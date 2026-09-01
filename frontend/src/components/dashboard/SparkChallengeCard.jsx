import { Zap, ArrowRight, Sparkles } from "lucide-react";
import { SPARK_CHALLENGE_TARGET } from "../../services/learning/sparkChallenge";

/**
 * Epic G1 — optional light spark challenge on Dashboard.
 * 3 solid graded turns on a weak pilot skill; celebrate via sparks/persistence only.
 */
export default function SparkChallengeCard({
  candidate = null,
  onStartChallenge,
  target = SPARK_CHALLENGE_TARGET,
}) {
  if (!candidate) return null;

  const label =
    candidate.skillLabel || candidate.shortLabel || candidate.topic || "a skill";
  const n = candidate.target || target || SPARK_CHALLENGE_TARGET;
  const metaBits = [
    candidate.topic && candidate.topic !== label ? candidate.topic : null,
    candidate.stateLabel || null,
    candidate.score != null ? `~${Math.round(Number(candidate.score))}%` : null,
  ].filter(Boolean);

  return (
    <div
      className="spark-challenge-card"
      role="region"
      aria-label="Spark challenge"
    >
      <div className="spark-challenge-head">
        <span className="spark-challenge-icon" aria-hidden>
          <Zap size={16} />
        </span>
        <div>
          <p className="eyebrow">Spark challenge</p>
          <h3>
            {n} solid turns on {label}
          </h3>
        </div>
      </div>
      <p className="spark-challenge-body">
        Optional short push — no badges, just skill sparks and stick-with-it energy.
        Skip anytime.
      </p>
      <div className="spark-challenge-row">
        <div className="spark-challenge-meta">
          <Sparkles size={14} aria-hidden />
          <div>
            <strong>{label}</strong>
            {metaBits.length > 0 && <span>{metaBits.join(" · ")}</span>}
          </div>
        </div>
        <button
          type="button"
          className="journal-primary-btn spark-challenge-start"
          onClick={() => onStartChallenge?.(candidate)}
        >
          Take challenge
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
