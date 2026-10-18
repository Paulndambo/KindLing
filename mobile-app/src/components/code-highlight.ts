/**
 * Lightweight, dependency-free syntax tokenizer for tutor code blocks.
 * Mirrors frontend/src/utils/codeHighlight.js — keep the two in sync.
 */

export type TokenType =
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'literal'
  | 'function'
  | 'type'
  | 'tag'
  | 'attr'
  | 'plain';

export type CodeToken = { type: TokenType; text: string };

const LANG_ALIASES: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python', python3: 'python',
  sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash',
  ps1: 'powershell', pwsh: 'powershell',
  yml: 'yaml', rb: 'ruby', rs: 'rust', kt: 'kotlin',
  cs: 'csharp', 'c#': 'csharp', 'c++': 'cpp', cc: 'cpp', h: 'c', hpp: 'cpp',
  golang: 'go', htm: 'html', xml: 'html', svg: 'html', vue: 'html',
  md: 'markdown', psql: 'sql', mysql: 'sql', sqlite: 'sql',
};

const DISPLAY_NAMES: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', bash: 'Terminal',
  powershell: 'PowerShell', java: 'Java', c: 'C', cpp: 'C++', csharp: 'C#', go: 'Go',
  rust: 'Rust', ruby: 'Ruby', php: 'PHP', kotlin: 'Kotlin', swift: 'Swift', sql: 'SQL',
  html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON', yaml: 'YAML', markdown: 'Markdown',
  scratch: 'Scratch', pseudocode: 'Pseudocode', text: 'Text', code: 'Code',
};

const C_LIKE_KEYWORDS =
  'if else for while do switch case break continue return function var let const new delete typeof instanceof in of class extends super this import export from default try catch finally throw async await yield static public private protected void interface enum implements package struct union sizeof goto namespace using template typename virtual override final abstract fn mut impl pub use mod match loop where trait crate self func go chan defer select range map type fallthrough val fun when object companion lateinit init is as guard extension protocol inout';

const KEYWORDS: Record<string, string> = {
  python: 'def return if elif else for while in not and or is import from as class try except finally raise with lambda pass break continue global nonlocal yield async await del assert print match case',
  ruby: 'def end if elsif else unless while until for in do return class module begin rescue ensure raise yield require puts self then case when and or not',
  bash: 'if then else elif fi for while until do done case esac in function return export local echo cd ls mkdir rm cp mv cat grep sudo npm npx pip python git source exit read',
  powershell: 'if else elseif foreach for while do switch function return param begin process end try catch finally throw',
  sql: 'select from where insert into values update set delete create table drop alter add join inner left right outer full on as and or not null is in like between order by group having limit offset distinct union all primary key foreign references default index view count sum avg min max case when then else end',
  css: 'important media import keyframes from to supports',
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
  pseudocode: 'if then else end for each to while do repeat until return function procedure input output print set begin and or not',
};

const LITERALS = new Set([
  'true', 'false', 'null', 'undefined', 'nil', 'None', 'True', 'False', 'NaN',
  'Infinity', 'TRUE', 'FALSE', 'NULL', 'self', 'this',
]);

const TYPE_WORDS = new Set([
  'int', 'float', 'double', 'char', 'bool', 'boolean', 'string', 'String', 'str',
  'long', 'short', 'byte', 'number', 'any', 'unknown', 'never', 'object', 'list',
  'dict', 'tuple', 'set', 'Array', 'Map', 'Set', 'Promise', 'Object', 'i32', 'i64',
  'u8', 'u32', 'u64', 'f32', 'f64', 'usize', 'Vec', 'Option', 'Result',
]);

const HASH_COMMENT_LANGS = new Set(['python', 'ruby', 'bash', 'powershell', 'yaml']);

export function normalizeLanguage(lang = ''): string {
  const key = String(lang || '').trim().toLowerCase();
  return LANG_ALIASES[key] || key || 'code';
}

export function languageDisplayName(lang = ''): string {
  const norm = normalizeLanguage(lang);
  return DISPLAY_NAMES[norm] || norm.charAt(0).toUpperCase() + norm.slice(1);
}

function tokenizeWithRegex(code: string, re: RegExp, classify: (m: RegExpExecArray) => CodeToken[]): CodeToken[] {
  const tokens: CodeToken[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[0] === '') { re.lastIndex += 1; continue; }
    if (m.index > last) tokens.push({ type: 'plain', text: code.slice(last, m.index) });
    tokens.push(...classify(m));
    last = re.lastIndex;
  }
  if (last < code.length) tokens.push({ type: 'plain', text: code.slice(last) });
  return tokens;
}

function tokenizeMarkup(code: string): CodeToken[] {
  return tokenizeWithRegex(
    code,
    /(<!--[\s\S]*?(?:-->|$))|(<\/?[A-Za-z][\w:-]*)|(\s[\w:-]+)(?==)|("[^"]*"|'[^']*')|(\/?>)/g,
    (m) => {
      if (m[1]) return [{ type: 'comment', text: m[1] }];
      if (m[2]) return [{ type: 'tag', text: m[2] }];
      if (m[3]) return [{ type: 'attr', text: m[3] }];
      if (m[4]) return [{ type: 'string', text: m[4] }];
      return [{ type: 'tag', text: m[5] || '' }];
    },
  );
}

