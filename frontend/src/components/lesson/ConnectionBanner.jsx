import { WifiOff, CloudOff, RefreshCw, CloudUpload } from "lucide-react";

/**
 * Non-blocking connectivity / sync status for the lesson shell.
 * Keeps tone calm — never shames the learner.
 */
export default function ConnectionBanner({
  online = true,
  apiStatus = "unknown",
  learningQueued = 0,
  isChecking = false,
  isSyncing = false,
  onRetryConnection,
  onSyncLearning,
}) {
  if (online && apiStatus !== "down" && learningQueued <= 0) {
    return null;
  }

  let tone = "info";
  let Icon = CloudUpload;
  let title = "";
  let detail = "";
  let actionLabel = null;
  let onAction = null;

  if (!online) {
    tone = "warn";
    Icon = WifiOff;
    title = "You're offline";
    detail =
      "Your chat stays on this device. Reconnect to talk with Kindling and save progress.";
    actionLabel = isChecking ? "Checking…" : "Check connection";
    onAction = onRetryConnection;
  } else if (apiStatus === "down") {
    tone = "warn";
    Icon = CloudOff;
    title = "Can't reach Kindling's servers";
    detail =
      learningQueued > 0
        ? `We'll keep ${learningQueued} learning update${learningQueued === 1 ? "" : "s"} safe and send them when the connection returns.`
        : "You can keep reading this lesson. Progress will sync when we're back online.";
    actionLabel = isChecking ? "Checking…" : "Try reconnect";
    onAction = onRetryConnection;
  } else if (learningQueued > 0) {
    tone = "info";
    Icon = CloudUpload;
    title = "Saving progress…";
    detail = `${learningQueued} update${learningQueued === 1 ? "" : "s"} waiting to sync. Your chat history is already stored on this device.`;
    actionLabel = isSyncing ? "Syncing…" : "Sync now";
    onAction = onSyncLearning;
  }

  return (
    <div
      className={`connection-banner connection-banner--${tone}`}
      role="status"
      aria-live="polite"
    >
      <div className="connection-banner-icon" aria-hidden>
        <Icon size={16} />
      </div>
      <div className="connection-banner-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          className="connection-banner-action"
          onClick={onAction}
          disabled={isChecking || isSyncing}
        >
          <RefreshCw size={13} className={isChecking || isSyncing ? "spin" : ""} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
