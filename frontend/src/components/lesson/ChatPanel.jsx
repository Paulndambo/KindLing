import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Mic,
  Send,
  Volume2,
  PanelLeft,
  BookOpen,
  X,
  Loader2,
  Image as ImageIcon,
  Flame,
  Zap,
  ClipboardCheck,
  Clock3,
  MessageCircle,
  Code2,
  Sigma,
  PencilLine,
  ChevronDown,
  Maximize2,
  Minimize2,
  FileText,
} from "lucide-react";
import { challengeProgressLabel } from "../../services/learning/sparkChallenge";
import { assessmentProgressLabel } from "../../services/learning/assessmentEngine";
import { resolveTutorSuggestions } from "../../services/learning/tutorSuggestions";
import TypingDots from "./TypingDots";
import TutorMessageContent from "./TutorMessageContent";
import TutorSuggestionChips from "./TutorSuggestionChips";
import InterventionBanner, {
  InterventionSystemChip,
} from "./InterventionBanner";
import AffectCheckInCard, { PersistenceChip } from "./AffectCheckInCard";
import SessionReflectionCard from "./SessionReflectionCard";
import GoalsChip from "./GoalsChip";
import { ConversationEndedCard } from "./ConversationJournal";
import ConnectionBanner from "./ConnectionBanner";
import ChatErrorBanner from "./ChatErrorBanner";
import SafetyEscalationCard from "./SafetyEscalationCard";
import { HOMEWORK_ACCEPT } from "../../services/homework";
import "../../styles/tutor-content.css";

const COMPOSER_MODES = [
  { id: "text", label: "Chat", command: "/text", description: "Ask Kindling anything", Icon: MessageCircle },
  { id: "code", label: "Code", command: "/code", description: "Paste code or debug together", Icon: Code2 },
  { id: "math", label: "Math", command: "/math", description: "Type an equation or expression", Icon: Sigma },
  { id: "working", label: "Show my work", command: "/work", description: "Share your steps for feedback", Icon: PencilLine },
];
const CODE_LANGUAGES = ["python", "javascript", "html", "css", "java", "sql", "text"];

function DayBoundary({ text }) {
  return (
    <div className="day-boundary" role="separator" aria-label={text}>
      <span className="day-boundary-line" />
      <span className="day-boundary-label">{text}</span>
      <span className="day-boundary-line" />
    </div>
  );
}

