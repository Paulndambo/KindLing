import { Flame, ArrowRight, RefreshCw } from "lucide-react";

/**
 * Epic C1 — due Review spark list (Dashboard / My Subjects).
 * variant="panel" matches Subjects page section shells.
 */
export default function ReviewSparkCard({
  items = [],
  loading = false,
  onStartReview,
  onRefresh,
  compact = false,
  variant = "default",
  title = "Review spark",
}) {
  const due = (items || []).filter((i) => i.isDue !== false);
  const show = due.length > 0;
  const isPanel = variant === "panel";
  const limit = compact ? 3 : 8;
  const visible = due.slice(0, limit);
  const hiddenCount = Math.max(0, due.length - visible.length);

  if (!show && !loading && compact) return null;

  const headline = loading
    ? "Checking for warm-ups…"
    : show
      ? due.length === 1
        ? "One skill is ready for a warm-up"
        : `${due.length} skills ready for a warm-up`
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

        {!show && !loading && (
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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
