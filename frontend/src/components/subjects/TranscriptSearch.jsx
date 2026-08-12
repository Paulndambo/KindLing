import { useState, useCallback } from "react";
import { Search, BookOpen, Loader2, X } from "lucide-react";
import { searchTranscriptsAsync } from "../../services/learning";

/**
 * Search past lesson transcripts by keyword (Epic A2.4).
 */
export default function TranscriptSearch({
  studentId,
  subject = "",
  topic = "",
  onOpenLesson,
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async () => {
    const query = q.trim();
    if (query.length < 2) {
      setError("Type at least 2 characters.");
      return;
    }
    setError("");
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchTranscriptsAsync(studentId, {
        q: query,
        subject: subject || undefined,
        topic: topic || undefined,
      });
      setResults(data?.results || []);
    } catch (err) {
      setError(err?.message || "Search failed.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [q, studentId, subject, topic]);

  return (
    <div className="transcript-search">
      <div className="transcript-search-head">
        <BookOpen size={15} />
        <span>Search your lesson history</span>
      </div>
      <div className="transcript-search-row">
        <input
          type="search"
          placeholder="e.g. equivalent fractions, variables…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          aria-label="Search transcripts"
        />
        <button type="button" className="transcript-search-btn" onClick={runSearch} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          Search
        </button>
        {searched && (
          <button
            type="button"
            className="transcript-search-clear"
            onClick={() => {
              setQ("");
              setResults([]);
              setSearched(false);
              setError("");
            }}
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>
      {error && <p className="transcript-search-error">{error}</p>}
      {searched && !loading && !error && (
        <p className="transcript-search-meta">
          {results.length
            ? `${results.length} match${results.length === 1 ? "" : "es"}`
            : "No matches in your saved chats."}
        </p>
      )}
      <ul className="transcript-search-results">
        {results.map((r, i) => (
          <li key={`${r.conversationId}-${r.messageId}-${i}`}>
            <button
              type="button"
              className="transcript-hit"
              onClick={() => onOpenLesson?.(r.subject, r.topic)}
            >
              <div className="transcript-hit-meta">
                <strong>
                  {r.subject} · {r.topic}
                </strong>
                <span>{r.role === "tutor" ? "Kindling" : "You"}</span>
              </div>
              <p>{r.snippet}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
