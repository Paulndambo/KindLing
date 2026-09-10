import { useEffect, useState } from "react";
import { Check, X, Sparkles, Target } from "lucide-react";
import {
  IndependencePhase,
  independenceCelebrationCopy,
  getIndependenceQuestion,
} from "../../services/learning/independenceCheck";

/**
 * Epic L4 — single no-scaffold twin question after heavy help.
 * Reuses assessment visual language; framed as independence, not a test.
 */
export default function IndependencePanel({
  session,
  open = true,
  onAnswer,
  onContinue,
  onExit,
  disabled = false,
}) {
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    setPicked(null);
  }, [session?.id, session?.phase]);

  if (!open || !session?.questions?.length) return null;

  const done = session.status === IndependencePhase.COMPLETED;
  const explaining =
    session.phase === IndependencePhase.EXPLAINING ||
    session.status === IndependencePhase.EXPLAINING;
  const q = getIndependenceQuestion(session);
  const result = session.lastResult;
  const celeb = done ? independenceCelebrationCopy(session) : null;

  return (
    <div
      className={`assessment-panel independence-panel${done ? " done" : ""}`}
      role="region"
      aria-label="Independence spark"
    >
      <div className="assessment-head">
        <div className="assessment-head-left">
          <p className="assessment-eyebrow">
            <Sparkles size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
            Independence spark
            {session.transfer ? " · transfer" : " · twin"}
            {" · no hints"}
          </p>
          <h4 className="assessment-title">
            {done
              ? celeb?.headline || "Done"
              : explaining
                ? "Quick note"
                : "One on your own"}
          </h4>
        </div>
        <button
          type="button"
          className="assessment-icon-btn"
          onClick={onExit}
          disabled={disabled}
          aria-label="Close independence check"
        >
          <X size={16} />
        </button>
      </div>

      <div className="assessment-progress" aria-hidden>
        <div
          className="assessment-progress-fill"
          style={{ width: done ? "100%" : explaining ? "70%" : "35%" }}
        />
      </div>

      <p className="assessment-credit">
        {session.transfer
          ? "New packaging, same idea — no scaffold this turn."
          : "Same idea as your guided practice — try without help."}
      </p>

      {done ? (
        <div className="assessment-done">
          <p className="assessment-done-body">{celeb?.body}</p>
          {session.outcome && (
            <ul className="assessment-score-list" aria-label="Result">
              <li>
                {session.outcome.success ? (
                  <>
                    <Check size={14} /> Independent success
                  </>
                ) : (
                  <>
                    <Target size={14} /> Solo try logged — keep going
                  </>
                )}
              </li>
              {session.transfer && (
                <li>
                  <Sparkles size={14} /> Transfer surface
                </li>
              )}
            </ul>
          )}
          <button
            type="button"
            className="journal-primary-btn assessment-done-btn"
            onClick={onExit}
          >
            Back to lesson
          </button>
        </div>
      ) : q ? (
        <>
          <div className="assessment-question">
            <p className="assessment-q-meta">
              {session.noScaffold ? "No hints · one question" : "One question"}
            </p>
            <p className="assessment-prompt">{q.prompt}</p>
            <div className="assessment-options" role="listbox">
              {(q.options || []).map((opt, i) => {
                let cls = "assessment-option";
                if (explaining && result) {
                  if (i === result.correctIndex) cls += " is-correct";
                  else if (i === result.selectedIndex && !result.correct)
                    cls += " is-wrong";
                } else if (picked === i) {
                  cls += " is-picked";
                }
                return (
                  <button
                    key={opt.id || i}
                    type="button"
                    className={cls}
                    disabled={disabled || explaining}
                    onClick={() => {
                      if (explaining) return;
                      setPicked(i);
                      onAnswer?.(i);
                    }}
                  >
                    <span className="assessment-opt-letter" aria-hidden>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="assessment-opt-text">{opt.text}</span>
                    {explaining && result && i === result.correctIndex && (
                      <Check size={14} className="assessment-opt-icon" />
                    )}
                    {explaining &&
                      result &&
                      i === result.selectedIndex &&
                      !result.correct && (
                        <X size={14} className="assessment-opt-icon" />
                      )}
                  </button>
                );
              })}
            </div>
          </div>
          {explaining && result && (
            <div
              className={`assessment-explain ${
                result.correct ? "ok" : "miss"
              }`}
            >
              <div className="assessment-explain-head">
                {result.correct ? "You owned it" : "Solo try — learn from it"}
              </div>
              <p className="assessment-explain-body">{result.explanation}</p>
              <button
                type="button"
                className="journal-primary-btn assessment-next-btn"
                onClick={onContinue}
                disabled={disabled}
              >
                Continue
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

/**
 * Soft offer card before starting the twin.
 */
export function IndependenceOfferCard({
  offer,
  onAccept,
  onDecline,
  disabled = false,
}) {
  if (!offer) return null;
  return (
    <div
      className="assessment-offer affect-checkin independence-offer"
      role="region"
      aria-label="Independence spark offer"
    >
      <div className="affect-checkin-icon" aria-hidden>
        <Sparkles size={18} />
      </div>
      <div className="affect-checkin-body">
        <div className="affect-checkin-top">
          <p className="affect-checkin-eyebrow">
            {offer.eyebrow || "Independence spark"}
          </p>
          {onDecline && (
            <button
              type="button"
              className="affect-checkin-dismiss"
              onClick={onDecline}
              disabled={disabled}
              aria-label="Not now"
              title="Not now"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <h4 className="affect-checkin-title">{offer.headline}</h4>
        <p className="affect-checkin-text">{offer.body}</p>
        <div className="session-reflection-actions">
          <button
            type="button"
            className="journal-primary-btn"
            onClick={onAccept}
            disabled={disabled}
          >
            {offer.acceptCta || "Yes, one question"}
          </button>
          <button
            type="button"
            className="journal-secondary-btn"
            onClick={onDecline}
            disabled={disabled}
          >
            {offer.declineCta || "Not now"}
          </button>
        </div>
      </div>
    </div>
  );
}
