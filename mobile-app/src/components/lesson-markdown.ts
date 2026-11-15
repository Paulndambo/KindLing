export type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string; level: number }
  | { type: 'list'; text: string; ordered: boolean; number?: string }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; text: string; lang: string }
  | { type: 'visual'; text: string; lang: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'hr' };

const VISUAL_FENCE_LANGS = new Set([
  'visual',
  'visual-demo',
  'diagram',
  'mermaid',
  'flowchart',
  'ascii',
  'chart',
  'fraction-visual',
  'number-line',
  'plot',
  'geometry',
  'study-plan',
  'studyplan',
  'lesson-plan',
  'roadmap',
]);

function cleanMachineTags(raw: string): string {
  return String(raw || '')
    .replace(/⟦\s*(?:suggests?|check|visual|step)\b[^⟧]*⟧/gi, '')
    .replace(/\[\[\s*(?:suggests?|lesson-image)\s*:?[^\]]*\]\]/gi, '')
    .trim();
}

function parseTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let quoteLines: string[] = [];
  let tableLines: string[] = [];
  let code: string[] = [];
  let inCode = false;
  let fenceLang = '';
  let fenceMarker = '';

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
      paragraph = [];
    }
  };

  const flushQuote = () => {
    if (quoteLines.length) {
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
      quoteLines = [];
    }
  };

  const flushTable = () => {
    if (!tableLines.length) return;
    if (tableLines.length >= 2 && isTableSeparator(tableLines[1])) {
      const headers = parseTableCells(tableLines[0]);
      const rows = tableLines.slice(2).map(parseTableCells);
      blocks.push({ type: 'table', headers, rows });
    } else {
      blocks.push({ type: 'paragraph', text: tableLines.join('\n') });
    }
    tableLines = [];
  };

  const flushAllText = () => {
    flushParagraph();
    flushQuote();
    flushTable();
  };

  const cleaned = String(markdown || '');
  for (let line of cleaned.replace(/\r\n?/g, '\n').split('\n')) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    const closesFence = inCode && fenceMatch && fenceMatch[1][0] === fenceMarker[0]
      && fenceMatch[1].length >= fenceMarker.length && !fenceMatch[2].trim();
    if ((!inCode && fenceMatch) || closesFence) {
      flushAllText();
      if (inCode) {
        const lower = fenceLang.toLowerCase();
        const isVisual = VISUAL_FENCE_LANGS.has(lower) || (['', 'text', 'plain', 'txt'].includes(lower) && /^\s*(?:flowchart|graph)\s+(?:TD|TB|BT|LR|RL)\b/i.test(code.join('\n')));
        blocks.push({
          type: isVisual ? 'visual' : 'code',
          text: code.join('\n').replace(/\n+$/, ''),
          lang: fenceLang,
        });
        fenceLang = '';
      } else {
        fenceMarker = fenceMatch![1];
        fenceLang = fenceMatch![2].trim().split(/\s+/)[0].replace(/^\{\.?|\}$/g, '');
      }
      code = [];
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    line = cleanMachineTags(line);
    if (!line.trim()) {
      flushAllText();
      continue;
    }

    // Table rows
    if (/^\s*\|.+\|\s*$/.test(line)) {
      flushParagraph();
      flushQuote();
      tableLines.push(line);
      continue;
    } else if (tableLines.length) {
      flushTable();
    }

    // Blockquote
    const quoteMatch = /^\s*>\s?(.*)$/.exec(line);
    if (quoteMatch) {
      flushParagraph();
      quoteLines.push(quoteMatch[1]);
      continue;
    } else if (quoteLines.length) {
      flushQuote();
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.+)$/);
    if (heading) {
      flushAllText();
      blocks.push({
        type: 'heading',
        text: heading[2].trim(),
        level: heading[1].length,
      });
      continue;
    }

    const listItem = line.match(/^\s*(?:(\d+)[.)]|([*+-]))\s+(.+)$/);
    if (listItem) {
      flushAllText();
      blocks.push({
        type: 'list',
        text: listItem[3],
        ordered: Boolean(listItem[1]),
        number: listItem[1],
      });
      continue;
    }

    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      flushAllText();
      blocks.push({ type: 'hr' });
      continue;
    }

    paragraph.push(line);
  }

  flushAllText();
  if (inCode && code.length) {
    const lower = fenceLang.toLowerCase();
    const isVisual = VISUAL_FENCE_LANGS.has(lower) || (['', 'text', 'plain', 'txt'].includes(lower) && /^\s*(?:flowchart|graph)\s+(?:TD|TB|BT|LR|RL)\b/i.test(code.join('\n')));
    blocks.push({
      type: isVisual ? 'visual' : 'code',
      text: code.join('\n').replace(/\n+$/, ''),
      lang: fenceLang,
    });
  }
  return blocks;
}

