import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  HelpCircle,
  LayoutGrid,
  List,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { generateText } from "../../services/ai";
import {
  createAssessment,
  listAssessments,
  listSubjects,
  updateAssessment,
} from "../../services/api";
import {
  buildRevisionContext,
  generateCustomAssessment,
  gradeCustomAssessment,
} from "../../services/learning/customAssessment";
import "../../styles/assessments.css";

const QUESTION_TYPES = [
  {
    id: "multiple_choice",
    label: "Multiple choice",
    detail: "Choose the best answer from 4 structured choices.",
    badge: "Fast & focused",
  },
  {
    id: "open_ended",
    label: "Open ended",
    detail: "Explain your reasoning and show your working in your own words.",
    badge: "Deep thinking",
  },
  {
    id: "hybrid",
    label: "Hybrid mix",
    detail: "A balanced blend of multiple-choice and open-ended prompts.",
    badge: "Recommended",
  },
];

const COUNT_PRESETS = ["5", "8", "10", "12", "15"];

function formatTypeLabel(type) {
  if (type === "multiple_choice") return "Multiple choice";
  if (type === "open_ended") return "Open ended";
  return "Hybrid mix";
}

function formatDateShort(iso) {
  if (!iso) return "Just now";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getScoreTone(score) {
  if (score == null) return "neutral";
  if (score >= 80) return "strong";
  if (score >= 55) return "building";
  return "focus";
}

function getAnsweredCount(questions = [], answers = {}) {
  return questions.reduce((total, question) => {
    const answer = answers?.[question.id];
    const has =
      question.type === "multiple_choice"
        ? answer !== undefined && answer !== null && answer !== ""
        : Boolean(String(answer || "").trim());
    return total + (has ? 1 : 0);
  }, 0);
}

export default function AssessmentsCenter({
  student,
  subjects: propSubjects = [],
}) {
  const [fetchedSubjects, setFetchedSubjects] = useState([]);
  const subjects = propSubjects?.length ? propSubjects : fetchedSubjects;
  const [modePreference, setModePreference] = useState(null); // null | 'curriculum' | 'custom'
  const mode =
    modePreference || (subjects.length > 0 ? "curriculum" : "custom");
  const setMode = setModePreference;
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [subtopicId, setSubtopicId] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState("5");
  const [questionType, setQuestionType] = useState("hybrid");

  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [grade, setGrade] = useState(null);
  // 'list' | 'setup' | 'generating' | 'active' | 'grading' | 'review'
  const [phase, setPhase] = useState("list");
  const [error, setError] = useState("");
  const [chat, setChat] = useState([]);
  const [draft, setDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

  const [savedAssessments, setSavedAssessments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [historyRefresh, setHistoryRefresh] = useState(0);

  // Library controls
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'completed'
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all"); // 'all' | 'needs_review' | 'correct'

  useEffect(() => {
    if (propSubjects?.length) return undefined;
    let active = true;
    listSubjects()
      .then((rows) => {
        if (active && Array.isArray(rows)) setFetchedSubjects(rows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [propSubjects]);

  useEffect(() => {
    let active = true;
    listAssessments()
      .then((rows) => {
        if (active) {
          setSavedAssessments(Array.isArray(rows) ? rows : []);
          setHistoryError("");
        }
      })
      .catch((cause) => {
        if (active) {
          setHistoryError(
            cause instanceof Error
              ? cause.message
              : "Saved assessments could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, [historyRefresh]);

  useEffect(() => {
    if (phase !== "active" || !assessment?.id) return undefined;
    const timer = window.setTimeout(() => {
      updateAssessment(assessment.id, { answers })
        .then((saved) => {
          setSavedAssessments((current) =>
            current.map((item) => (item.id === saved.id ? saved : item)),
          );
        })
        .catch((cause) =>
          setError(
            cause instanceof Error
              ? cause.message
              : "Your answers could not be saved.",
          ),
        );
    }, 700);
    return () => window.clearTimeout(timer);
  }, [answers, assessment?.id, phase]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => String(s.id) === String(subjectId)) || null,
    [subjects, subjectId],
  );
  const availableTopics = useMemo(
    () => selectedSubject?.topics || [],
    [selectedSubject],
  );
  const selectedTopic = useMemo(
    () => availableTopics.find((t) => String(t.id) === String(topicId)) || null,
    [availableTopics, topicId],
  );
  const availableSubtopics = useMemo(
    () => selectedTopic?.subtopics || [],
    [selectedTopic],
  );
  const selectedSubtopic = useMemo(
    () =>
      availableSubtopics.find((st) => String(st.id) === String(subtopicId)) ||
      null,
    [availableSubtopics, subtopicId],
  );

  const answeredCount = useMemo(
    () => getAnsweredCount(assessment?.questions || [], answers),
    [assessment, answers],
  );
  const validCount =
    /^\d+$/.test(count) && Number(count) >= 5 && Number(count) <= 15;

  const canGenerate = useMemo(() => {
    if (!validCount || phase === "generating") return false;
    if (mode === "curriculum" && subjects.length > 0) {
      return Boolean(selectedSubject && selectedTopic && selectedSubtopic);
    }
    return Boolean(topic.trim());
  }, [
    validCount,
    phase,
    mode,
    subjects.length,
    selectedSubject,
    selectedTopic,
    selectedSubtopic,
    topic,
  ]);

  // Stats for library view
  const libraryStats = useMemo(() => {
    const total = savedAssessments.length;
    const completed = savedAssessments.filter(
      (item) => item.status === "completed" && item.result,
    );
    const inProgress = savedAssessments.filter(
      (item) => item.status !== "completed",
    );
    const avgScore = completed.length
      ? Math.round(
          completed.reduce(
            (sum, item) => sum + Number(item.result?.score ?? 0),
            0,
          ) / completed.length,
        )
      : null;
    const totalQuestions = savedAssessments.reduce(
      (sum, item) => sum + (item.questions?.length || 0),
      0,
    );
    return {
      total,
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      avgScore,
      totalQuestions,
    };
  }, [savedAssessments]);

  const filteredAssessments = useMemo(() => {
    return savedAssessments.filter((item) => {
      if (statusFilter === "active" && item.status === "completed")
        return false;
      if (statusFilter === "completed" && item.status !== "completed")
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = [
          item.title,
          item.topic,
          item.subjectName,
          item.topicName,
          item.subtopicName,
          item.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [savedAssessments, statusFilter, searchQuery]);

  const openSetup = () => {
    setError("");
    setPhase("setup");
  };

  const backToLibrary = () => {
    setPhase("list");
    setAssessment(null);
    setGrade(null);
    setAnswers({});
    setChat([]);
    setError("");
    setReviewFilter("all");
  };

  const start = async (event) => {
    event.preventDefault();
    if (!canGenerate) return;
    setError("");
    setGrade(null);
    setChat([]);
    setAnswers({});
    setPhase("generating");

    const useCurriculum =
      mode === "curriculum" &&
      subjects.length > 0 &&
      selectedSubject &&
      selectedTopic &&
      selectedSubtopic;

    const topicContext = useCurriculum
      ? `${selectedSubject.name} → ${selectedTopic.name} → ${selectedSubtopic.name}`
      : topic.trim();

    const topicShort = useCurriculum ? selectedSubtopic.name : topic.trim();

    try {
      const generated = await generateCustomAssessment({
        topic: topicContext,
        description: description.trim(),
        count: Number(count),
        questionType,
        grade: student?.grade || "",
      });
      const payload = {
        ...generated,
        topic: topicShort,
        ...(useCurriculum
          ? {
              subjectId: selectedSubject.id,
              topicId: selectedTopic.id,
              subtopicId: selectedSubtopic.id,
              subjectName: selectedSubject.name,
              topicName: selectedTopic.name,
              subtopicName: selectedSubtopic.name,
            }
          : {}),
        status: "active",
        answers: {},
        result: null,
        revisionMessages: [],
      };
      const saved = await createAssessment(payload);
      const persisted = { ...generated, ...saved, id: saved.id };
      setAssessment(persisted);
      setSavedAssessments((current) => [
        saved,
        ...current.filter((x) => x.id !== saved.id),
      ]);
      setPhase("active");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Kindling could not create this assessment.",
      );
      setPhase("setup");
    }
  };

  const submit = async () => {
    if (
      !assessment ||
      answeredCount !== assessment.questions.length ||
      phase === "grading"
    )
      return;
    setError("");
    setPhase("grading");
    try {
      const result = await gradeCustomAssessment(
        { ...assessment, answers },
        answers,
      );
      const saved = await updateAssessment(assessment.id, {
        answers,
        result,
        status: "completed",
      });
      setSavedAssessments((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setGrade(result);
      setReviewFilter("all");
      setPhase("review");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Kindling could not score this assessment. Try again.",
      );
      setPhase("active");
    }
  };

  const sendRevisionMessage = async (textOverride) => {
    const message = (
      typeof textOverride === "string" ? textOverride : draft
    ).trim();
    if (!message || chatBusy || !assessment || !grade) return;
    const nextChat = [...chat, { role: "user", text: message }];
    setChat(nextChat);
    if (typeof textOverride !== "string") setDraft("");
    setChatBusy(true);
    setError("");
    try {
      const history = nextChat
        .map(
          ({ role, text }) =>
            `${role === "user" ? "Learner" : "Kindling"}: ${text}`,
        )
        .join("\n\n");
      const reply = await generateText(
        `${history}\n\nRespond to the learner's latest message.`,
        {
          task: "chat",
          system: buildRevisionContext({ ...assessment, answers }, grade),
        },
      );
      const response = {
        role: "model",
        text: String(
          reply || "Let's keep reviewing the ideas together.",
        ).trim(),
      };
      const transcript = [...nextChat, response];
      const saved = await updateAssessment(assessment.id, {
        revisionMessages: transcript,
      });
      setSavedAssessments((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setChat(transcript);
    } catch (cause) {
      setChat((current) => current.slice(0, -1));
      if (typeof textOverride !== "string") setDraft(message);
      setError(
        cause instanceof Error
          ? cause.message
          : "Kindling could not reply. Please try again.",
      );
    } finally {
      setChatBusy(false);
    }
  };

  const openSavedAssessment = (saved) => {
    setAssessment({
      ...saved,
      questionType: saved.questionType,
      answers: saved.answers || {},
    });
    setAnswers(saved.answers || {});
    const savedGrade = saved.result || null;
    setGrade(savedGrade);
    setChat(
      Array.isArray(saved.revisionMessages) ? saved.revisionMessages : [],
    );
    setTopic(saved.topic || "");
    setDescription(saved.description || "");
    setQuestionType(saved.questionType || "hybrid");
    setCount(String(saved.questions?.length || 5));
    setError("");
    setReviewFilter("all");
    setPhase(saved.status === "completed" && savedGrade ? "review" : "active");
  };

  const scrollToQuestion = (id) => {
    const el = document.getElementById(`assess-q-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="assess-center">
      {/* Top context bar */}
      <div className="assess-topbar">
        <div className="assess-topbar-left">
          {phase !== "list" ? (
            <button
              type="button"
              className="btn-ghost assess-back-btn"
              onClick={backToLibrary}
            >
              <ArrowLeft size={16} />
              All assessments
            </button>
          ) : (
            <div className="assess-title-block">
              <span className="assess-title-icon" aria-hidden="true">
                <ClipboardCheck size={22} />
              </span>
              <div>
                <p className="eyebrow">
                  ASSESSMENTS · LEARN BY SHOWING WHAT YOU KNOW
                </p>
                <h2>
                  {phase === "list"
                    ? "Your assessments"
                    : phase === "setup" || phase === "generating"
                      ? "Build a New Assessment"
                      : phase === "review"
                        ? assessment?.title || "Assessment Review"
                        : assessment?.title || "Active Assessment"}
                </h2>
              </div>
            </div>
          )}
        </div>

        <div className="assess-topbar-actions">
          {phase === "list" && (
            <button
              type="button"
              className="btn-primary assess-new-cta"
              onClick={openSetup}
            >
              <Plus size={17} />
              New assessment
            </button>
          )}
          {(phase === "active" || phase === "review") && (
            <button
              type="button"
              className="btn-primary assess-new-cta"
              onClick={openSetup}
            >
              <Plus size={16} />
              New assessment
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="assess-error" role="alert">
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      {/* ====================================================================
          PHASE 1: LIBRARY (CARDS OR TABLE OF EXISTING ASSESSMENTS)
          ==================================================================== */}
      {phase === "list" && (
        <div className="assess-library">
          {/* Summary KPI strip */}
          <div className="assess-kpi-grid">
            <div className="assess-kpi-card tone-teal">
              <div className="assess-kpi-top">
                <span className="eyebrow">Total assessments</span>
                <span className="assess-kpi-icon">
                  <ClipboardCheck size={17} />
                </span>
              </div>
              <div className="assess-kpi-val">{libraryStats.total}</div>
              <p className="assess-kpi-cap">
                {libraryStats.totalQuestions} total questions generated
              </p>
            </div>

            <div className="assess-kpi-card tone-pine">
              <div className="assess-kpi-top">
                <span className="eyebrow">Completed</span>
                <span className="assess-kpi-icon">
                  <CheckCircle2 size={17} />
                </span>
              </div>
              <div className="assess-kpi-val">
                {libraryStats.completedCount}
              </div>
              <p className="assess-kpi-cap">
                Scored with full question-by-question review
              </p>
            </div>

            <div className="assess-kpi-card tone-marigold">
              <div className="assess-kpi-top">
                <span className="eyebrow">In progress</span>
                <span className="assess-kpi-icon">
                  <Clock size={17} />
                </span>
              </div>
              <div className="assess-kpi-val">
                {libraryStats.inProgressCount}
              </div>
              <p className="assess-kpi-cap">
                Saved automatically — pick up anytime
              </p>
            </div>

            <div className="assess-kpi-card tone-violet">
              <div className="assess-kpi-top">
                <span className="eyebrow">Average score</span>
                <span className="assess-kpi-icon">
                  <Award size={17} />
                </span>
              </div>
              <div className="assess-kpi-val">
                {libraryStats.avgScore != null
                  ? `${libraryStats.avgScore}%`
                  : "—"}
              </div>
              <p className="assess-kpi-cap">
                {libraryStats.completedCount
                  ? `Across ${libraryStats.completedCount} completed check-in${
                      libraryStats.completedCount === 1 ? "" : "s"
                    }`
                  : "Complete an assessment to see your average"}
              </p>
            </div>
          </div>

          {/* Filter & View Bar */}
          <div className="assess-toolbar panel">
            <div
              className="assess-filter-pills"
              role="tablist"
              aria-label="Filter assessments"
            >
              {[
                { id: "all", label: `All (${libraryStats.total})` },
                {
                  id: "active",
                  label: `In progress (${libraryStats.inProgressCount})`,
                },
                {
                  id: "completed",
                  label: `Completed (${libraryStats.completedCount})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === tab.id}
                  className={`assess-filter-pill${
                    statusFilter === tab.id ? " active" : ""
                  }`}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="assess-toolbar-right">
              <label className="assess-search">
                <Search size={15} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search topic or subject…"
                  aria-label="Search assessments"
                />
              </label>

              <div
                className="assess-view-toggle"
                role="group"
                aria-label="Layout view"
              >
                <button
                  type="button"
                  className={viewMode === "cards" ? "active" : ""}
                  onClick={() => setViewMode("cards")}
                  title="Card grid view"
                  aria-label="Cards view"
                  aria-pressed={viewMode === "cards"}
                >
                  <LayoutGrid size={15} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  className={viewMode === "table" ? "active" : ""}
                  onClick={() => setViewMode("table")}
                  title="Table view"
                  aria-label="Table view"
                  aria-pressed={viewMode === "table"}
                >
                  <List size={15} />
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          {historyError ? (
            <div className="assess-error" role="alert">
              <XCircle size={17} />
              <span>
                <strong>We couldn’t load your assessment library.</strong>{" "}
                {historyError}
              </span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setLoadingHistory(true);
                  setHistoryError("");
                  setHistoryRefresh((value) => value + 1);
                }}
              >
                Try again
              </button>
            </div>
          ) : null}

          {loadingHistory ? (
            <div className="assess-empty-panel panel">
              <Loader2 size={24} className="spin" />
              <strong>Loading your assessments…</strong>
              <p>Fetching your saved practice sessions and scores.</p>
            </div>
          ) : historyError &&
            !savedAssessments.length ? null : filteredAssessments.length ===
            0 ? (
            <div className="assess-empty-panel panel">
              <div className="assess-empty-illustration">
                <Sparkles size={26} />
              </div>
              <h3>
                {savedAssessments.length === 0
                  ? "No assessments created yet"
                  : "No assessments match your filter"}
              </h3>
              <p>
                {savedAssessments.length === 0
                  ? "Create your first custom assessment on any subject or topic. Kindling will generate tailored questions, grade your work, and guide you through revision."
                  : "Try clearing your search query or switching the status filter above."}
              </p>
              <div className="assess-empty-actions">
                {savedAssessments.length === 0 ? (
                  <button
                    type="button"
                    className="btn-primary assess-new-cta"
                    onClick={openSetup}
                  >
                    <Plus size={17} />
                    Create your first assessment
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setStatusFilter("all");
                      setSearchQuery("");
                    }}
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === "cards" ? (
            <div className="assess-cards-grid">
              {/* Quick "Create New" action card right in the grid */}
              <button
                type="button"
                className="assess-create-tile"
                onClick={openSetup}
              >
                <span className="assess-create-tile-icon">
                  <Plus size={24} />
                </span>
                <strong>Create new assessment</strong>
                <p>
                  Pick a subject or custom topic, choose 5–15 questions, and
                  test your understanding.
                </p>
                <span className="assess-create-tile-cta">
                  Build now <ArrowRight size={15} />
                </span>
              </button>

              {filteredAssessments.map((saved) => {
                const isDone =
                  saved.status === "completed" && Boolean(saved.result);
                const qLen = saved.questions?.length || 0;
                const ansLen = getAnsweredCount(
                  saved.questions || [],
                  saved.answers || {},
                );
                const score = isDone ? Number(saved.result?.score ?? 0) : null;
                const scoreTone = getScoreTone(score);
                const pct = isDone
                  ? score
                  : qLen
                    ? Math.round((ansLen / qLen) * 100)
                    : 0;
                const pathText = saved.subjectName
                  ? [saved.subjectName, saved.topicName]
                      .filter(Boolean)
                      .join(" · ")
                  : "Custom topic";

                return (
                  <article
                    key={saved.id}
                    className={`assess-lib-card panel status-${
                      isDone ? "completed" : "active"
                    } tone-${scoreTone}`}
                    onClick={() => openSavedAssessment(saved)}
                  >
                    <div className="assess-lib-card-top">
                      <span
                        className={`assess-status-badge ${
                          isDone ? "is-done" : "is-active"
                        }`}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 size={13} /> Completed
                          </>
                        ) : (
                          <>
                            <Clock size={13} /> In progress
                          </>
                        )}
                      </span>
                      <span className="assess-type-pill">
                        {formatTypeLabel(saved.questionType)}
                      </span>
                    </div>

                    <div className="assess-lib-card-body">
                      <p className="assess-lib-path">{pathText}</p>
                      <h3>{saved.title || saved.topic}</h3>
                      {saved.description ? (
                        <p className="assess-lib-desc">{saved.description}</p>
                      ) : null}
                    </div>

                    <div className="assess-lib-progress">
                      <div className="assess-lib-progress-labels">
                        <span>
                          {isDone
                            ? `${saved.result?.correct ?? 0} of ${qLen} correct`
                            : `${ansLen} of ${qLen} answered`}
                        </span>
                        <strong>
                          {isDone ? `${score}% score` : `${pct}% done`}
                        </strong>
                      </div>
                      <div className="assess-lib-bar">
                        <div
                          className="assess-lib-bar-fill"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>

                    <div className="assess-lib-card-foot">
                      <span className="assess-lib-date">
                        <Calendar size={13} />
                        {formatDateShort(saved.updatedAt || saved.createdAt)}
                      </span>
                      <span className="assess-lib-open">
                        {isDone ? "Review details" : "Continue"}{" "}
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="assess-table-wrap panel">
              <table className="assess-table">
                <thead>
                  <tr>
                    <th>Assessment & Topic</th>
                    <th>Format</th>
                    <th>Questions</th>
                    <th>Status</th>
                    <th>Score / Progress</th>
                    <th>Updated</th>
                    <th aria-label="Action" />
                  </tr>
                </thead>
                <tbody>
                  {filteredAssessments.map((saved) => {
                    const isDone =
                      saved.status === "completed" && Boolean(saved.result);
                    const qLen = saved.questions?.length || 0;
                    const ansLen = getAnsweredCount(
                      saved.questions || [],
                      saved.answers || {},
                    );
                    const score = isDone
                      ? Number(saved.result?.score ?? 0)
                      : null;
                    const scoreTone = getScoreTone(score);
                    return (
                      <tr
                        key={saved.id}
                        onClick={() => openSavedAssessment(saved)}
                      >
                        <td>
                          <div className="assess-table-title">
                            <strong>{saved.title || saved.topic}</strong>
                            <span>
                              {saved.subjectName
                                ? `${saved.subjectName} · ${
                                    saved.topicName || saved.topic
                                  }`
                                : saved.topic}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="assess-type-pill">
                            {formatTypeLabel(saved.questionType)}
                          </span>
                        </td>
                        <td>{qLen} questions</td>
                        <td>
                          <span
                            className={`assess-status-badge ${
                              isDone ? "is-done" : "is-active"
                            }`}
                          >
                            {isDone ? "Completed" : "In progress"}
                          </span>
                        </td>
                        <td>
                          {isDone ? (
                            <span
                              className={`assess-score-pill tone-${scoreTone}`}
                            >
                              {score}% ({saved.result?.correct ?? 0}/{qLen})
                            </span>
                          ) : (
                            <span className="assess-progress-inline">
                              {ansLen}/{qLen} answered
                            </span>
                          )}
                        </td>
                        <td className="assess-table-date">
                          {formatDateShort(saved.updatedAt || saved.createdAt)}
                        </td>
                        <td className="assess-table-action">
                          <button
                            type="button"
                            className="btn-ghost assess-table-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSavedAssessment(saved);
                            }}
                          >
                            {isDone ? "Review" : "Resume"}{" "}
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          PHASE 2: SETUP / CREATE NEW ASSESSMENT (TWO-COLUMN STUDIO)
          ==================================================================== */}
      {(phase === "setup" || phase === "generating") && (
        <div className="assess-studio-grid">
          <form className="assess-form panel" onSubmit={start}>
            <div className="assess-form-heading">
              <div>
                <span className="eyebrow">STEP 1 · DESIGN YOUR CHECK-IN</span>
                <h2>What would you like to practise?</h2>
                <p>
                  Choose a lesson from your subjects or enter any custom topic
                  you want to test yourself on.
                </p>
              </div>
              <span className="assess-form-badge">
                <Sparkles size={20} />
              </span>
            </div>

            {subjects.length > 0 && (
              <div
                className="assess-mode-switch"
                role="tablist"
                aria-label="Topic source"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "curriculum"}
                  className={mode === "curriculum" ? "active" : ""}
                  onClick={() => setMode("curriculum")}
                >
                  <BookOpen size={15} /> From my subjects
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "custom"}
                  className={mode === "custom" ? "active" : ""}
                  onClick={() => setMode("custom")}
                >
                  <Sparkles size={15} /> Custom topic
                </button>
              </div>
            )}

            {mode === "curriculum" && subjects.length > 0 ? (
              <div className="assess-curriculum-grid">
                <label className="assess-field">
                  <span>
                    Subject <b aria-hidden="true">*</b>
                  </span>
                  <select
                    value={subjectId}
                    onChange={(e) => {
                      setSubjectId(e.target.value);
                      setTopicId("");
                      setSubtopicId("");
                    }}
                    required
                  >
                    <option value="">Choose a subject…</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="assess-field">
                  <span>
                    Unit / Topic <b aria-hidden="true">*</b>
                  </span>
                  <select
                    value={topicId}
                    disabled={!selectedSubject}
                    onChange={(e) => {
                      setTopicId(e.target.value);
                      const nextTopic = availableTopics.find(
                        (t) => String(t.id) === String(e.target.value),
                      );
                      if (nextTopic?.subtopics?.length === 1) {
                        setSubtopicId(String(nextTopic.subtopics[0].id ?? ""));
                      } else {
                        setSubtopicId("");
                      }
                    }}
                    required
                  >
                    <option value="">Choose a topic…</option>
                    {availableTopics.map((t) => (
                      <option key={t.id ?? t.name} value={t.id ?? ""}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="assess-field">
                  <span>
                    Lesson / Subtopic <b aria-hidden="true">*</b>
                  </span>
                  <select
                    value={subtopicId}
                    disabled={!selectedTopic}
                    onChange={(e) => setSubtopicId(e.target.value)}
                    required
                  >
                    <option value="">Choose a subtopic…</option>
                    {availableSubtopics.map((st) => (
                      <option key={st.id ?? st.name} value={st.id ?? ""}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <label className="assess-field">
                <span>
                  Topic <b aria-hidden="true">*</b>
                </span>
                <input
                  required
                  maxLength={140}
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g. Equivalent fractions, photosynthesis, recursion in Python"
                />
              </label>
            )}

            <label className="assess-field">
              <span>
                Focus notes or guidance <small>Optional</small>
              </span>
              <textarea
                maxLength={800}
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell Kindling what to emphasize — e.g. word problems with unlike denominators, AP-level rigor, or a concept you found tricky."
              />
            </label>

            <div className="assess-field">
              <label htmlFor="assessment-count">Number of questions</label>
              <div className="assess-count-row">
                <div className="assess-count-presets">
                  {COUNT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`assess-count-chip${
                        count === preset ? " active" : ""
                      }`}
                      onClick={() => setCount(preset)}
                    >
                      {preset} questions
                    </button>
                  ))}
                </div>
                <div className="assess-count-custom">
                  <span>Custom (5–15):</span>
                  <input
                    id="assessment-count"
                    type="number"
                    min="5"
                    max="15"
                    step="1"
                    value={count}
                    onChange={(event) => setCount(event.target.value)}
                  />
                </div>
              </div>
              {!validCount ? (
                <small className="assess-field-error">
                  Choose a whole number from 5 to 15.
                </small>
              ) : null}
            </div>

            <fieldset className="assess-field assess-type-field">
              <legend>Question format</legend>
              <div className="assess-type-grid">
                {QUESTION_TYPES.map((type) => (
                  <label
                    key={type.id}
                    className={`assess-type-card${
                      questionType === type.id ? " selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="question-type"
                      value={type.id}
                      checked={questionType === type.id}
                      onChange={() => setQuestionType(type.id)}
                    />
                    <div className="assess-type-card-top">
                      <span className="assess-radio" aria-hidden="true" />
                      <span className="assess-type-tag">{type.badge}</span>
                    </div>
                    <strong>{type.label}</strong>
                    <small>{type.detail}</small>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="assess-form-foot">
              <button
                type="button"
                className="btn-ghost"
                onClick={backToLibrary}
                disabled={phase === "generating"}
              >
                Cancel
              </button>
              <button
                className="btn-primary assess-primary"
                type="submit"
                disabled={!canGenerate}
              >
                {phase === "generating" ? (
                  <>
                    <Loader2 size={17} className="spin" /> Creating your
                    assessment…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Generate assessment
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right rail: live blueprint & what to expect */}
          <aside className="assess-studio-aside">
            <div className="assess-blueprint panel">
              <span className="eyebrow">LIVE BLUEPRINT</span>
              <h3>
                {(mode === "curriculum" && selectedSubtopic?.name) ||
                  topic.trim() ||
                  "Untitled assessment"}
              </h3>
              <p className="assess-blueprint-sub">
                {mode === "curriculum" && selectedSubject
                  ? `${selectedSubject.name}${
                      selectedTopic ? ` · ${selectedTopic.name}` : ""
                    }`
                  : "Custom practice assessment"}
              </p>

              <dl className="assess-blueprint-list">
                <div>
                  <dt>Questions</dt>
                  <dd>{validCount ? `${count} items` : "5–15 items"}</dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>{formatTypeLabel(questionType)}</dd>
                </div>
                <div>
                  <dt>Estimated time</dt>
                  <dd>
                    ~{Math.max(5, Math.round(Number(count || 5) * 1.8))} mins
                  </dd>
                </div>
                <div>
                  <dt>Scoring</dt>
                  <dd>2 pts per question + rubric feedback</dd>
                </div>
              </dl>

              <div className="assess-blueprint-steps">
                <strong>How it works</strong>
                <ol>
                  <li>
                    <span>1</span>
                    <div>
                      <b>Tailored questions</b>
                      <p>
                        Kindling writes age-appropriate questions covering core
                        concepts and transfer skills.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <b>Auto-saved progress</b>
                      <p>
                        Your answers save as you type so you can pause and
                        return anytime.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <b>1-on-1 revision</b>
                      <p>
                        Get clear feedback, model answers, and a live revision
                        chat with Kindling.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ====================================================================
          PHASE 3: ACTIVE ASSESSMENT (WORKSPACE + STICKY QUESTION NAVIGATOR)
          ==================================================================== */}
      {(phase === "active" || phase === "grading") && assessment && (
        <div className="assess-workspace-grid">
          <div className="assess-questions-col">
            <div className="assess-banner-card panel">
              <div>
                <span className="eyebrow">ACTIVE ASSESSMENT</span>
                <h2>{assessment.title || assessment.topic}</h2>
                <p>
                  {assessment.subjectName
                    ? `${assessment.subjectName} · ${
                        assessment.topicName || assessment.topic
                      }`
                    : assessment.topic}{" "}
                  · {assessment.questions.length} questions ·{" "}
                  {formatTypeLabel(assessment.questionType || questionType)}
                </p>
              </div>
              <div className="assess-banner-progress">
                <div className="assess-banner-count">
                  <strong>
                    {answeredCount} / {assessment.questions.length}
                  </strong>
                  <span>answered</span>
                </div>
                <div className="assess-banner-bar">
                  <div
                    style={{
                      width: `${Math.round(
                        (answeredCount /
                          Math.max(1, assessment.questions.length)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {assessment.questions.map((question, index) => {
              const rawAns = answers[question.id];
              const isAnswered =
                question.type === "multiple_choice"
                  ? rawAns !== undefined && rawAns !== null && rawAns !== ""
                  : Boolean(String(rawAns || "").trim());

              return (
                <article
                  id={`assess-q-${question.id}`}
                  className={`assess-question-card panel${
                    isAnswered ? " is-answered" : ""
                  }`}
                  key={question.id}
                >
                  <div className="assess-q-header">
                    <div className="assess-q-badges">
                      <span className="assess-q-number">
                        Question {index + 1} of {assessment.questions.length}
                      </span>
                      <span className="assess-q-chip">
                        {question.type === "multiple_choice"
                          ? "Multiple choice"
                          : "Open ended"}
                      </span>
                      {question.difficulty ? (
                        <span
                          className={`assess-q-diff diff-${String(
                            question.difficulty,
                          ).toLowerCase()}`}
                        >
                          {question.difficulty}
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={`assess-q-state${isAnswered ? " done" : ""}`}
                    >
                      {isAnswered ? (
                        <>
                          <CheckCircle2 size={14} /> Answered
                        </>
                      ) : (
                        "Unanswered"
                      )}
                    </span>
                  </div>

                  {question.concept ? (
                    <p className="assess-q-concept">
                      <Target size={13} /> {question.concept}
                    </p>
                  ) : null}

                  <h3 className="assess-q-prompt">{question.prompt}</h3>

                  {question.type === "multiple_choice" ? (
                    <fieldset className="assess-options-grid">
                      <legend className="sr-only">Choose an answer</legend>
                      {question.options.map((option, optionIndex) => {
                        const selected =
                          rawAns !== undefined &&
                          rawAns !== null &&
                          rawAns !== "" &&
                          Number(rawAns) === optionIndex;
                        return (
                          <label
                            key={optionIndex}
                            className={`assess-option-card${
                              selected ? " selected" : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              checked={selected}
                              onChange={() =>
                                setAnswers((current) => ({
                                  ...current,
                                  [question.id]: optionIndex,
                                }))
                              }
                            />
                            <span className="assess-option-letter">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span className="assess-option-text">{option}</span>
                          </label>
                        );
                      })}
                    </fieldset>
                  ) : (
                    <label className="assess-open-answer">
                      <span className="assess-open-label">
                        Your response & reasoning
                      </span>
                      <textarea
                        rows={5}
                        maxLength={2000}
                        value={answers[question.id] || ""}
                        onChange={(event) =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }))
                        }
                        placeholder="Write your answer clearly and show how you worked it out…"
                      />
                    </label>
                  )}
                </article>
              );
            })}
          </div>

          {/* Sticky Right Rail: Question Map & Submit */}
          <aside className="assess-workspace-rail">
            <div className="assess-nav-card panel">
              <div className="assess-nav-head">
                <span className="eyebrow">QUESTION MAP</span>
                <strong>
                  {answeredCount} of {assessment.questions.length} complete
                </strong>
              </div>

              <div className="assess-nav-dots">
                {assessment.questions.map((q, idx) => {
                  const ans = answers[q.id];
                  const done =
                    q.type === "multiple_choice"
                      ? ans !== undefined && ans !== null && ans !== ""
                      : Boolean(String(ans || "").trim());
                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={`assess-nav-dot${done ? " done" : ""}`}
                      onClick={() => scrollToQuestion(q.id)}
                      title={`Jump to Question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <p className="assess-nav-note">
                {answeredCount === assessment.questions.length
                  ? "Every question is answered. Ready to submit for instant grading and feedback!"
                  : `Answer ${
                      assessment.questions.length - answeredCount
                    } more question${
                      assessment.questions.length - answeredCount === 1
                        ? ""
                        : "s"
                    } to unlock submission.`}
              </p>

              <button
                type="button"
                className="btn-primary assess-submit-btn"
                onClick={submit}
                disabled={
                  answeredCount !== assessment.questions.length ||
                  phase === "grading"
                }
              >
                {phase === "grading" ? (
                  <>
                    <Loader2 size={17} className="spin" /> Scoring your work…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} /> Submit & review
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ====================================================================
          PHASE 4: ASSESSMENT DETAILS / REVIEW SCREEN
          ==================================================================== */}
      {phase === "review" && assessment && grade && (
        <div className="assess-details">
          {/* Score Hero Banner */}
          <section
            className={`assess-score-banner panel tone-${getScoreTone(
              grade.score,
            )}`}
          >
            <div className="assess-score-Left">
              <div className="assess-score-ring">
                <strong>{grade.score}%</strong>
                <span>SCORE</span>
              </div>
              <div className="assess-score-copy">
                <span className="eyebrow">ASSESSMENT COMPLETE</span>
                <h2>{assessment.title || assessment.topic}</h2>
                <p>{grade.summary}</p>
              </div>
            </div>

            <div className="assess-score-metrics">
              <div className="assess-metric-box">
                <span>Fully correct</span>
                <strong>
                  {grade.correct} / {assessment.questions.length}
                </strong>
              </div>
              <div className="assess-metric-box">
                <span>Points earned</span>
                <strong>
                  {grade.points} / {grade.maxPoints} pts
                </strong>
              </div>
              <div className="assess-metric-box">
                <span>Need review</span>
                <strong>
                  {Math.max(0, assessment.questions.length - grade.correct)}
                </strong>
              </div>
            </div>
          </section>

          <div className="assess-review-grid">
            {/* Left column: Spacious Question-by-question breakdown */}
            <div className="assess-review-list">
              <div className="assess-review-bar">
                <div>
                  <span className="eyebrow">DETAILED BREAKDOWN</span>
                  <h3>Question-by-question review</h3>
                </div>
                <div
                  className="assess-filter-pills"
                  role="tablist"
                  aria-label="Filter reviewed questions"
                >
                  {[
                    {
                      id: "all",
                      label: `All (${assessment.questions.length})`,
                    },
                    {
                      id: "needs_review",
                      label: `Needs review (${Math.max(
                        0,
                        assessment.questions.length - grade.correct,
                      )})`,
                    },
                    { id: "correct", label: `Correct (${grade.correct})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="tab"
                      aria-selected={reviewFilter === f.id}
                      className={`assess-filter-pill${
                        reviewFilter === f.id ? " active" : ""
                      }`}
                      onClick={() => setReviewFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {assessment.questions.map((question, index) => {
                const review = grade.reviews?.find(
                  (item) => item.questionId === question.id,
                );
                const pts = review?.points ?? 0;
                const maxPts = review?.maxPoints ?? 2;
                const isCorrect = pts === maxPts;
                const isPartial = pts > 0 && pts < maxPts;

                if (reviewFilter === "needs_review" && isCorrect) return null;
                if (reviewFilter === "correct" && !isCorrect) return null;

                const rawAnswer = answers[question.id];
                const learnerAnswerText =
                  question.type === "multiple_choice"
                    ? rawAnswer !== undefined &&
                      rawAnswer !== null &&
                      rawAnswer !== ""
                      ? question.options?.[Number(rawAnswer)] || "No answer"
                      : "No answer submitted"
                    : String(rawAnswer || "").trim() || "No answer submitted";

                const expectedText =
                  review?.expectedAnswer || question.expectedAnswer || "";

                return (
                  <article
                    key={question.id}
                    id={`assess-q-${question.id}`}
                    className={`assess-detail-card panel ${
                      isCorrect
                        ? "state-correct"
                        : isPartial
                          ? "state-partial"
                          : "state-incorrect"
                    }`}
                  >
                    {/* Header row */}
                    <div className="assess-detail-head">
                      <div className="assess-detail-meta">
                        <span className="assess-detail-num">
                          Question {index + 1}
                        </span>
                        {question.concept ? (
                          <span className="assess-detail-concept">
                            {question.concept}
                          </span>
                        ) : null}
                      </div>

                      <div className="assess-detail-badges">
                        <span
                          className={`assess-verdict-pill ${
                            isCorrect
                              ? "verdict-correct"
                              : isPartial
                                ? "verdict-partial"
                                : "verdict-incorrect"
                          }`}
                        >
                          {isCorrect ? (
                            <>
                              <CheckCircle2 size={14} /> Correct
                            </>
                          ) : isPartial ? (
                            <>
                              <HelpCircle size={14} /> Partly correct
                            </>
                          ) : (
                            <>
                              <XCircle size={14} /> Needs review
                            </>
                          )}
                        </span>
                        <span className="assess-points-pill">
                          {pts} / {maxPts} pts
                        </span>
                      </div>
                    </div>

                    {/* Question prompt */}
                    <h4 className="assess-detail-prompt">{question.prompt}</h4>

                    {/* Side-by-side answer comparison */}
                    <div
                      className={`assess-answer-compare${
                        isCorrect ? " single" : ""
                      }`}
                    >
                      <div
                        className={`assess-answer-box learner-box ${
                          isCorrect ? "is-good" : "is-flagged"
                        }`}
                      >
                        <span className="assess-box-label">Your answer</span>
                        <p>{learnerAnswerText}</p>
                      </div>

                      {!isCorrect && expectedText ? (
                        <div className="assess-answer-box expected-box">
                          <span className="assess-box-label">
                            Expected / model answer
                          </span>
                          <p>{expectedText}</p>
                        </div>
                      ) : null}
                    </div>

                    {/* Tutor Feedback Callout */}
                    {review?.feedback ? (
                      <div className="assess-feedback-block">
                        <div className="assess-feedback-icon">
                          <Sparkles size={16} />
                        </div>
                        <div className="assess-feedback-body">
                          <strong>Tutor feedback</strong>
                          <p>{review.feedback}</p>
                        </div>
                      </div>
                    ) : null}

                    {/* Improvement & Worked Example Boxes */}
                    {!isCorrect && (review?.improvement || review?.example) ? (
                      <div className="assess-coaching-grid">
                        {review?.improvement ? (
                          <div className="assess-coaching-box improve-box">
                            <span className="assess-box-label">
                              <TrendingUp size={13} /> How to improve
                            </span>
                            <p>{review.improvement}</p>
                          </div>
                        ) : null}

                        {review?.example ? (
                          <div className="assess-coaching-box example-box">
                            <span className="assess-box-label">
                              <FileText size={13} /> Worked example
                            </span>
                            <p>{review.example}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Quick ask tutor button */}
                    <div className="assess-detail-foot">
                      <button
                        type="button"
                        className="btn-ghost assess-ask-q-btn"
                        disabled={chatBusy}
                        onClick={() =>
                          sendRevisionMessage(
                            `Can we walk through Question ${index + 1} (${
                              question.concept || "this concept"
                            }) step by step and try a similar example?`,
                          )
                        }
                      >
                        <MessageSquare size={14} /> Discuss Question {index + 1}{" "}
                        with Kindling
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Right column: Sticky 1-on-1 Revision Tutor Chat */}
            <aside className="assess-review-rail">
              <div className="assess-revision-chat panel">
                <div className="assess-chat-heading">
                  <span className="assess-chat-avatar">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <span className="eyebrow">1-ON-1 REVISION COACH</span>
                    <h3>Keep revising with Kindling</h3>
                    <p>
                      Ask about any question, request another worked example, or
                      practise a concept you missed.
                    </p>
                  </div>
                </div>

                <div className="assess-chat-chips">
                  <button
                    type="button"
                    disabled={chatBusy}
                    onClick={() =>
                      sendRevisionMessage(
                        "Which question should I focus on first, and why?",
                      )
                    }
                  >
                    Where should I start?
                  </button>
                  <button
                    type="button"
                    disabled={chatBusy}
                    onClick={() =>
                      sendRevisionMessage(
                        "Give me one new practice question on the concept I missed.",
                      )
                    }
                  >
                    Try a similar question
                  </button>
                </div>

                <div className="assess-chat-thread" aria-live="polite">
                  {chat.length === 0 ? (
                    <div className="assess-chat-empty">
                      <MessageSquare size={20} />
                      <p>
                        Click <b>“Discuss Question”</b> on any card or type a
                        question below to start revising with Kindling.
                      </p>
                    </div>
                  ) : (
                    chat.map((message, index) => (
                      <div
                        className={`assess-chat-message ${message.role}`}
                        key={`${message.role}-${index}`}
                      >
                        <b>{message.role === "user" ? "You" : "Kindling"}</b>
                        <p>{message.text}</p>
                      </div>
                    ))
                  )}
                  {chatBusy ? (
                    <div className="assess-chat-message model">
                      <b>Kindling</b>
                      <p>
                        <Loader2 size={14} className="spin" /> Thinking…
                      </p>
                    </div>
                  ) : null}
                </div>

                <form
                  className="assess-chat-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendRevisionMessage();
                  }}
                >
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ask Kindling to explain a step or test you on a similar problem…"
                  />
                  <button
                    type="submit"
                    className="btn-primary assess-chat-send"
                    disabled={!draft.trim() || chatBusy}
                    aria-label="Send revision message"
                  >
                    <Send size={15} /> Send message
                  </button>
                </form>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
