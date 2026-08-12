import { useState, useEffect } from "react";
import { Plus, X, ArrowRight, BookOpen, Loader2, LogIn, Sparkles } from "lucide-react";
import { ICON_MAP } from "../../constants/icons";
import { listContinuableAsync } from "../../services/learning";
import NewSubjectModal from "./NewSubjectModal";
import ContinueStrip from "./ContinueStrip";
import TranscriptSearch from "./TranscriptSearch";

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
  const [drafts, setDrafts] = useState({});
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [continueKeys, setContinueKeys] = useState(() => new Set());

  const studentName = student?.name?.trim() || "you";
  const hasProfile = Boolean(student?.id || student?.isOnboarded);
  const displayError = actionError || error;
  const studentId =
    student?.id != null
      ? `id_${student.id}`
      : student?.name?.toLowerCase().replace(/\s+/g, "_") || "anonymous";

  useEffect(() => {
    if (!isLoggedIn || !hasProfile) {
      setContinueKeys(new Set());
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const items = await listContinuableAsync(studentId, { limit: 40 });
        if (cancelled) return;
        const keys = new Set(
          (items || []).map(
            (i) => `${(i.subject || "").toLowerCase()}::${(i.topic || "").toLowerCase()}`
          )
        );
        setContinueKeys(keys);
      } catch {
        if (!cancelled) setContinueKeys(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, hasProfile, studentId, subjects]);

  const canContinue = (subjectName, topicName) =>
    continueKeys.has(
      `${(subjectName || "").toLowerCase()}::${(topicName || "").toLowerCase()}`
    );

  const setDraft = (subjId, val) =>
    setDrafts((d) => ({ ...d, [subjId]: val }));

  const submitTopic = async (subjId) => {
    const val = (drafts[subjId] || "").trim();
    if (!val || busy) return;
    setActionError("");
    setBusy(true);
    try {
      await onAddTopic(subjId, val);
      setDraft(subjId, "");
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

  // Not signed in
  if (!isLoggedIn) {
    return (
      <section id="subjects">
        <div className="subj-wrap">
          <div className="subj-head">
            <div>
              <p className="eyebrow">Your subjects</p>
              <h2>Build a curriculum around your interests.</h2>
              <p>
                Create subjects and topics that match what you want to learn —
                then start AI lessons on them.
              </p>
            </div>
          </div>
          <div className="subj-empty">
            <h3>Sign in to manage your subjects</h3>
            <p>
              Your subjects belong to your student account. Get started or log
              in to create them.
            </p>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <button className="new-subj-btn" onClick={onGetStarted}>
                <Sparkles size={16} /> Get started
              </button>
              <button
                className="btn-ghost"
                style={{ padding: "10px 16px" }}
                onClick={onOpenLogin}
              >
                <LogIn size={15} style={{ marginRight: 6 }} /> Log in
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Logged in but no profile yet
  if (!hasProfile) {
    return (
      <section id="subjects">
        <div className="subj-wrap">
          <div className="subj-head">
            <div>
              <p className="eyebrow">Your subjects</p>
              <h2>Finish setup to add subjects.</h2>
              <p>
                Complete your student profile first, then you can build subjects
                tailored to your interests.
              </p>
            </div>
          </div>
          <div className="subj-empty">
            <h3>Profile required</h3>
            <p>Set up your learning profile to start creating subjects.</p>
            <button className="new-subj-btn" onClick={onOpenOnboarding}>
              Complete your profile
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="subjects">
      <div className="subj-wrap">
        <div className="subj-head">
          <div>
            <p className="eyebrow">Your subjects</p>
            <h2>
              {studentName === "you"
                ? "Build the curriculum you actually need."
                : `Build the curriculum ${studentName} actually needs.`}
            </h2>
            <p>
              Create a subject, then add topics you want Kindling to teach —
              aligned to {student?.curriculum || "your goals and interests"}.
            </p>
          </div>
          <button
            className="new-subj-btn"
            onClick={() => setModalOpen(true)}
            disabled={busy}
          >
            <Plus size={16} /> New subject
          </button>
        </div>

        <ContinueStrip studentId={studentId} onContinue={onStartLesson} />

        <TranscriptSearch studentId={studentId} onOpenLesson={onStartLesson} />

        {displayError && (
          <div
            style={{
              color: "var(--berry)",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            {displayError}
          </div>
        )}

        {loading ? (
          <div className="subj-empty">
            <Loader2
              size={22}
              style={{ margin: "0 auto 10px", animation: "spin 1s linear infinite" }}
            />
            <p>Loading your subjects…</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="subj-empty">
            <h3>No subjects yet</h3>
            <p>
              Create your first subject — Math, Biology, Coding, anything that
              matches your interests — then add topics to start lessons.
            </p>
            <button
              className="new-subj-btn"
              style={{ margin: "0 auto" }}
              onClick={() => setModalOpen(true)}
              disabled={busy}
            >
              <Plus size={16} /> New subject
            </button>
          </div>
        ) : (
          <div className="my-subject-grid">
            {subjects.map((s) => {
              const Icon = ICON_MAP[s.icon] || BookOpen;
              const topics = s.topics || [];
              return (
                <div className="my-subject-card" key={s.id}>
                  <div className="my-subject-top">
                    <div className="my-subject-id">
                      <div
                        className="my-subject-icon"
                        style={{ background: s.color }}
                      >
                        <Icon size={19} color="#1F3A34" strokeWidth={1.7} />
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
                      className="icon-x"
                      aria-label={`Delete ${s.name}`}
                      disabled={busy}
                      onClick={() => handleDeleteSubject(s.id)}
                    >
                      <X size={15} />
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
                      return (
                      <div className="topic-chip" key={t.id}>
                        <span className="tname">{t.name}</span>
                        <div className="topic-actions">
                          <button
                            className={`start-chip-btn${resume ? " continue" : ""}`}
                            onClick={() => onStartLesson(s.name, t.name)}
                          >
                            {resume ? "Continue" : "Start"}{" "}
                            <ArrowRight size={12} />
                          </button>
                          <button
                            className="icon-x"
                            aria-label={`Remove ${t.name}`}
                            disabled={busy}
                            onClick={() => handleDeleteTopic(s.id, t.id)}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  <div className="add-topic-row">
                    <input
                      placeholder="Add a topic…"
                      value={drafts[s.id] || ""}
                      disabled={busy}
                      onChange={(e) => setDraft(s.id, e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && submitTopic(s.id)
                      }
                    />
                    <button
                      aria-label="Add topic"
                      disabled={busy}
                      onClick={() => submitTopic(s.id)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
