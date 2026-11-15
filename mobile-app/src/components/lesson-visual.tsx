import { Fragment, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/brand';
import { parseVisual } from './lesson-visual-model';

export function LessonVisual({ source, language }: { source: string; language: string }) {
  const model = useMemo(() => parseVisual(source, language), [source, language]);
  const [showSource, setShowSource] = useState(false);
  const ascii = !model && ['ascii', 'diagram'].includes(language.toLowerCase())
    && !/^\s*(?:\{|type\s*:|flowchart\s|graph\s)/i.test(source);
  return (
    <View style={s.content}>
      {model ? <>
        <Text accessibilityRole="header" style={s.title}>{model.title}</Text>
        {model.kind === 'fractions' ? model.bars.map((bar, index) => (
          <View key={index} style={s.content}>
            <Text style={s.body}>{bar.label ? `${bar.label} · ` : ''}{bar.num}/{bar.den}</Text>
            <View accessible accessibilityRole="image" accessibilityLabel={`${bar.num} of ${bar.den} parts shaded`} style={s.fraction}>
              {Array.from({ length: bar.den }, (_, part) => <View key={part} style={[s.segment, part < bar.num && s.shaded]} />)}
            </View>
            {bar.note ? <Text style={s.caption}>{bar.note}</Text> : null}
          </View>
        )) : null}
        {model.kind === 'bars' ? (() => {
          const min = Math.min(0, ...model.rows.map((row) => row.value));
          const max = Math.max(0, ...model.rows.map((row) => row.value));
          const span = max - min || 1;
          const zero = -min / span * 100;
          return model.rows.map((row, index) => (
            <View key={index} style={s.content}>
              <Text style={s.body}>{row.label} · {row.value}{row.unit ? ` ${row.unit}` : ''}</Text>
              <View accessible accessibilityRole="image" accessibilityLabel={`${row.label}: ${row.value} ${row.unit}`} style={s.barTrack}>
                <View style={[s.barFill, { left: `${Math.min(zero, (row.value - min) / span * 100)}%`, width: `${Math.abs(row.value) / span * 100}%` }]} />
                <View style={[s.zero, { left: `${zero}%` }]} />
              </View>
            </View>
          ));
        })() : null}
        {model.kind === 'steps' ? model.steps.map((step, index) => (
          <Fragment key={index}>
            <View style={s.step}>
              <Text style={s.stepNumber}>{index + 1}</Text>
              <View style={s.flex}>
                <Text style={s.body}>{step.title}</Text>
                {step.detail ? <Text style={s.caption}>{step.detail}</Text> : null}
              </View>
            </View>
            {index < model.steps.length - 1 ? <Text accessibilityElementsHidden style={s.arrow}>↓</Text> : model.cycle ? <Text style={s.caption}>↻ Returns to {model.steps[0].title}</Text> : null}
          </Fragment>
        )) : null}
        {model.kind === 'flow' ? model.edges.map((edge, index) => (
          <View key={index} style={s.flow}>
            <View style={s.node}><Text style={s.body}>{model.nodes.find((node) => node.id === edge.from)?.label}</Text></View>
            <Text style={s.arrow}>↓{edge.label ? ` ${edge.label}` : ''}</Text>
            <View style={s.node}><Text style={s.body}>{model.nodes.find((node) => node.id === edge.to)?.label}</Text></View>
          </View>
        )) : null}
        {model.kind === 'comparison' ? model.pairs.map((pair, index) => (
          <View key={index} style={s.node}>
            {pair.length === 3 ? <Text style={s.body}>{pair[0]}</Text> : null}
            <Text style={s.caption}>{model.left}: {pair[pair.length - 2]}</Text>
            <Text style={s.caption}>{model.right}: {pair[pair.length - 1]}</Text>
          </View>
        )) : null}
        {model.kind === 'number-line' ? <>
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator>
            <View style={s.numberCanvas}>
              <View style={s.axis} />
              {(() => {
                const step = model.step > 0 ? model.step : (model.max - model.min) / 4;
                const count = Math.floor((model.max - model.min) / step + 1e-8);
                const ticks = count <= 12 ? Array.from({ length: count + 1 }, (_, i) => model.min + i * step) : [model.min, model.max];
                return ticks.map((value, index) => (
                  <View key={index} style={[s.tick, { left: 24 + (value - model.min) / (model.max - model.min) * 272 }]}>
                    <View style={s.tickLine} />
                    <Text style={s.tickLabel}>{Number(value.toFixed(4))}</Text>
                  </View>
                ));
              })()}
              {model.points.filter((point) => point.value >= model.min && point.value <= model.max).map((point, index) => (
                <View key={index} accessibilityLabel={point.label} style={[s.point, { left: 19 + (point.value - model.min) / (model.max - model.min) * 272 }]} />
              ))}
            </View>
          </ScrollView>
          {model.points.map((point, index) => <Text key={index} style={s.caption}>● {point.label}: {Number(point.value.toFixed(4))}{point.value < model.min || point.value > model.max ? ' (outside this range)' : ''}</Text>)}
        </> : null}
        {model.caption ? <Text style={s.caption}>{model.caption}</Text> : null}
      </> : ascii ? <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator><Text selectable style={s.source}>{source}</Text></ScrollView> : <Text style={s.caption}>This demonstration uses a format that cannot be displayed yet.</Text>}
      {!ascii ? <>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showSource }} onPress={() => setShowSource(!showSource)} style={s.sourceButton}>
          <Text style={s.sourceLabel}>{showSource ? 'Hide source' : 'View source'}</Text>
        </Pressable>
        {showSource ? <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator><Text selectable style={s.source}>{source}</Text></ScrollView> : null}
      </> : null}
    </View>
  );
}

