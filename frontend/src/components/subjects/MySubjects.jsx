import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  X,
  ArrowRight,
  BookOpen,
  Loader2,
  LogIn,
  Sparkles,
  Library,
  AlertCircle,
  ChevronDown,
  Play,
  Layers,
  Search,
} from "lucide-react";
import { ICON_MAP } from "../../constants/icons";
import {
  DEFAULT_FAMILIARITY,
  familiarityLabel,
} from "../../constants/familiarity";
import { listContinuableAsync, loadReviewSparks } from "../../services/learning";
import {
  ALLOW_CUSTOM_SUBJECTS,
  SOLE_SUBJECT_NAME,
} from "../../constants/features";
import NewSubjectModal from "./NewSubjectModal";
import TopicIntentFields from "./TopicIntentFields";
import ContinueStrip from "./ContinueStrip";
import TranscriptSearch from "./TranscriptSearch";
import ReviewSparkCard from "../dashboard/ReviewSparkCard";

function countLessons(topics = []) {
  return topics.reduce(
    (n, t) => n + (t.subtopics?.length ? t.subtopics.length : 1),
    0
  );
}

function unitLeaves(t) {
  if (t.subtopics?.length > 0) return t.subtopics;
  return [
    {
      id: t.id,
      name: t.name,
      familiarity: t.familiarity,
      learningGoal: t.learningGoal,
    },
  ];
}

function SubjectsPageShell({
  title,
  subtitle,
  eyebrow = "Your subjects",
  action = null,
  children,
}) {
  return (
    <section id="subjects" className="subjects-page">
      <div className="subj-wrap">
        <header className="subj-head">
          <div className="subj-head-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {action}
        </header>
        <div className="subj-stack">{children}</div>
      </div>
    </section>
  );
}

