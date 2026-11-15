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

import { parseBlocks } from './lesson-markdown';
import { LessonVisual } from './lesson-visual';

import {
  languageDisplayName,
  TOKEN_COLORS,
  tokenizeCode,
  tokensToLines,
} from './code-highlight';

const monospaceFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

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
        showsHorizontalScrollIndicator nestedScrollEnabled
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
              showsHorizontalScrollIndicator nestedScrollEnabled
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
              <LessonVisual source={block.text} language={block.lang} />
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
  content: { alignSelf: 'stretch', minWidth: 0, gap: 10 },
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
    width: '100%',
    minWidth: 0,
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
    flexShrink: 0,
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
