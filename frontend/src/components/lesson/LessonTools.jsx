import {
  Volume2,
  RefreshCw,
  Brain,
  Activity,
  LifeBuoy,
  X,
  BookOpen,
  MessageSquarePlus,
  Square,
} from "lucide-react";

function signalLabel(correctness) {
  switch (correctness) {
    case "correct":
      return { text: "On track", tone: "good" };
    case "partial":
      return { text: "Partial understanding", tone: "mid" };
    case "incorrect":
      return { text: "Needs scaffold", tone: "focus" };
    case "exploring":
      return { text: "Exploring / asking", tone: "mid" };
    default:
      return { text: "Observing…", tone: "muted" };
  }
}

function affectLabel(affect) {
  const map = {
    confident: "Confident",
    hesitant: "Hesitant",
    frustrated: "Frustrated",
    curious: "Curious",
    disengaged: "Low engagement",
    neutral: "Steady",
  };
  return map[affect] || "—";
}

export default function LessonTools({
  tools,
  onToggle,
  diffPct,
  diffLabel,
  isStreaming,
  hasAi,
  student,
  studentName,
  onRequestHint,
  onRestart,
  onEndConversation,
  onStartNewConversation,
  onOpenJournal,
  isSummarizing = false,
  conversationEnded = false,
  isArchiveView = false,
  archiveCount = 0,
  lastSignals = null,
  sessionSummary = null,
  learningInsights = null,
  intervention = null,
  onRequestGuide,
  onExitIntervention,
  onAcceptIntervention,
  onDeclineIntervention,
  hasManipulatives = false,
  manipOpen = false,
  onOpenManipulative,
  manipState = null,
}) {
  const last = lastSignals ? signalLabel(lastSignals.correctness) : null;
  const accuracyPct =
    sessionSummary?.accuracy != null
      ? Math.round(sessionSummary.accuracy * 100)
      : null;

  const interventionActive = intervention?.status === "active";
  const interventionOffered = intervention?.status === "offered";

  return (
    <aside className="lesson-tools">
      <div>
        <h4>Live difficulty</h4>
        <div className="diff-track">
          <div
            className="diff-fill"
            style={{ width: `${diffPct}%`, transition: "width 0.7s ease" }}
          />
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8 }}>
          {diffLabel}
        </p>
      </div>

      {/* Intervention / step-by-step guide controls */}
      <div
        className={`intervention-tools-panel${
          interventionActive ? " active" : ""
        }${interventionOffered ? " offered" : ""}`}
      >
        <h4>
          <LifeBuoy size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
          Step-by-step guide
        </h4>
        {interventionActive ? (
          <>
            <p className="intervention-tools-text">
              Kindling is walking through{" "}
              <strong>{intervention.context?.topic || "this topic"}</strong>{" "}
              with explanations and examples. {studentName} can stay as long as
              they need.
            </p>
            <button
              type="button"
              className="intervention-exit-btn full"
              onClick={onExitIntervention}
              disabled={isStreaming}
            >
              <X size={14} />
              Exit guide mode
            </button>
          </>
        ) : interventionOffered ? (
          <>
            <p className="intervention-tools-text">
              {intervention.context?.headline ||
                "Kindling noticed a struggle"}
              . Offer a guided walkthrough?
            </p>
            <div className="intervention-tools-actions">
              <button
                type="button"
                className="intervention-btn primary compact"
                onClick={onAcceptIntervention}
                disabled={isStreaming || !hasAi}
              >
                Start guide
              </button>
              <button
                type="button"
                className="intervention-btn ghost compact"
                onClick={onDeclineIntervention}
                disabled={isStreaming}
              >
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="intervention-tools-text">
              If {studentName} is stuck, Kindling can switch into a clear
              step-by-step explanation with examples — or will offer help after
              repeated misses.
            </p>
            <button
              type="button"
              className="guide-btn"
              onClick={onRequestGuide}
              disabled={isStreaming || !hasAi}
              style={{ opacity: isStreaming || !hasAi ? 0.45 : 1 }}
            >
              <LifeBuoy size={14} />
              Start step-by-step guide
            </button>
          </>
        )}
      </div>

      {/* Learner pulse — Kindling's understanding of this student right now */}
      <div className="learner-pulse">
        <h4>
          <Brain size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
          Learner pulse
        </h4>
        {lastSignals ? (
          <div className="learner-pulse-body">
            <div className={`pulse-chip tone-${last.tone}`}>{last.text}</div>
            <div className="pulse-row">
              <span>Affect</span>
              <strong>{affectLabel(lastSignals.affect)}</strong>
            </div>
            <div className="pulse-row">
              <span>Confidence</span>
              <strong>{Math.round(lastSignals.confidence * 100)}%</strong>
            </div>
            <div className="pulse-row">
              <span>Engagement</span>
              <strong>{Math.round(lastSignals.engagement * 100)}%</strong>
            </div>
            {lastSignals.responseMs != null && (
              <div className="pulse-row">
                <span>Think time</span>
                <strong>
                  {lastSignals.responseMs < 1000
                    ? "<1s"
                    : `${Math.round(lastSignals.responseMs / 1000)}s`}
                </strong>
              </div>
            )}
            {lastSignals.misconceptions?.length > 0 && (
              <p className="pulse-note">
                Flagged:{" "}
                {lastSignals.misconceptions.map((m) => m.label).join(", ")}
              </p>
            )}
          </div>
        ) : (
          <p className="pulse-empty">
            Kindling learns from each reply — correctness, confidence, and how{" "}
            {studentName} likes to think.
          </p>
        )}

        {sessionSummary && (
          <div className="session-pulse">
            <div className="pulse-row">
              <span>
                <Activity size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                This session
              </span>
              <strong>
                {sessionSummary.turnCount || sessionSummary.counters
                  ? `${sessionSummary.turnCount ?? 0} turns`
                  : "—"}
              </strong>
            </div>
            {accuracyPct != null && (
              <div className="pulse-row">
                <span>Accuracy signal</span>
                <strong>{accuracyPct}%</strong>
              </div>
            )}
            {sessionSummary.counters && (
              <div className="pulse-mini-grid">
                <span>✓ {sessionSummary.counters.correct || 0}</span>
                <span>~ {sessionSummary.counters.partial || 0}</span>
                <span>✗ {sessionSummary.counters.incorrect || 0}</span>
                <span>💡 {sessionSummary.counters.hints || 0}</span>
              </div>
            )}
          </div>
        )}

        {learningInsights?.stats?.focusAreas?.length > 0 && (
          <p className="pulse-note">
            Focus areas:{" "}
            {learningInsights.stats.focusAreas
              .slice(0, 2)
              .map((f) => f.topic)
              .join(", ")}
          </p>
        )}
      </div>

      {hasManipulatives && (
        <div className="manip-tools-block">
          <h4>
            <Square size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
            Interactive model
          </h4>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 8px" }}>
            Fraction bars & number lines help make parts of a whole concrete.
            {manipState
              ? ` Showing ${manipState.num}/${manipState.den}.`
              : ""}
          </p>
          <button
            type="button"
            className="hint-btn"
            onClick={onOpenManipulative}
            disabled={isStreaming}
          >
            {manipOpen ? "Focus model in chat" : "Open fraction model"}
          </button>
        </div>
      )}

      <div className={`voice-panel${tools.voiceOutput ? " active" : ""}`}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div className="voice-label">
            <Volume2 size={15} />
            Voice Output
          </div>
          <div
            className={`switch ${tools.voiceOutput ? "on" : ""}`}
            onClick={() => onToggle("voiceOutput")}
            role="switch"
            aria-checked={tools.voiceOutput}
          />
        </div>
        {tools.voiceOutput && (
          <p className="voice-info">
            Kindling reads replies in a natural Gemini voice. Click{" "}
            <strong>Read aloud</strong> under any message to replay it.
          </p>
        )}
      </div>

      <div>
        <h4>Tools</h4>
        <div className="tool-row">
          Show visual models{" "}
          <div
            className={`switch ${tools.visuals ? "on" : ""}`}
            onClick={() => onToggle("visuals")}
            role="switch"
            aria-checked={tools.visuals}
          />
        </div>
        <div className="tool-row">
          Extra encouragement{" "}
          <div
            className={`switch ${tools.encourage ? "on" : ""}`}
            onClick={() => onToggle("encourage")}
            role="switch"
            aria-checked={tools.encourage}
          />
        </div>
      </div>

      <button
        type="button"
        className="hint-btn"
        onClick={onRequestHint}
        disabled={
          isStreaming ||
          !hasAi ||
          interventionActive ||
          conversationEnded ||
          isArchiveView
        }
        style={{
          opacity:
            isStreaming ||
            !hasAi ||
            interventionActive ||
            conversationEnded ||
            isArchiveView
              ? 0.5
              : 1,
        }}
      >
        {isStreaming
          ? "Kindling is thinking…"
          : interventionActive
            ? "💡 In guide mode"
            : "💡 Get a hint"}
      </button>

      <div className="conversation-tools-panel">
        <h4>
          <BookOpen size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
          Conversations
        </h4>
        <p className="conversation-tools-text">
          Kindling remembers this topic. Come back anytime—or save a summary to
          your Learning Journal when you finish.
        </p>
        <div className="conversation-tools-stack">
          <button
            type="button"
            className="journal-open-btn"
            onClick={onOpenJournal}
            disabled={isSummarizing}
          >
            <BookOpen size={14} />
            Learning Journal
            {archiveCount > 0 ? ` (${archiveCount})` : ""}
          </button>
          <button
            type="button"
            className="new-conversation-btn"
            onClick={onStartNewConversation || onRestart}
            disabled={isStreaming || isSummarizing || !hasAi}
          >
            <MessageSquarePlus size={14} />
            New conversation
          </button>
          <button
            type="button"
            className="end-conversation-btn"
            onClick={onEndConversation}
            disabled={
              isStreaming ||
              isSummarizing ||
              conversationEnded ||
              isArchiveView ||
              !hasAi
            }
          >
            <Square size={13} />
            {isSummarizing ? "Saving summary…" : "End & save summary"}
          </button>
        </div>
        <button
          type="button"
          className="restart-lesson-btn subtle"
          onClick={onRestart}
          disabled={isStreaming || isSummarizing}
          title="Same as new conversation — archives the current thread"
        >
          <RefreshCw size={14} /> Fresh start on this topic
        </button>
      </div>

      <div>
        <h4>Student view</h4>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-soft)",
            lineHeight: 1.6,
          }}
        >
          Teaching <strong>{studentName}</strong> ({student?.grade}).
          <br />
          Aligned with {student?.curriculum || "standard curriculum"}.
          <br />
          <span style={{ opacity: 0.85 }}>
            Kindling adapts from every answer — privately and continuously.
          </span>
        </p>
      </div>
    </aside>
  );
}
