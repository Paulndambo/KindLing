import { useEffect, useMemo, useState, useCallback } from "react";
import {
  GraduationCap,
  Flame,
  Clock,
  Target,
  BookOpen,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  ArrowRight,
  Loader2,
  RefreshCw,
  Download,
  Mail,
  Search,
  ChevronRight,
  LayoutDashboard,
  ClipboardCheck,
} from "lucide-react";
import { LEARNING_STYLE_OPTIONS } from "../../constants/onboarding";
import {
  getDashboard,
  ApiError,
  snoozeReviewSpark,
  downloadStandardsReport,
} from "../../services/api";
import ConfidenceChart from "../charts/ConfidenceChart";
import ContinueStrip from "../subjects/ContinueStrip";
import FamilyDigestCard from "./FamilyDigestCard";
import ReviewSparkCard from "./ReviewSparkCard";
import WeekFocusCard from "./WeekFocusCard";
import SparkChallengeCard from "./SparkChallengeCard";
import HomeworkWindowCard from "./HomeworkWindowCard";
import AssessmentsCenter from "./AssessmentsCenter";
import { pickSparkChallengeCandidate } from "../../services/learning/sparkChallenge";
import "../../styles/dashboard.css";
import "../../styles/dashboard-workspace.css";

const EMPTY_LIST = [];
const DASHBOARD_PAGES = [
  {
    id: "overview",
    label: "Overview",
    Icon: LayoutDashboard,
    description: "Your next steps, recent progress, and a little momentum.",
  },
  {
    id: "progress",
    label: "Learning progress",
    Icon: TrendingUp,
    description: "See how your understanding is growing, one skill at a time.",
  },
  {
    id: "insights",
    label: "Strengths & activity",
    Icon: Sparkles,
    description:
      "Recognize what is working and find your next opportunity to grow.",
  },
  {
    id: "plan",
    label: "Plan & family",
    Icon: CalendarDays,
    description:
      "Give your learning a direction and keep your family in the loop.",
  },
  {
    id: "assessments",
    label: "Assessments",
    Icon: ClipboardCheck,
    description:
      "Check your understanding, revisit your work, and see what clicks.",
  },
];

