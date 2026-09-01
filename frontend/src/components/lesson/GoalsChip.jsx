import { Target } from "lucide-react";
import { truncateGoal } from "../../services/learning/goalsSurface";

/**
 * Epic C5 — compact goal + familiarity chip for path / tools / header.
 */
export default function GoalsChip({
  goals,
  compact = false,
  className = "",
  showWeekFocus = true,
}) {
  if (!goals) return null;
  const { effectiveGoal, familiarityShort, weekFocus, hasAnyGoal } = goals;
  if (!hasAnyGoal && !familiarityShort) return null;

  return (
    <div
      className={`goals-chip${compact ? " compact" : ""}${className ? ` ${className}` : ""}`}
      role="note"
      aria-label="Learning goals"
    >
      <span className="goals-chip-icon" aria-hidden>
        <Target size={compact ? 12 : 14} />
      </span>
      <div className="goals-chip-body">
        {familiarityShort && (
          <span className="goals-chip-fam">{familiarityShort}</span>
        )}
        {effectiveGoal ? (
          <span className="goals-chip-goal" title={effectiveGoal}>
            {truncateGoal(effectiveGoal, compact ? 72 : 110)}
          </span>
        ) : (
          <span className="goals-chip-muted">No topic goal yet</span>
        )}
        {showWeekFocus && weekFocus ? (
          <span className="goals-chip-week" title={weekFocus}>
            Week: {truncateGoal(weekFocus, compact ? 56 : 80)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
