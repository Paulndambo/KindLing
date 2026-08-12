import { formatFraction, fractionToPercent } from "../../../services/learning/manipulatives";

/**
 * Interactive 0–1 number line with fraction ticks.
 */
export default function NumberLine({
  num = 1,
  den = 4,
  onChange,
  disabled = false,
  highlightLabel = null,
}) {
  const safeDen = Math.min(16, Math.max(1, den || 1));
  const safeNum = Math.min(safeDen, Math.max(0, num || 0));
  const pct = fractionToPercent(safeNum, safeDen);

  const setNum = (n) => {
    if (disabled || !onChange) return;
    onChange({ num: Math.max(0, Math.min(safeDen, n)), den: safeDen });
  };

  const setDen = (d) => {
    if (disabled || !onChange) return;
    const nextDen = Math.min(16, Math.max(1, d));
    const nextNum = Math.min(safeNum, nextDen);
    onChange({ num: nextNum, den: nextDen });
  };

  const ticks = Array.from({ length: safeDen + 1 }, (_, i) => i);

  return (
    <div className="manip-numberline" aria-label="Fraction number line">
      <div className="manip-fraction-readout">
        <span className="manip-fraction-value">
          {formatFraction(safeNum, safeDen)}
        </span>
        <span className="manip-fraction-pct">on the number line</span>
        {highlightLabel && (
          <span className="manip-tutor-hint">{highlightLabel}</span>
        )}
      </div>

      <div className="manip-line-wrap">
        <div className="manip-line-rail" aria-hidden>
          <div className="manip-line-fill" style={{ width: `${pct}%` }} />
          <div className="manip-line-knob" style={{ left: `${pct}%` }} />
        </div>
        <div className="manip-line-ticks">
          {ticks.map((i) => (
            <button
              key={i}
              type="button"
              className={`manip-tick${i === safeNum ? " active" : ""}`}
              style={{ left: `${(i / safeDen) * 100}%` }}
              disabled={disabled}
              onClick={() => setNum(i)}
              aria-label={`${formatFraction(i, safeDen)}`}
              title={formatFraction(i, safeDen)}
            >
              <span className="manip-tick-dot" />
              <span className="manip-tick-label">
                {i === 0 ? "0" : i === safeDen ? "1" : formatFraction(i, safeDen)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="manip-controls">
        <label className="manip-control">
          <span>Divisions</span>
          <div className="manip-stepper">
            <button
              type="button"
              disabled={disabled || safeDen <= 1}
              onClick={() => setDen(safeDen - 1)}
              aria-label="Fewer divisions"
            >
              −
            </button>
            <strong>{safeDen}</strong>
            <button
              type="button"
              disabled={disabled || safeDen >= 16}
              onClick={() => setDen(safeDen + 1)}
              aria-label="More divisions"
            >
              +
            </button>
          </div>
        </label>
        <label className="manip-control">
          <span>Position</span>
          <div className="manip-stepper">
            <button
              type="button"
              disabled={disabled || safeNum <= 0}
              onClick={() => setNum(safeNum - 1)}
              aria-label="Move left"
            >
              −
            </button>
            <strong>{formatFraction(safeNum, safeDen)}</strong>
            <button
              type="button"
              disabled={disabled || safeNum >= safeDen}
              onClick={() => setNum(safeNum + 1)}
              aria-label="Move right"
            >
              +
            </button>
          </div>
        </label>
      </div>
    </div>
  );
}
