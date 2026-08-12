import { Plus, Mic, Send, Volume2, PanelLeft, BookOpen, X } from "lucide-react";
import TypingDots from "./TypingDots";
import TutorMessageContent from "./TutorMessageContent";
import InterventionBanner, {
  InterventionSystemChip,
} from "./InterventionBanner";
import { ConversationEndedCard } from "./ConversationJournal";
import "../../styles/tutor-content.css";

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
  studentName,
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
  onAcceptIntervention,
  onDeclineIntervention,
  onExitIntervention,
  pathCollapsed = false,
  onExpandPath,
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
}) {
  const interventionActive = intervention?.status === "active";
  const interventionOffered = intervention?.status === "offered";
  const inputDisabled =
    isStreaming ||
    !hasAi ||
    isArchiveView ||
    conversationEnded ||
    isSummarizing;

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
            <h3>{topicName}</h3>
            <p className="sub">
              {subjectName} · {curriculum || "Standard"} · {studentName}
              {isResume && !isArchiveView && !conversationEnded
                ? " · Continuing"
                : ""}
              {isArchiveView ? " · Journal view" : ""}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {onOpenJournal && (
            <button
              type="button"
              className="journal-header-btn"
              onClick={onOpenJournal}
              title="Learning Journal"
            >
              <BookOpen size={14} />
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
            }`}
          >
            <span className="pulse" />{" "}
            {isSummarizing
              ? "Saving journal…"
              : isStreaming
                ? "Thinking…"
                : isArchiveView
                  ? "Reading past chat"
                  : conversationEnded
                    ? "Conversation ended"
                    : interventionActive
                      ? "Guide mode"
                      : isResume
                        ? "Picking up where you left"
                        : "Kindling is live"}
          </div>
        </div>
      </div>

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
        />
      )}

      <div className="chat-area" ref={chatAreaRef}>
        {!hasAi && (
          <div className="error-toast" style={{ margin: "auto" }}>
            ⚠ No API key — add VITE_GEMINI_API_KEY to .env
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
              </div>
            );
          }
          return (
            <div className="msg child" key={msg.id || i}>
              {msg.text}
            </div>
          );
        })}

        {conversationEnded && endedSummary && (
          <ConversationEndedCard
            summary={endedSummary}
            onStartNew={onContinueAfterEnd || onStartNewConversation}
            onOpenJournal={onOpenJournal}
          />
        )}

        {interventionOffered && !isArchiveView && !conversationEnded && (
          <InterventionBanner
            status="offered"
            context={intervention.context}
            isStreaming={isStreaming}
            hasAi={hasAi}
            onAccept={onAcceptIntervention}
            onDecline={onDeclineIntervention}
          />
        )}

        {isStreaming && messages.length === 0 && <TypingDots />}
      </div>

      <div className="lesson-input">
        <button
          className="icon-btn"
          aria-label="Attach work"
          title="Attach work"
          disabled={inputDisabled}
        >
          <Plus size={18} color="#1F3A34" />
        </button>
        <input
          ref={inputRef}
          type="text"
          placeholder={
            isArchiveView
              ? "Read-only — return to the live lesson to chat"
              : conversationEnded
                ? "Conversation ended — start a new one to continue"
                : isListening
                  ? "🎙 Listening — speak now…"
                  : isStreaming || isSummarizing
                    ? "Kindling is thinking…"
                    : interventionActive
                      ? `Ask a question or try the next step, ${studentName}…`
                      : `Answer Kindling, ${studentName}…`
          }
          value={inputVal}
          disabled={inputDisabled}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
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
          onClick={onSend}
        >
          <Send size={17} color="currentColor" />
        </button>
      </div>
    </main>
  );
}
