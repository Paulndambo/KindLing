import { Fragment, useMemo, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import {
  languageDisplayName,
  TOKEN_COLORS,
  tokenizeCode,
  tokensToLines,
} from './code-highlight';

type Block =
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

const monospaceFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

function cleanMachineTags(raw: string): string {
  return String(raw || '')
    .replace(/⟦\s*(?:suggests?|check|visual|step)\b[^⟧]*⟧/gi, '')
    .replace(/\[\[\s*(?:suggests?|lesson-image)\s*:?[^\]]*\]\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let quoteLines: string[] = [];
  let tableLines: string[] = [];
  let code: string[] = [];
  let inCode = false;
  let fenceLang = '';

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

  const cleaned = cleanMachineTags(markdown);
  for (const line of cleaned.replace(/\r\n?/g, '\n').split('\n')) {
    const fenceMatch = /^\s*```([\w+-]*)/.exec(line);
    if (fenceMatch) {
      flushAllText();
      if (inCode) {
        const lower = fenceLang.toLowerCase();
        const isVisual = VISUAL_FENCE_LANGS.has(lower);
        blocks.push({
          type: isVisual ? 'visual' : 'code',
          text: code.join('\n').replace(/\n+$/, ''),
          lang: fenceLang,
        });
        fenceLang = '';
      } else {
        fenceLang = (fenceMatch[1] || '').trim();
      }
      code = [];
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

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
    const isVisual = VISUAL_FENCE_LANGS.has(lower);
    blocks.push({
      type: isVisual ? 'visual' : 'code',
      text: code.join('\n').replace(/\n+$/, ''),
      lang: fenceLang,
    });
  }
  return blocks;
}

function inlineParts(text: string, isDarkBubble = false): ReactNode[] {
  const tokens = text.split(
    /(\*\*.+?\*\*|__.+?__|~~.+?~~|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g
  );
  return tokens.filter(Boolean).map((token, index) => {
    if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      return (
        <Text key={index} style={styles.bold}>
          {token.slice(2, -2)}
        </Text>
      );
    }
    if (token.startsWith('~~') && token.endsWith('~~')) {
      return (
        <Text key={index} style={styles.strike}>
          {token.slice(2, -2)}
        </Text>
      );
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <Text
          key={index}
          style={[
            styles.inlineCode,
            isDarkBubble && styles.inlineCodeOnDark,
          ]}
        >
          {token.slice(1, -1)}
        </Text>
      );
    }
    if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      return (
        <Text key={index} style={styles.italic}>
          {token.slice(1, -1)}
        </Text>
      );
    }
    return <Fragment key={index}>{token}</Fragment>;
  });
}

function MobileCodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(
    () => tokensToLines(tokenizeCode(code, lang)),
    [code, lang]
  );
  const showLineNumbers = lines.length > 1;
  const displayName = languageDisplayName(lang);

  const handleCopy = async () => {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {
      /* ignore clipboard error on unsupported runtimes */
    }
  };

  return (
    <View style={styles.codeWrap}>
      <View style={styles.codeToolbar}>
        <View style={styles.codeToolbarLeft}>
          <View style={styles.codeDots}>
            <View style={[styles.codeDot, { backgroundColor: '#E27A6B' }]} />
            <View style={[styles.codeDot, { backgroundColor: '#E4B04A' }]} />
            <View style={[styles.codeDot, { backgroundColor: '#5FB38A' }]} />
          </View>
          <Text style={styles.codeLang}>{displayName}</Text>
        </View>
        {typeof navigator !== 'undefined' && navigator.clipboard ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copied ? 'Copied code' : 'Copy code'}
            onPress={handleCopy}
            style={styles.codeCopyBtn}
          >
            <Text style={styles.codeCopyText}>
              {copied ? 'Copied ✓' : 'Copy'}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.codeLineCount}>
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.codeScrollContent}
      >
        <View style={styles.codeLinesWrap}>
          {lines.map((lineTokens, lineIdx) => (
            <View key={lineIdx} style={styles.codeLineRow}>
              {showLineNumbers ? (
                <Text selectable={false} style={styles.codeLineNumber}>
                  {lineIdx + 1}
                </Text>
              ) : null}
              <Text selectable style={styles.codeLineText}>
                {lineTokens.length
                  ? lineTokens.map((tok, tokIdx) => (
                      <Text
                        key={tokIdx}
                        style={[
                          { color: TOKEN_COLORS[tok.type] },
                          tok.type === 'keyword' && styles.tokKeyword,
                          tok.type === 'comment' && styles.tokComment,
                        ]}
                      >
                        {tok.text}
                      </Text>
                    ))
                  : ' '}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export function LessonMessageContent({
  text,
  textStyle,
  isUser = false,
}: {
  text: string;
  textStyle?: StyleProp<TextStyle>;
  isUser?: boolean;
}) {
  const blocks = useMemo(() => parseBlocks(text), [text]);

  return (
    <View style={styles.content}>
      {blocks.map((block, index) => {
        if (block.type === 'hr') {
          return <View key={index} style={styles.hr} />;
        }

        if (block.type === 'list') {
          return (
            <View key={index} style={styles.listRow}>
              <Text
                style={[
                  textStyle,
                  styles.listMarker,
                  isUser && styles.listMarkerOnDark,
                ]}
              >
                {block.ordered ? `${block.number}.` : '•'}
              </Text>
              <Text style={[textStyle, styles.blockText]}>
                {inlineParts(block.text, isUser)}
              </Text>
            </View>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <View key={index} style={styles.blockquote}>
              <Text style={[textStyle, styles.blockquoteText]}>
                {inlineParts(block.text, false)}
              </Text>
            </View>
          );
        }

        if (block.type === 'table') {
          return (
            <ScrollView
              key={index}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tableWrap}
            >
              <View style={styles.tableInner}>
                <View style={styles.tableHeaderRow}>
                  {block.headers.map((header, hIdx) => (
                    <Text key={hIdx} style={styles.tableHeaderCell}>
                      {inlineParts(header, false)}
                    </Text>
                  ))}
                </View>
                {block.rows.map((row, rIdx) => (
                  <View
                    key={rIdx}
                    style={[
                      styles.tableBodyRow,
                      rIdx % 2 === 1 && styles.tableBodyRowAlt,
                    ]}
                  >
                    {row.map((cell, cIdx) => (
                      <Text key={cIdx} style={styles.tableBodyCell}>
                        {inlineParts(cell, false)}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }

        if (block.type === 'visual') {
          return (
            <View key={index} style={styles.visualCard}>
              <View style={styles.visualHeader}>
                <View style={styles.visualBadgePill}>
                  <Text style={styles.visualBadge}>VISUAL DEMONSTRATION</Text>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.visualScroll}
              >
                <Text selectable style={styles.visualText}>
                  {block.text}
                </Text>
              </ScrollView>
            </View>
          );
        }

        if (block.type === 'code') {
          return (
            <MobileCodeBlock key={index} code={block.text} lang={block.lang} />
          );
        }

        return (
          <Text
            key={index}
            style={[
              textStyle,
              styles.blockText,
              block.type === 'heading' ? styles.heading : undefined,
              block.type === 'heading' && block.level > 2
                ? styles.smallHeading
                : undefined,
            ]}
          >
            {inlineParts(block.text, isUser)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'stretch', gap: 10 },
  blockText: { flexShrink: 1 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  strike: { textDecorationLine: 'line-through' },
  inlineCode: {
    fontFamily: monospaceFont,
    fontSize: 14,
    backgroundColor: '#E5F0EE',
    color: '#1D4F50',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    fontWeight: '600',
  },
  inlineCodeOnDark: {
    backgroundColor: 'rgba(246, 242, 233, 0.16)',
    color: '#F3C868',
  },
  hr: {
    height: 1,
    backgroundColor: 'rgba(31, 58, 52, 0.12)',
    marginVertical: 4,
  },
  heading: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    color: '#1F3A34',
    marginTop: 4,
  },
  smallHeading: {
    fontSize: 15.5,
    lineHeight: 21,
    fontWeight: '700',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 2,
  },
  listMarker: {
    minWidth: 20,
    fontWeight: '700',
    color: '#286B6D',
  },
  listMarkerOnDark: {
    color: '#F3C868',
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#E4A32A',
    backgroundColor: '#FDF5E2',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  blockquoteText: {
    color: '#26302C',
    fontSize: 15,
    lineHeight: 22,
  },
  /* Code blocks */
  codeWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#16241F',
    borderWidth: 1,
    borderColor: '#243A32',
    marginVertical: 2,
  },
  codeToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1D2F29',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  codeToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  codeDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  codeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  codeLang: {
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(246, 242, 233, 0.78)',
    letterSpacing: 0.3,
  },
  codeLineCount: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(246, 242, 233, 0.48)',
  },
  codeCopyBtn: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  codeCopyText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(246, 242, 233, 0.88)',
  },
  codeScrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: '100%',
  },
  codeLinesWrap: {
    alignSelf: 'flex-start',
    gap: 2,
  },
  codeLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  codeLineNumber: {
    width: 28,
    paddingRight: 10,
    textAlign: 'right',
    fontFamily: monospaceFont,
    fontSize: 12.5,
    lineHeight: 20,
    color: 'rgba(246, 242, 233, 0.28)',
  },
  codeLineText: {
    fontFamily: monospaceFont,
    fontSize: 13,
    lineHeight: 20,
    color: '#E6EDE8',
  },
  tokKeyword: {
    fontWeight: '600',
  },
  tokComment: {
    fontStyle: 'italic',
  },
  /* Visual demonstration card */
  visualCard: {
    backgroundColor: '#F4FAF9',
    borderColor: 'rgba(40, 107, 109, 0.28)',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 13,
    gap: 8,
  },
  visualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visualBadgePill: {
    backgroundColor: 'rgba(40, 107, 109, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
  },
  visualBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#286B6D',
  },
  visualScroll: {
    minWidth: '100%',
  },
  visualText: {
    fontFamily: monospaceFont,
    fontSize: 13,
    lineHeight: 19,
    color: '#1F3A34',
  },
  /* Tables */
  tableWrap: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(31, 58, 52, 0.12)',
    backgroundColor: '#FBFAF7',
  },
  tableInner: {
    minWidth: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#E4ECE8',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(31, 58, 52, 0.1)',
  },
  tableHeaderCell: {
    minWidth: 100,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1F3A34',
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(31, 58, 52, 0.06)',
  },
  tableBodyRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  tableBodyCell: {
    minWidth: 100,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#26302C',
  },
});
