import { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Check, Copy } from "lucide-react";
import "katex/dist/katex.min.css";

/**
 * Renders Kindling tutor replies as structured, learner-friendly content:
 * paragraphs, lists, tables, code, math, and preformatted diagrams.
 * Never renders raw HTML from the model (no rehype-raw).
 */

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [[rehypeKatex, { throwOnError: false, strict: "ignore" }]];

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

function CodeBlock({ className, children }) {
  const code = String(children ?? "").replace(/\n$/, "");
  const lang = languageLabel(className);
  const isDiagram = DIAGRAM_LANGS.has(lang);

  if (isDiagram) {
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

function markdownComponents() {
  return {
    p: ({ children }) => <p className="tutor-p">{children}</p>,
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
        return <CodeBlock className={className}>{text}</CodeBlock>;
      }
      return <InlineCode>{children}</InlineCode>;
    },
  };
}

const STATIC_COMPONENTS = markdownComponents();

function TutorMessageContent({ text, streaming = false }) {
  const content = text || "";

  // components object is stable; streaming only affects CSS class
  const components = useMemo(() => STATIC_COMPONENTS, []);

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
