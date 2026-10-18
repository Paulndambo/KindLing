/**
 * Lightweight, dependency-free syntax tokenizer for tutor code blocks.
 * Mirrors mobile-app/src/components/code-highlight.ts — keep the two in sync.
 *
 * Produces tokens of type:
 *   comment | string | number | keyword | literal | function | type | tag | attr | plain
 */

const LANG_ALIASES = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  python3: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  ps1: "powershell",
  pwsh: "powershell",
  yml: "yaml",
  rb: "ruby",
  rs: "rust",
  kt: "kotlin",
  cs: "csharp",
  "c#": "csharp",
  "c++": "cpp",
  cc: "cpp",
  h: "c",
  hpp: "cpp",
  golang: "go",
  htm: "html",
  xml: "html",
  svg: "html",
  vue: "html",
  md: "markdown",
  psql: "sql",
  mysql: "sql",
  sqlite: "sql",
};

const DISPLAY_NAMES = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  bash: "Terminal",
  powershell: "PowerShell",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  ruby: "Ruby",
  php: "PHP",
  kotlin: "Kotlin",
  swift: "Swift",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  json: "JSON",
  yaml: "YAML",
  markdown: "Markdown",
  scratch: "Scratch",
  pseudocode: "Pseudocode",
  text: "Text",
  code: "Code",
};

const C_LIKE_KEYWORDS =
  "if else for while do switch case break continue return function var let const new delete typeof instanceof in of class extends super this import export from default try catch finally throw async await yield static public private protected void interface enum implements package struct union sizeof goto namespace using template typename virtual override final abstract fn mut impl pub use mod match loop where trait crate self func go chan defer select range map type fallthrough val fun when object companion lateinit init is as guard let var extension protocol inout";

const KEYWORDS = {
  python:
    "def return if elif else for while in not and or is import from as class try except finally raise with lambda pass break continue global nonlocal yield async await del assert print match case",
  ruby: "def end if elsif else unless while until for in do return class module begin rescue ensure raise yield require puts self then case when and or not",
  bash: "if then else elif fi for while until do done case esac in function return export local echo cd ls mkdir rm cp mv cat grep sudo npm npx pip python git source exit read",
  powershell:
    "if else elseif foreach for while do switch function return param begin process end try catch finally throw",
  sql: "select from where insert into values update set delete create table drop alter add join inner left right outer full on as and or not null is in like between order by group having limit offset distinct union all primary key foreign references default index view count sum avg min max case when then else end",
  css: "important media import keyframes from to supports",
  javascript: C_LIKE_KEYWORDS,
  typescript: `${C_LIKE_KEYWORDS} type readonly keyof declare namespace module as satisfies`,
  java: C_LIKE_KEYWORDS,
  c: C_LIKE_KEYWORDS,
  cpp: `${C_LIKE_KEYWORDS} std cout cin endl include define`,
  csharp: `${C_LIKE_KEYWORDS} foreach get set var readonly`,
  go: C_LIKE_KEYWORDS,
  rust: C_LIKE_KEYWORDS,
  kotlin: C_LIKE_KEYWORDS,
  swift: C_LIKE_KEYWORDS,
  php: `${C_LIKE_KEYWORDS} echo foreach elseif endif`,
  pseudocode:
    "if then else end for each to while do repeat until return function procedure input output print set begin and or not",
};

const LITERALS = new Set([
  "true", "false", "null", "undefined", "nil", "None", "True", "False", "NaN",
  "Infinity", "TRUE", "FALSE", "NULL", "self", "this",
]);

const TYPE_WORDS = new Set([
  "int", "float", "double", "char", "bool", "boolean", "string", "String", "str",
  "long", "short", "byte", "number", "any", "unknown", "never", "object", "list",
  "dict", "tuple", "set", "Array", "Map", "Set", "Promise", "Object", "i32", "i64",
  "u8", "u32", "u64", "f32", "f64", "usize", "Vec", "Option", "Result",
]);

const HASH_COMMENT_LANGS = new Set(["python", "ruby", "bash", "powershell", "yaml"]);
const SQL_LIKE = new Set(["sql"]);

export function normalizeLanguage(lang = "") {
  const key = String(lang || "").trim().toLowerCase();
  return LANG_ALIASES[key] || key || "code";
}

export function languageDisplayName(lang = "") {
  const norm = normalizeLanguage(lang);
  return DISPLAY_NAMES[norm] || norm.charAt(0).toUpperCase() + norm.slice(1);
}

function keywordSet(lang) {
  const list = KEYWORDS[lang] || C_LIKE_KEYWORDS;
  return new Set(list.split(/\s+/));
}

