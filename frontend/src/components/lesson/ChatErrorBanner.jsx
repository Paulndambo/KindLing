import { AlertCircle, RotateCcw, X } from "lucide-react";

/**
 * Recoverable AI / stream failure banner inside the lesson chat.
 * Student messages stay visible; Retry re-sends without blaming the learner.
 */
export default function ChatErrorBanner({
  error,
  onRetry,
  onDismiss,
  isStreaming = false,
}) {
  if (!error) return null;

  const recoverable = error.recoverable !== false;

  return (
    <div
      className="chat-error-banner"
      role="alert"
      aria-live="assertive"
    >
      <div className="chat-error-banner-icon" aria-hidden>
        <AlertCircle size={18} />
      </div>
      <div className="chat-error-banner-copy">
        <strong>{error.title || "Something went wrong"}</strong>
        <span>
          {error.message ||
            "Kindling couldn't reply. Your message is saved — you can try again."}
        </span>
      </div>
      <div className="chat-error-banner-actions">
        {recoverable && onRetry && (
          <button
            type="button"
            className="chat-error-retry"
            onClick={onRetry}
            disabled={isStreaming}
          >
            <RotateCcw size={14} />
            Try again
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            className="chat-error-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
