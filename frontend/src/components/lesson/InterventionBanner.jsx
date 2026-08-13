import {
  LifeBuoy,
  X,
  Sparkles,
  ArrowRight,
  HandHeart,
  Lightbulb,
  BookOpen,
  Trees,
  ArrowUpRight,
} from "lucide-react";

function levelIcon(level) {
  switch (Number(level)) {
    case 1:
      return <Lightbulb size={20} />;
    case 2:
      return <BookOpen size={20} />;
    case 4:
      return <Trees size={20} />;
    default:
      return <LifeBuoy size={20} />;
  }
}

/**
 * In-chat UI for intervention ladder: nudge, offer, active bar, escalate.
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
  onNudgeThinking,
  onNudgeHelp,
  onEscalate,
  onPickLevel,
  showLevelPicker = false,
}) {
  // Epic B1: soft idle nudge (before a full intervention offer)
  if (status === "nudge" && context) {
    return (
      <div
        className="intervention-offer intervention-nudge"
        role="region"
        aria-label="Gentle check-in"
      >
        <div className="intervention-offer-icon nudge">
          <HandHeart size={20} />
        </div>
        <div className="intervention-offer-body">
          <p className="intervention-offer-eyebrow">No rush</p>
          <h4 className="intervention-offer-title">{context.headline}</h4>
          <p className="intervention-offer-text">{context.body}</p>
          <div className="intervention-offer-actions">
            <button
              type="button"
              className="intervention-btn ghost"
              onClick={onNudgeThinking}
              disabled={isStreaming}
            >
              I&apos;m still thinking
            </button>
            <button
              type="button"
              className="intervention-btn primary"
              onClick={onNudgeHelp}
              disabled={isStreaming || !hasAi}
            >
              <Sparkles size={14} />
              Yes, help me
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "offered" && context) {
    const isEscalate = context.reason === "escalate" || context.escalate;
    const level = context.level || 3;
    const cta = context.acceptCta || "Yes, guide me";
    return (
      <div
        className={`intervention-offer ladder-level-${level}${
          isEscalate ? " escalate" : ""
        }`}
        role="region"
        aria-label={isEscalate ? "More help offer" : "Help offer"}
      >
        <div className={`intervention-offer-icon level-${level}`}>
          {levelIcon(level)}
        </div>
        <div className="intervention-offer-body">
          <p className="intervention-offer-eyebrow">
            {isEscalate
              ? "A bit more support"
              : context.eyebrow || "Kindling noticed"}
          </p>
          <div className="intervention-level-pill">
            Level {level} · {context.levelLabel || "Help"}
          </div>
          <h4 className="intervention-offer-title">{context.headline}</h4>
          <p className="intervention-offer-text">{context.body}</p>
          {context.workedExample?.title && level === 2 && (
            <p className="intervention-example-tag">
              Example ready: {context.workedExample.title}
            </p>
          )}
          {context.easierSkill?.name && level === 4 && (
            <p className="intervention-example-tag">
              Easier path: {context.easierSkill.name}
              {context.easierSkill.topic
                ? ` · ${context.easierSkill.topic}`
                : ""}
            </p>
          )}
          <div className="intervention-offer-actions">
            <button
              type="button"
              className="intervention-btn primary"
              onClick={onAccept}
              disabled={isStreaming || !hasAi}
            >
              <Sparkles size={14} />
              {cta}
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
          {showLevelPicker && onPickLevel && (
            <div className="intervention-level-picker" role="group" aria-label="Help level">
              <span className="intervention-level-picker-label">Or pick:</span>
              {[1, 2, 3, 4].map((lv) => (
                <button
                  key={lv}
                  type="button"
                  className={`intervention-level-chip${
                    lv === level ? " current" : ""
                  }`}
                  disabled={isStreaming || !hasAi}
                  onClick={() => onPickLevel(lv)}
                >
                  {lv === 1
                    ? "Hint"
                    : lv === 2
                      ? "Example"
                      : lv === 3
                        ? "Guide"
                        : "Easier"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === "active" && context) {
    const level = context.level || 3;
    const title = context.activeTitle || context.levelLabel || "Step-by-step guide";
    const exitLabel = context.exitLabel || "Exit guide";
    const canEscalate = level < 4 && typeof onEscalate === "function";
    return (
      <div
        className={`intervention-active-bar ladder-level-${level}`}
        role="status"
        aria-live="polite"
      >
        <div className="intervention-active-left">
          <span className="intervention-active-dot" />
          <div>
            <strong>
              {title}
              <span className="intervention-level-inline"> · L{level}</span>
            </strong>
            <span className="intervention-active-topic">
              {autoEntered ? "Kindling stepped in · " : ""}
              {context.topic}
            </span>
          </div>
        </div>
        <div className="intervention-active-actions">
          {canEscalate && (
            <button
              type="button"
              className="intervention-escalate-btn"
              onClick={onEscalate}
              disabled={isStreaming || !hasAi}
              title="Get a stronger kind of help"
            >
              <ArrowUpRight size={14} />
              More help
            </button>
          )}
          <button
            type="button"
            className="intervention-exit-btn"
            onClick={onExit}
            disabled={isStreaming}
            title="Leave help mode and return to normal practice"
          >
            <X size={14} />
            {exitLabel}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/** Compact system message row inside the chat transcript. */
export function InterventionSystemChip({ kind, text }) {
  const isEnter =
    kind === "intervention_enter" || kind === "multistep_enter";
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
