import { HeartHandshake, ExternalLink } from "lucide-react";
import { SAFETY_RESOURCES } from "../../services/safety";

/**
 * High-severity distress escalation UI.
 * Pauses tutoring; never shames; points to trusted adults / crisis resources.
 */
export default function SafetyEscalationCard({
  copy,
  resources = SAFETY_RESOURCES,
  onPause,
  onResume,
}) {
  if (!copy) return null;

  return (
    <div className="safety-escalation-card" role="alert" aria-live="assertive">
      <div className="safety-escalation-icon" aria-hidden>
        <HeartHandshake size={22} />
      </div>
      <div className="safety-escalation-body">
        <h4>{copy.title}</h4>
        <p>{copy.body}</p>
        <ul className="safety-resource-list">
          {resources.map((r) => (
            <li key={r.id}>
              <strong>{r.label}</strong>
              <span>
                {r.href ? (
                  <a href={r.href} target="_blank" rel="noopener noreferrer">
                    {r.detail} <ExternalLink size={12} />
                  </a>
                ) : (
                  r.detail
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="safety-escalation-actions">
          {onPause && (
            <button type="button" className="safety-btn safety-btn-primary" onClick={onPause}>
              {copy.primaryAction || "I understand"}
            </button>
          )}
          {onResume && (
            <button type="button" className="safety-btn safety-btn-secondary" onClick={onResume}>
              {copy.secondaryAction || "I'm OK — go back to the lesson"}
            </button>
          )}
        </div>
        <p className="safety-escalation-footnote">
          Kindling is a learning tutor, not a crisis service or counselor.
        </p>
      </div>
    </div>
  );
}
