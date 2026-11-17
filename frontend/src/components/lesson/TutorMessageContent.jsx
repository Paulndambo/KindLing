import { memo, useEffect, useId, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Check, Copy, Eye } from "lucide-react";
import "katex/dist/katex.min.css";
import { stripMathCheckTags } from "../../services/learning/mathVerifier";
import {
  MANIPULATIVE_TYPES,
  VISUAL_TAG_RE,
  parseVisualDirective,
  stripVisualTags,
} from "../../services/learning/manipulatives";
import { stripStepTags } from "../../services/learning/multiStepEngine";
import { stripSuggestTags } from "../../services/learning/tutorSuggestions";
import { findLessonImage } from "../../services/learning/lessonImages";
import {
  parseLessonFlowchart,
  parseVisualDemo,
} from "../../services/learning/diagramRenderer";
import {
  languageDisplayName,
  tokenizeCode,
  tokensToLines,
} from "../../utils/codeHighlight";

const LESSON_IMAGE_MARKER = /^\[\[lesson-image:\s*(.{2,100}?)\s*\]\]$/i;

function TutorLessonImage({ query }) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    findLessonImage(query, controller.signal)
      .then((result) => {
        if (active) setImage(result);
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.abort();
    };
  }, [query]);

  if (!image) return null;
  return (
    <figure className="tutor-lesson-visual">
      <a href={image.href} target="_blank" rel="noopener noreferrer">
        <img src={image.src} alt={image.title} loading="lazy" />
      </a>
      <figcaption>
        Visual reference:{" "}
        <a href={image.href} target="_blank" rel="noopener noreferrer">
          {image.title}
        </a>
      </figcaption>
    </figure>
  );
}

/**
 * Renders Kindling tutor replies as structured, learner-friendly content:
 * paragraphs, lists, tables, code, math, interactive-style SVG visual demonstrations,
 * and flowcharts. Never renders raw HTML from the model (no rehype-raw).
 */

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [[rehypeKatex, { throwOnError: false, strict: "ignore" }]];
const FLOWCHART_NODE_WIDTH = 164;
const FLOWCHART_NODE_HEIGHT = 58;

