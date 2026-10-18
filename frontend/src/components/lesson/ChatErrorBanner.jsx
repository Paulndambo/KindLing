import { AlertCircle, Clock3, KeyRound, Lock, RotateCcw, X } from "lucide-react";

/**
 * Recoverable AI / stream failure banner inside the lesson chat, plus a
 * dedicated Daily AI Allowance lock card when `daily_ai_cap_reached` occurs.
 */
export default function ChatErrorBanner({
  error,
  onRetry,
  onDismiss,
  onOpenSettings,
  isStreaming = false,
}) {
  if (!error) return null;

  const isDailyCap =
    error.code === "DAILY_AI_CAP_REACHED" ||
    error.apiCode === "daily_ai_cap_reached";

  if (isDailyCap) {
    const usage = error.usage || null;
    const resetsAt = usage?.resetsAt || error.resetsAt || "midnight UTC";
    const hasRequests =
      usage && Number.isFinite(Number(usage.used)) && Number(usage.limit) > 0;
    const hasTokens =
      usage &&
      Number.isFinite(Number(usage.estimatedTokensUsed)) &&
      Number(usage.estimatedTokenLimit) > 0;

    const reqExhausted =
      hasRequests && Number(usage.used) >= Number(usage.limit);
    const tokExhausted =
      hasTokens &&
      Number(usage.estimatedTokensUsed) >= Number(usage.estimatedTokenLimit);

    // Show the metric(s) that actually triggered the cap so we never display an
    // unexhausted secondary counter (e.g. 431k / 1M tokens) under a "used up" banner.
    const showTokens = tokExhausted || (!reqExhausted && hasTokens);
    const showRequests = reqExhausted || (!tokExhausted && hasRequests);

    const tokenPct = hasTokens
      ? Math.min(
          100,
          Math.round(
            (Number(usage.estimatedTokensUsed) /
              Number(usage.estimatedTokenLimit)) *
              100
          )
        )
      : null;
    const reqPct = hasRequests
      ? Math.min(
          100,
          Math.round((Number(usage.used) / Number(usage.limit)) * 100)
        )
      : null;
    const fillPct = showTokens && showRequests
      ? Math.max(tokenPct ?? 0, reqPct ?? 0)
      : showRequests
        ? (reqPct ?? 100)
        : showTokens
          ? (tokenPct ?? 100)
          : 100;

    const headingTitle =
      reqExhausted && !tokExhausted
        ? "Today's AI request limit reached"
        : tokExhausted && !reqExhausted
          ? "Today's AI token allowance is used up"
          : error.title || "Today's AI allowance is used up";

    const bodyExplanation =
      reqExhausted && !tokExhausted
        ? `You've used all ${Number(usage.limit).toLocaleString()} daily platform AI requests included with your plan.`
        : tokExhausted && !reqExhausted
          ? `You've used your daily platform AI allowance of ${Number(usage.estimatedTokenLimit).toLocaleString()} tokens.`
          : "You've reached today's included platform AI allowance.";

    return (
      <div
        className="chat-error-banner is-daily-cap"
        role="alert"
        aria-live="assertive"
      >
        <div className="chat-error-banner-icon is-cap" aria-hidden>
          <Lock size={18} />
        </div>
        <div className="chat-error-banner-copy">
          <div className="daily-cap-head">
            <strong>{headingTitle}</strong>
            <span className="daily-cap-reset-pill">
              <Clock3 size={12} aria-hidden />
              Resets at {resetsAt}
            </span>
          </div>
          <span>
            {bodyExplanation} Live AI chatting is paused until {resetsAt}, or
            you can connect your own API key in Settings to continue right away.
          </span>

          {(showRequests || showTokens) && (
            <div className="daily-cap-usage" aria-label="Daily AI allowance usage">
              <div
                className="daily-cap-usage-bar"
                role="progressbar"
                aria-valuenow={fillPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${fillPct}%` }} />
              </div>
              <div className="daily-cap-usage-stats">
                {showTokens && (
                  <span>
                    <strong>
                      {Number(usage.estimatedTokensUsed).toLocaleString()}
                    </strong>{" "}
                    / {Number(usage.estimatedTokenLimit).toLocaleString()} est.
                    tokens used
                  </span>
                )}
                {showRequests && (
                  <span>
                    <strong>{Number(usage.used).toLocaleString()}</strong> /{" "}
                    {Number(usage.limit).toLocaleString()} requests used
                  </span>
                )}
              </div>
            </div>
          )}

          <p className="daily-cap-hint">
            You can still use <strong>Quick check</strong> questions,{" "}
            <strong>Interactive models</strong>, and your{" "}
            <strong>Learning Journal</strong> while chat is paused.
          </p>
        </div>

        {onOpenSettings && (
          <div className="chat-error-banner-actions">
            <button
              type="button"
              className="chat-error-retry is-settings"
              onClick={onOpenSettings}
            >
              <KeyRound size={14} />
              AI settings &amp; plan
            </button>
          </div>
        )}
      </div>
    );
  }

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

