import { useEffect, useState } from "react";
import {
  BarChart3,
  GitCommitHorizontal,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";
import FractionBars from "./FractionBars";
import NumberLine from "./NumberLine";
import {
  MANIPULATIVE_TYPES,
  formatFraction,
  manipulativesForTopic,
} from "../../../services/learning/manipulatives";

/**
 * Host panel for interactive math models in the live lesson.
 */
export default function ManipulativePanel({
  topicName,
  open = false,
  onOpenChange,
  type = MANIPULATIVE_TYPES.FRACTION_BAR,
  onTypeChange,
  num = 1,
  den = 4,
  onStateChange,
  tutorPulse = null,
  onShareWithTutor,
  disabled = false,
}) {
  const available = manipulativesForTopic(topicName);
  const [collapsed, setCollapsed] = useState(!open);

  useEffect(() => {
    if (open) setCollapsed(false);
  }, [open]);

  useEffect(() => {
    if (tutorPulse) setCollapsed(false);
  }, [tutorPulse]);

  if (!available.length) return null;

  const activeType = available.includes(type) ? type : available[0];

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    onOpenChange?.(!next);
  };

  return (
    <div
      className={`manip-panel${collapsed ? " is-collapsed" : ""}${
        tutorPulse ? " tutor-driven" : ""
      }`}
    >
      <button
        type="button"
        className="manip-panel-toggle"
        onClick={handleToggle}
        aria-expanded={!collapsed}
      >
        <Sparkles size={14} />
        <span>Interactive model</span>
        <span className="manip-panel-value">
          {formatFraction(num, den)}
        </span>
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {!collapsed && (
        <div className="manip-panel-body">
          {available.length > 1 && (
            <div className="manip-type-tabs" role="tablist">
              {available.includes(MANIPULATIVE_TYPES.FRACTION_BAR) && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeType === MANIPULATIVE_TYPES.FRACTION_BAR}
                  className={
                    activeType === MANIPULATIVE_TYPES.FRACTION_BAR ? "active" : ""
                  }
                  onClick={() =>
                    onTypeChange?.(MANIPULATIVE_TYPES.FRACTION_BAR)
                  }
                >
                  <BarChart3 size={13} /> Fraction bar
                </button>
              )}
              {available.includes(MANIPULATIVE_TYPES.NUMBER_LINE) && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeType === MANIPULATIVE_TYPES.NUMBER_LINE}
                  className={
                    activeType === MANIPULATIVE_TYPES.NUMBER_LINE ? "active" : ""
                  }
                  onClick={() =>
                    onTypeChange?.(MANIPULATIVE_TYPES.NUMBER_LINE)
                  }
                >
                  <GitCommitHorizontal size={13} /> Number line
                </button>
              )}
            </div>
          )}

          {tutorPulse && (
            <p className="manip-tutor-banner" role="status">
              Kindling set the model to{" "}
              <strong>{formatFraction(tutorPulse.num, tutorPulse.den)}</strong>
              {tutorPulse.label ? ` — ${tutorPulse.label}` : ""}. Try adjusting it!
            </p>
          )}

          {activeType === MANIPULATIVE_TYPES.NUMBER_LINE ? (
            <NumberLine
              num={num}
              den={den}
              onChange={onStateChange}
              disabled={disabled}
              highlightLabel={tutorPulse?.label}
            />
          ) : (
            <FractionBars
              num={num}
              den={den}
              onChange={onStateChange}
              disabled={disabled}
              highlightLabel={tutorPulse?.label}
            />
          )}

          {onShareWithTutor && (
            <button
              type="button"
              className="manip-share-btn"
              disabled={disabled}
              onClick={() =>
                onShareWithTutor({
                  type: activeType,
                  num,
                  den,
                  text: `My model shows ${formatFraction(num, den)}.`,
                })
              }
            >
              <Send size={14} />
              Share model with Kindling
            </button>
          )}
        </div>
      )}
    </div>
  );
}
