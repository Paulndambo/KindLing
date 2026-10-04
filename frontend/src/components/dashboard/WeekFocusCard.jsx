import { useEffect, useState } from "react";
import { Target, Loader2, Check, CalendarDays } from "lucide-react";
import { patchStudentProfile, ApiError } from "../../services/api";
import {
  WEEK_FOCUS_MAX,
  sanitizeWeekFocus,
} from "../../services/learning/goalsSurface";

function daysFromToday(dateValue) {
  if (!dateValue) return null;
  const target = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function countdownCopy(days, label) {
  const name = label?.trim() || "Your target";
  if (days === null) return "";
  if (days === 0) return `${name} is today.`;
  if (days === 1) return `${name} is tomorrow — one day to go.`;
  if (days > 1) return `${days} days until ${name}.`;
  if (days === -1) return `${name} was yesterday.`;
  return `${name} was ${Math.abs(days)} days ago.`;
}

/**
 * Student-owned weekly focus and target date controls for C5 lite / C5+.1.
 */
export default function WeekFocusCard({ student, onStudentUpdate }) {
  const remote = String(student?.weekFocus || student?.week_focus || "");
  const remoteTargetDate = String(
    student?.targetDate || student?.target_date || ""
  ).slice(0, 10);
  const remoteTargetLabel = String(
    student?.targetLabel || student?.target_label || ""
  );
  const [draft, setDraft] = useState(remote);
  const [targetDateDraft, setTargetDateDraft] = useState(remoteTargetDate);
  const [targetLabelDraft, setTargetLabelDraft] = useState(remoteTargetLabel);
  const [busy, setBusy] = useState(false);
  const [targetBusy, setTargetBusy] = useState(false);
  const [error, setError] = useState("");
  const [targetError, setTargetError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [targetSavedFlash, setTargetSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(remote);
  }, [remote, student?.id]);

  useEffect(() => {
    setTargetDateDraft(remoteTargetDate);
    setTargetLabelDraft(remoteTargetLabel);
  }, [remoteTargetDate, remoteTargetLabel, student?.id]);

  const dirty = sanitizeWeekFocus(draft) !== sanitizeWeekFocus(remote);
  const targetDirty =
    targetDateDraft !== remoteTargetDate ||
    targetLabelDraft.trim() !== remoteTargetLabel.trim();

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

  const saveTarget = async () => {
    if (!targetDirty) return;
    setTargetBusy(true);
    setTargetError("");
    try {
      const updated = await patchStudentProfile({
        targetLabel: targetLabelDraft.trim(),
        targetDate: targetDateDraft || null,
      });
      onStudentUpdate?.(updated);
      setTargetDateDraft(String(updated.targetDate || "").slice(0, 10));
      setTargetLabelDraft(updated.targetLabel || "");
      setTargetSavedFlash(true);
      window.setTimeout(() => setTargetSavedFlash(false), 1600);
    } catch (err) {
      setTargetError(
        err instanceof ApiError ? err.message : "Could not save your target date."
      );
    } finally {
      setTargetBusy(false);
    }
  };

  const targetDays = daysFromToday(targetDateDraft);

  return (
    <div
      className="week-focus-card"
      role="region"
      aria-label="Learning focus and target date"
    >
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
      <div className="target-date-section">
        <div className="week-focus-head">
          <span className="week-focus-icon" aria-hidden>
            <CalendarDays size={16} />
          </span>
          <div>
            <p className="eyebrow">Optional target</p>
            <h3>A date you’re working toward</h3>
          </div>
        </div>
        <p className="week-focus-hint">
          An exam, project, or personal goal. You choose it; it won’t change your
          lessons automatically.
        </p>
        <label className="week-focus-label" htmlFor="target-label-input">
          Target name
        </label>
        <input
          id="target-label-input"
          type="text"
          className="week-focus-input target-label-input"
          placeholder="e.g. Biology exam"
          maxLength={120}
          value={targetLabelDraft}
          disabled={targetBusy}
          onChange={(event) => setTargetLabelDraft(event.target.value)}
        />
        <div className="week-focus-row target-date-row">
          <label className="week-focus-label" htmlFor="target-date-input">
            Target date
          </label>
          <input
            id="target-date-input"
            type="date"
            className="week-focus-input"
            value={targetDateDraft}
            disabled={targetBusy}
            onChange={(event) => setTargetDateDraft(event.target.value)}
          />
          <button
            type="button"
            className="journal-primary-btn week-focus-save"
            onClick={saveTarget}
            disabled={targetBusy || !targetDirty}
          >
            {targetBusy ? (
              <Loader2 size={14} className="spin" />
            ) : targetSavedFlash ? (
              <>
                <Check size={14} /> Saved
              </>
            ) : (
              "Save date"
            )}
          </button>
        </div>
        {targetDateDraft && (
          <p className="target-countdown" aria-live="polite">
            {countdownCopy(targetDays, targetLabelDraft)}
          </p>
        )}
        {targetError && (
          <p className="week-focus-error" role="alert">
            {targetError}
          </p>
        )}
      </div>
    </div>
  );
}
