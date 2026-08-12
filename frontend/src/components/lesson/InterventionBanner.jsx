import { LifeBuoy, X, Sparkles, ArrowRight } from "lucide-react";

/**
 * In-chat UI for intervention: offer card, active guide bar, or compact system chip.
 */
export default function InterventionBanner({
  status,
  context,
  autoEntered = false,
  isStreaming = false,
  hasAi = true,
  onAccept,
  onDecline,
  onExit,
}) {
  if (status === "offered" && context) {
    return (
      <div
        className="intervention-offer"
        role="region"
        aria-label="Step-by-step help offer"
      >
        <div className="intervention-offer-icon">
          <LifeBuoy size={20} />
        </div>
        <div className="intervention-offer-body">
          <p className="intervention-offer-eyebrow">Kindling noticed</p>
          <h4 className="intervention-offer-title">{context.headline}</h4>
          <p className="intervention-offer-text">{context.body}</p>
          <div className="intervention-offer-actions">
            <button
              type="button"
              className="intervention-btn primary"
              onClick={onAccept}
              disabled={isStreaming || !hasAi}
            >
              <Sparkles size={14} />
              Yes, guide me
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              className="intervention-btn ghost"
              onClick={onDecline}
              disabled={isStreaming}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "active" && context) {
    return (
      <div
        className="intervention-active-bar"
        role="status"
        aria-live="polite"
      >
        <div className="intervention-active-left">
          <span className="intervention-active-dot" />
          <div>
            <strong>Step-by-step guide</strong>
            <span className="intervention-active-topic">
              {autoEntered ? "Kindling stepped in · " : ""}
              {context.topic}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="intervention-exit-btn"
          onClick={onExit}
          disabled={isStreaming}
          title="Leave guide mode and return to normal practice"
        >
          <X size={14} />
          Exit guide
        </button>
      </div>
    );
  }

  return null;
}

/** Compact system message row inside the chat transcript. */
export function InterventionSystemChip({ kind, text }) {
  const isEnter = kind === "intervention_enter";
  const isResume = kind === "resume";
  const tone = isEnter ? "enter" : isResume ? "resume" : "exit";
  return (
    <div
      className={`intervention-system-chip ${tone}`}
      role="status"
    >
      {isEnter ? <LifeBuoy size={12} /> : <ArrowRight size={12} />}
      <span>{text}</span>
    </div>
  );
}
