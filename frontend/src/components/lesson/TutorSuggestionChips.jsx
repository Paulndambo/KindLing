/**
 * One-tap follow-ups under the latest tutor message (supportive, low-typing).
 */
export default function TutorSuggestionChips({
  suggestions = [],
  onSelect,
  disabled = false,
  label = "Try a quick reply",
}) {
  const items = (Array.isArray(suggestions) ? suggestions : [])
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!items.length) return null;

  return (
    <div
      className="tutor-suggest-wrap"
      role="group"
      aria-label={label}
    >
      <p className="tutor-suggest-label">{label}</p>
      <div className="tutor-suggest-chips">
        {items.map((text) => (
          <button
            key={text}
            type="button"
            className="tutor-suggest-chip"
            disabled={disabled}
            onClick={() => onSelect?.(text)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
