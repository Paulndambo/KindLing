import { BookOpen, X, Sparkles, ArrowRight, Clock } from "lucide-react";

function formatRange(conv) {
  const start = conv.createdAt ? new Date(conv.createdAt) : null;
  const end = conv.endedAt ? new Date(conv.endedAt) : null;
  const fmt = (d) =>
    d
      ? d.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return fmt(start);
  return "Past session";
}

/**
 * Learning Journal — past conversations with summaries for this topic.
 */
export default function ConversationJournal({
  open,
  onClose,
  topicName,
  subjectName,
  archived = [],
  onView,
  onStartNew,
}) {
  if (!open) return null;

  return (
    <div className="journal-overlay" role="dialog" aria-modal="true" aria-label="Learning Journal">
      <div className="journal-panel">
        <header className="journal-header">
          <div className="journal-header-title">
            <BookOpen size={18} />
            <div>
              <h3>Learning Journal</h3>
              <p>
                {subjectName} · {topicName}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="journal-close"
            onClick={onClose}
            aria-label="Close journal"
          >
            <X size={18} />
          </button>
        </header>

        <p className="journal-intro">
          Every ended conversation is saved here with a short summary—so you can
          look back at what you learned without starting from zero next time.
        </p>

        {archived.length === 0 ? (
          <div className="journal-empty">
            <Sparkles size={22} />
            <p>
              No saved conversations yet. When you <strong>end</strong> a chat
              or start a <strong>new</strong> one, Kindling will summarize it
              here.
            </p>
            <button type="button" className="journal-primary-btn" onClick={onClose}>
              Back to lesson
            </button>
          </div>
        ) : (
          <ul className="journal-list">
            {archived.map((conv) => (
              <li key={conv.id} className="journal-card">
                <div className="journal-card-top">
                  <h4>{conv.title || topicName}</h4>
                  <span className="journal-card-time">
                    <Clock size={12} />
                    {formatRange(conv)}
                  </span>
                </div>
                {conv.summary && <p className="journal-card-summary">{conv.summary}</p>}
                {conv.highlights?.length > 0 && (
                  <ul className="journal-highlights">
                    {conv.highlights.slice(0, 3).map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                )}
                {conv.nextStep && (
                  <p className="journal-next">
                    <strong>Next time:</strong> {conv.nextStep}
                  </p>
                )}
                <div className="journal-card-actions">
                  <button
                    type="button"
                    className="journal-secondary-btn"
                    onClick={() => onView?.(conv.id)}
                  >
                    Read conversation
                    <ArrowRight size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="journal-footer">
          <button type="button" className="journal-primary-btn" onClick={onStartNew}>
            Start a new conversation
          </button>
        </footer>
      </div>
    </div>
  );
}

/** Summary card shown in-chat after ending a conversation */
export function ConversationEndedCard({ summary, onStartNew, onOpenJournal }) {
  if (!summary) return null;
  return (
    <div className="conv-ended-card" role="status">
      <div className="conv-ended-badge">
        <BookOpen size={14} />
        Saved to Learning Journal
      </div>
      <h4>{summary.title || "Session complete"}</h4>
      {summary.summary && <p>{summary.summary}</p>}
      {summary.highlights?.length > 0 && (
        <ul>
          {summary.highlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}
      {summary.nextStep && (
        <p className="conv-ended-next">
          <strong>Next time:</strong> {summary.nextStep}
        </p>
      )}
      <div className="conv-ended-actions">
        <button type="button" className="journal-primary-btn" onClick={onStartNew}>
          Start new conversation
        </button>
        <button type="button" className="journal-secondary-btn" onClick={onOpenJournal}>
          Open journal
        </button>
      </div>
    </div>
  );
}
