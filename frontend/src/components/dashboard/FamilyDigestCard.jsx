import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import {
  listDigests,
  generateDigest,
  patchStudentProfile,
  ApiError,
} from "../../services/api";

function formatPeriod(start, end) {
  try {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (!s || !e) return "";
    const opts = { month: "short", day: "numeric" };
    return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(
      undefined,
      opts
    )}`;
  } catch {
    return "";
  }
}

/**
 * Family weekly digest panel (Epic A5).
 * Opt-in toggle + list + generate preview for caregivers.
 */
export default function FamilyDigestCard({ student, onStudentUpdate }) {
  const [items, setItems] = useState([]);
  const [digestOptIn, setDigestOptIn] = useState(
    Boolean(student?.digestOptIn)
  );
  const [familyEmail, setFamilyEmail] = useState(
    student?.familyEmail || ""
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [emailDraft, setEmailDraft] = useState(
    student?.familyEmail || ""
  );

  const load = useCallback(async () => {
    try {
      const data = await listDigests();
      setItems(data.items || []);
      if (typeof data.digestOptIn === "boolean") {
        setDigestOptIn(data.digestOptIn);
      }
      if (data.familyEmail != null) {
        setFamilyEmail(data.familyEmail || "");
        setEmailDraft(data.familyEmail || "");
      }
      setError("");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not load family digests.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, student?.id]);

  useEffect(() => {
    setDigestOptIn(Boolean(student?.digestOptIn));
    setFamilyEmail(student?.familyEmail || "");
    setEmailDraft(student?.familyEmail || "");
  }, [student?.digestOptIn, student?.familyEmail]);

  const savePrefs = async (partial) => {
    setBusy(true);
    setError("");
    try {
      const updated = await patchStudentProfile(partial);
      if (typeof updated.digestOptIn === "boolean") {
        setDigestOptIn(updated.digestOptIn);
      }
      if (updated.familyEmail != null) {
        setFamilyEmail(updated.familyEmail);
        setEmailDraft(updated.familyEmail);
      }
      onStudentUpdate?.(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save preferences."
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleOptIn = () => {
    savePrefs({ digestOptIn: !digestOptIn });
  };

  const saveEmail = () => {
    const next = (emailDraft || "").trim();
    if (next === (familyEmail || "")) return;
    savePrefs({ familyEmail: next });
  };

  const handleGenerate = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await generateDigest({
        deliver: true,
        dryRun: true,
        forcePreview: true,
      });
      const digest = res?.digest;
      if (digest) {
        setSelected(digest);
        await load();
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not generate digest preview."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel dash-digest-panel">
      <div className="dash-panel-head">
        <h3>
          <Mail
            size={18}
            style={{ marginRight: 8, verticalAlign: -3 }}
            color="var(--pine)"
          />
          Family weekly digest
        </h3>
        <span className="dash-delta muted">Clear progress · never shaming</span>
      </div>

      <p
        style={{
          fontSize: 13.5,
          color: "var(--ink-soft)",
          lineHeight: 1.5,
          margin: "0 0 14px",
        }}
      >
        Kindling can summarize lessons, time on task, strengths, and gentle next
        steps for caregivers. Built from real learning events — effort first,
        accuracy second.
      </p>

      <div className="dash-digest-prefs">
        <button
          type="button"
          className="btn-ghost dash-digest-toggle"
          onClick={toggleOptIn}
          disabled={busy}
          aria-pressed={digestOptIn}
        >
          {digestOptIn ? (
            <ToggleRight size={22} color="var(--pine)" />
          ) : (
            <ToggleLeft size={22} />
          )}
          <span>
            {digestOptIn ? "Weekly digests on" : "Weekly digests off"}
          </span>
        </button>

        <div className="dash-digest-email-row">
          <label htmlFor="family-email-input">
            Family email
            <input
              id="family-email-input"
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              onBlur={saveEmail}
              placeholder="caregiver@example.com"
              disabled={busy}
            />
          </label>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: "6px 10px", fontSize: 12 }}
            onClick={saveEmail}
            disabled={busy}
          >
            Save
          </button>
        </div>
      </div>

      <div className="dash-digest-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={handleGenerate}
          disabled={busy}
          style={{ fontSize: 13, padding: "8px 14px" }}
        >
          {busy ? (
            <Loader2
              size={14}
              style={{
                marginRight: 6,
                display: "inline",
                verticalAlign: -2,
                animation: "spin 1s linear infinite",
              }}
            />
          ) : (
            <Sparkles
              size={14}
              style={{ marginRight: 6, display: "inline", verticalAlign: -2 }}
            />
          )}
          Generate this week&apos;s preview
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{ padding: "6px 10px", fontSize: 12 }}
          onClick={() => {
            setLoading(true);
            load();
          }}
          disabled={busy || loading}
          aria-label="Refresh digests"
        >
          <RefreshCw
            size={14}
            style={{ marginRight: 4, display: "inline", verticalAlign: -2 }}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="note-card"
          style={{
            marginTop: 12,
            borderColor: "rgba(180,60,60,0.25)",
            color: "var(--berry)",
          }}
        >
          {error}
        </div>
      )}

      {selected && (
        <article className="dash-digest-preview note-card" style={{ marginTop: 14 }}>
          <div className="dash-digest-preview-head">
            <strong>{selected.headline}</strong>
            <span className="dash-status-pill status-building">
              {selected.status}
              {selected.channel ? ` · ${selected.channel}` : ""}
            </span>
          </div>
          <p className="dash-digest-period">
            {formatPeriod(selected.periodStart, selected.periodEnd)}
          </p>
          <pre className="dash-digest-body">{selected.bodyText}</pre>
          {selected.summary?.active && (
            <ul className="dash-digest-stats">
              <li>
                <CheckCircle2 size={14} /> Lessons: {selected.summary.sessions ?? 0}
              </li>
              <li>
                <CheckCircle2 size={14} /> Time:{" "}
                {selected.summary.timeOnTaskLabel || "—"}
              </li>
              <li>
                <CheckCircle2 size={14} /> Exchanges:{" "}
                {selected.summary.exchanges ?? 0}
              </li>
            </ul>
          )}
        </article>
      )}

      <div className="dash-digest-list" style={{ marginTop: 16 }}>
        <h4 style={{ fontSize: 13, margin: "0 0 8px", color: "var(--ink-soft)" }}>
          Recent digests
        </h4>
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            <Loader2
              size={14}
              style={{
                display: "inline",
                marginRight: 6,
                verticalAlign: -2,
                animation: "spin 1s linear infinite",
              }}
            />
            Loading…
          </p>
        ) : items.length ? (
          <ul className="dash-insight-list">
            {items.map((d) => (
              <li key={d.id}>
                <Mail size={16} className="dash-insight-icon good" />
                <div>
                  <button
                    type="button"
                    className="dash-digest-link"
                    onClick={() => setSelected(d)}
                  >
                    <strong>{d.headline || `Digest #${d.id}`}</strong>
                  </button>
                  <span>
                    {formatPeriod(d.periodStart, d.periodEnd)}
                    {d.status ? ` · ${d.status}` : ""}
                    {d.channel ? ` · ${d.channel}` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            No digests yet. Turn on weekly digests and generate a preview, or wait
            for the weekly job after lessons.
          </p>
        )}
      </div>
    </div>
  );
}
