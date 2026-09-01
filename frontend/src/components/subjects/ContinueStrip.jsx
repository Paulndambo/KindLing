import { useEffect, useState } from "react";
import { ArrowRight, History, Loader2 } from "lucide-react";
import { listContinuableAsync } from "../../services/learning";

function formatWhen(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * "Continue where we left off" cards for My Subjects / Dashboard (Epic A2).
 * variant="panel" matches Subjects page section shells.
 */
export default function ContinueStrip({
  studentId,
  onContinue,
  maxItems = 4,
  title = "Continue where you left off",
  variant = "default",
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const isPanel = variant === "panel";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await listContinuableAsync(studentId, { limit: maxItems });
        if (!cancelled) setItems(list || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, maxItems]);

  if (loading) {
    return (
      <div
        className={
          isPanel
            ? "subj-panel continue-strip continue-strip--loading"
            : "continue-strip continue-strip--loading"
        }
        role="status"
      >
        <Loader2 size={16} className="spin" aria-hidden />
        <span>Looking for open lessons…</span>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <section
      className={
        isPanel ? "subj-panel continue-strip" : "continue-strip"
      }
      aria-label={title}
    >
      <div className={isPanel ? "subj-panel-head" : "continue-strip-head"}>
        {isPanel ? (
          <>
            <span className="subj-panel-icon" aria-hidden>
              <History size={16} />
            </span>
            <div className="subj-panel-head-copy">
              <p className="eyebrow">Pick up</p>
              <h3>{title}</h3>
            </div>
          </>
        ) : (
          <>
            <History size={16} aria-hidden />
            <h3>{title}</h3>
          </>
        )}
      </div>
      <div className={isPanel ? "subj-panel-body" : undefined}>
        <div className="continue-strip-cards">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="continue-card"
              onClick={() =>
                onContinue?.(item.subject, item.topic, {
                  conversationId: item.id,
                  resume: true,
                })
              }
            >
              <div className="continue-card-top">
                <span className="continue-card-subject">{item.subject}</span>
                <span className="continue-card-when">
                  {formatWhen(item.updatedAt)}
                </span>
              </div>
              <strong className="continue-card-topic">{item.topic}</strong>
              {item.previewText && (
                <p className="continue-card-preview">{item.previewText}</p>
              )}
              <span className="continue-card-cta">
                Continue <ArrowRight size={13} aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