export default function ChatPanel({
  topicName,
  subjectName,
  /** Parent topic unit name (Subject → Topic → Subtopic) */
  unitName = "",
  nextTopicName = "",
  studentName,
  student = null,
  curriculum,
  messages,
  isStreaming,
  isSpeaking,
  isLoadingVoice,
  isListening,
  hasAi,
  inputVal,
  setInputVal,
  chatAreaRef,
  inputRef,
  onSend,
  onToggleListening,
  onSpeak,
  onStopSpeaking,
  intervention = null,
  softNudge = null,
  onAcceptIntervention,
  onDeclineIntervention,
  onExitIntervention,
  onNudgeThinking,
  onNudgeHelp,
  onEscalateIntervention,
  onPickLevel,
  affectCheckIn = null,
  onAffectRespond,
  onAffectDismiss,
  sessionReflection = null,
  onReflectionSubmit,
  onReflectionSkip,
  persistenceNote = null,
  onDismissPersistenceNote,
  reflectionResult = null,
  onReviewSparkCta,
  reviewMode = false,
  reviewSkillLabel = null,
  challengeMode = false,
  challengeSkillLabel = null,
  challengeProgress = null,
  pathCollapsed = false,
  onExpandPath,
  focusMode = false,
  onToggleFocusMode,
  isResume = false,
  isArchiveView = false,
  conversationEnded = false,
  endedSummary = null,
  isSummarizing = false,
  onStartNewConversation,
  onContinueAfterEnd,
  onOpenJournal,
  onExitArchiveView,
  archiveCount = 0,
  dailyCapReached = false,
  dailyAiUsage = null,
  onOpenAiSettings = null,
  chatError = null,
  onRetryChatError,
  onDismissChatError,
  connectivity = null,
  safetyEscalation = null,
  onSafetyPause,
  onSafetyResume,
  onAttachHomework,
  homeworkBusy = false,
  homeworkError = "",
  onClearHomeworkError,
  manipulativeSlot = null,
  multiStepSlot = null,
  /** Epic C6 — quick check panel + readiness offer */
  assessmentSlot = null,
  assessmentOfferSlot = null,
  assessmentSession = null,
  /** Epic L4 — independence twin after heavy help */
  independenceSlot = null,
  independenceOfferSlot = null,
  /** Epic C5 — orientation goal chip under header */
  lessonGoals = null,
  showGoalsOrientation = true,
  homeworkWindowMinutes = null,
  homeworkWindowSecondsLeft = null,
  homeworkWindowNoticeDismissed = false,
  onDismissHomeworkWindow,
}) {
  const fileInputRef = useRef(null);
  const [composerMode, setComposerMode] = useState("text");
  const [codeLanguage, setCodeLanguage] = useState("python");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [activeModeIndex, setActiveModeIndex] = useState(0);
  const [softWarningDismissed, setSoftWarningDismissed] = useState(false);
  const selectedComposerMode =
    COMPOSER_MODES.find((mode) => mode.id === composerMode) || COMPOSER_MODES[0];
  const ModeIcon = selectedComposerMode.Icon;
  const commandQuery = inputVal.startsWith("/")
    ? inputVal.slice(1).split(/\s/, 1)[0].toLowerCase()
    : "";
  const matchingModes = COMPOSER_MODES.filter((mode) =>
    `${mode.command.slice(1)} ${mode.label} ${mode.description}`
      .toLowerCase()
      .includes(commandQuery)
  );
  const interventionActive = intervention?.status === "active";
  const interventionOffered = intervention?.status === "offered";
  const assessmentRunning = Boolean(assessmentSlot || assessmentSession);
  const independenceRunning = Boolean(independenceSlot);
  const focusModeRunning = assessmentRunning || independenceRunning;
  const showSoftNudge =
    Boolean(softNudge) &&
    !dailyCapReached &&
    !interventionOffered &&
    !interventionActive &&
    !focusModeRunning &&
    !isArchiveView &&
    !conversationEnded;
  const showAffectCheckIn =
    Boolean(affectCheckIn) &&
    !dailyCapReached &&
    !sessionReflection &&
    !interventionOffered &&
    !showSoftNudge &&
    !focusModeRunning &&
    !isArchiveView &&
    !conversationEnded;
  const showSessionReflection =
    Boolean(sessionReflection) &&
    !isArchiveView &&
    !conversationEnded;
  const showAssessmentOffer =
    Boolean(assessmentOfferSlot) &&
    !showSessionReflection &&
    !interventionOffered &&
    !showAffectCheckIn &&
    !assessmentRunning &&
    !isArchiveView &&
    !conversationEnded;
  const offline = connectivity && connectivity.online === false;
  const safetyActive = Boolean(safetyEscalation && !safetyEscalation.acknowledged);
  const safetyPaused = Boolean(safetyEscalation?.paused || safetyEscalation?.acknowledged);
  const inputDisabled =
    isStreaming ||
    !hasAi ||
    dailyCapReached ||
    isArchiveView ||
    conversationEnded ||
    isSummarizing ||
    showSessionReflection ||
    assessmentRunning ||
    offline ||
    safetyActive ||
    safetyPaused ||
    homeworkBusy;

  const effectiveChatError =
    chatError ||
    (dailyCapReached
      ? {
          code: "DAILY_AI_CAP_REACHED",
          apiCode: "daily_ai_cap_reached",
          title: "Today's AI allowance is used up",
          message: `Today's platform AI allowance is used up. It resets at ${dailyAiUsage?.resetsAt || "midnight UTC"}.`,
          usage: dailyAiUsage,
          resetsAt: dailyAiUsage?.resetsAt || "midnight UTC",
          recoverable: false,
        }
      : null);

  // Latest completed tutor turn gets 0–5 strictly on-topic follow-ups based on necessity
  let lastTutorIdx = -1;
  for (let i = (messages || []).length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m?.role === "tutor" && !m.streaming && m.text) {
      lastTutorIdx = i;
      break;
    }
  }
  const suggestCtx = {
    topic: topicName,
    subject: subjectName,
    nextTopic: nextTopicName,
    country: student?.country || "",
    interests: student?.interests || [],
  };
  const chipsDisabled =
    inputDisabled ||
    dailyCapReached ||
    isStreaming ||
    showSoftNudge ||
    showAffectCheckIn ||
    showSessionReflection ||
    interventionOffered ||
    interventionActive;

  // Keep end-of-chat cards (e.g. "Before we dive in" affect check-in, reflection,
  // intervention prompts, or daily cap banner) fully visible when they mount.
  useEffect(() => {
    if (
      !showAffectCheckIn &&
      !showSessionReflection &&
      !showSoftNudge &&
      !interventionOffered &&
      !showAssessmentOffer &&
      !safetyEscalation &&
      !dailyCapReached
    ) {
      return undefined;
    }
    const id = requestAnimationFrame(() => {
      const el = chatAreaRef?.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [
    chatAreaRef,
    showAffectCheckIn,
    showSessionReflection,
    showSoftNudge,
    interventionOffered,
    showAssessmentOffer,
    safetyEscalation,
    dailyCapReached,
  ]);

  const chooseComposerMode = (mode) => {
    setComposerMode(mode.id);
    setModeMenuOpen(false);
    setActiveModeIndex(0);
    if (/^\/[a-z]*$/i.test(inputVal)) setInputVal("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const sendComposerMessage = () => {
    const draft = inputVal.trim();
    if (!draft) return;
    let message = draft;
    if (composerMode === "code") {
      message = `Could you help me understand or debug this code?\n\n\`\`\`${codeLanguage}\n${draft}\n\`\`\``;
    } else if (composerMode === "math") {
      message = `I want help with this math. Please explain the steps and check my reasoning:\n${draft}`;
    } else if (composerMode === "working") {
      message = `Here is my working. Please check each step and help me understand any mistake:\n${draft}`;
    }
    setModeMenuOpen(false);
    onSend(message);
  };
  const handleComposerKeyDown = (event) => {
    if (modeMenuOpen) {
      if (matchingModes.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setActiveModeIndex(
          (index) => (index + direction + matchingModes.length) % matchingModes.length
        );
        return;
      }
      if (event.key === "Enter" && !event.shiftKey && matchingModes.length) {
        event.preventDefault();
        chooseComposerMode(matchingModes[activeModeIndex] || matchingModes[0]);
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setModeMenuOpen(false);
        if (/^\/[a-z]*$/i.test(inputVal)) setInputVal("");
        return;
      }
    }
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      (composerMode !== "code" || event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      sendComposerMessage();
    }
  };

  return (
    <main
      className={`lesson-main${interventionActive ? " intervention-mode" : ""}${
        isArchiveView ? " archive-view" : ""
      }`}
    >
      <div className="lesson-header">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            minWidth: 0,
          }}
        >
          {pathCollapsed && onExpandPath && (
            <button
              type="button"
              className="lesson-path-expand"
              onClick={onExpandPath}
              aria-label="Show lesson path"
              title="Show lesson path"
            >
              <PanelLeft size={15} />
              Path
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <h1>{topicName}</h1>
            <p className="sub">
              {subjectName}
              {unitName ? ` · ${unitName}` : ""}
              {curriculum ? ` · ${curriculum}` : ""}
              {isArchiveView ? " · Journal view" : ""}
            </p>
            {/* Goals chip only when path is collapsed — path sidebar already shows it */}
            {showGoalsOrientation &&
              pathCollapsed &&
              lessonGoals &&
              (lessonGoals.hasLessonGoal || lessonGoals.familiarity) &&
              !isArchiveView &&
              !conversationEnded && (
                <div className="lesson-header-goals">
                  <GoalsChip goals={lessonGoals} compact />
                </div>
              )}
          </div>
        </div>
        <div className="lesson-header-actions">
          <button
            type="button"
            className="journal-header-btn lesson-focus-toggle"
            onClick={onToggleFocusMode}
            aria-pressed={focusMode}
            aria-keyshortcuts="Alt+Shift+F Escape"
            title={
              focusMode
                ? "Exit focus mode (Escape). Focus the composer with Alt+Shift+I."
                : "Focus on the lesson (Alt+Shift+F). Focus the composer with Alt+Shift+I."
            }
          >
            {focusMode ? (
              <Minimize2 size={14} aria-hidden />
            ) : (
              <Maximize2 size={14} aria-hidden />
            )}
            {focusMode ? "Exit focus" : "Focus"}
          </button>
          {isResume && !isArchiveView && !conversationEnded && (
            <span className="resume-pill" title="Continuing a previous conversation">
              Resuming
            </span>
          )}
          {onOpenJournal && (
            <button
              type="button"
              className="journal-header-btn"
              onClick={onOpenJournal}
              title="Learning Journal"
            >
              <BookOpen size={14} aria-hidden />
              Journal
              {archiveCount > 0 && (
                <span className="journal-count">{archiveCount}</span>
              )}
            </button>
          )}
          {(isSpeaking || isLoadingVoice) && (
            <div
              className="speaking-badge"
              title={isLoadingVoice ? "Starting voice…" : "Speaking"}
            >
              <div className="bar">
                <span />
                <span />
                <span />
                <span />
              </div>
              <span style={{ fontSize: 11 }}>
                {isLoadingVoice ? "Starting…" : "Speaking"}
              </span>
              <button
                onClick={onStopSpeaking}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--teal)",
                  fontWeight: 700,
                  fontSize: 12,
                  padding: 0,
                }}
              >
                Stop
              </button>
            </div>
          )}
          <div
            className={`adapt-badge${interventionActive ? " intervention" : ""}${
              isArchiveView ? " archive" : ""
            }${dailyCapReached ? " cap-reached" : ""}`}
          >
            <span className="pulse" />{" "}
            {isSummarizing
              ? "Saving journal…"
              : safetyActive || safetyPaused
                ? "Lesson paused for safety"
                : dailyCapReached
                  ? `Daily limit reached · Resets ${dailyAiUsage?.resetsAt || "midnight UTC"}`
                  : isStreaming
                    ? "Thinking…"
                    : chatError
                      ? "Paused — try again"
                      : offline
                        ? "Offline"
                        : isArchiveView
                          ? "Reading past chat"
                          : conversationEnded
                            ? "Conversation ended"
                            : interventionActive
                              ? intervention?.context?.levelLabel ||
                                intervention?.context?.activeTitle ||
                                "Help mode"
                              : "Kindling is live"}
          </div>
        </div>
      </div>

      {connectivity?.showBanner && !isArchiveView && (
        <ConnectionBanner
          online={connectivity.online}
          apiStatus={connectivity.apiStatus}
          learningQueued={connectivity.learningQueued}
          isChecking={connectivity.isChecking}
          isSyncing={connectivity.isSyncing}
          onRetryConnection={connectivity.checkApi}
          onSyncLearning={connectivity.syncLearning}
        />
      )}

      {!dailyCapReached &&
        dailyAiUsage?.softWarning &&
        !softWarningDismissed &&
        !isArchiveView &&
        !conversationEnded && (
          <div className="daily-cap-soft-warning" role="status">
            <Clock3 size={15} aria-hidden />
            <span>
              <strong>Nearing today&apos;s AI allowance:</strong>{" "}
              {Number.isFinite(Number(dailyAiUsage.estimatedTokensUsed)) &&
              Number(dailyAiUsage.estimatedTokenLimit) > 0
                ? `${Number(dailyAiUsage.estimatedTokensUsed).toLocaleString()} of ${Number(dailyAiUsage.estimatedTokenLimit).toLocaleString()} est. tokens`
                : `${dailyAiUsage.used} of ${dailyAiUsage.limit} requests`}{" "}
              used · Resets at {dailyAiUsage.resetsAt || "midnight UTC"}.
            </span>
            <button
              type="button"
              className="daily-cap-soft-dismiss"
              onClick={() => setSoftWarningDismissed(true)}
              aria-label="Dismiss allowance notice"
            >
              <X size={14} />
            </button>
          </div>
        )}

      {homeworkWindowMinutes && !isArchiveView && !conversationEnded && (
        homeworkWindowSecondsLeft > 0 ? (
          <div className="homework-window-banner" role="timer" aria-live="off">
            <Clock3 size={16} aria-hidden />
            <strong>{homeworkWindowMinutes}-minute focus window</strong>
            <span>
              {Math.floor(homeworkWindowSecondsLeft / 60)}:
              {String(homeworkWindowSecondsLeft % 60).padStart(2, "0")} left
            </span>
          </div>
        ) : !homeworkWindowNoticeDismissed ? (
          <div className="homework-window-banner is-finished" role="status">
            <Clock3 size={16} aria-hidden />
            <span>Your focus window is complete. You can wrap up or keep working.</span>
            <button
              type="button"
              disabled={inputDisabled}
              onClick={() =>
                onSend?.("My focus window is up. Please help me summarize what I completed and one next step.")
              }
            >
              Wrap up
            </button>
            <button type="button" className="homework-window-continue" onClick={onDismissHomeworkWindow}>
              Keep working
            </button>
          </div>
        ) : null
      )}

      {isArchiveView && (
        <div className="archive-banner">
          <span>You’re viewing a saved conversation (read-only).</span>
          <button type="button" onClick={onExitArchiveView}>
            <X size={14} />
            Back to live lesson
          </button>
        </div>
      )}

      {interventionActive && !isArchiveView && !conversationEnded && (
        <InterventionBanner
          status="active"
          context={intervention.context}
          autoEntered={intervention.autoEntered}
          isStreaming={isStreaming}
          hasAi={hasAi}
          onExit={onExitIntervention}
          onEscalate={onEscalateIntervention}
        />
      )}

      {assessmentRunning && !isArchiveView && !conversationEnded && (
        <div
          className="review-mode-banner assessment-mode"
          role="status"
          aria-label="Quick check"
        >
          <ClipboardCheck size={16} aria-hidden />
          Quick check
          <span>
            One question at a time · tutor explains after each answer
          </span>
          {assessmentSession && (
            <span className="challenge-progress">
              {assessmentProgressLabel(assessmentSession)}
            </span>
          )}
        </div>
      )}

      {challengeMode &&
        !assessmentRunning &&
        !isArchiveView &&
        !conversationEnded && (
        <div
          className="review-mode-banner challenge-mode"
          role="status"
          aria-label="Spark challenge"
        >
          <Zap size={16} aria-hidden />
          Spark challenge
          <span>
            {challengeProgress?.target || 3} solid turns
            {challengeSkillLabel || reviewSkillLabel
              ? ` · ${challengeSkillLabel || reviewSkillLabel}`
              : ""}{" "}
            — optional, no badges
          </span>
          {challengeProgress && (
            <span className="challenge-progress">
              {challengeProgressLabel(challengeProgress)}
            </span>
          )}
        </div>
      )}

      {reviewMode &&
        !challengeMode &&
        !assessmentRunning &&
        !isArchiveView &&
        !conversationEnded && (
        <div className="review-mode-banner" role="status">
          <Flame size={16} aria-hidden />
          Review spark
          <span>
            Short warm-up
            {reviewSkillLabel ? ` · ${reviewSkillLabel}` : ""} — not a full new
            lesson
          </span>
        </div>
      )}

      <div className="chat-area" ref={chatAreaRef}>
        {!hasAi && (
          <div className="error-toast config-toast" role="status">
            Kindling needs an AI route to tutor. Open{" "}
            <strong>Settings → AI providers</strong> to use platform Gemini or
            add your own API key (BYOK). Platform AI must be enabled on the account.
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === "day_boundary") {
            return <DayBoundary key={msg.id || `day-${i}`} text={msg.text} />;
          }
          if (msg.role === "system") {
            if (msg.kind === "conversation_ended") {
              return null; // card below handles this
            }
            return (
              <InterventionSystemChip
                key={msg.id || i}
                kind={msg.kind}
                text={msg.text}
              />
            );
          }
          if (msg.role === "tutor") {
            const showChips =
              i === lastTutorIdx &&
              !msg.streaming &&
              !isArchiveView &&
              !conversationEnded &&
              !assessmentRunning;
            const resolved = showChips
              ? resolveTutorSuggestions(msg.text, suggestCtx)
              : null;
            return (
              <div key={msg.id || i} className="tutor-msg-stack">
                <div
                  className={`msg tutor${msg.streaming ? " stream-cursor" : ""}`}
                >
                  <span className="tname">Kindling</span>
                  <TutorMessageContent
                    text={msg.text}
                    streaming={Boolean(msg.streaming)}
                  />
                </div>
                {!msg.streaming && msg.text && (
                  <button
                    className="read-aloud-btn"
                    onClick={() => onSpeak(msg.text)}
                  >
                    <Volume2 size={11} /> Read aloud
                  </button>
                )}
                {showChips && resolved?.suggestions?.length > 0 && (
                  <TutorSuggestionChips
                    suggestions={resolved.suggestions}
                    disabled={chipsDisabled}
                    onSelect={(text) => {
                      if (chipsDisabled || !onSend) return;
                      onSend(text);
                    }}
                  />
                )}
              </div>
            );
          }
          if (msg.kind === "homework" || msg.homework) {
            return (
              <div className="msg child homework-msg" key={msg.id || i}>
                <div className="homework-msg-label">
                  {msg.homework?.attachmentKind === "document" ? (
                    <FileText size={12} />
                  ) : (
                    <ImageIcon size={12} />
                  )}
                  {msg.homework?.attachmentKind === "document"
                    ? msg.homework?.attachmentName || "My document"
                    : "My work"}
                </div>
                {msg.homework?.imageUrl && (
                  <a
                    href={msg.homework.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="homework-thumb-wrap"
                  >
                    <img
                      src={msg.homework.imageUrl}
                      alt="Uploaded homework"
                      className="homework-thumb"
                    />
                  </a>
                )}
                <div className="homework-msg-text">{msg.text}</div>
                {msg.homework?.analysis?.errors?.length > 0 && (
                  <ul className="homework-error-hints">
                    {msg.homework.analysis.errors.slice(0, 2).map((e, ei) => (
                      <li key={ei}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }
          return (
            <div className="msg child" key={msg.id || i}>
              {msg.text}
            </div>
          );
        })}

        {conversationEnded && (endedSummary || reflectionResult) && (
          <ConversationEndedCard
            summary={endedSummary}
            reflection={reflectionResult}
            onStartNew={onContinueAfterEnd || onStartNewConversation}
            onOpenJournal={onOpenJournal}
            onReviewSpark={onReviewSparkCta}
          />
        )}

        {showSoftNudge && (
          <InterventionBanner
            status="nudge"
            context={softNudge}
            isStreaming={isStreaming}
            hasAi={hasAi}
            onNudgeThinking={onNudgeThinking}
            onNudgeHelp={onNudgeHelp}
          />
        )}

        {showAffectCheckIn && (
          <AffectCheckInCard
            checkIn={affectCheckIn}
            onRespond={onAffectRespond}
            onDismiss={onAffectDismiss}
            /* B7 session-start stays tappable if greeting begins after wait timeout */
            disabled={
              isStreaming && affectCheckIn?.reason !== "session_start"
            }
          />
        )}

        {showSessionReflection && (
          <SessionReflectionCard
            reflection={sessionReflection}
            onSubmit={onReflectionSubmit}
            onSkip={onReflectionSkip}
            disabled={isSummarizing}
            reviewCta={sessionReflection?.reviewCtaPreview || null}
          />
        )}

        {showAssessmentOffer && assessmentOfferSlot}

        {independenceOfferSlot &&
          !showSessionReflection &&
          !showAssessmentOffer &&
          !interventionOffered &&
          !focusModeRunning &&
          !isArchiveView &&
          !conversationEnded &&
          independenceOfferSlot}

        {independenceSlot}

        {persistenceNote?.text && !isArchiveView && (
          <PersistenceChip
            text={persistenceNote.text}
            onDismiss={onDismissPersistenceNote}
          />
        )}

        {interventionOffered && !dailyCapReached && !isArchiveView && !conversationEnded && (
          <InterventionBanner
            status="offered"
            context={{
              ...intervention.context,
              escalate: intervention.escalate,
            }}
            isStreaming={isStreaming}
            hasAi={hasAi}
            onAccept={onAcceptIntervention}
            onDecline={onDeclineIntervention}
            onPickLevel={onPickLevel}
            showLevelPicker
          />
        )}

        {isStreaming && messages.length === 0 && <TypingDots />}

        {safetyEscalation && !isArchiveView && (
          <SafetyEscalationCard
            copy={safetyEscalation.copy}
            onPause={
              safetyEscalation.paused || safetyEscalation.acknowledged
                ? undefined
                : onSafetyPause
            }
            onResume={onSafetyResume}
          />
        )}

        {effectiveChatError && !isArchiveView && !safetyEscalation && (
          <ChatErrorBanner
            error={effectiveChatError}
            onRetry={onRetryChatError}
            onDismiss={dailyCapReached ? undefined : onDismissChatError}
            onOpenSettings={onOpenAiSettings}
            isStreaming={isStreaming}
          />
        )}
      </div>

      {assessmentSlot}
      {multiStepSlot}
      {manipulativeSlot}

      {(homeworkError || homeworkBusy) && (
        <div
          className={`homework-status-bar${homeworkError ? " is-error" : ""}`}
          role="status"
        >
          {homeworkBusy ? (
            <>
              <Loader2 size={14} className="spin" /> Looking at your work…
            </>
          ) : (
            <>
              <span>{homeworkError}</span>
              {onClearHomeworkError && (
                <button type="button" onClick={onClearHomeworkError}>
                  Dismiss
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="lesson-composer-shell">
      {modeMenuOpen && !inputDisabled && matchingModes.length > 0 && (
        <div className="lesson-mode-menu" role="listbox" aria-label="Choose an input mode">
          <p className="lesson-mode-menu-label">Write it your way</p>
          {matchingModes.map((mode, index) => {
            const Icon = mode.Icon;
            return (
              <button
                key={mode.id}
                type="button"
                className={`lesson-mode-option${index === activeModeIndex ? " is-active" : ""}`}
                role="option"
                aria-selected={index === activeModeIndex}
                onMouseEnter={() => setActiveModeIndex(index)}
                onClick={() => chooseComposerMode(mode)}
              >
                <span className="lesson-mode-option-icon"><Icon size={17} /></span>
                <span className="lesson-mode-option-copy">
                  <strong>{mode.label}</strong>
                  <small>{mode.description}</small>
                </span>
                <kbd>{mode.command}</kbd>
              </button>
            );
          })}
          <p className="lesson-mode-menu-foot">↑ ↓ to browse · Enter to choose · Esc to close</p>
        </div>
      )}
      <div
        className={`lesson-input${composerMode === "code" ? " is-code-mode" : ""}${
          dailyCapReached ? " is-cap-locked" : ""
        }`}
      >
        <button
          type="button"
          className={`lesson-mode-trigger${composerMode !== "text" ? " is-selected" : ""}`}
          aria-label={`Input mode: ${selectedComposerMode.label}. Change mode`}
          aria-expanded={modeMenuOpen}
          title="Change input mode (type /)"
          disabled={inputDisabled}
          onClick={() => {
            if (modeMenuOpen) {
              if (/^\/[a-z]*$/i.test(inputVal)) setInputVal("");
            } else if (!inputVal.trim()) {
              setInputVal("/");
            }
            setActiveModeIndex(0);
            setModeMenuOpen((open) => !open);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          <ModeIcon size={16} />
          <span>{selectedComposerMode.label}</span>
          <ChevronDown size={13} />
        </button>
        {composerMode === "code" && (
          <select
            className="lesson-code-language"
            aria-label="Code language"
            value={codeLanguage}
            onChange={(event) => setCodeLanguage(event.target.value)}
          >
            {CODE_LANGUAGES.map((language) => (
              <option key={language} value={language}>{language}</option>
            ))}
          </select>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={HOMEWORK_ACCEPT}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file && onAttachHomework) onAttachHomework(file);
          }}
        />
        <button
          className="icon-btn"
          aria-label="Attach homework photo or document"
          title="Attach a photo, PDF, Word, or text file"
          disabled={inputDisabled || !onAttachHomework}
          onClick={() => fileInputRef.current?.click()}
        >
          {homeworkBusy ? (
            <Loader2 size={18} className="spin" color="#1F3A34" />
          ) : (
            <Plus size={18} color="#1F3A34" />
          )}
        </button>
        <textarea
          ref={inputRef}
          aria-keyshortcuts="Alt+Shift+I"
          rows={
            composerMode === "code"
              ? 5
              : Math.min(4, Math.max(1, (inputVal.match(/\n/g) || []).length + 1))
          }
          className="lesson-composer-input"
          aria-label={
            composerMode === "code"
              ? `Write ${codeLanguage} code`
              : composerMode === "math"
                ? "Enter a math expression"
                : composerMode === "working"
                  ? "Show your working"
                  : "Message Kindling"
          }
          placeholder={
            isArchiveView
              ? "Read-only — return to the live lesson to chat"
              : conversationEnded
                ? "Conversation ended — start a new one to continue"
                : dailyCapReached
                  ? `Chat disabled — today's AI allowance is used up (resets at ${dailyAiUsage?.resetsAt || "midnight UTC"})`
                  : offline
                    ? "You're offline — reconnect to chat"
                    : safetyActive || safetyPaused
                      ? "Lesson paused — use the buttons above when you're ready"
                      : chatError
                        ? "Tap Try again above, or type a new message…"
                        : isListening
                          ? "🎙 Listening — speak now…"
                          : isStreaming || isSummarizing
                            ? "Kindling is thinking…"
                            : interventionActive
                              ? `Ask a question or try the next step, ${studentName}…`
                            : composerMode === "code"
                              ? `Paste or write ${codeLanguage} code… (Enter for a new line)`
                              : composerMode === "math"
                                ? "Type an equation, expression, or question…"
                                : composerMode === "working"
                                  ? "Write your steps here…"
                                  : `Answer Kindling, ${studentName}…`
          }
          value={inputVal}
          disabled={inputDisabled}
          onChange={(event) => {
            const value = event.target.value;
            setInputVal(value);
            if (/^\/[a-z]*$/i.test(value)) {
              setModeMenuOpen(true);
              setActiveModeIndex(0);
            } else if (modeMenuOpen && !value.startsWith("/")) {
              setModeMenuOpen(false);
            }
          }}
          onKeyDown={handleComposerKeyDown}
          autoCapitalize={composerMode === "code" ? "off" : "sentences"}
          spellCheck={composerMode !== "code"}
          style={{
            borderColor: isListening
              ? "var(--teal)"
              : interventionActive
                ? "var(--marigold)"
                : undefined,
            boxShadow: isListening
              ? "0 0 0 3px rgba(62,138,143,.18)"
              : undefined,
          }}
        />
        <button
          className={`icon-btn${isListening ? " mic-btn-active" : ""}`}
          aria-label={isListening ? "Stop listening" : "Speak answer"}
          title={
            isListening
              ? "Listening — click to stop"
              : "Click to speak your answer"
          }
          onClick={onToggleListening}
          disabled={inputDisabled}
        >
          <Mic size={18} color={isListening ? "#fff" : "#1F3A34"} />
        </button>
        <button
          className="icon-btn send-btn"
          aria-label="Send"
          disabled={inputDisabled || !inputVal.trim()}
          onClick={sendComposerMessage}
        >
          <Send size={17} color="currentColor" />
        </button>
      </div>
      <div className="lesson-composer-hint" aria-live="polite">
        {dailyCapReached
          ? `Today's platform AI allowance is used up · Resets at ${dailyAiUsage?.resetsAt || "midnight UTC"}`
          : composerMode === "code"
            ? `Code mode · ${codeLanguage} · Enter for a new line, Ctrl+Enter to send`
            : composerMode === "text"
              ? "Type / to switch modes"
              : `${selectedComposerMode.label} mode · Type / to switch modes`}
      </div>
      </div>
    </main>
  );
}
