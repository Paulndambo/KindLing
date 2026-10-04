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
        return <CodeBlock className={className}>{text}</CodeBlock>;
      }
      return <InlineCode>{children}</InlineCode>;
    },
  };
}

const STATIC_COMPONENTS = markdownComponents();

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
