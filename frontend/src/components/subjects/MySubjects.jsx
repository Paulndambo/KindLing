import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { ICON_MAP } from "../../constants/icons";
import {
  DEFAULT_FAMILIARITY,
  familiarityLabel,
} from "../../constants/familiarity";
import { listContinuableAsync, loadReviewSparks } from "../../services/learning";
import NewSubjectModal from "./NewSubjectModal";
import TopicIntentFields from "./TopicIntentFields";
import ContinueStrip from "./ContinueStrip";
import TranscriptSearch from "./TranscriptSearch";
import ReviewSparkCard from "../dashboard/ReviewSparkCard";

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
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [continueKeys, setContinueKeys] = useState(() => new Set());
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);

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

  const canContinue = (subjectName, topicName) =>
    continueKeys.has(
      `${(subjectName || "").toLowerCase()}::${(topicName || "").toLowerCase()}`
    );

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
        title="Build a curriculum around your interests."
        subtitle="Create subjects and topics that match what you want to learn — then start AI lessons on them."
      >
        <div className="subj-panel subj-panel--empty">
          <div className="subj-empty">
            <h3>Sign in to manage your subjects</h3>
            <p>
              Your subjects belong to your student account. Get started or log
              in to create them.
            </p>
            <div className="subj-empty-actions">
              <button type="button" className="new-subj-btn" onClick={onGetStarted}>
                <Sparkles size={16} aria-hidden /> Get started
              </button>
              <button type="button" className="btn-ghost subj-empty-secondary" onClick={onOpenLogin}>
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
        title="Finish setup to add subjects."
        subtitle="Complete your student profile first, then you can build subjects tailored to your interests."
      >
        <div className="subj-panel subj-panel--empty">
          <div className="subj-empty">
            <h3>Profile required</h3>
            <p>Set up your learning profile to start creating subjects.</p>
            <button type="button" className="new-subj-btn" onClick={onOpenOnboarding}>
              Complete your profile
            </button>
          </div>
        </div>
      </SubjectsPageShell>
    );
  }

  return (
    <section id="subjects" className="subjects-page">
      <div className="subj-wrap">
        <header className="subj-head">
          <div className="subj-head-copy">
            <p className="eyebrow">Your subjects</p>
            <h2>
              {studentName === "you"
                ? "What do you want to learn?"
                : `What does ${studentName} want to learn?`}
            </h2>
            <p>
              Subjects and topics Kindling can teach
              {student?.curriculum
                ? ` — aligned to ${student.curriculum}.`
                : " — aligned to your goals and interests."}
            </p>
          </div>
          <button
            type="button"
            className="new-subj-btn"
            onClick={() => setModalOpen(true)}
            disabled={busy}
          >
            <Plus size={16} aria-hidden /> New subject
          </button>
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
                item.subject || "Math Foundations",
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

          <details className="subj-panel subj-panel--tools">
            <summary className="subj-panel-summary">
              <span className="subj-panel-icon" aria-hidden>
                <BookOpen size={16} />
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
                <h3 id="subj-library-title">Your subjects</h3>
                <p className="subj-panel-meta">
                  {loading
                    ? "Loading…"
                    : subjectCount === 0
                      ? "None yet — create your first subject"
                      : `${subjectCount} subject${subjectCount === 1 ? "" : "s"} · ${topicCount} topic${topicCount === 1 ? "" : "s"}`}
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
                  <h3>No subjects yet</h3>
                  <p>
                    Create your first subject — Math, Biology, Coding, anything
                    you care about — then add topics to start lessons.
                  </p>
                  <button
                    type="button"
                    className="new-subj-btn"
                    onClick={() => setModalOpen(true)}
                    disabled={busy}
                  >
                    <Plus size={16} aria-hidden /> New subject
                  </button>
                </div>
              ) : (
                <div className="my-subject-grid">
                  {subjects.map((s) => {
                    const Icon = ICON_MAP[s.icon] || BookOpen;
                    const topics = s.topics || [];
                    const draft = getDraft(s.id);
                    const expanded =
                      draft.expanded || Boolean(draft.name?.trim());
                    const canAdd =
                      Boolean((draft.name || "").trim()) && !busy;

                    return (
                      <article className="my-subject-card" key={s.id}>
                        <div className="my-subject-top">
                          <div className="my-subject-id">
                            <div
                              className="my-subject-icon"
                              style={{ background: s.color }}
                            >
                              <Icon
                                size={19}
                                color="#1F3A34"
                                strokeWidth={1.7}
                                aria-hidden
                              />
                            </div>
                            <div>
                              <h3>{s.name}</h3>
                              <p className="cnt">
                                {topics.length}{" "}
                                {topics.length === 1 ? "topic" : "topics"}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="icon-x"
                            aria-label={`Delete ${s.name}`}
                            disabled={busy}
                            onClick={() => handleDeleteSubject(s.id)}
                          >
                            <X size={15} aria-hidden />
                          </button>
                        </div>

                        <div className="topic-list">
                          {topics.length === 0 && (
                            <p className="topic-empty">
                              No topics yet — add one below.
                            </p>
                          )}
                          {topics.map((t) => {
                            const resume = canContinue(s.name, t.name);
                            const fam = t.familiarity || DEFAULT_FAMILIARITY;
                            return (
                              <div className="topic-chip" key={t.id}>
                                <div className="topic-chip-main">
                                  <span className="tname">{t.name}</span>
                                  <div className="topic-meta-row">
                                    <span
                                      className="topic-fam-badge"
                                      title={familiarityLabel(fam)}
                                    >
                                      {familiarityLabel(fam)}
                                    </span>
                                    {t.learningGoal ? (
                                      <span
                                        className="topic-goal-preview"
                                        title={t.learningGoal}
                                      >
                                        {t.learningGoal}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="topic-actions">
                                  <button
                                    type="button"
                                    className={`start-chip-btn${resume ? " continue" : ""}`}
                                    onClick={() =>
                                      onStartLesson(s.name, t.name)
                                    }
                                  >
                                    {resume ? "Continue" : "Start"}
                                    <ArrowRight size={12} aria-hidden />
                                  </button>
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
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div
                          className={`add-topic-block${expanded ? " expanded" : ""}`}
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
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {modalOpen && (
        <NewSubjectModal
          onClose={() => !busy && setModalOpen(false)}
          onCreate={handleCreate}
          saving={busy}
        />
      )}
    </section>
  );
}