function StatCard({ eyebrow, value, cap, icon: Icon, tone = "teal" }) {
  return (
    <div className={`snap-card dash-stat dash-stat--${tone}`}>
      <div className="dash-stat-top">
        <span className="eyebrow">{eyebrow}</span>
        {Icon && (
          <span className="dash-stat-icon">
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className={`val${String(value).length > 12 ? " dw-stat-text" : ""}`}>
        {value}
      </div>
      <p className="cap">{cap}</p>
    </div>
  );
}

function MasteryRow({ subject, skill, level, status }) {
  const value = Math.max(0, Math.min(100, Number(level) || 0));
  return (
    <div className="dw-skill-row">
      <div className="dw-skill-top">
        <div>
          <span>{subject}</span>
          <h3>{skill}</h3>
        </div>
        <strong>
          {value}
          <small>%</small>
        </strong>
      </div>
      <div
        className="dw-skill-meter"
        role="meter"
        aria-label={`${skill} understanding`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <span style={{ width: `${value}%` }} />
      </div>
      <div className="dw-skill-caption">
        <span>{status || "Building understanding"}</span>
        <span>{value >= 80 ? "Keep it fresh" : "Room to grow"}</span>
      </div>
    </div>
  );
}

function EmptyState({ title, body, icon: Icon = Sparkles, tone = "teal" }) {
  return (
    <div className={`dash-empty tone-${tone}`}>
      <span className="dash-empty-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}

function PanelIcon({ icon: Icon, tone = "teal" }) {
  return (
    <span className={`dash-h-icon tone-${tone}`} aria-hidden="true">
      <Icon size={16} strokeWidth={2.2} />
    </span>
  );
}

const EMPTY_WEEK = {
  sessions: { value: "0", cap: "No sessions yet" },
  time: { value: "0m", cap: "Start a lesson to track time" },
  streak: { value: "0 days", cap: "This period" },
  focus: { value: "—", cap: "Start a lesson" },
  masteryDelta: "—",
  questions: "0",
};

export default function Dashboard({
  student,
  subjects = [],
  onStartLesson,
  onStudentUpdate,
  activePage = "overview",
  onPageChange,
  onOpenSubjects,
}) {
  const [week, setWeek] = useState("this");
  const [skillQuery, setSkillQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const page =
    DASHBOARD_PAGES.find((page) => page.id === activePage) ||
    DASHBOARD_PAGES[0];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [exportingStandards, setExportingStandards] = useState("");
  const [standardsExportError, setStandardsExportError] = useState("");
  // Bump to re-run the fetch effect (refresh / retry)
  const [fetchTick, setFetchTick] = useState(0);

  const studentName = student?.name || "Student";
  const studentId =
    student?.id != null
      ? `id_${student.id}`
      : student?.name?.toLowerCase().replace(/\s+/g, "_") || "anonymous";
  const interestsText = student?.interests?.length
    ? student.interests.slice(0, 2).join(" & ")
    : "your interests";
  const goal = student?.goal || "Build confidence one lesson at a time";
  const learningStyle =
    LEARNING_STYLE_OPTIONS.find((s) => s.id === student?.learningStyle)
      ?.label || "Visual & Diagrams";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload = await getDashboard();
        if (cancelled) return;
        setData(payload);
        setError("");
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : "We couldn’t load your progress. Please try again.";
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [student?.id, student?.name, fetchTick]);

  const refreshDashboard = useCallback((opts = {}) => {
    if (opts.silent) setRefreshing(true);
    else setLoading(true);
    setFetchTick((n) => n + 1);
  }, []);

  const stats = data?.weekStats?.[week] || EMPTY_WEEK;
  const hasData = Boolean(data?.hasData);
  const insights = data?.insights;
  const totals = data?.totals || {};
  const profile = data?.profile;

  const confidencePoints = useMemo(() => {
    const series = data?.confidenceHistory?.[week];
    if (Array.isArray(series) && series.length) return series;
    return [];
  }, [data, week]);

  const masteryRows = data?.masteryMap || EMPTY_LIST;
  const recommendedNextSkill = data?.recommendedNextSkill || null;
  const reviewSparks = data?.reviewSparks || {};
  const reviewItems = reviewSparks.due || reviewSparks.dueNow || EMPTY_LIST;
  const strengths = data?.strengths || EMPTY_LIST;
  const focusAreas = data?.focusAreas || EMPTY_LIST;
  const recentActivity = data?.recentActivity || EMPTY_LIST;
  const weekPlan = data?.weekPlan || EMPTY_LIST;

  const skillSubjects = [
    ...new Set(masteryRows.map((row) => row.subject).filter(Boolean)),
  ];
  const filteredSkills = masteryRows.filter(
    (row) =>
      (subjectFilter === "all" || row.subject === subjectFilter) &&
      `${row.subject} ${row.skill}`
        .toLowerCase()
        .includes(skillQuery.toLowerCase().trim()),
  );

  /** Epic L2.4 — prefer API ranking; fall back to client ranking */
  const nextBestActions = useMemo(() => {
    if (Array.isArray(data?.nextBestActions) && data.nextBestActions.length) {
      return data.nextBestActions;
    }
    const items = [];
    if (reviewItems.length) {
      const d = reviewItems[0];
      items.push({
        action: "REVIEW",
        score: 0.92,
        label: "Review today",
        reason: `Spaced practice on ${d.shortLabel || d.skillLabel || d.skillSlug || "a due skill"}`,
        cta: "Start review spark",
        kind: "review",
        skillSlug: d.skillSlug,
      });
    }
    if (recommendedNextSkill) {
      items.push({
        action: "CONTINUE_SOCRATIC",
        score: 0.7,
        label:
          recommendedNextSkill.shortLabel ||
          recommendedNextSkill.name ||
          "Next skill",
        reason: "Recommended next skill on your path",
        cta: "Practice skill",
        kind: "skill",
        skillSlug: recommendedNextSkill.slug,
      });
    }
    if (focusAreas[0]) {
      const f = focusAreas[0];
      const label = f.label || f.topic || "Focus area";
      items.push({
        action: "CONTINUE_SOCRATIC",
        score: 0.5,
        label: `Practice: ${label}`,
        reason: "Gentle focus area",
        cta: "Open lesson",
        kind: "focus",
      });
    }
    if (!items.length && onStartLesson) {
      items.push({
        action: "CONTINUE_SOCRATIC",
        score: 0.4,
        label: "Continue learning",
        reason: "Keep the spark going with a short lesson",
        cta: "Start a lesson",
        kind: "default",
      });
    }
    return items;
  }, [
    data?.nextBestActions,
    reviewItems,
    recommendedNextSkill,
    focusAreas,
    onStartLesson,
  ]);

  const topNba = nextBestActions[0] || null;

  const handleStartReview = useCallback(
    (item) => {
      if (!onStartLesson || !item) return;
      onStartLesson(
        item.subject || subjects[0]?.name || "General",
        item.topic || item.shortLabel,
        {
          reviewMode: true,
          reviewSkill: item.skillSlug,
          reviewSkillLabel: item.shortLabel || item.skillName,
          reviewId: item.id,
        },
      );
    },
    [onStartLesson, subjects],
  );

  const handleSnoozeReview = useCallback(
    async (item, days) => {
      const result = await snoozeReviewSpark({ reviewId: item?.id, days });
      refreshDashboard({ silent: true });
      return result;
    },
    [refreshDashboard],
  );

  const handleStandardsExport = useCallback(async (format = "csv") => {
    setExportingStandards(format);
    setStandardsExportError("");
    try {
      await downloadStandardsReport({ format });
    } catch (err) {
      setStandardsExportError(
        err?.message || "Could not export progress. Please try again.",
      );
    } finally {
      setExportingStandards(false);
    }
  }, []);

  /** Epic G1 — optional 3-solid-turn spark challenge */
  const sparkChallenge = useMemo(
    () =>
      pickSparkChallengeCandidate({
        dueReviews: reviewItems,
        recommendedNextSkill,
        focusAreas,
        masteryMap: masteryRows,
      }),
    [reviewItems, recommendedNextSkill, focusAreas, masteryRows],
  );

  const handleStartChallenge = useCallback(
    (candidate) => {
      if (!onStartLesson || !candidate) return;
      onStartLesson(
        candidate.subject || subjects[0]?.name || "General",
        candidate.topic || candidate.skillLabel,
        {
          challengeMode: true,
          challengeSkill: candidate.skillSlug || null,
          challengeSkillLabel: candidate.skillLabel,
          challengeTarget: candidate.target || 3,
          // If this skill is also a due review, completing the challenge reschedules it
          reviewId: candidate.reviewId || null,
          reviewMode: Boolean(candidate.reviewId),
          reviewSkill: candidate.reviewId ? candidate.skillSlug : null,
          reviewSkillLabel: candidate.reviewId ? candidate.skillLabel : null,
        },
      );
    },
    [onStartLesson, subjects],
  );

  /** Epic L2.4 — next-best-action from policy ranking */
  const handleNba = useCallback(
    (item) => {
      if (!item || !onStartLesson) return;
      if (item.kind === "review" || item.action === "REVIEW") {
        const match =
          reviewItems.find((r) => r.skillSlug === item.skillSlug) ||
          reviewItems[0];
        if (match) {
          handleStartReview(match);
          return;
        }
      }
      if (item.kind === "challenge" || item.action === "CHALLENGE") {
        if (sparkChallenge) {
          handleStartChallenge(sparkChallenge);
          return;
        }
      }
      const subj =
        item.subject ||
        recommendedNextSkill?.subject ||
        subjects[0]?.name ||
        "Computer Science";
      const actionOnlyLabel =
        item.kind === "lesson" ||
        item.kind === "challenge" ||
        [
          "Independent practice",
          "Quick check",
          "Fair stretch",
          "Rework a sticky idea",
        ].includes(item.label);
      const top =
        item.topic ||
        recommendedNextSkill?.topic ||
        (!actionOnlyLabel &&
        typeof item.label === "string" &&
        !/^Review|Independent|Quick|Fair|Rework/i.test(item.label)
          ? item.label
          : null) ||
        subjects[0]?.topics?.[0]?.name ||
        subjects[0]?.topics?.[0]?.subtopics?.[0]?.name ||
        "Lesson";
      onStartLesson(subj, top, {});
    },
    [
      onStartLesson,
      reviewItems,
      handleStartReview,
      sparkChallenge,
      handleStartChallenge,
      recommendedNextSkill,
      subjects,
    ],
  );

  const subjectCount = subjects.length || 0;
  const topicCount = useMemo(() => {
    if (!subjects.length) return 0;
    return subjects.reduce((n, s) => n + (s.topics?.length || 0), 0);
  }, [subjects]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const noteText = useMemo(() => {
    if (insights?.summary) return insights.summary;
    if (!hasData) {
      return `${studentName} hasn't completed a tracked lesson yet. Start a session and Kindling will fill this dashboard with mastery, confidence, and focus areas.`;
    }
    return `Kindling is learning how ${studentName} thinks. Keep practicing to refine personalization.`;
  }, [insights, hasData, studentName]);

  if (loading) {
    return (
      <section id="dashboard" className="dashboard-workspace" aria-busy="true">
        <div className="dash-wrap dash-loading-wrap">
          <div className="dash-skeleton-hero" aria-hidden>
            <div className="skel skel-avatar" />
            <div className="skel-lines">
              <div className="skel skel-line w40" />
              <div className="skel skel-line w70" />
              <div className="skel skel-line w55" />
            </div>
          </div>
          <div className="snap-grid dash-skeleton-stats" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <div className="snap-card dash-stat skel-card" key={i}>
                <div className="skel skel-line w50" />
                <div className="skel skel-line w30 tall" />
                <div className="skel skel-line w60" />
              </div>
            ))}
          </div>
          <p className="dash-loading-label" role="status">
            <Loader2 size={16} className="spin" aria-hidden />
            Loading your dashboard…
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="dashboard"
      className="dashboard-workspace"
      data-page={activePage}
    >
      <div className="dash-wrap">
        <div className="dw-breadcrumb">
          <span>Workspace</span>
          <ChevronRight size={12} />
          <span>{page.label}</span>
        </div>
        <header className="dw-header">
          <div>
            <p className="dw-overline">YOUR LEARNING, IN FOCUS</p>
            <h1 id="dashboard-heading">
              {activePage === "overview"
                ? `${greeting}, ${studentName}`
                : page.label}
            </h1>
            <p>{page.description}</p>
          </div>
          <div className="dw-header-actions">
            {(activePage === "overview" || activePage === "progress") && (
              <div
                className="dw-period"
                role="group"
                aria-label="Learning period"
              >
                {[
                  ["last", "Last week"],
                  ["this", "This week"],
                ].map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={week === id}
                    onClick={() => setWeek(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {activePage !== "assessments" && (
              <button
                type="button"
                className="dw-refresh"
                onClick={() => refreshDashboard({ silent: true })}
                disabled={refreshing}
                aria-label="Refresh dashboard"
              >
                <RefreshCw size={15} className={refreshing ? "spin" : ""} />
                <span>{refreshing ? "Updating…" : "Refresh"}</span>
              </button>
            )}
          </div>
        </header>
        <nav className="dw-mobile-pages" aria-label="Dashboard pages">
          {DASHBOARD_PAGES.map(({ id, label, Icon }) => (
            <button
              type="button"
              key={id}
              aria-current={activePage === id ? "page" : undefined}
              onClick={() => onPageChange?.(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        {error && (
          <div className="dash-error" role="alert">
            <AlertCircle size={17} aria-hidden />
            <span>
              <b>Your dashboard could not be updated.</b> {error}
            </span>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => refreshDashboard()}
            >
              Retry
            </button>
          </div>
        )}

        {(data || !error || activePage === "assessments") && (
          <>
            {!hasData &&
              !error &&
              ["progress", "insights"].includes(activePage) && (
                <div className="dw-first-lesson">
                  <div>
                    <BookOpen size={21} />
                    <span>
                      <strong>
                        A little practice will bring this page to life.
                      </strong>
                      <p>
                        Choose a subject and start a lesson to build your
                        learning history.
                      </p>
                    </span>
                  </div>
                  <button type="button" onClick={onOpenSubjects}>
                    Explore subjects <ArrowRight size={14} />
                  </button>
                </div>
              )}

            {activePage === "assessments" && (
              <AssessmentsCenter student={student} subjects={subjects} />
            )}

            {activePage === "overview" && (
              <>
                {/* Put the most useful action directly beneath the page heading. */}
                {topNba && onStartLesson && (
                  <div
                    className="nba-card"
                    role="region"
                    aria-label="Suggested next step"
                  >
                    <span className="nba-icon" aria-hidden="true">
                      <Flame size={22} />
                    </span>
                    <div className="nba-card-main">
                      <p className="eyebrow">A good next step</p>
                      <h2 className="nba-title">
                        {subjectCount
                          ? topNba.label
                          : "Make room for your first big idea"}
                      </h2>
                      <p className="nba-reason">
                        {subjectCount
                          ? topNba.reason
                          : "Add a subject, choose a topic, and start learning at your own pace."}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary nba-cta"
                      onClick={() =>
                        subjectCount ? handleNba(topNba) : onOpenSubjects?.()
                      }
                    >
                      {subjectCount
                        ? topNba.cta || "Start learning"
                        : "Add a subject"}{" "}
                      <ArrowRight size={15} aria-hidden />
                    </button>
                  </div>
                )}

                {onStartLesson && (
                  <ContinueStrip
                    studentId={studentId}
                    onContinue={onStartLesson}
                    title="Pick up a lesson"
                  />
                )}

                {/* Snapshot stats from backend week aggregates + profile totals */}
                <div className="snap-grid">
                  <StatCard
                    eyebrow="Sessions"
                    value={stats.sessions?.value ?? "0"}
                    cap={
                      hasData && totals.exchanges != null
                        ? `${stats.sessions?.cap || "—"} · ${totals.exchanges} lifetime exchanges`
                        : stats.sessions?.cap || "—"
                    }
                    icon={BookOpen}
                    tone="teal"
                  />
                  <StatCard
                    eyebrow={
                      hasData && insights?.stats?.accuracy != null
                        ? "Accuracy signal"
                        : "Time learning"
                    }
                    value={
                      hasData && insights?.stats?.accuracy != null
                        ? `${insights.stats.accuracy}%`
                        : (stats.time?.value ?? "0m")
                    }
                    cap={
                      hasData && insights?.stats?.accuracy != null
                        ? `${totals.correct || 0} correct · ${totals.incorrect || 0} to revisit`
                        : stats.time?.cap || "—"
                    }
                    icon={
                      hasData && insights?.stats?.accuracy != null
                        ? TrendingUp
                        : Clock
                    }
                    tone="pine"
                  />
                  <StatCard
                    eyebrow={
                      hasData && profile?.behavior?.hintRate != null
                        ? "Hint rate"
                        : "Activity"
                    }
                    value={
                      hasData && profile?.behavior?.hintRate != null
                        ? `${Math.round((profile.behavior.hintRate || 0) * 100)}%`
                        : (stats.streak?.value ?? "0 days")
                    }
                    cap={
                      hasData && profile?.behavior?.hintRate != null
                        ? "Share of turns asking for help"
                        : stats.streak?.cap || "—"
                    }
                    icon={
                      hasData && profile?.behavior?.hintRate != null
                        ? Sparkles
                        : Flame
                    }
                    tone="marigold"
                  />
                  <StatCard
                    eyebrow="Focus skill"
                    value={focusAreas[0]?.label || stats.focus?.value || "—"}
                    cap={
                      focusAreas[0]?.hint ||
                      stats.focus?.cap ||
                      "Start a lesson"
                    }
                    icon={Target}
                    tone="berry"
                  />
                </div>

                <p className="dash-live-banner">
                  {hasData
                    ? "Your learning activity and progress are up to date."
                    : "No lesson data yet — complete a session and this dashboard will fill in automatically."}
                </p>

                <div className="dw-section-heading">
                  <div>
                    <h2>A little practice goes a long way</h2>
                    <p>Pick one small step for today.</p>
                  </div>
                  <button type="button" onClick={() => onPageChange?.("plan")}>
                    Your learning plan <ArrowRight size={14} />
                  </button>
                </div>
                {subjectCount === 0 ? (
                  <div className="dw-setup-grid">
                    <button
                      type="button"
                      onClick={() => onPageChange?.("plan")}
                    >
                      <Target size={21} />
                      <strong>Give your learning a direction</strong>
                      <span>Set a weekly focus or a date to work toward.</span>
                      <span>
                        Make a plan <ArrowRight size={14} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPageChange?.("assessments")}
                    >
                      <ClipboardCheck size={21} />
                      <strong>Find out what you know</strong>
                      <span>
                        Create a short assessment on a topic of your choice.
                      </span>
                      <span>
                        Explore assessments <ArrowRight size={14} />
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="dash-practice-grid">
                    <ReviewSparkCard
                      compact
                      items={reviewItems}
                      retention={reviewSparks.retention}
                      loading={refreshing}
                      onStartReview={handleStartReview}
                      onSnooze={handleSnoozeReview}
                      onRefresh={() => refreshDashboard({ silent: true })}
                    />
                    <SparkChallengeCard
                      candidate={sparkChallenge}
                      onStartChallenge={handleStartChallenge}
                    />

                    {onStartLesson && (
                      <HomeworkWindowCard
                        subjects={subjects}
                        onStartLesson={onStartLesson}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {activePage === "progress" && (
              <>
                <div className="dw-summary-strip">
                  <div>
                    <span>Skills explored</span>
                    <strong>{masteryRows.length}</strong>
                  </div>
                  <div>
                    <span>Subjects in your workspace</span>
                    <strong>{subjectCount}</strong>
                  </div>
                  <div>
                    <span>Learning goal</span>
                    <strong className="dw-goal-text">{goal}</strong>
                  </div>
                </div>
                {/* Profile strip (student from API / onboarding) */}
                <details className="academic-card dash-profile-card">
                  <summary className="dw-profile-summary">
                    <h2>
                      <PanelIcon icon={GraduationCap} tone="pine" /> Your
                      learning profile
                    </h2>
                    <span>
                      View details <ChevronRight size={14} />
                    </span>
                  </summary>
                  <div className="academic-grid">
                    <div className="academic-item">
                      <b>School</b>
                      <span>
                        {student?.countryFlag || "🌐"}{" "}
                        {student?.schoolName || "—"} ·{" "}
                        {student?.schoolType || "—"}
                      </span>
                    </div>
                    <div className="academic-item">
                      <b>Curriculum</b>
                      <span>{student?.curriculum || "—"}</span>
                    </div>
                    <div className="academic-item">
                      <b>Target level</b>
                      <span>{student?.academicTarget || "—"}</span>
                    </div>
                    <div className="academic-item">
                      <b>Learning style</b>
                      <span>{learningStyle}</span>
                    </div>
                    <div className="academic-item">
                      <b>Subjects in Kindling</b>
                      <span>
                        {subjectCount} subjects · {topicCount} topics
                      </span>
                    </div>
                    <div className="academic-item">
                      <b>Interests woven in</b>
                      <span>{interestsText}</span>
                    </div>
                  </div>
                </details>

                {/* Mastery + confidence */}
                <div className="dash-grid">
                  <div className="panel">
                    <div className="dash-panel-head">
                      <h2>
                        <PanelIcon icon={Sparkles} tone="marigold" />
                        Skill progress
                      </h2>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span className="dash-delta">
                          <TrendingUp size={14} /> {stats.masteryDelta || "—"}{" "}
                          {week === "this" ? "this week" : "last week"}
                        </span>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleStandardsExport("csv")}
                          disabled={Boolean(exportingStandards)}
                          aria-label="Download standards progress CSV"
                          title="Download standards progress as CSV"
                        >
                          <Download size={15} />
                          {exportingStandards === "csv"
                            ? "Preparing…"
                            : "Export CSV"}
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleStandardsExport("narrative")}
                          disabled={Boolean(exportingStandards)}
                          aria-label="Download an email-ready progress summary"
                          title="Download a plain-text summary suitable for email"
                        >
                          <Mail size={15} />
                          {exportingStandards === "narrative"
                            ? "Preparing…"
                            : "Summary (.txt)"}
                        </button>
                      </div>
                    </div>
                    {recommendedNextSkill && (
                      <div
                        className="note-card"
                        style={{
                          marginBottom: 12,
                          borderColor: "rgba(62,138,143,.28)",
                          background: "rgba(62,138,143,.06)",
                        }}
                      >
                        <b>Up next — </b>
                        Next recommended skill:{" "}
                        <strong>
                          {recommendedNextSkill.shortLabel ||
                            recommendedNextSkill.name}
                        </strong>
                        {recommendedNextSkill.stateLabel
                          ? ` · ${recommendedNextSkill.stateLabel}`
                          : ""}
                        {recommendedNextSkill.score != null
                          ? ` (~${Math.round(recommendedNextSkill.score)}%)`
                          : ""}
                        . Build on what you already understand.
                      </div>
                    )}
                    {masteryRows.length > 0 && (
                      <div className="dw-skill-filters">
                        <label>
                          <Search size={15} />
                          <input
                            type="search"
                            aria-label="Search skills"
                            placeholder="Find a skill…"
                            value={skillQuery}
                            onChange={(e) => setSkillQuery(e.target.value)}
                          />
                        </label>
                        <select
                          aria-label="Filter skills by subject"
                          value={subjectFilter}
                          onChange={(e) => setSubjectFilter(e.target.value)}
                        >
                          <option value="all">All subjects</option>
                          {skillSubjects.map((subject) => (
                            <option key={subject}>{subject}</option>
                          ))}
                        </select>
                        <span>
                          {filteredSkills.length} of {masteryRows.length} skills
                        </span>
                      </div>
                    )}
                    <div className="mastery-map">
                      {filteredSkills.length ? (
                        filteredSkills.map((m) => (
                          <MasteryRow
                            key={`${m.subject}-${m.skill}-${m.slug || ""}`}
                            {...m}
                          />
                        ))
                      ) : (
                        <EmptyState
                          title={
                            masteryRows.length
                              ? "No matching skills"
                              : "Your progress starts with a lesson"
                          }
                          body={
                            masteryRows.length
                              ? "Try another subject or a different search."
                              : "Practice a topic and your growing understanding will appear here."
                          }
                          icon={Sparkles}
                          tone="marigold"
                        />
                      )}
                    </div>
                    <div className="note-card">
                      <b>Your learning picture — </b>
                      {noteText}
                    </div>
                    <p className="dash-chart-cap" style={{ marginTop: 10 }}>
                      The Computer Science codes in these downloads belong to
                      Kindling’s internal pilot framework; they are not
                      externally reviewed standards.
                    </p>
                    {standardsExportError && (
                      <p role="status" className="form-error">
                        {standardsExportError}
                      </p>
                    )}
                  </div>

                  <div className="panel">
                    <div className="dash-panel-head">
                      <h2>
                        <PanelIcon icon={TrendingUp} tone="teal" />
                        Confidence
                      </h2>
                      <span className="dash-delta muted">
                        From recent exchanges
                      </span>
                    </div>
                    {confidencePoints.length ? (
                      <ConfidenceChart points={confidencePoints} />
                    ) : (
                      <div className="dw-confidence-empty">
                        <EmptyState
                          title="Confidence takes shape with practice"
                          body="As you share how a lesson feels, your confidence trend will appear here."
                          icon={TrendingUp}
                        />
                      </div>
                    )}
                    <p className="dash-chart-cap">
                      How sure {studentName} felt across recent turns — climbing
                      is a good sign; dips usually mean a tougher topic.
                    </p>
                    <div className="dash-mini-stats">
                      <div>
                        <b>{stats.questions ?? totals.exchanges ?? "0"}</b>
                        <span>
                          {week === "this"
                            ? "questions this week"
                            : "questions last week"}
                        </span>
                      </div>
                      <div>
                        <b>
                          {confidencePoints.length
                            ? `${confidencePoints[confidencePoints.length - 1]}%`
                            : "—"}
                        </b>
                        <span>latest confidence</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activePage === "insights" && (
              <>
                {/* Strengths / focus + activity */}
                <div className="dash-grid dash-grid-equal">
                  <div className="panel">
                    <h2>
                      <PanelIcon icon={CheckCircle2} tone="pine" />
                      What&apos;s going well
                    </h2>
                    {strengths.length ? (
                      <ul className="dash-insight-list">
                        {strengths.map((s) => (
                          <li key={s.label}>
                            <CheckCircle2
                              size={16}
                              className="dash-insight-icon good"
                            />
                            <div>
                              <strong>{s.label}</strong>
                              <span>{s.hint}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState
                        title="Strengths will show here"
                        body="After a few successful exchanges on a topic, Kindling lists it as a strength."
                        icon={CheckCircle2}
                        tone="pine"
                      />
                    )}
                    <h2 className="dash-subhead">
                      <PanelIcon icon={Target} tone="berry" />
                      Worth more practice
                    </h2>
                    {focusAreas.length ? (
                      <ul className="dash-insight-list">
                        {focusAreas.map((s) => (
                          <li key={s.label}>
                            <AlertCircle
                              size={16}
                              className="dash-insight-icon focus"
                            />
                            <div>
                              <strong>{s.label}</strong>
                              <span>{s.hint}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState
                        title="No focus areas yet"
                        body="As you practice, Kindling will suggest skills that could use another look."
                        icon={Target}
                        tone="berry"
                      />
                    )}
                  </div>

                  <div className="panel">
                    <h2>
                      <PanelIcon icon={Clock} tone="violet" />
                      Recent activity
                    </h2>
                    <div className="dash-activity">
                      {recentActivity.length ? (
                        recentActivity.map((a) => (
                          <div
                            className={`dash-activity-item tone-${a.tone || "good"}`}
                            key={a.id}
                          >
                            <div className="dash-activity-when">{a.when}</div>
                            <div className="dash-activity-body">
                              <div className="dash-activity-title">
                                <span className="dash-activity-tag">
                                  {a.subject}
                                </span>
                                {a.title}
                              </div>
                              <p>{a.detail}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="No sessions yet"
                          body="Your completed lessons and learning moments will appear here."
                          icon={Clock}
                          tone="violet"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activePage === "plan" && (
              <>
                <div className="dw-plan-layout">
                  <div className="dw-plan-main">
                    <WeekFocusCard
                      student={student}
                      onStudentUpdate={onStudentUpdate}
                    />
                    {/* Upcoming plan from backend suggestions */}
                    <div className="panel dash-plan-panel">
                      <div className="dash-panel-head">
                        <h2>
                          <PanelIcon icon={CalendarDays} tone="teal" />
                          Coming up
                        </h2>
                        <span className="dash-delta muted">
                          Suggested by Kindling
                        </span>
                      </div>
                      <div className="plan-list dash-plan-list">
                        {weekPlan.length ? (
                          weekPlan.map((p) => (
                            <div
                              className="plan-item dash-plan-item"
                              key={p.day + p.tag + p.title}
                            >
                              <span className="plan-day">{p.day}</span>
                              <div className="dash-plan-body">
                                <div className="dash-plan-title-row">
                                  <strong>{p.title}</strong>
                                  <span className="dash-plan-meta">
                                    {p.tag} · {p.duration}
                                  </span>
                                </div>
                                <p>{p.text}</p>
                              </div>
                              {onStartLesson && (
                                <button
                                  type="button"
                                  className="dw-plan-start"
                                  aria-label={`Start ${p.title}`}
                                  onClick={() =>
                                    onStartLesson(
                                      p.subject ||
                                        p.tag ||
                                        subjects[0]?.name ||
                                        "General",
                                      p.topic || p.title,
                                      {},
                                    )
                                  }
                                >
                                  Start <ArrowRight size={14} />
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <EmptyState
                            title="No plan yet"
                            body="Add subjects or complete a lesson so Kindling can suggest next steps."
                            icon={CalendarDays}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="dw-plan-family">
                    {/* Epic A5 — family digests */}
                    <FamilyDigestCard
                      student={student}
                      onStudentUpdate={onStudentUpdate}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
