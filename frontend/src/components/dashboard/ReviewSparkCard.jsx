import { Flame, ArrowRight, Sparkles, RefreshCw } from "lucide-react";

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

  if (!show && !loading && compact) return null;

  const headline = show
    ? due.length === 1
      ? "One skill is ready for a warm-up"
      : `${due.length} skills ready for a warm-up`
    : "No reviews due right now";

  return (
    <section
      className={`review-spark-card${compact ? " compact" : ""}${
        isPanel ? " subj-panel" : ""
      }`}
      role="region"
      aria-label="Review spark"
    >
      <div className={isPanel ? "subj-panel-head" : "review-spark-head"}>
        {isPanel ? (
          <>
            <span className="subj-panel-icon" aria-hidden>
              <Flame size={16} />
            </span>
            <div className="subj-panel-head-copy">
              <p className="eyebrow">{title}</p>
              <h3>{headline}</h3>
            </div>
            {onRefresh && (
              <button
                type="button"
                className="btn-ghost review-spark-refresh"
                onClick={onRefresh}
                disabled={loading}
                aria-label="Refresh reviews"
              >
                <RefreshCw
                  size={14}
                  className={loading ? "spin" : undefined}
                  aria-hidden
                />
              </button>
            )}
          </>
        ) : (
          <>
            <div className="review-spark-title-row">
              <span className="review-spark-icon" aria-hidden>
                <Flame size={16} />
              </span>
              <div>
                <p className="eyebrow">{title}</p>
                <h3>{headline}</h3>
              </div>
            </div>
            {onRefresh && (
              <button
                type="button"
                className="btn-ghost review-spark-refresh"
                onClick={onRefresh}
                disabled={loading}
                aria-label="Refresh reviews"
              >
                <RefreshCw
                  size={14}
                  className={loading ? "spin" : undefined}
                  aria-hidden
                />
              </button>
            )}
          </>
        )}
      </div>

      <div className={isPanel ? "subj-panel-body" : undefined}>
        {!show && !loading && (
          <p className="review-spark-empty">
            When something feels sticky in a lesson, Kindling will schedule a
            short Review spark here within about a week.
          </p>
        )}

        {show && (
          <ul className="review-spark-list">
            {due.slice(0, compact ? 3 : 8).map((item) => (
              <li
                key={item.id || item.skillSlug}
                className="review-spark-row"
              >
                <div className="review-spark-row-main">
                  <Sparkles size={14} aria-hidden />
                  <div>
                    <strong>
                      {item.shortLabel || item.skillName || item.topic}
                    </strong>
                    <span>
                      {item.topic}
                      {item.stateLabel ? ` · ${item.stateLabel}` : ""}
                      {item.score != null
                        ? ` · ${Math.round(item.score)}%`
                        : ""}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="journal-primary-btn review-spark-start"
                  onClick={() => onStartReview?.(item)}
                >
                  Start
                  <ArrowRight size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
