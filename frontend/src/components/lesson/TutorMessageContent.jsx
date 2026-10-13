import { memo, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Check, Copy } from "lucide-react";
import "katex/dist/katex.min.css";
import { stripMathCheckTags } from "../../services/learning/mathVerifier";
import { stripVisualTags } from "../../services/learning/manipulatives";
import { stripStepTags } from "../../services/learning/multiStepEngine";
import { stripSuggestTags } from "../../services/learning/tutorSuggestions";
import { findLessonImage } from "../../services/learning/lessonImages";
import { parseLessonFlowchart } from "../../services/learning/diagramRenderer";

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
        Example image: <a href={image.href} target="_blank" rel="noopener noreferrer">{image.title}</a>
      </figcaption>
    </figure>
  );
}

/**
 * Renders Kindling tutor replies as structured, learner-friendly content:
 * paragraphs, lists, tables, code, math, and preformatted diagrams.
 * Never renders raw HTML from the model (no rehype-raw).
 */

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [[rehypeKatex, { throwOnError: false, strict: "ignore" }]];
const FLOWCHART_NODE_WIDTH = 160;
const FLOWCHART_NODE_HEIGHT = 56;

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

const DIAGRAM_LANGS = new Set([
  "mermaid",
  "text",
  "ascii",
  "diagram",
  "plain",
  "txt",
]);

function wrappedLabel(label) {
  const words = label.split(/\s+/);
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
    (FLOWCHART_NODE_WIDTH / 2) / Math.max(Math.abs(dx), 0.001),
    (FLOWCHART_NODE_HEIGHT / 2) / Math.max(Math.abs(dy), 0.001)
  );
  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