const s = StyleSheet.create({
  content: { gap: 10, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '700', color: Brand.ink },
  body: { fontSize: 14, lineHeight: 21, color: Brand.ink, fontWeight: '600', flexShrink: 1 },
  caption: { color: Brand.muted, fontSize: 13, lineHeight: 20 },
  flex: { flex: 1, gap: 4 },
  fraction: { flexDirection: 'row', height: 32, borderWidth: 1, borderColor: Brand.teal, borderRadius: 5, overflow: 'hidden' },
  segment: { flex: 1, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: Brand.teal },
  shaded: { backgroundColor: Brand.teal, borderRightColor: '#fff' },
  barTrack: { height: 24, backgroundColor: Brand.tealPale, borderRadius: 4, overflow: 'hidden' },
  barFill: { position: 'absolute', top: 0, bottom: 0, backgroundColor: Brand.teal },
  zero: { position: 'absolute', width: 1, top: 0, bottom: 0, backgroundColor: Brand.ink },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNumber: { color: '#fff', backgroundColor: Brand.teal, borderRadius: 6, overflow: 'hidden', width: 28, textAlign: 'center', lineHeight: 28, fontWeight: '700' },
  node: { padding: 12, borderWidth: 1, borderColor: Brand.line, borderRadius: 10, backgroundColor: '#fff', gap: 5 },
  flow: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Brand.line },
  arrow: { textAlign: 'center', color: Brand.teal, fontSize: 15, lineHeight: 26 },
  numberCanvas: { width: 320, height: 86 },
  axis: { position: 'absolute', left: 24, right: 24, top: 30, height: 2, backgroundColor: Brand.ink },
  tick: { position: 'absolute', top: 25, width: 0, alignItems: 'center' },
  tickLine: { height: 12, width: 1, backgroundColor: Brand.ink },
  tickLabel: { fontSize: 10, width: 50, textAlign: 'center', color: Brand.ink, marginTop: 8 },
  point: { position: 'absolute', top: 26, width: 10, height: 10, borderRadius: 5, backgroundColor: Brand.teal },
  sourceButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  sourceLabel: { color: Brand.teal, fontSize: 12, fontWeight: '600' },
  source: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: Brand.ink, fontSize: 13, lineHeight: 20 },
});
