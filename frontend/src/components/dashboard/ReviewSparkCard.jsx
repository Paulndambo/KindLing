import { useState } from "react";
import { Flame, ArrowRight, RefreshCw } from "lucide-react";

/**
 * Epic C1 — due Review spark list (Dashboard / My Subjects).
 * variant="panel" matches Subjects page section shells.
 */
export default function ReviewSparkCard({
  items = [],
  loading = false,
  onStartReview,
  onSnooze,
  onRefresh,
  compact = false,
  variant = "default",
  title = "Review spark",
}) {
  const [snoozingId, setSnoozingId] = useState(null);
  const [snoozeMessage, setSnoozeMessage] = useState("");
  const due = (items || []).filter((i) => i.isDue !== false);
  const upcoming = (items || []).filter((i) => i.isDue === false);
  const show = due.length > 0;
  const isPanel = variant === "panel";
  const limit = compact ? 3 : 8;
  const visible = due.slice(0, limit);
  const hiddenCount = Math.max(0, due.length - visible.length);

  const handleSnooze = async (item, days, event) => {
    const rowKey = item.id || item.skillSlug;
    const details = event.currentTarget.closest("details");
    setSnoozingId(rowKey);
    setSnoozeMessage("");
    try {
      const result = await onSnooze?.(item, days);
      if (!result?.ok) throw new Error(result?.error || "Could not reschedule this review.");
      details?.removeAttribute("open");
      setSnoozeMessage(`Review snoozed. ${formatDueDate(result.snoozedUntil)}.`);
    } catch (error) {
      setSnoozeMessage(error?.message || "Could not reschedule this review.");
    } finally {
      setSnoozingId(null);
    }
  };

  if (!show && !upcoming.length && !loading && compact && !snoozeMessage) return null;

  const headline = loading
    ? "Checking for warm-ups…"
    : show
      ? due.length === 1
        ? "One skill is ready for a warm-up"
        : `${due.length} skills ready for a warm-up`
      : upcoming.length
        ? "Your next warm-ups are on the way"
        : "No reviews due right now";

  return (
    <section
      className={`review-spark-card${compact ? " compact" : ""}${
        isPanel ? " subj-panel review-spark-card--panel" : ""
      }`}
      role="region"
      aria-label="Review spark"
    >
      <div className="review-spark-head">
        <div className="review-spark-title-row">
          <span
            className={isPanel ? "subj-panel-icon review-spark-icon" : "review-spark-icon"}
            aria-hidden
          >
            <Flame size={16} />
          </span>
          <div className="review-spark-titles">
            <p className="eyebrow">{title}</p>
            <h3>{headline}</h3>
            {show && compact && hiddenCount > 0 ? (
              <p className="review-spark-sub">
                Showing {visible.length} of {due.length} due skills
              </p>
            ) : show ? (
              <p className="review-spark-sub">
                Short refresh lessons — not a full new topic
              </p>
            ) : null}
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            className="review-spark-refresh"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh reviews"
            title="Refresh"
          >
            <RefreshCw
              size={15}
              className={loading ? "spin" : undefined}
              aria-hidden
            />
          </button>
        )}
      </div>

      <div className={isPanel ? "review-spark-body" : undefined}>
        {loading && !show ? (
          <p className="review-spark-empty">Looking for skills that need a spark…</p>
        ) : null}

        {!show && !upcoming.length && !loading && (
          <p className="review-spark-empty">
            When something feels sticky in a lesson, Kindling schedules a short
            Review spark here within about a week.
          </p>
        )}

        {show && (
          <ul className="review-spark-list">
            {visible.map((item) => {
              const label =
                item.shortLabel || item.skillName || item.topic || "Skill";
              const metaBits = [
                item.topic && item.topic !== label ? item.topic : null,
                item.subject || null,
                item.stateLabel || null,
              ].filter(Boolean);
              const score =
                item.score != null && Number.isFinite(Number(item.score))
                  ? Math.round(Number(item.score))
                  : null;

              return (
                <li
                  key={item.id || item.skillSlug || label}
                  className="review-spark-row"
                >
                  <div className="review-spark-row-main">
                    <div className="review-spark-row-text">
                      <strong>{label}</strong>
                      {metaBits.length > 0 ? (
                        <span className="review-spark-meta">
                          {metaBits.join(" · ")}
                        </span>
                      ) : null}
                      {item.reason && (
                        <span className="review-spark-meta">
                          {reviewReason(item.reason)}
                        </span>
                      )}
                    </div>
                    {score != null ? (
                      <span
                        className="review-spark-score"
                        title="Current skill blend"
                      >
                        {score}%
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="review-spark-start"
                    onClick={() => onStartReview?.(item)}
                  >
                    Start
                    <ArrowRight size={14} aria-hidden />
                  </button>
                  {onSnooze && (
                    <details className="review-snooze">
                      <summary aria-label={`Snooze ${label}`}>
                        Snooze
                      </summary>
                      <div className="review-snooze-options">
                        {[1, 3, 7].map((days) => (
                          <button
                            type="button"
                            key={days}
                            disabled={snoozingId === (item.id || item.skillSlug)}
                            onClick={(event) => handleSnooze(item, days, event)}
                          >
                            {snoozingId === (item.id || item.skillSlug)
                              ? "Saving…"
                              : `In ${days} day${days === 1 ? "" : "s"}`}
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {upcoming.length > 0 && (
          <div className="review-spark-upcoming">
            <p className="review-spark-upcoming-title">Coming up</p>
            <ul className="review-spark-list">
              {upcoming.slice(0, compact ? 2 : 5).map((item) => (
                <li key={item.id || item.skillSlug} className="review-spark-row upcoming">
                  <div className="review-spark-row-text">
                    <strong>{item.shortLabel || item.skillName || item.topic || "Skill"}</strong>
                    <span className="review-spark-meta">
                      {item.subject ? `${item.subject} · ` : ""}
                      {formatDueDate(item.dueAt)}
                    </span>
                  </div>
                  <span className="review-spark-upcoming-tag">Scheduled</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {snoozeMessage && (
          <p className="review-snooze-message" role="status">
            {snoozeMessage}
          </p>
        )}
      </div>
    </section>
  );
}

function reviewReason(reason) {
  const labels = {
    weak: "A little more practice will help this skill grow.",
    rusty: "A short refresh can bring this skill back.",
    streak: "A few recent tries were tricky; this is a chance to revisit.",
    recent_struggle: "This came up as challenging recently.",
    prerequisite: "A helpful earlier skill to warm up first.",
  };
  return labels[reason] || "A short refresh will help keep this skill warm.";
}

function formatDueDate(value) {
  if (!value) return "Coming soon";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Coming soon";
  return `Due ${new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date)}`;
}