function tokenizeMarkup(code) {
  const tokens = [];
  const re = /(<!--[\s\S]*?(?:-->|$))|(<\/?[A-Za-z][\w:-]*)|(\s[\w:-]+)(?==)|("[^"]*"|'[^']*')|(\/?>)/g;
  let last = 0;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) tokens.push({ type: "plain", text: code.slice(last, m.index) });
    if (m[1]) tokens.push({ type: "comment", text: m[1] });
    else if (m[2]) tokens.push({ type: "tag", text: m[2] });
    else if (m[3]) tokens.push({ type: "attr", text: m[3] });
    else if (m[4]) tokens.push({ type: "string", text: m[4] });
    else if (m[5]) tokens.push({ type: "tag", text: m[5] });
    last = re.lastIndex;
  }
  if (last < code.length) tokens.push({ type: "plain", text: code.slice(last) });
  return tokens;
}

function tokenizeJson(code) {
  const tokens = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b/g;
  let last = 0;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) tokens.push({ type: "plain", text: code.slice(last, m.index) });
    if (m[1]) {
      tokens.push({ type: m[2] ? "attr" : "string", text: m[1] });
      if (m[2]) tokens.push({ type: "plain", text: m[2] });
    } else if (m[3]) tokens.push({ type: "number", text: m[3] });
    else if (m[4]) tokens.push({ type: "literal", text: m[4] });
    last = re.lastIndex;
  }
  if (last < code.length) tokens.push({ type: "plain", text: code.slice(last) });
  return tokens;
}

/**
 * Tokenize source code into highlight tokens.
 * @param {string} code
 * @param {string} lang
 * @returns {{ type: string, text: string }[]}
 */
export function tokenizeCode(code, lang) {
  const src = String(code ?? "");
  const norm = normalizeLanguage(lang);
  if (!src) return [];
  if (norm === "html") return tokenizeMarkup(src);
  if (norm === "json") return tokenizeJson(src);
  if (norm === "text" || norm === "markdown") return [{ type: "plain", text: src }];

  const keywords = keywordSet(norm);
  const caseInsensitive = SQL_LIKE.has(norm);
  const hashComments = HASH_COMMENT_LANGS.has(norm);
  const sqlComments = SQL_LIKE.has(norm);
  const tokens = [];
  const push = (type, text) => {
    if (!text) return;
    const prev = tokens[tokens.length - 1];
    if (prev && prev.type === type && type === "plain") prev.text += text;
    else tokens.push({ type, text });
  };

  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    const rest = src.slice(i);

    // Comments
    if (ch === "/" && src[i + 1] === "/" && !hashComments) {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      push("comment", src.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      push("comment", src.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === "#" && hashComments) {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      push("comment", src.slice(i, stop));
      i = stop;
      continue;
    }
    if (sqlComments && ch === "-" && src[i + 1] === "-") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      push("comment", src.slice(i, stop));
      i = stop;
      continue;
    }

    // Preprocessor lines (C/C++)
    if (ch === "#" && (norm === "c" || norm === "cpp") && /^#\s*\w+/.test(rest)) {
      const m = /^#\s*\w+/.exec(rest);
      push("keyword", m[0]);
      i += m[0].length;
      continue;
    }

    // Strings (triple quotes first)
    if ((ch === '"' || ch === "'") && src.slice(i, i + 3) === ch.repeat(3)) {
      const end = src.indexOf(ch.repeat(3), i + 3);
      const stop = end === -1 ? n : end + 3;
      push("string", src.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < n && src[j] !== ch) {
        if (src[j] === "\\") j += 1;
        else if (src[j] === "\n" && ch !== "`") break;
        j += 1;
      }
      const stop = Math.min(n, j + 1);
      push("string", src.slice(i, stop));
      i = stop;
      continue;
    }

    // Numbers
    const numMatch = /^(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(rest);
    if (numMatch && !/[\w$]/.test(src[i - 1] || "")) {
      push("number", numMatch[0]);
      i += numMatch[0].length;
      continue;
    }

    // Identifiers / keywords
    const idMatch = /^[A-Za-z_$][\w$]*/.exec(rest);
    if (idMatch) {
      const word = idMatch[0];
      const lookup = caseInsensitive ? word.toLowerCase() : word;
      const after = src.slice(i + word.length);
      if (LITERALS.has(word)) push("literal", word);
      else if (keywords.has(lookup)) push("keyword", word);
      else if (TYPE_WORDS.has(word)) push("type", word);
      else if (/^\s*\(/.test(after)) push("function", word);
      else if (/^[A-Z][a-z]/.test(word) && norm !== "sql") push("type", word);
      else if (norm === "css" && /^\s*:/.test(after)) push("attr", word);
      else push("plain", word);
      i += word.length;
      continue;
    }

    push("plain", ch);
    i += 1;
  }
  return tokens;
}

/**
 * Split tokens into per-line arrays (for line-numbered rendering).
 * @param {{ type: string, text: string }[]} tokens
 * @returns {{ type: string, text: string }[][]}
 */
export function tokensToLines(tokens) {
  const lines = [[]];
  for (const token of tokens) {
    const parts = token.text.split("\n");
    parts.forEach((part, idx) => {
      if (idx > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ type: token.type, text: part });
    });
  }
  return lines;
}