export default function MySubjects({
  subjects,
  loading = false,
  error = "",
  onCreateSubject,
  onAddTopic,
  onDeleteSubject,
  onDeleteTopic,
  onStartLesson,
  student,
  isLoggedIn = false,
  onGetStarted,
  onOpenLogin,
  onOpenOnboarding,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  /** @type {Record<string, { name: string, familiarity: string, learningGoal: string, expanded: boolean }>} */
  const [drafts, setDrafts] = useState({});
  /** subjectId → set of expanded unit ids/names */
  const [openUnits, setOpenUnits] = useState({});
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [continueKeys, setContinueKeys] = useState(() => new Set());
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const studentName = student?.name?.trim() || "you";
  const hasProfile = Boolean(student?.id || student?.isOnboarded);
  const displayError = actionError || error;
  const studentId =
    student?.id != null
      ? `id_${student.id}`
      : student?.name?.toLowerCase().replace(/\s+/g, "_") || "anonymous";

  const subjectCount = subjects?.length || 0;
  const topicCount = (subjects || []).reduce(
    (n, s) => n + (s.topics?.length || 0),
    0
  );
  const lessonCount = useMemo(
    () => (subjects || []).reduce((n, s) => n + countLessons(s.topics || []), 0),
    [subjects]
  );

  const refreshReviews = useCallback(async () => {
    if (!isLoggedIn || !hasProfile) {
      setReviewItems([]);
      return;
    }
    setReviewLoading(true);
    try {
      const pack = await loadReviewSparks({ refresh: true });
      setReviewItems(pack.dueNow?.length ? pack.dueNow : pack.due || []);
    } catch {
      setReviewItems([]);
    } finally {
      setReviewLoading(false);
    }
  }, [isLoggedIn, hasProfile]);

  useEffect(() => {
    if (!isLoggedIn || !hasProfile) {
      setContinueKeys(new Set());
      setReviewItems([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const items = await listContinuableAsync(studentId, { limit: 40 });
        if (cancelled) return;
        const keys = new Set(
          (items || []).map(
            (i) =>
              `${(i.subject || "").toLowerCase()}::${(i.topic || "").toLowerCase()}`
          )
        );
        setContinueKeys(keys);
      } catch {
        if (!cancelled) setContinueKeys(new Set());
      }
      if (!cancelled) await refreshReviews();
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, hasProfile, studentId, subjects, refreshReviews]);

  // Default-expand first unit that has a resume, else first unit per subject
  useEffect(() => {
    if (!subjects?.length) return;
    setOpenUnits((prev) => {
      const next = { ...prev };
      for (const s of subjects) {
        const key = String(s.id);
        if (next[key]) continue;
        const topics = s.topics || [];
        let pick = topics[0] ? String(topics[0].id || topics[0].name) : null;
        for (const t of topics) {
          const leaves = unitLeaves(t);
          if (
            leaves.some((leaf) =>
              continueKeys.has(
                `${(s.name || "").toLowerCase()}::${(leaf.name || "").toLowerCase()}`
              )
            )
          ) {
            pick = String(t.id || t.name);
            break;
          }
        }
        if (pick) next[key] = { [pick]: true };
      }
      return next;
    });
  }, [subjects, continueKeys]);

  const canContinue = (subjectName, topicName) =>
    continueKeys.has(
      `${(subjectName || "").toLowerCase()}::${(topicName || "").toLowerCase()}`
    );

  const isUnitOpen = (subjId, unitKey) =>
    Boolean(openUnits[String(subjId)]?.[String(unitKey)]);

  const toggleUnit = (subjId, unitKey) => {
    const sid = String(subjId);
    const uk = String(unitKey);
    setOpenUnits((prev) => {
      const cur = { ...(prev[sid] || {}) };
      if (cur[uk]) delete cur[uk];
      else cur[uk] = true;
      return { ...prev, [sid]: cur };
    });
  };

  const emptyDraft = () => ({
    name: "",
    familiarity: DEFAULT_FAMILIARITY,
    learningGoal: "",
    expanded: false,
  });

  const getDraft = (subjId) => drafts[subjId] || emptyDraft();

  const patchDraft = (subjId, patch) =>
    setDrafts((d) => ({
      ...d,
      [subjId]: { ...emptyDraft(), ...(d[subjId] || {}), ...patch },
    }));

  const submitTopic = async (subjId) => {
    const draft = getDraft(subjId);
    const val = (draft.name || "").trim();
    if (!val || busy) return;
    setActionError("");
    setBusy(true);
    try {
      await onAddTopic(subjId, {
        name: val,
        familiarity: draft.familiarity || DEFAULT_FAMILIARITY,
        learningGoal: (draft.learningGoal || "").trim(),
      });
      setDrafts((d) => {
        const next = { ...d };
        delete next[subjId];
        return next;
      });
    } catch (err) {
      setActionError(err?.message || "Could not add topic.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (subj) => {
    setActionError("");
    setBusy(true);
    try {
      await onCreateSubject(subj);
      setModalOpen(false);
    } catch (err) {
      setActionError(err?.message || "Could not create subject.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    setActionError("");
    setBusy(true);
    try {
      await onDeleteSubject(id);
    } catch (err) {
      setActionError(err?.message || "Could not delete subject.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTopic = async (subjId, topicId) => {
    setActionError("");
    setBusy(true);
    try {
      await onDeleteTopic(subjId, topicId);
    } catch (err) {
      setActionError(err?.message || "Could not delete topic.");
    } finally {
      setBusy(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <SubjectsPageShell
        title="Your learning path starts here."
        subtitle="Sign in to open Computer Science lessons — or create subjects when multi-subject unlocks."
        action={
          <button type="button" className="new-subj-btn" onClick={onGetStarted}>
            <Sparkles size={16} aria-hidden /> Get started
          </button>
        }
      >
        <div className="subj-panel subj-panel--empty">
          <div className="subj-empty">
            <div className="subj-empty-icon" aria-hidden>
              <Library size={28} />
            </div>
            <h3>Sign in to see your path</h3>
            <p>
              Subjects and lessons stay with your student account so you can
              resume anytime.
            </p>
            <div className="subj-empty-actions">
              <button
                type="button"
                className="new-subj-btn"
                onClick={onGetStarted}
              >
                <Sparkles size={16} aria-hidden /> Get started
              </button>
              <button
                type="button"
                className="btn-ghost subj-empty-secondary"
                onClick={onOpenLogin}
              >
                <LogIn size={15} aria-hidden /> Log in
              </button>
            </div>
          </div>
        </div>
      </SubjectsPageShell>
    );
  }

  if (!hasProfile) {
    return (
      <SubjectsPageShell
        title="Finish setup to unlock lessons."
        subtitle="A quick profile helps Kindling pace topics to your level."
      >
        <div className="subj-panel subj-panel--empty">
          <div className="subj-empty">
            <div className="subj-empty-icon" aria-hidden>
              <Sparkles size={28} />
            </div>
            <h3>Profile required</h3>
            <p>Set up your learning profile, then your path appears here.</p>
            <button
              type="button"
              className="new-subj-btn"
              onClick={onOpenOnboarding}
            >
              Complete your profile
            </button>
          </div>
        </div>
      </SubjectsPageShell>
    );
  }

  const headerAction = ALLOW_CUSTOM_SUBJECTS ? (
    <button
      type="button"
      className="new-subj-btn"
      onClick={() => setModalOpen(true)}
      disabled={busy}
      title="Add a new subject"
    >
      <Plus size={16} aria-hidden /> New subject
    </button>
  ) : (
    <div className="subj-head-badge" title="More subjects unlock later">
      <Layers size={14} aria-hidden />
      <span>{SOLE_SUBJECT_NAME} only</span>
    </div>
  );

  return (
    <section id="subjects" className="subjects-page">
      <div className="subj-wrap">
        <header className="subj-head">
          <div className="subj-head-copy">
            <p className="eyebrow">Your path</p>
            <h2>
              {ALLOW_CUSTOM_SUBJECTS
                ? studentName === "you"
                  ? "What do you want to learn?"
                  : `What does ${studentName} want to learn?`
                : studentName === "you"
                  ? "Your Computer Science path"
                  : `${studentName}'s Computer Science path`}
            </h2>
            <p>
              {ALLOW_CUSTOM_SUBJECTS
                ? `Subjects and topics Kindling can teach${
                    student?.curriculum
                      ? ` — aligned to ${student.curriculum}.`
                      : " — aligned to your goals and interests."
                  }`
                : `From digital literacy to programming and systems — pick a topic, open a lesson, and Kindling tutors you through it.`}
            </p>
            {!loading && subjectCount > 0 ? (
              <div className="subj-stat-row" aria-label="Path summary">
                <span className="subj-stat">
                  <strong>{subjectCount}</strong> subject
                  {subjectCount === 1 ? "" : "s"}
                </span>
                <span className="subj-stat-dot" aria-hidden />
                <span className="subj-stat">
                  <strong>{topicCount}</strong> topic
                  {topicCount === 1 ? "" : "s"}
                </span>
                <span className="subj-stat-dot" aria-hidden />
                <span className="subj-stat">
                  <strong>{lessonCount}</strong> lesson
                  {lessonCount === 1 ? "" : "s"}
                </span>
              </div>
            ) : null}
          </div>
          {headerAction}
        </header>

        <div className="subj-stack">
          <ContinueStrip
            studentId={studentId}
            onContinue={onStartLesson}
            variant="panel"
          />

          <ReviewSparkCard
            compact
            variant="panel"
            items={reviewItems}
            loading={reviewLoading}
            onRefresh={refreshReviews}
            onStartReview={(item) => {
              onStartLesson?.(
                item.subject || SOLE_SUBJECT_NAME,
                item.topic || item.shortLabel,
                {
                  reviewMode: true,
                  reviewSkill: item.skillSlug,
                  reviewSkillLabel: item.shortLabel || item.skillName,
                  reviewId: item.id,
                }
              );
            }}
          />

          {displayError ? (
            <div className="subj-panel subj-panel--error" role="alert">
              <AlertCircle size={16} aria-hidden />
              <p>{displayError}</p>
            </div>
          ) : null}

          <section
            className="subj-panel subj-panel--library"
            aria-labelledby="subj-library-title"
          >
            <div className="subj-panel-head">
              <span className="subj-panel-icon" aria-hidden>
                <Library size={16} />
              </span>
              <div className="subj-panel-head-copy">
                <p className="eyebrow">Curriculum</p>
                <h3 id="subj-library-title">
                  {ALLOW_CUSTOM_SUBJECTS ? "Your subjects" : SOLE_SUBJECT_NAME}
                </h3>
                <p className="subj-panel-meta">
                  {loading
                    ? "Loading your path…"
                    : subjectCount === 0
                      ? ALLOW_CUSTOM_SUBJECTS
                        ? "None yet — create your first subject"
                        : "Preparing your path…"
                      : ALLOW_CUSTOM_SUBJECTS
                        ? `${topicCount} topics · ${lessonCount} lessons`
                        : `${topicCount} topics · open one unit at a time`}
                </p>
              </div>
            </div>

            <div className="subj-panel-body">
              {loading ? (
                <div className="subj-empty subj-empty--inline">
                  <Loader2 size={22} className="spin" aria-hidden />
                  <p>Loading your subjects…</p>
                </div>
              ) : subjects.length === 0 ? (
                <div className="subj-empty subj-empty--inline">
                  <div className="subj-empty-icon" aria-hidden>
                    <BookOpen size={26} />
                  </div>
                  <h3>
                    {ALLOW_CUSTOM_SUBJECTS
                      ? "No subjects yet"
                      : `${SOLE_SUBJECT_NAME} is loading…`}
                  </h3>
                  <p>
                    {ALLOW_CUSTOM_SUBJECTS
                      ? "Create your first subject — then add topics to start lessons."
                      : `Refresh in a moment — Kindling adds your ${SOLE_SUBJECT_NAME} path automatically.`}
                  </p>
                  {ALLOW_CUSTOM_SUBJECTS ? (
                    <button
                      type="button"
                      className="new-subj-btn"
                      onClick={() => setModalOpen(true)}
                      disabled={busy}
                    >
                      <Plus size={16} aria-hidden /> New subject
                    </button>
                  ) : null}
                </div>
              ) : (
                <div
                  className={`my-subject-grid${
                    subjects.length === 1 ? " single" : ""
                  }`}
                >
                  {subjects.map((s) => {
                    const Icon = ICON_MAP[s.icon] || BookOpen;
                    const topics = s.topics || [];
                    const draft = getDraft(s.id);
                    const expanded =
                      draft.expanded || Boolean(draft.name?.trim());
                    const canAdd =
                      Boolean((draft.name || "").trim()) && !busy;
                    const lessons = countLessons(topics);
                    const resumeAny = topics.some((t) =>
                      unitLeaves(t).some((leaf) =>
                        canContinue(s.name, leaf.name)
                      )
                    );

                    return (
                      <article
                        className={`my-subject-card${
                          subjects.length === 1 ? " featured" : ""
                        }`}
                        key={s.id}
                      >
                        <div className="my-subject-top">
                          <div className="my-subject-id">
                            <div
                              className="my-subject-icon"
                              style={{ background: s.color || "#E8F1FB" }}
                            >
                              <Icon
                                size={20}
                                color="#1F3A34"
                                strokeWidth={1.7}
                                aria-hidden
                              />
                            </div>
                            <div className="my-subject-titles">
                              <h3>{s.name}</h3>
                              <p className="cnt">
                                {topics.length} topic
                                {topics.length === 1 ? "" : "s"}
                                {lessons
                                  ? ` · ${lessons} lesson${
                                      lessons === 1 ? "" : "s"
                                    }`
                                  : ""}
                              </p>
                              {s.learningGoal ? (
                                <p
                                  className="my-subject-goal"
                                  title={s.learningGoal}
                                >
                                  {s.learningGoal}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="my-subject-top-actions">
                            {resumeAny ? (
                              <span className="subj-resume-pill">
                                In progress
                              </span>
                            ) : null}
                            {ALLOW_CUSTOM_SUBJECTS ? (
                              <button
                                type="button"
                                className="icon-x"
                                aria-label={`Delete ${s.name}`}
                                disabled={busy}
                                onClick={() => handleDeleteSubject(s.id)}
                              >
                                <X size={15} aria-hidden />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="topic-list unit-list">
                          {topics.length === 0 && (
                            <p className="topic-empty">
                              No topics yet
                              {ALLOW_CUSTOM_SUBJECTS
                                ? " — add one below."
                                : "."}
                            </p>
                          )}
                          {topics.map((t, unitIdx) => {
                            const leaves = unitLeaves(t);
                            const unitKey = String(t.id || t.name);
                            const open = isUnitOpen(s.id, unitKey);
                            const firstLeaf = leaves[0];
                            const resumeLeaves = leaves.filter((leaf) =>
                              canContinue(s.name, leaf.name)
                            );
                            const resumeUnit = resumeLeaves.length > 0;
                            const startLeaf = resumeLeaves[0] || firstLeaf;

                            return (
                              <div
                                className={`unit-block${open ? " is-open" : ""}${
                                  resumeUnit ? " has-resume" : ""
                                }`}
                                key={unitKey}
                              >
                                <div className="unit-block-head">
                                  <button
                                    type="button"
                                    className="unit-block-toggle"
                                    aria-expanded={open}
                                    onClick={() => toggleUnit(s.id, unitKey)}
                                  >
                                    <span className="unit-index" aria-hidden>
                                      {String(unitIdx + 1).padStart(2, "0")}
                                    </span>
                                    <span className="unit-block-copy">
                                      <span className="tname unit-name">
                                        {t.name}
                                      </span>
                                      <span className="unit-meta-line">
                                        <span className="unit-lesson-count">
                                          {leaves.length} lesson
                                          {leaves.length === 1 ? "" : "s"}
                                        </span>
                                        {resumeUnit ? (
                                          <span className="unit-resume-hint">
                                            · {resumeLeaves.length} to continue
                                          </span>
                                        ) : null}
                                      </span>
                                      {t.learningGoal ? (
                                        <span
                                          className="topic-goal-preview"
                                          title={t.learningGoal}
                                        >
                                          {t.learningGoal}
                                        </span>
                                      ) : null}
                                    </span>
                                    <ChevronDown
                                      size={18}
                                      className="unit-chevron"
                                      aria-hidden
                                    />
                                  </button>
                                  <div className="topic-actions unit-head-actions">
                                    {startLeaf && (
                                      <button
                                        type="button"
                                        className={`start-chip-btn${
                                          resumeUnit ? " continue" : ""
                                        }`}
                                        onClick={() =>
                                          onStartLesson(
                                            s.name,
                                            startLeaf.name,
                                            { unit: t.name }
                                          )
                                        }
                                      >
                                        {resumeUnit ? (
                                          <>
                                            <Play size={12} aria-hidden />{" "}
                                            Continue
                                          </>
                                        ) : (
                                          <>
                                            Start
                                            <ArrowRight size={12} aria-hidden />
                                          </>
                                        )}
                                      </button>
                                    )}
                                    {ALLOW_CUSTOM_SUBJECTS ? (
                                      <button
                                        type="button"
                                        className="icon-x"
                                        aria-label={`Remove ${t.name}`}
                                        disabled={busy}
                                        onClick={() =>
                                          handleDeleteTopic(s.id, t.id)
                                        }
                                      >
                                        <X size={13} aria-hidden />
                                      </button>
                                    ) : null}
                                  </div>
                                </div>

                                {open ? (
                                  <ul className="subtopic-chip-list">
                                    {leaves.map((leaf, leafIdx) => {
                                      const resume = canContinue(
                                        s.name,
                                        leaf.name
                                      );
                                      const fam =
                                        leaf.familiarity || DEFAULT_FAMILIARITY;
                                      return (
                                        <li
                                          className={`topic-chip subtopic-chip${
                                            resume ? " is-resume" : ""
                                          }`}
                                          key={leaf.id || leaf.name}
                                        >
                                          <span
                                            className="subtopic-idx"
                                            aria-hidden
                                          >
                                            {leafIdx + 1}
                                          </span>
                                          <div className="topic-chip-main">
                                            <span className="tname">
                                              {leaf.name}
                                            </span>
                                            <div className="topic-meta-row">
                                              <span
                                                className="topic-fam-badge"
                                                title={familiarityLabel(fam)}
                                              >
                                                {familiarityLabel(fam)}
                                              </span>
                                              {resume ? (
                                                <span className="topic-resume-badge">
                                                  Resume
                                                </span>
                                              ) : null}
                                            </div>
                                          </div>
                                          <div className="topic-actions">
                                            <button
                                              type="button"
                                              className={`start-chip-btn${
                                                resume ? " continue" : ""
                                              }`}
                                              onClick={() =>
                                                onStartLesson(s.name, leaf.name, {
                                                  unit: t.name,
                                                })
                                              }
                                            >
                                              {resume ? "Continue" : "Open"}
                                              <ArrowRight
                                                size={12}
                                                aria-hidden
                                              />
                                            </button>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>

                        {ALLOW_CUSTOM_SUBJECTS ? (
                          <div
                            className={`add-topic-block${
                              expanded ? " expanded" : ""
                            }`}
                          >
                            <div className="add-topic-head">
                              <span className="add-topic-kicker">New topic</span>
                              {expanded ? (
                                <button
                                  type="button"
                                  className="add-topic-collapse"
                                  disabled={busy}
                                  onClick={() =>
                                    setDrafts((d) => {
                                      const next = { ...d };
                                      delete next[s.id];
                                      return next;
                                    })
                                  }
                                >
                                  Cancel
                                </button>
                              ) : null}
                            </div>
                            <div className="add-topic-row">
                              <input
                                placeholder="Name a topic to learn next…"
                                value={draft.name || ""}
                                disabled={busy}
                                aria-label={`New topic in ${s.name}`}
                                onChange={(e) =>
                                  patchDraft(s.id, {
                                    name: e.target.value,
                                    expanded: true,
                                  })
                                }
                                onFocus={() =>
                                  patchDraft(s.id, { expanded: true })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    submitTopic(s.id);
                                  }
                                }}
                              />
                            </div>
                            {expanded ? (
                              <div className="add-topic-intent">
                                <TopicIntentFields
                                  compact
                                  disabled={busy}
                                  familiarity={
                                    draft.familiarity || DEFAULT_FAMILIARITY
                                  }
                                  onFamiliarityChange={(id) =>
                                    patchDraft(s.id, { familiarity: id })
                                  }
                                  learningGoal={draft.learningGoal || ""}
                                  onLearningGoalChange={(v) =>
                                    patchDraft(s.id, { learningGoal: v })
                                  }
                                  goalPlaceholder="What should Kindling focus on in this topic?"
                                />
                                <div className="add-topic-actions">
                                  <button
                                    type="button"
                                    className="btn-primary add-topic-submit"
                                    disabled={!canAdd}
                                    onClick={() => submitTopic(s.id)}
                                  >
                                    <Plus size={15} aria-hidden />
                                    Add topic
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <details
            className="subj-panel subj-panel--tools"
            open={toolsOpen}
            onToggle={(e) => setToolsOpen(e.currentTarget.open)}
          >
            <summary className="subj-panel-summary">
              <span className="subj-panel-icon" aria-hidden>
                <Search size={16} />
              </span>
              <span className="subj-panel-summary-text">
                <span className="eyebrow">Tools</span>
                <strong>Search lesson history</strong>
              </span>
              <span className="subj-panel-chevron" aria-hidden />
            </summary>
            <div className="subj-panel-body">
              <TranscriptSearch
                studentId={studentId}
                onOpenLesson={onStartLesson}
                embedded
              />
            </div>
          </details>
        </div>
      </div>

      {ALLOW_CUSTOM_SUBJECTS && modalOpen && (
        <NewSubjectModal
          onClose={() => !busy && setModalOpen(false)}
          onCreate={handleCreate}
          saving={busy}
        />
      )}
    </section>
  );
}
