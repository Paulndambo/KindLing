import { useMemo } from "react";
import { formatFraction, fractionToPercent } from "../../../services/learning/manipulatives";

/**
 * Interactive fraction bar: set denominator (parts) and fill numerator.
 */
export default function FractionBars({
  num = 1,
  den = 4,
  onChange,
  disabled = false,
  highlightLabel = null,
}) {
  const safeDen = Math.min(24, Math.max(1, den || 1));
  const safeNum = Math.min(safeDen * 2, Math.max(0, num || 0));
  const pct = fractionToPercent(Math.min(safeNum, safeDen), safeDen);
  const parts = useMemo(
    () => Array.from({ length: safeDen }, (_, i) => i),
    [safeDen]
  );

  const setNum = (n) => {
    if (disabled || !onChange) return;
    onChange({ num: n, den: safeDen });
  };

  const setDen = (d) => {
    if (disabled || !onChange) return;
    const nextDen = Math.min(24, Math.max(1, d));
    const nextNum = Math.min(safeNum, nextDen);
    onChange({ num: nextNum, den: nextDen });
  };

  return (
    <div className="manip-fraction" aria-label="Fraction bar model">
      <div className="manip-fraction-readout">
        <span className="manip-fraction-value">
          {formatFraction(safeNum, safeDen)}
        </span>
        <span className="manip-fraction-pct">{Math.round(pct)}% of the whole</span>
        {highlightLabel && (
          <span className="manip-tutor-hint">{highlightLabel}</span>
        )}
      </div>

      <div
        className="manip-bar-track"
        role="group"
        aria-label={`Fraction bar showing ${safeNum} of ${safeDen}`}
      >
        {parts.map((i) => {
          const filled = i < Math.min(safeNum, safeDen);
          return (
            <button
              key={i}
              type="button"
              className={`manip-bar-seg${filled ? " filled" : ""}`}
              disabled={disabled}
              aria-pressed={filled}
              aria-label={`Part ${i + 1} of ${safeDen}${filled ? ", filled" : ""}`}
              onClick={() => setNum(filled && i === safeNum - 1 ? i : i + 1)}
            />
          );
        })}
      </div>

      <div className="manip-controls">
        <label className="manip-control">
          <span>Parts (denominator)</span>
          <div className="manip-stepper">
            <button
              type="button"
              disabled={disabled || safeDen <= 1}
              onClick={() => setDen(safeDen - 1)}
              aria-label="Fewer parts"
            >
              −
            </button>
            <strong>{safeDen}</strong>
            <button
              type="button"
              disabled={disabled || safeDen >= 24}
              onClick={() => setDen(safeDen + 1)}
              aria-label="More parts"
            >
              +
            </button>
          </div>
        </label>
        <label className="manip-control">
          <span>Filled (numerator)</span>
          <div className="manip-stepper">
            <button
              type="button"
              disabled={disabled || safeNum <= 0}
              onClick={() => setNum(safeNum - 1)}
              aria-label="Fill less"
            >
              −
            </button>
            <strong>{safeNum}</strong>
            <button
              type="button"
              disabled={disabled || safeNum >= safeDen}
              onClick={() => setNum(safeNum + 1)}
              aria-label="Fill more"
            >
              +
            </button>
          </div>
        </label>
      </div>

      <div className="manip-presets" role="group" aria-label="Quick fractions">
        {[
          [1, 2],
          [1, 3],
          [1, 4],
          [2, 3],
          [3, 4],
          [1, 1],
        ].map(([n, d]) => (
          <button
            key={`${n}/${d}`}
            type="button"
            className={`manip-preset${
              safeNum === n && safeDen === d ? " active" : ""
            }`}
            disabled={disabled}
            onClick={() => onChange?.({ num: n, den: d })}
          >
            {formatFraction(n, d)}
          </button>
        ))}
      </div>
    </div>
  );
}
