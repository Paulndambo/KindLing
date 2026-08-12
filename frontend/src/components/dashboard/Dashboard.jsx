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
} from "lucide-react";
import { LEARNING_STYLE_OPTIONS, AVATAR_OPTIONS } from "../../constants/onboarding";
import { getDashboard, ApiError } from "../../services/api";
import ConfidenceChart from "../charts/ConfidenceChart";
import ContinueStrip from "../subjects/ContinueStrip";

function StatCard({ eyebrow, value, cap, icon: Icon }) {
  return (
    <div className="snap-card dash-stat">
      <div className="dash-stat-top">
        <span className="eyebrow">{eyebrow}</span>
        {Icon && (
          <span className="dash-stat-icon">
            <Icon size={15} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="val">{value}</div>
      <p className="cap">{cap}</p>
    </div>
  );
}

function MasteryRow({ subject, skill, level, segs, status }) {
  return (
    <div className="subj-row dash-mastery-row">
      <div className="lbl">
        <span>
          {subject}
          <span
            className={`dash-status-pill status-${String(status || "building")
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
          >
            {status}
          </span>
        </span>
        <span>
          {skill} · {level}%
        </span>
      </div>
      <div className="track">
        {(segs || []).map((s, i) => (
          <div className={`seg ${s}`} key={i} />
        ))}
      </div>
      <div className="dash-level-track" aria-hidden="true">
        <div className="dash-level-fill" style={{ width: `${level}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div
      style={{
        padding: "18px 4px",
        color: "var(--ink-soft)",
        fontSize: 13.5,
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: "var(--ink)", display: "block", marginBottom: 4 }}>
        {title}
      </strong>
      {body}
    </div>
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

export default function Dashboard({ student, subjects = [], onStartLesson }) {
  const [week, setWeek] = useState("this");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // Bump to re-run the fetch effect (refresh / retry)
  const [fetchTick, setFetchTick] = useState(0);

  const studentName = student?.name || "Student";
  const studentId =
    student?.id != null
      ? `id_${student.id}`
      : student?.name?.toLowerCase().replace(/\s+/g, "_") || "anonymous";
  const grade = student?.grade || "—";
  const interestsText = student?.interests?.length
    ? student.interests.slice(0, 2).join(" & ")
    : "your interests";
  const goal = student?.goal || "Build confidence one lesson at a time";
  const learningStyle =
    LEARNING_STYLE_OPTIONS.find((s) => s.id === student?.learningStyle)?.label ||
    "Visual & Diagrams";

  const avatar =
    AVATAR_OPTIONS.find((a) => a.id === student?.avatar) || AVATAR_OPTIONS[0];
  const AvatarIcon = avatar.Icon;

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
            : "Could not load dashboard. Is the backend running?";
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
    return [40, 40, 40, 40, 40, 40, 40];
  }, [data, week]);

  const masteryRows = data?.masteryMap || [];
  const recommendedNextSkill = data?.recommendedNextSkill || null;
  const strengths = data?.strengths || [];
  const focusAreas = data?.focusAreas || [];
  const recentActivity = data?.recentActivity || [];
  const weekPlan = data?.weekPlan || [];

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
      <section id="dashboard">
        <div
          className="dash-wrap"
          style={{
            padding: "80px 40px",
            textAlign: "center",
            color: "var(--ink-soft)",
          }}
        >
          <Loader2
            size={22}
            style={{
              display: "inline-block",
              marginBottom: 10,
              animation: "spin 1s linear infinite",
            }}
          />
          <div style={{ fontSize: 14 }}>Loading dashboard from Kindling…</div>
        </div>
      </section>
    );
  }

  return (
    <section id="dashboard">
      <div className="dash-wrap">
        {onStartLesson && (
          <ContinueStrip
            studentId={studentId}
            onContinue={onStartLesson}
            title="Pick up a lesson"
          />
        )}
        {/* Hero header */}
        <div className="dash-hero">
          <div className="dash-hero-main">
            <div className="dash-avatar" aria-hidden="true">
              <AvatarIcon size={22} />
            </div>
            <div>
              <p className="eyebrow">Student dashboard</p>
              <h2>
                {greeting}, {studentName}
              </h2>
              <p className="dash-hero-sub">
                Your progress, strengths, and next lessons — tuned to{" "}
                <strong>{grade}</strong>
                {student?.schoolName ? (
                  <>
                    {" "}
                    at <strong>{student.schoolName}</strong>
                  </>
                ) : null}
                .
              </p>
            </div>
          </div>
          <div className="dash-hero-meta">
            <div className="dash-goal-chip">
              <Sparkles size={14} />
              <span>
                Goal: <strong>{goal}</strong>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "6px 10px", fontSize: 12 }}
                onClick={() => refreshDashboard({ silent: true })}
                disabled={refreshing}
                aria-label="Refresh dashboard"
              >
                <RefreshCw
                  size={14}
                  style={{
                    marginRight: 4,
                    display: "inline",
                    verticalAlign: -2,
                    animation: refreshing
                      ? "spin 1s linear infinite"
                      : undefined,
                  }}
                />
                Refresh
              </button>
              <div className="week-pick" role="tablist" aria-label="Week range">
                <button
                  type="button"
                  role="tab"
                  aria-selected={week === "last"}
                  className={week === "last" ? "active" : ""}
                  onClick={() => setWeek("last")}
                >
                  Last week
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={week === "this"}
                  className={week === "this" ? "active" : ""}
                  onClick={() => setWeek("this")}
                >
                  This week
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div
            className="note-card"
            style={{
              marginBottom: 16,
              borderColor: "rgba(180,60,60,0.25)",
              color: "var(--berry)",
            }}
          >
            <b>Could not load live data — </b>
            {error}{" "}
            <button
              type="button"
              className="btn-ghost"
              style={{ marginLeft: 8, padding: "2px 8px", fontSize: 12 }}
              onClick={() => refreshDashboard()}
            >
              Retry
            </button>
          </div>
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
                : stats.time?.value ?? "0m"
            }
            cap={
              hasData && insights?.stats?.accuracy != null
                ? `${totals.correct || 0} correct · ${totals.incorrect || 0} to revisit`
                : stats.time?.cap || "—"
            }
            icon={
              hasData && insights?.stats?.accuracy != null ? TrendingUp : Clock
            }
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
                : stats.streak?.value ?? "0 days"
            }
            cap={
              hasData && profile?.behavior?.hintRate != null
                ? "Share of turns asking for help"
                : stats.streak?.cap || "—"
            }
            icon={
              hasData && profile?.behavior?.hintRate != null ? Sparkles : Flame
            }
          />
          <StatCard
            eyebrow="Focus skill"
            value={
              focusAreas[0]?.label ||
              stats.focus?.value ||
              "—"
            }
            cap={
              focusAreas[0]?.hint ||
              stats.focus?.cap ||
              "Start a lesson"
            }
            icon={Target}
          />
        </div>

        <p className="dash-live-banner">
          {hasData
            ? "Showing live Kindling data from your backend learning profile and sessions."
            : "No lesson data yet — complete a session and this dashboard will fill in automatically."}
        </p>

        {/* Profile strip (student from API / onboarding) */}
        <div className="academic-card dash-profile-card">
          <h4>
            <GraduationCap size={18} color="var(--pine)" /> Your learning profile
          </h4>
          <div className="academic-grid">
            <div className="academic-item">
              <b>School</b>
              <span>
                {student?.countryFlag || "🌐"}{" "}
                {student?.schoolName || "—"} · {student?.schoolType || "—"}
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
        </div>

        {/* Mastery + confidence */}
        <div className="dash-grid">
          <div className="panel">
            <div className="dash-panel-head">
              <h3>Skill sparks</h3>
              <span className="dash-delta">
                <TrendingUp size={14} /> {stats.masteryDelta || "—"} this week
              </span>
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
                <b>Ready to spark — </b>
                Next recommended skill:{" "}
                <strong>
                  {recommendedNextSkill.shortLabel || recommendedNextSkill.name}
                </strong>
                {recommendedNextSkill.stateLabel
                  ? ` · ${recommendedNextSkill.stateLabel}`
                  : ""}
                {recommendedNextSkill.score != null
                  ? ` (~${Math.round(recommendedNextSkill.score)}%)`
                  : ""}
                . Kindling uses the skill graph so prerequisites light up first.
              </div>
            )}
            <div className="mastery-map">
              {masteryRows.length ? (
                masteryRows.map((m) => (
                  <MasteryRow
                    key={`${m.subject}-${m.skill}-${m.slug || ""}`}
                    {...m}
                  />
                ))
              ) : (
                <EmptyState
                  title="No skill sparks yet"
                  body="Practice Math Foundations topics — Kindling tracks fine-grained skills (not only whole topics) with a knowledge graph."
                />
              )}
            </div>
            <div className="note-card">
              <b>Note from Kindling — </b>
              {noteText}
            </div>
          </div>

          <div className="panel">
            <div className="dash-panel-head">
              <h3>Confidence</h3>
              <span className="dash-delta muted">From recent exchanges</span>
            </div>
            <ConfidenceChart points={confidencePoints} />
            <p className="dash-chart-cap">
              How sure {studentName} felt across recent turns — climbing is a
              good sign; dips usually mean a tougher topic.
            </p>
            <div className="dash-mini-stats">
              <div>
                <b>{stats.questions ?? totals.exchanges ?? "0"}</b>
                <span>
                  {week === "this" ? "questions this week" : "questions last week"}
                </span>
              </div>
              <div>
                <b>
                  {confidencePoints[confidencePoints.length - 1] ?? 0}%
                </b>
                <span>latest confidence</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strengths / focus + activity */}
        <div className="dash-grid dash-grid-equal">
          <div className="panel">
            <h3>What&apos;s going well</h3>
            {strengths.length ? (
              <ul className="dash-insight-list">
                {strengths.map((s) => (
                  <li key={s.label}>
                    <CheckCircle2 size={16} className="dash-insight-icon good" />
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
              />
            )}
            <h3 className="dash-subhead">Worth more practice</h3>
            {focusAreas.length ? (
              <ul className="dash-insight-list">
                {focusAreas.map((s) => (
                  <li key={s.label}>
                    <AlertCircle size={16} className="dash-insight-icon focus" />
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
                body="Struggle zones appear here when mastery dips on a topic."
              />
            )}
          </div>

          <div className="panel">
            <h3>Recent activity</h3>
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
                        <span className="dash-activity-tag">{a.subject}</span>
                        {a.title}
                      </div>
                      <p>{a.detail}</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No sessions yet"
                  body="Lesson sessions from the learning API will list here after you practice."
                />
              )}
            </div>
          </div>
        </div>

        {/* Upcoming plan from backend suggestions */}
        <div className="panel dash-plan-panel">
          <div className="dash-panel-head">
            <h3>
              <CalendarDays
                size={18}
                style={{ marginRight: 8, verticalAlign: -3 }}
              />
              Coming up
            </h3>
            <span className="dash-delta muted">Suggested by Kindling</span>
          </div>
          <div className="plan-list dash-plan-list">
            {weekPlan.length ? (
              weekPlan.map((p) => (
                <div className="plan-item dash-plan-item" key={p.day + p.tag + p.title}>
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
                  <span className="dash-plan-arrow" aria-hidden="true">
                    <ArrowRight size={16} />
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                title="No plan yet"
                body="Add subjects or complete a lesson so Kindling can suggest next steps."
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