function tokenizeJson(code: string): CodeToken[] {
  return tokenizeWithRegex(
    code,
    /("(?:\\.|[^"\\])*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b/g,
    (m) => {
      if (m[1]) {
        const out: CodeToken[] = [{ type: m[2] ? 'attr' : 'string', text: m[1] }];
        if (m[2]) out.push({ type: 'plain', text: m[2] });
        return out;
      }
      if (m[3]) return [{ type: 'number', text: m[3] }];
      return [{ type: 'literal', text: m[4] || '' }];
    },
  );
}

export function tokenizeCode(code: string, lang: string): CodeToken[] {
  const src = String(code ?? '');
  const norm = normalizeLanguage(lang);
  if (!src) return [];
  if (norm === 'html') return tokenizeMarkup(src);
  if (norm === 'json') return tokenizeJson(src);
  if (norm === 'text' || norm === 'markdown') return [{ type: 'plain', text: src }];

  const keywords = new Set((KEYWORDS[norm] || C_LIKE_KEYWORDS).split(/\s+/));
  const isSql = norm === 'sql';
  const hashComments = HASH_COMMENT_LANGS.has(norm);
  const tokens: CodeToken[] = [];
  const push = (type: TokenType, text: string) => {
    if (!text) return;
    const prev = tokens[tokens.length - 1];
    if (prev && prev.type === type && type === 'plain') prev.text += text;
    else tokens.push({ type, text });
  };
  const lineEnd = (from: number) => {
    const end = src.indexOf('\n', from);
    return end === -1 ? src.length : end;
  };

  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    const rest = src.slice(i);

    if (ch === '/' && src[i + 1] === '/' && !hashComments) { const stop = lineEnd(i); push('comment', src.slice(i, stop)); i = stop; continue; }
    if (ch === '/' && src[i + 1] === '*') { const end = src.indexOf('*/', i + 2); const stop = end === -1 ? n : end + 2; push('comment', src.slice(i, stop)); i = stop; continue; }
    if (ch === '#' && hashComments) { const stop = lineEnd(i); push('comment', src.slice(i, stop)); i = stop; continue; }
    if (isSql && ch === '-' && src[i + 1] === '-') { const stop = lineEnd(i); push('comment', src.slice(i, stop)); i = stop; continue; }
    if (ch === '#' && (norm === 'c' || norm === 'cpp')) {
      const m = /^#\s*\w+/.exec(rest);
      if (m) { push('keyword', m[0]); i += m[0].length; continue; }
    }

    if ((ch === '"' || ch === "'") && src.slice(i, i + 3) === ch.repeat(3)) {
      const end = src.indexOf(ch.repeat(3), i + 3);
      const stop = end === -1 ? n : end + 3;
      push('string', src.slice(i, stop)); i = stop; continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < n && src[j] !== ch) {
        if (src[j] === '\\') j += 1;
        else if (src[j] === '\n' && ch !== '`') break;
        j += 1;
      }
      const stop = Math.min(n, j + 1);
      push('string', src.slice(i, stop)); i = stop; continue;
    }

    const num = /^(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(rest);
    if (num && !/[\w$]/.test(src[i - 1] || '')) { push('number', num[0]); i += num[0].length; continue; }

    const id = /^[A-Za-z_$][\w$]*/.exec(rest);
    if (id) {
      const word = id[0];
      const lookup = isSql ? word.toLowerCase() : word;
      const after = src.slice(i + word.length);
      if (LITERALS.has(word)) push('literal', word);
      else if (keywords.has(lookup)) push('keyword', word);
      else if (TYPE_WORDS.has(word)) push('type', word);
      else if (/^\s*\(/.test(after)) push('function', word);
      else if (/^[A-Z][a-z]/.test(word) && !isSql) push('type', word);
      else if (norm === 'css' && /^\s*:/.test(after)) push('attr', word);
      else push('plain', word);
      i += word.length;
      continue;
    }

    push('plain', ch);
    i += 1;
  }
  return tokens;
}

export function tokensToLines(tokens: CodeToken[]): CodeToken[][] {
  const lines: CodeToken[][] = [[]];
  for (const token of tokens) {
    token.text.split('\n').forEach((part, idx) => {
      if (idx > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ type: token.type, text: part });
    });
  }
  return lines;
}

/** Token colors tuned for the dark pine code surface. */
export const TOKEN_COLORS: Record<TokenType, string> = {
  comment: '#7F978D',
  string: '#A8D8A0',
  number: '#F2B56B',
  keyword: '#F08FB0',
  literal: '#F2B56B',
  function: '#7FC8E8',
  type: '#E8D07A',
  tag: '#F08FB0',
  attr: '#B9A6F2',
  plain: '#E6EDE8',
};
