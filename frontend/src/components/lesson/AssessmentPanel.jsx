import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Check,
  X,
  ArrowRight,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import {
  AssessmentPhase,
  assessmentProgressLabel,
  scoreAssessment,
  assessmentCelebrationCopy,
} from "../../services/learning/assessmentEngine";

/**
 * Epic C6 — one-at-a-time MCQ with tutor explanation after each answer.
 * Offline-capable revision check (not open chat).
 */
export default function AssessmentPanel({
  session,
  open = true,
  onAnswer,
  onContinue,
  onExit,
  onDone,
  disabled = false,
}) {
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    setPicked(null);
  }, [session?.currentIndex, session?.id, session?.phase]);

  if (!open || !session?.questions?.length) return null;

  const done = session.status === AssessmentPhase.COMPLETED;
  const explaining = session.phase === AssessmentPhase.EXPLAINING;
  const q = session.questions[session.currentIndex];
  const result = session.lastResult;
  const progress = assessmentProgressLabel(session);
  const score = scoreAssessment(session);
  const celeb = done ? assessmentCelebrationCopy(session) : null;
  const total = session.questions.length;
  const idx = Math.min((session.currentIndex || 0) + 1, total);
  const fillPct = done
    ? 100
    : Math.round(
        ((session.answers?.length || 0) / Math.max(1, total)) * 100
      );

  const handleSelect = (optionIndex) => {
    if (disabled || explaining || done) return;
    setPicked(optionIndex);
    onAnswer?.(optionIndex);
  };

  return (
    <div
      className={`assessment-panel${done ? " done" : ""}${
        explaining ? " explaining" : ""
      }`}
      role="region"
      aria-label="Quick check assessment"
    >
      <div className="assessment-head">
        <div className="assessment-head-left">
          <ClipboardCheck size={16} aria-hidden />
          <div>
            <p className="assessment-eyebrow">
              Quick check
              {session.topic ? ` · ${session.topic}` : ""}
            </p>
            <h4 className="assessment-title">
              {done
                ? celeb?.headline || "Check complete"
                : session.topic
                  ? `Check your understanding`
                  : "Revision check"}
            </h4>
          </div>
        </div>
        <button
          type="button"
          className="assessment-icon-btn"
          onClick={onExit}
          disabled={disabled}
          title={done ? "Close" : "Exit check"}
          aria-label={done ? "Close check" : "Exit check"}
        >
          <X size={14} />
        </button>
      </div>

      <div className="assessment-progress" aria-hidden>
        <div
          className="assessment-progress-fill"
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <p className="assessment-credit">
        {done
          ? `${score.correct}/${score.total} correct · ${score.percent}%`
          : progress}
      </p>

      {done ? (
        <div className="assessment-done">
          <p className="assessment-done-body">
            {celeb?.body ||
              `You finished ${score.correct} of ${score.total}. Use the explanations as revision notes.`}
          </p>
          <ul className="assessment-score-list" aria-label="Results">
            {(session.answers || []).map((a, i) => (
              <li
                key={a.questionId || i}
                className={a.correct ? "ok" : "miss"}
              >
                {a.correct ? (
                  <Check size={13} aria-hidden />
                ) : (
                  <X size={13} aria-hidden />
                )}
                <span>
                  Q{i + 1}
                  {a.concept ? ` · ${a.concept}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="journal-primary-btn assessment-done-btn"
            onClick={() => onDone?.() || onExit?.()}
            disabled={disabled}
          >
            Back to lesson
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <>
          {q && (
            <div className="assessment-question">
              <p className="assessment-q-meta">
                Question {Math.min(idx, total)} of {total}
                {q.concept ? ` · ${q.concept}` : ""}
              </p>
              <p className="assessment-prompt">{q.prompt}</p>
              <div
                className="assessment-options"
                role="group"
                aria-label="Answer choices"
              >
                {(q.options || []).map((opt, oi) => {
                  const isPicked =
                    explaining && result
                      ? result.selectedIndex === oi
                      : picked === oi;
                  const isCorrectOpt =
                    explaining && result && result.correctIndex === oi;
                  const isWrongPick =
                    explaining &&
                    result &&
                    result.selectedIndex === oi &&
                    !result.correct;
                  let cls = "assessment-option";
                  if (isPicked && !explaining) cls += " selected";
                  if (isCorrectOpt) cls += " correct";
                  if (isWrongPick) cls += " incorrect";
                  if (explaining && !isCorrectOpt && !isWrongPick) {
                    cls += " dimmed";
                  }
                  return (
                    <button
                      key={opt.id || oi}
                      type="button"
                      className={cls}
                      disabled={disabled || explaining}
                      aria-pressed={isPicked}
                      onClick={() => handleSelect(oi)}
                    >
                      <span className="assessment-opt-letter" aria-hidden>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="assessment-opt-text">{opt.text}</span>
                      {isCorrectOpt && (
                        <Check size={14} className="assessment-opt-icon" />
                      )}
                      {isWrongPick && (
                        <X size={14} className="assessment-opt-icon" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {explaining && result && (
            <div
              className={`assessment-explain ${
                result.correct ? "is-correct" : "is-incorrect"
              }`}
              role="status"
            >
              <div className="assessment-explain-head">
                {result.correct ? (
                  <Sparkles size={15} aria-hidden />
                ) : (
                  <Lightbulb size={15} aria-hidden />
                )}
                <strong>
                  {result.correct ? "You got it" : "Let's revise"}
                </strong>
              </div>
              <p className="assessment-explain-body">{result.explanation}</p>
              {!result.correct && result.correctText && (
                <p className="assessment-explain-answer">
                  Solid answer: <strong>{result.correctText}</strong>
                </p>
              )}
              <button
                type="button"
                className="journal-primary-btn assessment-next-btn"
                onClick={() => onContinue?.()}
                disabled={disabled}
              >
                {session.currentIndex + 1 >= total
                  ? "See results"
                  : "Next question"}
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {!explaining && (
            <p className="assessment-hint-line">
              Pick one answer. Kindling will explain the idea right after —
              like a tutor sitting with you for revision.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Soft offer card when the learner signals understanding.
 */
export function AssessmentOfferCard({
  offer,
  onStart,
  onDismiss,
  disabled = false,
}) {
  if (!offer) return null;
  return (
    <div
      className="assessment-offer affect-checkin"
      role="region"
      aria-label="Quick check offer"
    >
      <div className="affect-checkin-icon" aria-hidden>
        <ClipboardCheck size={18} />
      </div>
      <div className="affect-checkin-body">
        <div className="affect-checkin-top">
          <p className="affect-checkin-eyebrow">
            {offer.eyebrow || "Quick check"}
          </p>
          {onDismiss && (
            <button
              type="button"
              className="affect-checkin-dismiss"
              onClick={onDismiss}
              disabled={disabled}
              aria-label="Not yet"
              title="Not yet"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <h4 className="affect-checkin-title">
          {offer.headline || "Ready for a quick check?"}
        </h4>
        <p className="affect-checkin-text">
          {offer.body ||
            "A few multiple-choice questions — one at a time — with a short tutor explanation after each."}
        </p>
        <div className="session-reflection-actions">
          <button
            type="button"
            className="journal-secondary-btn"
            onClick={onDismiss}
            disabled={disabled}
          >
            {offer.skipLabel || "Not yet"}
          </button>
          <button
            type="button"
            className="journal-primary-btn"
            onClick={onStart}
            disabled={disabled}
          >
            {offer.cta || "Start quick check"}
          </button>
        </div>
      </div>
    </div>
  );
}