function languageLabel(className = "") {
  const match = /language-([\w+-]+)/.exec(className || "");
  return match?.[1]?.toLowerCase() || "text";
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore clipboard failures */
    }
  };

  return (
    <button
      type="button"
      className="tutor-code-copy"
      onClick={onCopy}
      aria-label={copied ? "Copied" : "Copy code"}
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

const VISUAL_DEMO_LANGS = new Set([
  "visual",
  "visual-demo",
  "chart",
  "fraction-visual",
  "number-line",
  "plot",
  "geometry",
  "study-plan",
  "studyplan",
  "lesson-plan",
  "roadmap",
]);

const DIAGRAM_LANGS = new Set([
  "mermaid",
  "flowchart",
  "text",
  "ascii",
  "diagram",
  "plain",
  "txt",
]);

function wrappedLabel(label) {
  const words = String(label || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > 22 && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function boundaryPoint(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const scale = Math.min(
    FLOWCHART_NODE_WIDTH / 2 / Math.max(Math.abs(dx), 0.001),
    FLOWCHART_NODE_HEIGHT / 2 / Math.max(Math.abs(dy), 0.001)
  );
  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

function TutorFlowchart({ graph }) {
  const vertical =
    graph.direction === "TD" ||
    graph.direction === "TB" ||
    graph.direction === "BT";
  const maxPerLevel = Math.max(...graph.levels.map(([, ids]) => ids.length));
  const backEdgeSet = new Set(graph.backEdges || []);
  const hasBackEdges = backEdgeSet.size > 0;
  const width = vertical
    ? Math.max(260, maxPerLevel * 195 + (hasBackEdges ? 90 : 44))
    : graph.levels.length * 228 + 30;
  const height = vertical
    ? graph.levels.length * 134 + 24
    : Math.max(150, maxPerLevel * 108 + (hasBackEdges ? 70 : 36));
  const positions = new Map();
  graph.levels.forEach(([, ids], levelIndex) => {
    const index =
      graph.direction === "BT" || graph.direction === "RL"
        ? graph.levels.length - 1 - levelIndex
        : levelIndex;
    ids.forEach((id, itemIndex) => {
      positions.set(
        id,
        vertical
          ? {
              x: width / 2 + (itemIndex - (ids.length - 1) / 2) * 195,
              y: 38 + index * 134 + FLOWCHART_NODE_HEIGHT / 2,
            }
          : {
              x: 104 + index * 228,
              y: height / 2 + (itemIndex - (ids.length - 1) / 2) * 104,
            }
      );
    });
  });

  const arrows = graph.edges.map(([fromId, toId, edgeLabel], index) => {
    const from = positions.get(fromId);
    const to = positions.get(toId);
    if (!from || !to) return null;

    if (backEdgeSet.has(index)) {
      // Render a gentle curved return arc for cycles (e.g. Water Cycle)
      const curveOffset = vertical ? 110 : 68;
      const startX = vertical ? from.x + FLOWCHART_NODE_WIDTH / 2 : from.x;
      const startY = vertical ? from.y : from.y + FLOWCHART_NODE_HEIGHT / 2;
      const endX = vertical ? to.x + FLOWCHART_NODE_WIDTH / 2 : to.x;
      const endY = vertical ? to.y : to.y + FLOWCHART_NODE_HEIGHT / 2;
      const ctrlX = vertical
        ? Math.max(startX, endX) + curveOffset
        : (startX + endX) / 2;
      const ctrlY = vertical
        ? (startY + endY) / 2
        : Math.max(startY, endY) + curveOffset;
      return (
        <g key={`${fromId}-${toId}-${index}`} aria-hidden="true">
          <path
            d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
            fill="none"
            stroke="#E4A32A"
            strokeWidth="2"
            strokeDasharray="5 3"
          />
          <circle cx={endX} cy={endY} r="4" fill="#E4A32A" />
          {edgeLabel ? (
            <text
              x={ctrlX - (vertical ? 14 : 0)}
              y={ctrlY}
              textAnchor="middle"
              fill="#8B5E08"
              fontSize="11"
              fontWeight="600"
              fontFamily="Inter, Arial, sans-serif"
            >
              {edgeLabel}
            </text>
          ) : null}
        </g>
      );
    }

    const start = boundaryPoint(from, to);
    const end = boundaryPoint(to, from);
    const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
    const ux = (end.x - start.x) / length;
    const uy = (end.y - start.y) / length;
    const baseX = end.x - ux * 10;
    const baseY = end.y - uy * 10;
    const px = -uy * 5;
    const py = ux * 5;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const labelWidth = edgeLabel ? Math.min(130, edgeLabel.length * 6.5 + 14) : 0;

    return (
      <g key={`${fromId}-${toId}-${index}`} aria-hidden="true">
        <line
          x1={start.x}
          y1={start.y}
          x2={baseX}
          y2={baseY}
          stroke="#286B6D"
          strokeWidth="2.2"
        />
        <path
          d={`M ${end.x} ${end.y} L ${baseX + px} ${baseY + py} L ${baseX - px} ${baseY - py} Z`}
          fill="#286B6D"
        />
        {edgeLabel ? (
          <g>
            <rect
              x={midX - labelWidth / 2}
              y={midY - 10}
              width={labelWidth}
              height="20"
              rx="10"
              fill="#FDF1D9"
              stroke="#E4A32A"
              strokeWidth="1"
            />
            <text
              x={midX}
              y={midY + 4}
              textAnchor="middle"
              fill="#1F3A34"
              fontSize="11"
              fontWeight="600"
              fontFamily="Inter, Arial, sans-serif"
            >
              {edgeLabel.slice(0, 22)}
            </text>
          </g>
        ) : null}
      </g>
    );
  });

  return (
    <figure className="tutor-mermaid">
      <figcaption className="tutor-mermaid-label">
        <Eye size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />
        Visual Concept Flowchart
      </figcaption>
      <div className="tutor-mermaid-svg">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Flowchart with ${graph.nodes.length} steps`}
        >
          <title>Visual Concept Flowchart</title>
          {arrows}
          {graph.nodes.map((node, nodeIdx) => {
            const point = positions.get(node.id);
            const lines = wrappedLabel(node.label);
            const textY = point.y - ((lines.length - 1) * 16) / 2 + 4;
            const isFirst = nodeIdx === 0;
            const fill = isFirst ? "#EDF7F6" : "#FFFFFF";
            return (
              <g key={node.id}>
                {node.shape === "diamond" ? (
                  <path
                    d={`M ${point.x} ${point.y - 32} L ${point.x + 88} ${point.y} L ${point.x} ${point.y + 32} L ${point.x - 88} ${point.y} Z`}
                    fill="#FDF8EE"
                    stroke="#D48D1B"
                    strokeWidth="2"
                  />
                ) : node.shape === "rounded" ? (
                  <rect
                    x={point.x - 82}
                    y={point.y - 29}
                    width="164"
                    height="58"
                    rx="29"
                    fill={fill}
                    stroke="#286B6D"
                    strokeWidth="2"
                  />
                ) : (
                  <rect
                    x={point.x - 82}
                    y={point.y - 29}
                    width="164"
                    height="58"
                    rx="12"
                    fill={fill}
                    stroke="#286B6D"
                    strokeWidth="2"
                  />
                )}
                <text
                  x={point.x}
                  y={textY}
                  textAnchor="middle"
                  fill="#1F3A34"
                  fontSize="13"
                  fontWeight={isFirst ? "700" : "600"}
                  fontFamily="Inter, Arial, sans-serif"
                >
                  {lines.map((line, index) => (
                    <tspan
                      key={`${node.id}-${index}`}
                      x={point.x}
                      dy={index ? 16 : 0}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="tutor-diagram-description" aria-label="Diagram steps">
        {graph.nodes.map((node) => (
          <li key={node.id}>{node.label}</li>
        ))}
        {graph.edges.map(([from, to, edgeLabel], index) => (
          <li key={`edge-${index}`}>
            {graph.nodes.find((node) => node.id === from)?.label}{" "}
            {edgeLabel ? `(${edgeLabel}) ` : ""}leads to{" "}
            {graph.nodes.find((node) => node.id === to)?.label}.
          </li>
        ))}
      </ul>
    </figure>
  );
}

const BAR_PALETTE = [
  { fill: "#286B6D", bg: "#E6F2F2", border: "#286B6D" },
  { fill: "#E4A32A", bg: "#FDF3DC", border: "#C98914" },
  { fill: "#3B7A57", bg: "#E8F4EC", border: "#3B7A57" },
  { fill: "#5B6ABF", bg: "#ECEFFA", border: "#5B6ABF" },
];

function TutorVisualDemo({ spec }) {
  const rawClipId = useId();
  const clipId = `coord-clip-${rawClipId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (!spec) return null;

  if (spec.kind === "fraction-bars") {
    return (
      <figure className="tutor-visual-demo" aria-label={spec.title}>
        <div className="tutor-visual-header">
          <span className="tutor-visual-badge">
            <Eye size={12} /> Visual Demonstration
          </span>
          <strong className="tutor-visual-title">{spec.title}</strong>
        </div>
        <div className="tutor-fraction-demo-list">
          {spec.bars.map((bar, idx) => {
            const palette = BAR_PALETTE[idx % BAR_PALETTE.length];
            const den = Math.max(1, Math.min(24, bar.den || 4));
            const num = Math.max(0, Math.min(den, bar.num ?? 1));
            const pct = Math.round((num / den) * 100);
            return (
              <div key={`${bar.label}-${idx}`} className="tutor-fraction-row">
                <div className="tutor-fraction-meta">
                  <span
                    className="tutor-fraction-pill"
                    style={{
                      background: palette.bg,
                      borderColor: palette.border,
                      color: "#1F3A34",
                    }}
                  >
                    {bar.num}/{bar.den}
                  </span>
                  <span className="tutor-fraction-label">{bar.label}</span>
                  <span className="tutor-fraction-pct">{pct}%</span>
                </div>
                <div
                  className="tutor-fraction-bar-track"
                  role="img"
                  aria-label={`${bar.num} out of ${bar.den} shaded (${pct}%)`}
                >
                  {Array.from({ length: den }).map((_, segIdx) => {
                    const active = segIdx < num;
                    return (
                      <span
                        key={segIdx}
                        className={`tutor-fraction-seg${active ? " is-shaded" : ""}`}
                        style={
                          active
                            ? { background: palette.fill, borderColor: "#FFFFFF" }
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
                {bar.note ? (
                  <p className="tutor-fraction-note">{bar.note}</p>
                ) : null}
              </div>
            );
          })}
        </div>
        {spec.caption ? (
          <figcaption className="tutor-visual-caption">{spec.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (spec.kind === "number-line") {
    const min = spec.min ?? 0;
    const max = spec.max ?? 1;
    const span = Math.max(0.0001, max - min);
    const step = spec.step || span / 4;
    const tickCount = Math.min(24, Math.max(2, Math.round(span / step) + 1));
    const width = 520;
    const height = spec.jump ? 128 : 98;
    const padX = 44;
    const trackW = width - padX * 2;
    const lineY = spec.jump ? 76 : 50;
    const xFor = (v) =>
      padX + Math.max(0, Math.min(1, (v - min) / span)) * trackW;

    const ticks = Array.from({ length: tickCount }).map((_, i) => {
      const val = min + (i / (tickCount - 1)) * span;
      const x = xFor(val);
      let label = Number.isInteger(val)
        ? String(val)
        : spec.den && min === 0 && max === 1
          ? `${Math.round(val * spec.den)}/${spec.den}`
          : Number(val.toFixed(2)).toString();
      return { x, val, label };
    });

    return (
      <figure className="tutor-visual-demo" aria-label={spec.title}>
        <div className="tutor-visual-header">
          <span className="tutor-visual-badge">
            <Eye size={12} /> Visual Demonstration
          </span>
          <strong className="tutor-visual-title">{spec.title}</strong>
        </div>
        <div className="tutor-mermaid-svg">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={spec.title}
          >
            <line
              x1={padX}
              y1={lineY}
              x2={width - padX}
              y2={lineY}
              stroke="#1F3A34"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {ticks.map((t, idx) => (
              <g key={idx}>
                <line
                  x1={t.x}
                  y1={lineY - 8}
                  x2={t.x}
                  y2={lineY + 8}
                  stroke="#1F3A34"
                  strokeWidth="2"
                />
                <text
                  x={t.x}
                  y={lineY + 25}
                  textAnchor="middle"
                  fontSize="11.5"
                  fontWeight="600"
                  fill="#4A5D58"
                  fontFamily="Inter, Arial, sans-serif"
                >
                  {t.label}
                </text>
              </g>
            ))}
            {spec.jump ? (
              <g>
                <path
                  d={`M ${xFor(spec.jump.from)} ${lineY - 6} Q ${(xFor(spec.jump.from) + xFor(spec.jump.to)) / 2} ${lineY - 54} ${xFor(spec.jump.to)} ${lineY - 6}`}
                  fill="none"
                  stroke="#E4A32A"
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                />
                {spec.jump.label ? (
                  <text
                    x={(xFor(spec.jump.from) + xFor(spec.jump.to)) / 2}
                    y={lineY - 36}
                    textAnchor="middle"
                    fontSize="11.5"
                    fontWeight="700"
                    fill="#B8790E"
                    fontFamily="Inter, Arial, sans-serif"
                  >
                    {spec.jump.label}
                  </text>
                ) : null}
              </g>
            ) : null}
            {spec.points.map((pt, idx) => {
              const cx = xFor(pt.value);
              return (
                <g key={idx}>
                  <circle
                    cx={cx}
                    cy={lineY}
                    r="7"
                    fill="#286B6D"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <rect
                    x={cx - 38}
                    y={lineY - 34}
                    width="76"
                    height="20"
                    rx="10"
                    fill="#EDF7F6"
                    stroke="#286B6D"
                    strokeWidth="1.2"
                  />
                  <text
                    x={cx}
                    y={lineY - 20}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#1F3A34"
                    fontFamily="Inter, Arial, sans-serif"
                  >
                    {String(pt.label || pt.display).slice(0, 12)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        {spec.caption ? (
          <figcaption className="tutor-visual-caption">{spec.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (spec.kind === "bar-chart") {
    const maxVal = Math.max(
      1,
      ...spec.rows.map((r) => Math.abs(Number(r.value) || 0))
    );
    return (
      <figure className="tutor-visual-demo" aria-label={spec.title}>
        <div className="tutor-visual-header">
          <span className="tutor-visual-badge">
            <Eye size={12} /> Visual Demonstration
          </span>
          <strong className="tutor-visual-title">{spec.title}</strong>
        </div>
        <div className="tutor-barchart-list">
          {spec.rows.map((row, idx) => {
            const palette = BAR_PALETTE[idx % BAR_PALETTE.length];
            const pct = Math.max(
              6,
              Math.min(100, Math.round((Math.abs(row.value) / maxVal) * 100))
            );
            return (
              <div key={`${row.label}-${idx}`} className="tutor-barchart-row">
                <div className="tutor-barchart-top">
                  <span className="tutor-barchart-label">{row.label}</span>
                  <strong className="tutor-barchart-val">
                    {row.value}
                    {row.unit ? ` ${row.unit}` : ""}
                  </strong>
                </div>
                <div className="tutor-barchart-track">
                  <div
                    className="tutor-barchart-fill"
                    style={{ width: `${pct}%`, background: palette.fill }}
                  />
                </div>
                {row.note ? (
                  <span className="tutor-barchart-note">{row.note}</span>
                ) : null}
              </div>
            );
          })}
        </div>
        {spec.caption ? (
          <figcaption className="tutor-visual-caption">{spec.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (spec.kind === "coordinate-plane") {
    const size = 280;
    const pad = 28;
    const plotSize = size - pad * 2;
    const maxCoord = Math.max(
      5,
      ...spec.points.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)]),
      Math.abs(spec.intercept || 0) + 2
    );
    const range = Math.ceil(maxCoord);
    const toX = (x) => pad + ((x + range) / (range * 2)) * plotSize;
    const toY = (y) => pad + ((range - y) / (range * 2)) * plotSize;
    const gridTicks = [-range, -Math.round(range / 2), 0, Math.round(range / 2), range];

    let lineSegment = null;
    if (spec.slope != null) {
      const x1 = -range;
      const y1 = spec.slope * x1 + (spec.intercept || 0);
      const x2 = range;
      const y2 = spec.slope * x2 + (spec.intercept || 0);
      lineSegment = { x1: toX(x1), y1: toY(y1), x2: toX(x2), y2: toY(y2) };
    }

    return (
      <figure className="tutor-visual-demo" aria-label={spec.title}>
        <div className="tutor-visual-header">
          <span className="tutor-visual-badge">
            <Eye size={12} /> Visual Demonstration
          </span>
          <strong className="tutor-visual-title">{spec.title}</strong>
        </div>
        <div className="tutor-mermaid-svg">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            style={{ maxWidth: 300 }}
            role="img"
            aria-label={spec.title}
          >
            <defs>
              <clipPath id={clipId}>
                <rect x={pad} y={pad} width={plotSize} height={plotSize} />
              </clipPath>
            </defs>
            <rect
              x={pad}
              y={pad}
              width={plotSize}
              height={plotSize}
              fill="#F8FBFA"
              stroke="#CFE2DF"
              rx="6"
            />
            {gridTicks.map((t, idx) => (
              <g key={idx}>
                <line
                  x1={toX(t)}
                  y1={pad}
                  x2={toX(t)}
                  y2={size - pad}
                  stroke={t === 0 ? "#1F3A34" : "#E1ECEA"}
                  strokeWidth={t === 0 ? "2" : "1"}
                />
                <line
                  x1={pad}
                  y1={toY(t)}
                  x2={size - pad}
                  y2={toY(t)}
                  stroke={t === 0 ? "#1F3A34" : "#E1ECEA"}
                  strokeWidth={t === 0 ? "2" : "1"}
                />
                {t !== 0 ? (
                  <>
                    <text
                      x={toX(t)}
                      y={toY(0) + 14}
                      fontSize="9.5"
                      textAnchor="middle"
                      fill="#5A6B66"
                    >
                      {t}
                    </text>
                    <text
                      x={toX(0) - 8}
                      y={toY(t) + 3}
                      fontSize="9.5"
                      textAnchor="end"
                      fill="#5A6B66"
                    >
                      {t}
                    </text>
                  </>
                ) : null}
              </g>
            ))}
            {lineSegment ? (
              <line
                clipPath={`url(#${clipId})`}
                x1={lineSegment.x1}
                y1={lineSegment.y1}
                x2={lineSegment.x2}
                y2={lineSegment.y2}
                stroke="#286B6D"
                strokeWidth="2.5"
              />
            ) : null}
            {spec.points.map((pt, idx) => (
              <g key={idx}>
                <circle
                  cx={toX(pt.x)}
                  cy={toY(pt.y)}
                  r="5"
                  fill="#E4A32A"
                  stroke="#1F3A34"
                  strokeWidth="1.5"
                />
                <text
                  x={toX(pt.x) + 7}
                  y={toY(pt.y) - 6}
                  fontSize="10.5"
                  fontWeight="700"
                  fill="#1F3A34"
                >
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
        {spec.caption ? (
          <figcaption className="tutor-visual-caption">{spec.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (spec.kind === "geometry") {
    const isCircle = /circle/.test(spec.shape);
    const isRect = /rect|square/.test(spec.shape);
    return (
      <figure className="tutor-visual-demo" aria-label={spec.title}>
        <div className="tutor-visual-header">
          <span className="tutor-visual-badge">
            <Eye size={12} /> Visual Demonstration
          </span>
          <strong className="tutor-visual-title">{spec.title}</strong>
        </div>
        <div className="tutor-mermaid-svg">
          <svg
            viewBox="0 0 320 170"
            style={{ maxWidth: 360 }}
            role="img"
            aria-label={spec.title}
          >
            {isCircle ? (
              <g>
                <circle
                  cx="160"
                  cy="85"
                  r="58"
                  fill="#EDF7F6"
                  stroke="#286B6D"
                  strokeWidth="2.5"
                />
                <line
                  x1="160"
                  y1="85"
                  x2="218"
                  y2="85"
                  stroke="#E4A32A"
                  strokeWidth="2.5"
                />
                <circle cx="160" cy="85" r="4" fill="#1F3A34" />
                <text
                  x="189"
                  y="77"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#1F3A34"
                >
                  r = {spec.labels.r || spec.labels.radius || "r"}
                </text>
              </g>
            ) : isRect ? (
              <g>
                <rect
                  x="70"
                  y="32"
                  width="180"
                  height="96"
                  rx="4"
                  fill="#EDF7F6"
                  stroke="#286B6D"
                  strokeWidth="2.5"
                />
                <text
                  x="160"
                  y="148"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#1F3A34"
                >
                  {spec.labels.width ||
                    spec.labels.base ||
                    spec.labels.length ||
                    spec.labels.w ||
                    "width"}
                </text>
                <text
                  x="262"
                  y="84"
                  textAnchor="start"
                  fontSize="12"
                  fontWeight="700"
                  fill="#1F3A34"
                >
                  {spec.labels.height || spec.labels.h || "height"}
                </text>
              </g>
            ) : (
              <g>
                <polygon
                  points="75,135 235,135 75,35"
                  fill="#EDF7F6"
                  stroke="#286B6D"
                  strokeWidth="2.5"
                />
                <rect
                  x="75"
                  y="121"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="#286B6D"
                  strokeWidth="1.5"
                />
                <text
                  x="155"
                  y="154"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#1F3A34"
                >
                  {spec.labels.b || spec.labels.base || "base"}
                </text>
                <text
                  x="58"
                  y="90"
                  textAnchor="end"
                  fontSize="12"
                  fontWeight="700"
                  fill="#1F3A34"
                >
                  {spec.labels.a || spec.labels.height || spec.labels.h || "height"}
                </text>
                <text
                  x="168"
                  y="76"
                  textAnchor="start"
                  fontSize="12"
                  fontWeight="700"
                  fill="#B8790E"
                >
                  {spec.labels.c || spec.labels.hypotenuse || ""}
                </text>
              </g>
            )}
          </svg>
        </div>
        {spec.formula ? (
          <div className="tutor-visual-formula">{spec.formula}</div>
        ) : null}
        {spec.caption ? (
          <figcaption className="tutor-visual-caption">{spec.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (spec.kind === "comparison") {
    return (
      <figure className="tutor-visual-demo" aria-label={spec.title}>
        <div className="tutor-visual-header">
          <span className="tutor-visual-badge">
            <Eye size={12} /> Visual Comparison
          </span>
          <strong className="tutor-visual-title">{spec.title}</strong>
        </div>
        <div className="tutor-comparison-grid">
          <div className="tutor-comparison-col-head">{spec.leftTitle}</div>
          <div className="tutor-comparison-col-head is-alt">
            {spec.rightTitle}
          </div>
          {spec.pairs.map((pair, idx) => (
            <div key={idx} className="tutor-comparison-pair">
              {pair.aspect ? (
                <div className="tutor-comparison-aspect">{pair.aspect}</div>
              ) : null}
              <div className="tutor-comparison-cell">{pair.left}</div>
              <div className="tutor-comparison-cell is-alt">{pair.right}</div>
            </div>
          ))}
        </div>
        {spec.caption ? (
          <figcaption className="tutor-visual-caption">{spec.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (spec.kind === "study-plan") {
    return (
      <figure
        className="tutor-visual-demo tutor-study-plan-card"
        aria-label={spec.title}
      >
        <div className="tutor-visual-header">
          <span className="tutor-visual-badge is-study-plan">
            <Eye size={12} /> Topic Curriculum
          </span>
          <strong className="tutor-visual-title">{spec.title}</strong>
        </div>
        {spec.objectives?.length ? (
          <div className="tutor-study-plan-group">
            <span className="tutor-study-plan-kicker">
              Learning Objectives &amp; Goals
            </span>
            <ul className="tutor-study-plan-objectives">
              {spec.objectives.map((obj, idx) => (
                <li key={idx}>
                  <span className="tutor-study-plan-check" aria-hidden="true">
                    ✓
                  </span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {spec.concepts?.length ? (
          <div className="tutor-study-plan-group">
            <span className="tutor-study-plan-kicker">Key Concepts Covered</span>
            <div className="tutor-study-plan-concepts">
              {spec.concepts.map((concept, idx) => (
                <span key={idx} className="tutor-study-plan-concept-pill">
                  {concept}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {spec.sections?.length ? (
          <div className="tutor-study-plan-group">
            <span className="tutor-study-plan-kicker">
              Curriculum Modules
            </span>
            <div className="tutor-process-steps is-study-plan">
              {spec.sections.map((sec, idx) => (
                <div key={idx} className="tutor-process-step-card">
                  <span className="tutor-process-step-num">{sec.step}</span>
                  <div className="tutor-process-step-body">
                    <strong className="tutor-process-step-title">
                      {sec.title}
                    </strong>
                    {sec.detail ? (
                      <span className="tutor-process-step-detail">
                        {sec.detail}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {spec.caption ? (
          <figcaption className="tutor-visual-caption">{spec.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  // Default: process / cycle / layers cards
  return (
    <figure className="tutor-visual-demo" aria-label={spec.title}>
      <div className="tutor-visual-header">
        <span className="tutor-visual-badge">
          <Eye size={12} />{" "}
          {spec.kind === "cycle"
            ? "Visual Cycle"
            : spec.kind === "layers"
              ? "Visual Layers"
              : "Visual Walkthrough"}
        </span>
        <strong className="tutor-visual-title">{spec.title}</strong>
      </div>
      <div className={`tutor-process-steps is-${spec.kind}`}>
        {spec.steps.map((item, idx) => (
          <div key={idx} className="tutor-process-step-card">
            <span className="tutor-process-step-num">{item.step}</span>
            <div className="tutor-process-step-body">
              <strong className="tutor-process-step-title">{item.title}</strong>
              {item.detail ? (
                <span className="tutor-process-step-detail">{item.detail}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {spec.caption ? (
        <figcaption className="tutor-visual-caption">{spec.caption}</figcaption>
      ) : null}
    </figure>
  );
}

function CodeBlock({ className, children, streaming = false }) {
  const code = String(children ?? "").replace(/\n$/, "");
  const lang = languageLabel(className);
  const isVisualDemo = VISUAL_DEMO_LANGS.has(lang);
  const isDiagram = DIAGRAM_LANGS.has(lang);

  if (isVisualDemo) {
    if (streaming) {
      return (
        <div className="tutor-mermaid-pending" role="status" aria-live="polite">
          <span className="tutor-mermaid-pending-label">
            Building visual demonstration…
          </span>
        </div>
      );
    }
    const spec = parseVisualDemo(code);
    if (spec) {
      return <TutorVisualDemo spec={spec} />;
    }
  }

  if (isDiagram) {
    if (lang === "mermaid" || lang === "flowchart") {
      const parsed = streaming ? null : parseLessonFlowchart(code);
      if (parsed?.ok) {
        return (
          <div className="tutor-code-wrap tutor-diagram-wrap">
            <div className="tutor-code-toolbar">
              <span className="tutor-code-lang">visual diagram</span>
              <CopyButton text={code} />
            </div>
            <TutorFlowchart graph={parsed} />
          </div>
        );
      }
      if (streaming) {
        return (
          <div
            className="tutor-mermaid-pending"
            role="status"
            aria-live="polite"
          >
            <span className="tutor-mermaid-pending-label">
              Diagram taking shape…
            </span>
            <pre className="tutor-mermaid-source">{code}</pre>
          </div>
        );
      }
      // Fallback: try parsing as a structured visual demo if not a valid flowchart
      const fallbackVisual = parseVisualDemo(code);
      if (fallbackVisual) {
        return <TutorVisualDemo spec={fallbackVisual} />;
      }
      return (
        <div className="tutor-code-wrap tutor-ascii-wrap">
          <div className="tutor-code-toolbar">
            <span className="tutor-code-lang">visual model</span>
            <CopyButton text={code} />
          </div>
          <pre className="tutor-ascii" aria-label="Visual diagram">
            <code>{code}</code>
          </pre>
        </div>
      );
    }
    return (
      <div className="tutor-code-wrap tutor-ascii-wrap">
        <div className="tutor-code-toolbar">
          <span className="tutor-code-lang">
            <Eye size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
            visual demonstration
          </span>
          <CopyButton text={code} />
        </div>
        <pre className="tutor-ascii" aria-label="Diagram">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return <HighlightedCode code={code} lang={lang} className={className} />;
}

function HighlightedCode({ code, lang, className }) {
  const lines = useMemo(
    () => tokensToLines(tokenizeCode(code, lang)),
    [code, lang]
  );
  const showNumbers = lines.length > 1;
  const displayName = languageDisplayName(lang);

  return (
    <div className="tutor-code-wrap">
      <div className="tutor-code-toolbar">
        <span className="tutor-code-lang">
          <span className="tutor-code-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          {displayName}
        </span>
        <CopyButton text={code} />
      </div>
      <pre
        className={`tutor-code language-${lang}${showNumbers ? " has-line-numbers" : ""}`}
      >
        <code className={className}>
          {lines.map((lineTokens, lineIdx) => (
            <span className="tutor-code-line" key={lineIdx}>
              {lineTokens.length
                ? lineTokens.map((tok, tokIdx) =>
                    tok.type === "plain" ? (
                      tok.text
                    ) : (
                      <span key={tokIdx} className={`tok-${tok.type}`}>
                        {tok.text}
                      </span>
                    )
                  )
                : "\u200b"}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function InlineCode({ children }) {
  return <code className="tutor-inline-code">{children}</code>;
}

function markdownComponents(streaming) {
  return {
    p: ({ children }) => {
      const paragraphText =
        typeof children === "string"
          ? children
          : Array.isArray(children) &&
              children.every((child) => typeof child === "string")
            ? children.join("")
            : "";
      const marker = LESSON_IMAGE_MARKER.exec(paragraphText.trim());
      if (marker) return <TutorLessonImage query={marker[1]} />;
      return <p className="tutor-p">{children}</p>;
    },
    h1: ({ children }) => <h3 className="tutor-h">{children}</h3>,
    h2: ({ children }) => <h3 className="tutor-h">{children}</h3>,
    h3: ({ children }) => <h4 className="tutor-h tutor-h-sm">{children}</h4>,
    h4: ({ children }) => <h4 className="tutor-h tutor-h-sm">{children}</h4>,
    h5: ({ children }) => <h4 className="tutor-h tutor-h-sm">{children}</h4>,
    h6: ({ children }) => <h4 className="tutor-h tutor-h-sm">{children}</h4>,
    ul: ({ children }) => <ul className="tutor-ul">{children}</ul>,
    ol: ({ children }) => <ol className="tutor-ol">{children}</ol>,
    li: ({ children }) => <li className="tutor-li">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="tutor-blockquote">{children}</blockquote>
    ),
    a: ({ href, children }) => (
      <a
        className="tutor-link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    hr: () => <hr className="tutor-hr" />,
    strong: ({ children }) => (
      <strong className="tutor-strong">{children}</strong>
    ),
    em: ({ children }) => <em className="tutor-em">{children}</em>,
    table: ({ children }) => (
      <div className="tutor-table-wrap">
        <table className="tutor-table">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr>{children}</tr>,
    th: ({ children }) => <th>{children}</th>,
    td: ({ children }) => <td>{children}</td>,
    img: ({ src, alt }) => (
      <img className="tutor-img" src={src} alt={alt || ""} loading="lazy" />
    ),
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children }) => {
      const text = String(children ?? "").replace(/\n$/, "");
      const hasLanguage = Boolean(className && /language-/.test(className));
      const multiLine = text.includes("\n");

      if (hasLanguage || multiLine) {
        return (
          <CodeBlock className={className} streaming={streaming}>
            {text}
          </CodeBlock>
        );
      }
      return <InlineCode>{children}</InlineCode>;
    },
  };
}

function TutorMessageContent({ text, streaming = false }) {
  const hasExplicitVisualBlocks = useMemo(
    () => /```(?:visual|visual-demo|chart|mermaid|flowchart)/i.test(text || ""),
    [text]
  );

  // If the message has no fenced ```visual blocks, convert any ⟦visual ...⟧ tags
  // in-place into ```visual blocks so even multiple ⟦visual ...⟧ tags placed
  // between paragraphs render right where the tutor placed them!
  const textWithInPlaceVisuals = useMemo(() => {
    if (streaming || !text || hasExplicitVisualBlocks) return text || "";
    const tagRe = new RegExp(VISUAL_TAG_RE.source, "gi");
    return String(text).replace(tagRe, (fullMatch) => {
      const dir = parseVisualDirective(fullMatch);
      if (!dir) return "";
      if (dir.type === MANIPULATIVE_TYPES.NUMBER_LINE) {
        const title = dir.label || `Number Line: ${dir.num}/${dir.den}`;
        return `\n\n\`\`\`visual\ntype: number-line\ntitle: ${title}\nmin: 0\nmax: ${Math.max(1, Math.ceil(dir.num / dir.den))}\nden: ${dir.den}\npoints: ${dir.num}/${dir.den} (${dir.label || `${dir.num}/${dir.den}`})\n\`\`\`\n\n`;
      }
      const title = dir.label || `Fraction Model: ${dir.num}/${dir.den}`;
      return `\n\n\`\`\`visual\ntype: fraction\ntitle: ${title}\n${dir.num}/${dir.den} | ${dir.label || `${dir.num} out of ${dir.den} equal parts`}\n\`\`\`\n\n`;
    });
  }, [text, streaming, hasExplicitVisualBlocks]);

  // Fallback for natural-language visual cues (when neither ```visual nor ⟦visual⟧ was used)
  const inlineVisualDirective = useMemo(() => {
    if (streaming || !text || hasExplicitVisualBlocks) return null;
    if (new RegExp(VISUAL_TAG_RE.source, "i").test(text)) return null;
    const dir = parseVisualDirective(text);
    if (!dir) return null;
    if (dir.type === MANIPULATIVE_TYPES.NUMBER_LINE) {
      return {
        kind: "number-line",
        title: dir.label || `Number Line: ${dir.num}/${dir.den}`,
        min: 0,
        max: Math.max(1, Math.ceil(dir.num / dir.den)),
        step: 1 / dir.den,
        den: dir.den,
        points: [
          {
            value: dir.num / dir.den,
            display: `${dir.num}/${dir.den}`,
            label: `${dir.num}/${dir.den}`,
          },
        ],
      };
    }
    return {
      kind: "fraction-bars",
      title: dir.label || `Fraction Model: ${dir.num}/${dir.den}`,
      bars: [
        {
          num: dir.num,
          den: dir.den,
          label: dir.label || `${dir.num} out of ${dir.den} equal parts`,
        },
      ],
    };
  }, [text, streaming, hasExplicitVisualBlocks]);

  // Machine tags (check / visual / step / suggests) — never show raw tags to learners
  let content = stripSuggestTags(
    stripStepTags(stripVisualTags(stripMathCheckTags(textWithInPlaceVisuals || "")))
  );
  // Ensure standalone [[lesson-image: ...]] markers become their own Markdown paragraphs
  // even when the model places multiple markers across an explanation with single newlines.
  content = content.replace(
    /(^|\n)[ \t]*(\[\[lesson-image:[^\]\n]{2,100}\]\])[ \t]*(?=\n|$)/gi,
    "$1\n$2\n"
  );
  if (streaming) {
    const markerStart = content.toLowerCase().lastIndexOf("[[lesson-image:");
    if (markerStart > content.lastIndexOf("]]")) {
      content = content.slice(0, markerStart);
    }
  }

  // components object is stable; streaming only affects CSS class
  const components = useMemo(() => markdownComponents(streaming), [streaming]);

  if (!content.trim() && streaming) {
    return <span className="tutor-streaming-placeholder"> </span>;
  }

  return (
    <div className={`tutor-md${streaming ? " is-streaming" : ""}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
      {inlineVisualDirective ? (
        <TutorVisualDemo spec={inlineVisualDirective} />
      ) : null}
    </div>
  );
}

export default memo(TutorMessageContent);
