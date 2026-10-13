import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

type Block = { type: 'paragraph' | 'heading' | 'list' | 'code'; text: string; ordered?: boolean; number?: string; level?: number };

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let code: string[] = [];
  let inCode = false;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
    paragraph = [];
  };

  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*```/.test(line)) {
      flushParagraph();
      if (inCode) blocks.push({ type: 'code', text: code.join('\n') });
      code = [];
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    const heading = line.match(/^\s*(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: 'heading', text: heading[2], level: heading[1].length });
      continue;
    }
    const listItem = line.match(/^\s*(?:(\d+)[.)]|([*+-]))\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      blocks.push({ type: 'list', text: listItem[3], ordered: Boolean(listItem[1]), number: listItem[1] });
      continue;
    }
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      flushParagraph();
      continue;
    }
    paragraph.push(line);
  }

  flushParagraph();
  if (inCode) blocks.push({ type: 'code', text: code.join('\n') });
  return blocks;
}

function inlineParts(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*.+?\*\*|__.+?__|~~.+?~~|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g);
  return tokens.filter(Boolean).map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) return <Text key={index} style={styles.bold}>{token.slice(2, -2)}</Text>;
    if (token.startsWith('__') && token.endsWith('__')) return <Text key={index} style={styles.bold}>{token.slice(2, -2)}</Text>;
    if (token.startsWith('~~') && token.endsWith('~~')) return <Text key={index} style={styles.strike}>{token.slice(2, -2)}</Text>;
    if (token.startsWith('`') && token.endsWith('`')) return <Text key={index} style={styles.inlineCode}>{token.slice(1, -1)}</Text>;
    if (token.startsWith('*') && token.endsWith('*')) return <Text key={index} style={styles.italic}>{token.slice(1, -1)}</Text>;
    if (token.startsWith('_') && token.endsWith('_')) return <Text key={index} style={styles.italic}>{token.slice(1, -1)}</Text>;
    return <Fragment key={index}>{token}</Fragment>;
  });
}

export function LessonMessageContent({ text, textStyle }: { text: string; textStyle?: StyleProp<TextStyle> }) {
  const blocks = parseBlocks(text);
  return (
    <View style={styles.content}>
      {blocks.map((block, index) => {
        if (block.type === 'list') {
          return (
            <View key={index} style={styles.listRow}>
              <Text style={[textStyle, styles.listMarker]}>{block.ordered ? `${block.number}.` : '•'}</Text>
              <Text style={[textStyle, styles.blockText]}>{inlineParts(block.text)}</Text>
            </View>
          );
        }
        if (block.type === 'code') {
          return <Text key={index} selectable style={[textStyle, styles.codeBlock]}>{block.text}</Text>;
        }
        return (
          <Text key={index} style={[textStyle, styles.blockText, block.type === 'heading' ? styles.heading : undefined, block.type === 'heading' && block.level! > 2 ? styles.smallHeading : undefined]}>
            {inlineParts(block.text)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'stretch', gap: 8 },
  blockText: { flexShrink: 1 },
  bold: { fontWeight: '800' },
  italic: { fontStyle: 'italic' },
  strike: { textDecorationLine: 'line-through' },
  inlineCode: { fontFamily: 'monospace', backgroundColor: '#EEF0EC' },
  codeBlock: { fontFamily: 'monospace', fontSize: 14, lineHeight: 20, backgroundColor: '#EEF0EC', padding: 10, borderRadius: 8 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  smallHeading: { fontSize: 16, lineHeight: 22 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  listMarker: { minWidth: 18, fontWeight: '700' },
});
