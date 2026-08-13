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
  return (
    <div className={`topic-intent${compact ? " compact" : ""}`}>
      <div className="field-block" style={{ marginBottom: compact ? 12 : 16 }}>
        <span className="field-label">{familiarityLabel}</span>
        <div className="familiarity-pills" role="group" aria-label={familiarityLabel}>
          {FAMILIARITY_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              className={`familiarity-pill${familiarity === level.id ? " selected" : ""}`}
              disabled={disabled}
              title={level.hint}
              onClick={() => onFamiliarityChange?.(level.id)}
            >
              {level.short}
            </button>
          ))}
        </div>
        <p className="field-hint">
          {FAMILIARITY_LEVELS.find((l) => l.id === familiarity)?.hint ||
            "Helps Kindling start at the right pace"}
        </p>
      </div>

      <div className="field-block" style={{ marginBottom: 0 }}>
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
