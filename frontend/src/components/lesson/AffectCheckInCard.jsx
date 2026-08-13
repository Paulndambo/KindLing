import { Heart, X } from "lucide-react";
import { AFFECT_CHECKIN_OPTIONS } from "../../services/learning/affectCheckIn";

/**
 * Epic B3 — gentle affective check-in card (never shaming).
 */
export default function AffectCheckInCard({
  checkIn,
  onRespond,
  onDismiss,
  disabled = false,
}) {
  if (!checkIn) return null;

  return (
    <div
      className="affect-checkin"
      role="region"
      aria-label="How are you feeling check-in"
    >
      <div className="affect-checkin-icon" aria-hidden>
        <Heart size={18} />
      </div>
      <div className="affect-checkin-body">
        <div className="affect-checkin-top">
          <p className="affect-checkin-eyebrow">Kindling cares</p>
          {onDismiss && (
            <button
              type="button"
              className="affect-checkin-dismiss"
              onClick={onDismiss}
              disabled={disabled}
              aria-label="Dismiss check-in"
              title="Not now"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <h4 className="affect-checkin-title">{checkIn.headline}</h4>
        <p className="affect-checkin-text">{checkIn.body}</p>
        <div className="affect-checkin-options" role="group" aria-label="How I feel">
          {AFFECT_CHECKIN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`affect-checkin-option opt-${opt.id}`}
              disabled={disabled}
              onClick={() => onRespond?.(opt.id)}
            >
              <span className="affect-checkin-emoji" aria-hidden>
                {opt.emoji}
              </span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Compact persistence celebration chip. */
export function PersistenceChip({ text, onDismiss }) {
  if (!text) return null;
  return (
    <div className="persistence-chip" role="status">
      <Heart size={12} aria-hidden />
      <span>{text}</span>
      {onDismiss && (
        <button
          type="button"
          className="persistence-chip-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