function TutorFlowchart({ graph }) {
  const vertical = graph.direction === "TD" || graph.direction === "TB" || graph.direction === "BT";
  const maxPerLevel = Math.max(...graph.levels.map(([, ids]) => ids.length));
  const width = vertical
    ? Math.max(220, maxPerLevel * 190 + 40)
    : graph.levels.length * 220 + 20;
  const height = vertical
    ? graph.levels.length * 130 + 20
    : Math.max(130, maxPerLevel * 100 + 30);
  const positions = new Map();
  graph.levels.forEach(([, ids], levelIndex) => {
    const index = graph.direction === "BT" || graph.direction === "RL"
      ? graph.levels.length - 1 - levelIndex
      : levelIndex;
    ids.forEach((id, itemIndex) => {
      positions.set(
        id,
        vertical
          ? {
              x: width / 2 + (itemIndex - (ids.length - 1) / 2) * 190,
              y: 36 + index * 130 + FLOWCHART_NODE_HEIGHT / 2,
            }
          : {
              x: 100 + index * 220,
              y: height / 2 + (itemIndex - (ids.length - 1) / 2) * 100,
            }
      );
    });
  });

  const arrows = graph.edges.map(([fromId, toId], index) => {
    const from = positions.get(fromId);
    const to = positions.get(toId);
    const start = boundaryPoint(from, to);
    const end = boundaryPoint(to, from);
    const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
    const ux = (end.x - start.x) / length;
    const uy = (end.y - start.y) / length;
    const baseX = end.x - ux * 10;
    const baseY = end.y - uy * 10;
    const px = -uy * 5;
    const py = ux * 5;
    return (
      <g key={`${fromId}-${toId}-${index}`} aria-hidden="true">
        <line
          x1={start.x}
          y1={start.y}
          x2={baseX}
          y2={baseY}
          stroke="#286B6D"
          strokeWidth="2"
        />
        <path
          d={`M ${end.x} ${end.y} L ${baseX + px} ${baseY + py} L ${baseX - px} ${baseY - py} Z`}
          fill="#286B6D"
        />
      </g>
    );
  });

  return (
    <figure className="tutor-mermaid">
      <figcaption className="tutor-mermaid-label">Flowchart</figcaption>
      <div className="tutor-mermaid-svg">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Flowchart with ${graph.nodes.length} steps`}
        >
          <title>Flowchart</title>
          {arrows}
          {graph.nodes.map((node) => {
            const point = positions.get(node.id);
            const lines = wrappedLabel(node.label);
            const textY = point.y - ((lines.length - 1) * 16) / 2 + 4;
            return (
              <g key={node.id}>
                {node.shape === "diamond" ? (
                  <path
                    d={`M ${point.x} ${point.y - 31} L ${point.x + 86} ${point.y} L ${point.x} ${point.y + 31} L ${point.x - 86} ${point.y} Z`}
                    fill="#FFFFFF"
                    stroke="#286B6D"
                    strokeWidth="2"
                  />
                ) : node.shape === "rounded" ? (
                  <rect
                    x={point.x - 80}
                    y={point.y - 28}
                    width="160"
                    height="56"
                    rx="28"
                    fill="#FFFFFF"
                    stroke="#286B6D"
                    strokeWidth="2"
                  />
                ) : (
                  <rect
                    x={point.x - 80}
                    y={point.y - 28}
                    width="160"
                    height="56"
                    rx="10"
                    fill="#FFFFFF"
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
                  fontFamily="Arial, sans-serif"
                >
                  {lines.map((line, index) => (
                    <tspan key={`${node.id}-${index}`} x={point.x} dy={index ? 16 : 0}>
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
        {graph.edges.map(([from, to], index) => (
          <li key={`edge-${index}`}>
            {graph.nodes.find((node) => node.id === from)?.label} leads to{" "}
            {graph.nodes.find((node) => node.id === to)?.label}.
          </li>
        ))}
      </ul>
    </figure>
  );
}

function CodeBlock({ className, children, streaming = false }) {
  const code = String(children ?? "").replace(/\n$/, "");
  const lang = languageLabel(className);
  const isDiagram = DIAGRAM_LANGS.has(lang);

  if (isDiagram) {
    if (lang === "mermaid") {
      const parsed = streaming ? null : parseLessonFlowchart(code);
      if (parsed?.ok) {
        return (
          <div className="tutor-code-wrap tutor-diagram-wrap">
            <div className="tutor-code-toolbar">
              <span className="tutor-code-lang">diagram</span>
              <CopyButton text={code} />
            </div>
            <TutorFlowchart graph={parsed} />
          </div>
        );
      }
      if (streaming) {
        return (
          <div className="tutor-mermaid-pending" role="status" aria-live="polite">
            <span className="tutor-mermaid-pending-label">Diagram taking shape</span>
            <pre className="tutor-mermaid-source">{code}</pre>
          </div>
        );
      }
      return (
        <div className="tutor-code-wrap tutor-ascii-wrap">
          <div className="tutor-code-toolbar">
            <span className="tutor-code-lang">diagram source</span>
            <CopyButton text={code} />
          </div>
          <p className="tutor-mermaid-error">
            {parsed?.reason || "This diagram could not be rendered, so its source is shown."}
          </p>
          <pre className="tutor-ascii" aria-label="Diagram source">
            <code>{code}</code>
          </pre>
        </div>
      );
    }
    return (
      <div className="tutor-code-wrap tutor-ascii-wrap">
        <div className="tutor-code-toolbar">
          <span className="tutor-code-lang">
            {lang === "mermaid" ? "diagram" : lang === "text" ? "diagram" : lang}
          </span>
          <CopyButton text={code} />
        </div>
        <pre className="tutor-ascii" aria-label="Diagram">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="tutor-code-wrap">
      <div className="tutor-code-toolbar">
        <span className="tutor-code-lang">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className={`tutor-code language-${lang}`}>
        <code className={className}>{code}</code>
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
          : Array.isArray(children) && children.every((child) => typeof child === "string")
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
    /**
     * Block vs inline: fenced blocks go through `pre` → `code` with a
     * language-* class (or multi-line body). Inline code has neither.
     */
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
  // Machine tags (check / visual / step / suggests) — never show to learners
  let content = stripSuggestTags(
    stripStepTags(stripVisualTags(stripMathCheckTags(text || "")))
  );
  // Ensure a standalone marker becomes its own Markdown paragraph even when
  // the model used single newlines around it.
  content = content.replace(
    /(^|\n)[ \t]*(\[\[lesson-image:[^\]\n]{2,100}\]\])[ \t]*(?=\n|$)/gi,
    "$1\n$2\n"
  );
  if (streaming) {
    const markerStart = content.toLowerCase().lastIndexOf("[[lesson-image:");
    if (markerStart > content.lastIndexOf("]]")) content = content.slice(0, markerStart);
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
    </div>
  );
}

export default memo(TutorMessageContent);
