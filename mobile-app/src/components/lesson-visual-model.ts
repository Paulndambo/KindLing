type Step = { title: string; detail: string };
type Base = { title: string; caption: string };
export type VisualModel = Base & (
  | { kind: 'steps'; steps: Step[]; cycle: boolean }
  | { kind: 'study-plan'; objectives: string[]; concepts: string[]; modules: Step[] }
  | { kind: 'fractions'; bars: { num: number; den: number; label: string; note: string }[] }
  | { kind: 'bars'; rows: { label: string; value: number; unit: string }[] }
  | { kind: 'number-line'; min: number; max: number; step: number; points: { value: number; label: string }[] }
  | { kind: 'comparison'; left: string; right: string; pairs: string[][] }
  | { kind: 'flow'; nodes: { id: string; label: string }[]; edges: { from: string; to: string; label: string }[] }
);

const label = (value: unknown): string => String(value ?? '').trim()
  .replace(/^["']|["']$/g, '').replace(/<br\s*\/?>|\\n/gi, ' ');
const finite = (value: unknown, fallback: number) => value !== '' && Number.isFinite(Number(value)) ? Number(value) : fallback;
const fraction = (value: unknown) => {
  const match = /^(\d+)\s*\/\s*(\d+)$/.exec(String(value).trim());
  return match && Number(match[2]) > 0 ? { num: Number(match[1]), den: Number(match[2]) } : null;
};

/** Mermaid flowchart subset; preserves standalone labels, branches, cycles and edge labels. */
export function parseFlow(source: string): VisualModel | null {
  const nodes = new Map<string, { id: string; label: string }>();
  const edges: { from: string; to: string; label: string }[] = [];
  const nodePattern = /^([A-Za-z_][\w-]*)\s*(?:\(\[([\s\S]+)\]\)|\(\(([\s\S]+)\)\)|\[([\s\S]+)\]|\(([\s\S]+)\)|\{([\s\S]+)\})?$/;
  const parseNode = (token: string) => {
    const match = nodePattern.exec(token.trim());
    if (!match) return null;
    const id = match[1];
    const text = match.slice(2).find(Boolean);
    if (nodes.size >= 40 && !nodes.has(id)) return null;
    if (text || !nodes.has(id)) nodes.set(id, { id, label: label(text || id) });
    return id;
  };
  for (const line of source.replace(/;\s*/g, '\n').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^(?:%%|flowchart\s|graph\s|style\s|classDef\s|class\s|linkStyle\s|subgraph\s|end$)/i.test(trimmed)) continue;
    const arrow = /\s*(?:--\s+(.+?)\s+-->|-->|==>|-\.->|->)\s*(?:\|([^|]+)\|\s*)?/g;
    let previous: string | null = null;
    let previousLabel = '';
    let offset = 0;
    let match: RegExpExecArray | null;
    while ((match = arrow.exec(trimmed))) {
      const id = parseNode(trimmed.slice(offset, match.index));
      if (!id) return null;
      if (previous) edges.push({ from: previous, to: id, label: previousLabel });
      previous = id;
      previousLabel = label(match[1] || match[2] || '');
      offset = arrow.lastIndex;
    }
    const tail = parseNode(trimmed.slice(offset));
    if (!tail) return null;
    if (previous) edges.push({ from: previous, to: tail, label: previousLabel });
    if (edges.length > 60) return null;
  }
  return nodes.size && edges.length ? { kind: 'flow', title: 'Concept flow', caption: '', nodes: [...nodes.values()], edges } : null;
}

/** Parses the same line-based and JSON visual payloads used by the web tutor. */
export function parseVisual(source: string, language = ''): VisualModel | null {
  const text = source.trim();
  if (!text) return null;
  if (/^(?:flowchart|graph)\s+(?:TD|TB|BT|LR|RL)\b/i.test(text)) return parseFlow(text);
  let meta: Record<string, unknown> = {};
  let items: string[] = [];
  if (text.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      meta = parsed as Record<string, unknown>;
      items = Array.isArray(meta.items) ? meta.items.filter((item): item is string => typeof item === 'string') : [];
    } catch { return null; }
  } else {
    const metadata = /^(type|title|caption|subtitle|min|max|step|den|denominator|num|numerator|unit|left|right|points|bars|objectives|concepts|section_?\d+)\s*:\s*(.+)$/i;
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || /^(#|\/\/)/.test(trimmed)) continue;
      const match = metadata.exec(trimmed);
      if (match) meta[match[1].toLowerCase()] = match[2];
      else items.push(trimmed.replace(/^[-*•]\s*/, ''));
    }
  }
  // ASCII demonstrations must keep their spatial formatting, not become step cards.
  if (!meta.type && !Object.keys(meta).length) {
    if (/-->|==>|-\.->/.test(text)) return parseFlow(text);
    return null;
  }
  const inferred = meta.min !== undefined && meta.max !== undefined ? 'number-line'
    : meta.num !== undefined || meta.numerator !== undefined || meta.bars || items.some((item) => fraction(item.split('|')[0])) ? 'fraction'
    : items.some((item) => /^[^:|]+:\s*-?\d+(?:\.\d+)?\s*(?:%|[a-zA-Z]*)\s*$/.test(item)) ? 'bar-chart' : language;
  const kind = label(meta.type || inferred).toLowerCase();
  const base = { title: label(meta.title || meta.subtitle), caption: label(meta.caption) };
  if (/^(study-plan|studyplan|lesson-plan|roadmap)$/.test(kind)) {
    const splitList = (value: unknown) => label(value).split(/[|;]/).map(label).filter(Boolean);
    const moduleItems = Object.entries(meta)
      .filter(([key]) => /^section_?\d+$/.test(key))
      .map(([, value]) => label(value))
      .concat(items);
    const modules = moduleItems.map((item) => {
      const [title, ...detail] = item.replace(/^\d+[.)]\s*/, '').split('|');
      return { title: label(title), detail: detail.map(label).join(' · ') };
    }).filter((item) => item.title).slice(0, 6);
    const objectives = splitList(meta.objectives).slice(0, 5);
    const concepts = splitList(meta.concepts).slice(0, 8);
    return objectives.length || concepts.length || modules.length
      ? { ...base, title: base.title || 'Topic Curriculum', kind: 'study-plan', objectives, concepts, modules }
      : null;
  }
  if (/^(fraction|fractions|fraction-bars|fraction-compare|fraction-visual)$/.test(kind)) {
    const bars: { num: number; den: number; label: string; note: string }[] = [];
    if (Array.isArray(meta.bars)) {
      for (const raw of meta.bars) {
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as Record<string, unknown>;
        bars.push({ num: finite(item.num, -1), den: finite(item.den, 0), label: label(item.label), note: label(item.note) });
      }
    }
    const rows = typeof meta.bars === 'string' ? meta.bars.split(';').concat(items) : items;
    for (const item of rows) {
      const [value, name, note] = item.split('|');
      const parsed = fraction(value);
      if (parsed) bars.push({ ...parsed, label: label(name), note: label(note) });
    }
    if (!bars.length && (meta.num !== undefined || meta.numerator !== undefined)) {
      bars.push({ num: finite(meta.num ?? meta.numerator, -1), den: finite(meta.den ?? meta.denominator, 0), label: '', note: '' });
    }
    if (!bars.length || bars.some((bar) => !Number.isInteger(bar.den) || bar.den < 1 || bar.den > 48 || bar.num < 0 || bar.num > bar.den || !Number.isInteger(bar.num))) return null;
    return { ...base, title: base.title || 'Fraction model', kind: 'fractions', bars: bars.slice(0, 8) };
  }
  if (/^(bar-chart|bars|chart)$/.test(kind)) {
    const rows = items.flatMap((item) => {
      const match = /^([^:|]+):\s*(-?\d+(?:\.\d+)?)\s*([^|]*)/.exec(item);
      return match ? [{ label: label(match[1]), value: Number(match[2]), unit: label(match[3] || meta.unit) }] : [];
    });
    if (Array.isArray(meta.rows)) for (const raw of meta.rows) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as Record<string, unknown>;
      if (Number.isFinite(Number(row.value))) rows.push({ label: label(row.label), value: Number(row.value), unit: label(row.unit || meta.unit) });
    }
    return rows.length ? { ...base, title: base.title || 'Data comparison', kind: 'bars', rows: rows.slice(0, 12) } : null;
  }
  if (/^(number-line|numberline)$/.test(kind)) {
    const min = finite(meta.min, 0), max = finite(meta.max, 1);
    if (max <= min) return null;
    const points = [...(typeof meta.points === 'string' ? meta.points.split(/[,;]/) : []), ...items].flatMap((item) => {
      const match = /^(-?\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)\s*(?:\(([^)]+)\)|\|\s*(.+))?$/.exec(item.trim());
      if (!match) return [];
      const f = fraction(match[1]);
      const value = f ? f.num / f.den : Number(match[1]);
      return Number.isFinite(value) ? [{ value, label: label(match[2] || match[3] || match[1]) }] : [];
    });
    return { ...base, title: base.title || 'Number line', kind: 'number-line', min, max, step: finite(meta.step, (max - min) / finite(meta.den ?? meta.denominator, 4)), points: points.slice(0, 12) };
  }
  if (/^(comparison|versus|compare)$/.test(kind)) {
    const pairs = items.map((item) => item.split('|').map(label)).filter((row) => row.length === 2 || row.length === 3);
    return pairs.length ? { ...base, title: base.title || 'Comparison', kind: 'comparison', left: label(meta.left || 'Concept A'), right: label(meta.right || 'Concept B'), pairs } : null;
  }
  if (!/^(process|cycle|steps|timeline|layers|study-plan|studyplan|lesson-plan|roadmap|visual|visual-demo|diagram)$/.test(kind)) return null;
  const stepItems = Object.entries(meta).filter(([key]) => /^section_?\d+$/.test(key)).map(([, value]) => label(value)).concat(items);
  const steps = stepItems.map((item) => {
    const [title, ...detail] = item.replace(/^\d+[.)]\s*/, '').split('|');
    return { title: label(title), detail: detail.map(label).join(' · ') };
  }).filter((item) => item.title);
  if (meta.concepts) steps.unshift({ title: 'Key concepts', detail: label(meta.concepts).replace(/\|/g, ' · ') });
  if (meta.objectives) steps.unshift({ title: 'Objectives', detail: label(meta.objectives).replace(/\|/g, ' · ') });
  return steps.length ? { ...base, title: base.title || 'Step by step', kind: 'steps', steps: steps.slice(0, 20), cycle: kind === 'cycle' } : null;
}
