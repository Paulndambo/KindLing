import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBlocks } from '../src/components/lesson-markdown.ts';
import { parseFlow, parseVisual } from '../src/components/lesson-visual-model.ts';

test('code fences preserve indentation, blank lines and machine-like string literals', () => {
  const code = 'def example():\n    tag = "⟦visual:demo⟧"\n\n\n    return tag';
  const blocks = parseBlocks(`Before ⟦suggest:next⟧\n\n~~~python\n${code}\n~~~\n\nAfter`);
  assert.deepEqual(blocks, [
    { type: 'paragraph', text: 'Before' },
    { type: 'code', text: code, lang: 'python' },
    { type: 'paragraph', text: 'After' },
  ]);
});

test('long fences can contain shorter fences and language names retain punctuation', () => {
  const blocks = parseBlocks('````c#\nvar marker = "```";\n```\n````');
  assert.deepEqual(blocks, [{ type: 'code', lang: 'c#', text: 'var marker = "```";\n```' }]);
  assert.equal(parseBlocks('```c++\nint x = 1;\n```')[0].lang, 'c++');
});

test('unfinished replies still render fenced blocks and unlabeled flowcharts', () => {
  assert.equal(parseBlocks('```python\nprint(1)')[0].type, 'code');
  assert.equal(parseBlocks('```text\nflowchart TD\nA[Start] --> B[End]\n```')[0].type, 'visual');
});

test('Mermaid node definitions and branching edge labels are preserved', () => {
  const graph = parseFlow('flowchart TD\nA -->|Yes| B\nA -->|No| C\nA{Ready?}\nB["Continue"]\nC[Review]');
  assert.equal(graph.kind, 'flow');
  assert.deepEqual(graph.nodes, [
    { id: 'A', label: 'Ready?' }, { id: 'B', label: 'Continue' }, { id: 'C', label: 'Review' },
  ]);
  assert.deepEqual(graph.edges, [
    { from: 'A', to: 'B', label: 'Yes' }, { from: 'A', to: 'C', label: 'No' },
  ]);
});

test('flow cycles, chains and semicolon-separated statements retain connections', () => {
  const graph = parseFlow('graph LR; A[Water] --> B[Vapour] --> C[Cloud]; C -- rain --> A');
  assert.equal(graph.edges.length, 3);
  assert.deepEqual(graph.edges[2], { from: 'C', to: 'A', label: 'rain' });
});

test('fraction DSL and JSON payloads become models with accurate values', () => {
  const line = parseVisual('type: fraction\ntitle: Compare\n1/4 | One quarter\n3/4 | Three quarters', 'visual');
  assert.equal(line.kind, 'fractions');
  assert.deepEqual(line.bars.map(({ num, den }) => [num, den]), [[1, 4], [3, 4]]);
  const json = parseVisual('{"type":"fraction","bars":[{"num":2,"den":3,"label":"Two thirds"}]}');
  assert.equal(json.bars[0].label, 'Two thirds');
  assert.equal(parseVisual('type: fraction\n1/0 | Invalid'), null);
  assert.equal(parseVisual('type: fraction\n5/4 | Improper'), null);
});

test('bar charts preserve negative values rather than displaying absolute values', () => {
  const chart = parseVisual('type: bar-chart\nunit: kg\nGain: 12\nLoss: -5');
  assert.equal(chart.kind, 'bars');
  assert.deepEqual(chart.rows.map((row) => row.value), [12, -5]);
  assert.equal(chart.rows[0].unit, 'kg');
});

test('number lines parse fractional points and reject invalid ranges', () => {
  const line = parseVisual('type: number-line\nmin: 0\nmax: 1\nstep: 0.25\npoints: 1/4, 0.75');
  assert.equal(line.kind, 'number-line');
  assert.deepEqual(line.points.map((point) => point.value), [0.25, 0.75]);
  assert.equal(parseVisual('type: number-line\nmin: 3\nmax: 1'), null);
});

test('structured steps and comparison rows render as content rather than DSL', () => {
  const steps = parseVisual('type: process\ntitle: Water cycle\nEvaporate | Water heats up\nCondense | Clouds form');
  assert.equal(steps.kind, 'steps');
  assert.equal(steps.steps[1].detail, 'Clouds form');
  const comparison = parseVisual('type: comparison\nleft: Plant\nright: Animal\nCell wall | Present | Absent');
  assert.deepEqual(comparison.pairs[0], ['Cell wall', 'Present', 'Absent']);
});

test('ASCII art preserves spatial formatting; unsupported formats remain recoverable', () => {
  const art = '   A\n  / \\\n B   C';
  assert.equal(parseBlocks(`\`\`\`ascii\n${art}\n\`\`\``)[0].text, art);
  assert.equal(parseVisual(art, 'ascii'), null);
  assert.equal(parseVisual('{"type":"executable","script":"alert(1)"}'), null);
});

test('visual model inference and study plan metadata preserve instructional content', () => {
  assert.equal(parseVisual('title: Quarters\n1/4 | One quarter', 'visual').kind, 'fractions');
  assert.equal(parseVisual('title: Range\nmin: 0\nmax: 4', 'visual').kind, 'number-line');
  const plan = parseVisual('type: study-plan\nobjectives: Explain division\nconcepts: Equal groups\nsection_1: Explore | Try equal groups');
  assert.deepEqual(plan.steps.map((step) => step.title), ['Objectives', 'Key concepts', 'Explore']);
});
