import { Heart, Sparkles, X } from "lucide-react";
import {
  AFFECT_CHECKIN_OPTIONS,
  SESSION_START_ENERGY_OPTIONS,
  SESSION_START_REASON,
} from "../../services/learning/affectCheckIn";

/**
 * Epic B3 — gentle affective check-in card (never shaming).
 * Epic B7 — also renders session-start energy chip (variant + options from checkIn).
 */
export default function AffectCheckInCard({
  checkIn,
  onRespond,
  onDismiss,
  disabled = false,
}) {
  if (!checkIn) return null;

  const isSessionStart =
    checkIn.reason === SESSION_START_REASON ||
    checkIn.variant === "session-start";
  const options =
    (Array.isArray(checkIn.options) && checkIn.options.length
      ? checkIn.options
      : null) ||
    (isSessionStart ? SESSION_START_ENERGY_OPTIONS : AFFECT_CHECKIN_OPTIONS);
  const eyebrow = checkIn.eyebrow || (isSessionStart ? "Before we dive in" : "Kindling cares");
  const ariaLabel = isSessionStart
    ? "Energy check-in before lesson"
    : "How are you feeling check-in";
  const Icon = isSessionStart ? Sparkles : Heart;

  return (
    <div
      className={`affect-checkin${isSessionStart ? " session-start" : ""}`}
      role="region"
      aria-label={ariaLabel}
    >
      <div className="affect-checkin-icon" aria-hidden>
        <Icon size={18} />
      </div>
      <div className="affect-checkin-body">
        <div className="affect-checkin-top">
          <p className="affect-checkin-eyebrow">{eyebrow}</p>
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
        <div
          className="affect-checkin-options"
          role="group"
          aria-label={isSessionStart ? "My energy" : "How I feel"}
        >
          {options.map((opt) => (
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
