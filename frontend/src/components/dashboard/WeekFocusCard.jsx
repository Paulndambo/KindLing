import { useEffect, useState } from "react";
import { Target, Loader2, Check } from "lucide-react";
import { patchStudentProfile, ApiError } from "../../services/api";
import {
  WEEK_FOCUS_MAX,
  sanitizeWeekFocus,
} from "../../services/learning/goalsSurface";

/**
 * Epic C5 lite — editable “this week I’m working on…” line on the dashboard.
 */
export default function WeekFocusCard({ student, onStudentUpdate }) {
  const remote = String(student?.weekFocus || student?.week_focus || "");
  const [draft, setDraft] = useState(remote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(remote);
  }, [remote, student?.id]);

  const dirty = sanitizeWeekFocus(draft) !== sanitizeWeekFocus(remote);

  const save = async () => {
    const next = sanitizeWeekFocus(draft);
    if (next === sanitizeWeekFocus(remote)) return;
    setBusy(true);
    setError("");
    try {
      const updated = await patchStudentProfile({ weekFocus: next });
      onStudentUpdate?.(updated);
      setDraft(updated.weekFocus ?? next);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1600);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save week focus."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="week-focus-card" role="region" aria-label="This week focus">
      <div className="week-focus-head">
        <span className="week-focus-icon" aria-hidden>
          <Target size={16} />
        </span>
        <div>
          <p className="eyebrow">This week</p>
          <h3>I’m working on…</h3>
        </div>
      </div>
      <p className="week-focus-hint">
        One line Kindling can remember in lessons — not a full plan.
      </p>
      <label className="week-focus-label" htmlFor="week-focus-input">
        Week focus
      </label>
      <div className="week-focus-row">
        <input
          id="week-focus-input"
          type="text"
          className="week-focus-input"
          placeholder="e.g. Adding fractions with different denominators"
          maxLength={WEEK_FOCUS_MAX}
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
        />
        <button
          type="button"
          className="journal-primary-btn week-focus-save"
          onClick={save}
          disabled={busy || !dirty}
        >
          {busy ? (
            <Loader2 size={14} className="spin" />
          ) : savedFlash ? (
            <>
              <Check size={14} /> Saved
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>
      {error && (
        <p className="week-focus-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
