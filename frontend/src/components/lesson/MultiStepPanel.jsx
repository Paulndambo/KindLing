import { Check, Circle, ArrowRight, X, ListOrdered, Lightbulb } from "lucide-react";
import { StepStatus, scorePartialCredit } from "../../services/learning/multiStepEngine";

function StepIcon({ status }) {
  if (status === StepStatus.CORRECT) {
    return <Check size={14} className="ms-icon ok" aria-hidden />;
  }
  if (status === StepStatus.CURRENT) {
    return <ArrowRight size={14} className="ms-icon cur" aria-hidden />;
  }
  if (status === StepStatus.PARTIAL) {
    return <Circle size={14} className="ms-icon mid" aria-hidden />;
  }
  if (status === StepStatus.INCORRECT) {
    return <Circle size={14} className="ms-icon bad" aria-hidden />;
  }
  return <Circle size={14} className="ms-icon pending" aria-hidden />;
}

/**
 * Epic B6 — session UI for multi-step show-your-work.
 */
export default function MultiStepPanel({
  session,
  open = true,
  onClose,
  onExit,
  onHint,
  disabled = false,
  compact = false,
}) {
  if (!open || !session?.problem) return null;

  const credit = scorePartialCredit(session);
  const cur = session.steps?.[session.currentIndex];
  const done = session.status === "completed";

  return (
    <div
      className={`multistep-panel${compact ? " compact" : ""}${
        done ? " done" : ""
      }`}
      role="region"
      aria-label="Show your work steps"
    >
      <div className="multistep-head">
        <div className="multistep-head-left">
          <ListOrdered size={16} aria-hidden />
          <div>
            <p className="multistep-eyebrow">Show your work</p>
            <h4 className="multistep-title">{session.problem.title}</h4>
          </div>
        </div>
        <div className="multistep-head-actions">
          {onHint && cur && !done && (
            <button
              type="button"
              className="multistep-icon-btn"
              onClick={onHint}
              disabled={disabled}
              title="Hint for this step"
            >
              <Lightbulb size={14} />
            </button>
          )}
          <button
            type="button"
            className="multistep-icon-btn"
            onClick={onExit || onClose}
            disabled={disabled}
            title="Exit show-your-work"
            aria-label="Exit show-your-work"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <p className="multistep-prompt">
        {session.problem.promptPlain || session.problem.prompt}
      </p>

      <div className="multistep-progress" aria-hidden>
        <div
          className="multistep-progress-fill"
          style={{ width: `${credit.percent}%` }}
        />
      </div>
      <p className="multistep-credit">
        {done
          ? `Finished · ${credit.percent}% solid steps`
          : `Step ${(session.currentIndex || 0) + 1} of ${
              session.steps?.length || 0
            } · ${credit.percent}% so far`}
      </p>

      <ol className="multistep-list">
        {(session.steps || []).map((s) => (
          <li
            key={s.id || s.index}
            className={`multistep-step status-${s.status}${
              s.status === StepStatus.CURRENT ? " is-current" : ""
            }`}
          >
            <StepIcon status={s.status} />
            <div className="multistep-step-body">
              <strong>
                {s.index}. {s.label}
              </strong>
              {s.status === StepStatus.CURRENT && (
                <span className="multistep-step-ask">{s.prompt}</span>
              )}
              {s.studentAnswer && s.status !== StepStatus.CURRENT && (
                <span className="multistep-step-ans">You: {s.studentAnswer}</span>
              )}
            </div>
          </li>
        ))}
      </ol>

      {done ? (
        <p className="multistep-done-msg">
          Nice path through the work
          {credit.percent >= 80
            ? " — strong steps end to end."
            : " — every solid step counts."}
        </p>
      ) : (
        <p className="multistep-hint-line">
          Answer the current step in the chat. Kindling checks each piece and
          gives partial credit for solid work.
        </p>
      )}
    </div>
  );
}
