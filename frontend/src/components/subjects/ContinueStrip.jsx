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
 */
export default function ContinueStrip({
  studentId,
  onContinue,
  maxItems = 4,
  title = "Continue where you left off",
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <div className="continue-strip continue-strip--loading">
        <Loader2 size={16} className="spin" />
        <span>Looking for open lessons…</span>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="continue-strip">
      <div className="continue-strip-head">
        <History size={16} />
        <h3>{title}</h3>
      </div>
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
              <span className="continue-card-when">{formatWhen(item.updatedAt)}</span>
            </div>
            <strong className="continue-card-topic">{item.topic}</strong>
            {item.previewText && (
              <p className="continue-card-preview">{item.previewText}</p>
            )}
            <span className="continue-card-cta">
              Continue <ArrowRight size={13} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
