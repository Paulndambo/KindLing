import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import {
  REFLECTION_CLICKED_OPTIONS,
  REFLECTION_NEXT_OPTIONS,
} from "../../services/learning/sessionReflection";

/**
 * Epic B8 — short end-of-session reflection card (skip always available).
 */
export default function SessionReflectionCard({
  reflection,
  onSubmit,
  onSkip,
  disabled = false,
  reviewCta = null,
}) {
  const [clickedId, setClickedId] = useState(null);
  const [nextId, setNextId] = useState(null);
  const [freeNote, setFreeNote] = useState("");

  if (!reflection) return null;

  const clickedOpts = reflection.clickedOptions || REFLECTION_CLICKED_OPTIONS;
  const nextOpts = reflection.nextOptions || REFLECTION_NEXT_OPTIONS;

  const handleSave = () => {
    onSubmit?.({
      clickedId,
      nextId,
      freeNote: freeNote.trim(),
    });
  };

  const canSave = Boolean(clickedId || nextId || freeNote.trim());

  return (
    <div
      className="session-reflection affect-checkin"
      role="region"
      aria-label="Session wrap-up reflection"
    >
      <div className="affect-checkin-icon" aria-hidden>
        <Sparkles size={18} />
      </div>
      <div className="affect-checkin-body">
        <div className="affect-checkin-top">
          <p className="affect-checkin-eyebrow">
            {reflection.eyebrow || "Before you go"}
          </p>
          {onSkip && (
            <button
              type="button"
              className="affect-checkin-dismiss"
              onClick={onSkip}
              disabled={disabled}
              aria-label="Skip reflection"
              title="Skip"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <h4 className="affect-checkin-title">{reflection.headline}</h4>
        <p className="affect-checkin-text">{reflection.body}</p>

        <p className="session-reflection-label">What clicked?</p>
        <div
          className="affect-checkin-options"
          role="group"
          aria-label="What clicked"
        >
          {clickedOpts.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`affect-checkin-option opt-${opt.id}${
                clickedId === opt.id ? " selected" : ""
              }`}
              disabled={disabled}
              aria-pressed={clickedId === opt.id}
              onClick={() => setClickedId(opt.id)}
            >
              <span className="affect-checkin-emoji" aria-hidden>
                {opt.emoji}
              </span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <p className="session-reflection-label">What’s next?</p>
        <div
          className="affect-checkin-options"
          role="group"
          aria-label="What's next"
        >
          {nextOpts.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`affect-checkin-option opt-next-${opt.id}${
                nextId === opt.id ? " selected" : ""
              }`}
              disabled={disabled}
              aria-pressed={nextId === opt.id}
              onClick={() => setNextId(opt.id)}
            >
              <span className="affect-checkin-emoji" aria-hidden>
                {opt.emoji}
              </span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <label className="session-reflection-note-label" htmlFor="session-reflect-note">
          Optional note
        </label>
        <input
          id="session-reflect-note"
          type="text"
          className="session-reflection-note"
          placeholder="One line for next time (optional)"
          maxLength={200}
          value={freeNote}
          disabled={disabled}
          onChange={(e) => setFreeNote(e.target.value)}
        />

        {reviewCta?.label && (
          <p className="session-reflection-review-hint" role="note">
            After you finish, you can try: <strong>{reviewCta.label}</strong>
          </p>
        )}

        <div className="session-reflection-actions">
          <button
            type="button"
            className="journal-secondary-btn"
            onClick={onSkip}
            disabled={disabled}
          >
            Skip
          </button>
          <button
            type="button"
            className="journal-primary-btn"
            onClick={handleSave}
            disabled={disabled || !canSave}
          >
            Save & finish
          </button>
        </div>
      </div>
    </div>
  );
}
