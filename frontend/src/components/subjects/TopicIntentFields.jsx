import {
  DEFAULT_FAMILIARITY,
  FAMILIARITY_LEVELS,
} from "../../constants/familiarity";

/**
 * Shared familiarity + learning-goal fields for subject/topic capture.
 */
export default function TopicIntentFields({
  familiarity = DEFAULT_FAMILIARITY,
  onFamiliarityChange,
  learningGoal = "",
  onLearningGoalChange,
  goalPlaceholder = "e.g. Understand how to add fractions with different denominators",
  goalLabel = "What do you want to learn?",
  familiarityLabel = "How familiar are you?",
  disabled = false,
  compact = false,
}) {
  const active = FAMILIARITY_LEVELS.find((l) => l.id === familiarity);

  return (
    <div className={`topic-intent${compact ? " compact" : ""}`}>
      <div className="topic-intent-field">
        <div className="topic-intent-label-row">
          <span className="field-label">{familiarityLabel}</span>
          {active ? (
            <span className="topic-intent-active-hint">{active.hint}</span>
          ) : null}
        </div>
        <div className="familiarity-pills" role="group" aria-label={familiarityLabel}>
          {FAMILIARITY_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              className={`familiarity-pill${familiarity === level.id ? " selected" : ""}`}
              disabled={disabled}
              title={level.hint}
              aria-pressed={familiarity === level.id}
              onClick={() => onFamiliarityChange?.(level.id)}
            >
              <span className="familiarity-pill-short">{level.short}</span>
              <span className="familiarity-pill-label">{level.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="topic-intent-field topic-intent-field-last">
        <span className="field-label">{goalLabel}</span>
        <textarea
          className="modal-input topic-goal-input"
          rows={compact ? 2 : 3}
          placeholder={goalPlaceholder}
          value={learningGoal}
          disabled={disabled}
          onChange={(e) => onLearningGoalChange?.(e.target.value)}
        />
      </div>
    </div>
  );
}