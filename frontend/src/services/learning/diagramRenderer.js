const MAX_NODES = 16;
const MAX_EDGES = 24;

function cleanLabel(raw = "") {
  return String(raw || "")
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/\\n/g, " ")
    .trim();
}

function parseNode(source) {
  const raw = String(source || "").trim().replace(/;+$/, "").trim();
  if (!raw) return null;

  // Match id followed by optional bracketed/parenthesized/braced label:
  // A[Box], A("Rounded"), A([Stadium]), A((Circle)), A{Diamond}
  const match = /^([a-zA-Z_][\w-]*)\s*(?:\(\[([\s\S]{1,100})\]\)|\(\(([\s\S]{1,100})\)\)|\[([\s\S]{1,100})\]|\(([\s\S]{1,100})\)|\{([\s\S]{1,100})\})?$/.exec(
    raw
  );
  if (!match) return null;
  const [, id, stadium, circle, square, rounded, diamond] = match;
  const rawLabel = stadium || circle || square || rounded || diamond || id;
  const label = cleanLabel(rawLabel);
  if (!label) return null;
  return {
    id,
    label,
    shape: diamond
      ? "diamond"
      : stadium || circle || rounded
        ? "rounded"
        : "box",
  };
}

/**
 * Split a flowchart line into a chain of node tokens and optional edge labels.
 * Supports:
 *   A[Step 1] --> B[Step 2]
 *   A[Step 1] -->|heats| B[Step 2] --> C[Step 3]
 *   A[Step 1] -- heats --> B[Step 2]
 */
function splitFlowLine(line) {
  const cleaned = String(line || "").trim().replace(/;+$/, "").trim();
  if (!cleaned) return null;

  const arrowRegex =
    /\s*(?:--\s*([^>-][^-\n]{0,40}?)\s*-->|==\s*([^=\n]{0,40}?)\s*==>|--+>\s*(?:\|([^|\n]{1,50})\|)?|==+>\s*(?:\|([^|\n]{1,50})\|)?|-\.-\s*(?:([^.\n]{1,40}?)\s*\.-)?->)\s*/g;

  const nodeParts = [];
  const edgeLabels = [];
  let lastIndex = 0;
  let match;

  while ((match = arrowRegex.exec(cleaned)) !== null) {
    const before = cleaned.slice(lastIndex, match.index).trim();
    if (!before) return null;
    nodeParts.push(before);
    const edgeLabel = cleanLabel(
      match[1] || match[2] || match[3] || match[4] || match[5] || ""
    );
    edgeLabels.push(edgeLabel || null);
    lastIndex = match.index + match[0].length;
  }

  const tail = cleaned.slice(lastIndex).trim();
  if (!tail) return null;
  nodeParts.push(tail);

  return { nodeParts, edgeLabels };
}

/** Parse a safe, forgiving Mermaid-like flowchart subset (including cycles & edge labels). */
export function parseLessonFlowchart(source) {
  const lines = String(source || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("%%") &&
        !/^(?:subgraph\b|end\b|style\b|classDef\b|class\b|linkStyle\b)/i.test(line)
    );
  const header = /^(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\b/i.exec(lines[0] || "");
  if (!header) {
    return {
      ok: false,
      reason: "Use `flowchart TD` or `flowchart LR` as the first line.",
    };
  }

  const direction = header[1].toUpperCase();
  const nodes = new Map();
  const edges = [];

  for (const line of lines.slice(1)) {
    const chain = splitFlowLine(line);
    if (!chain) {
      return { ok: false, reason: "Use `-->` arrows to connect steps." };
    }
    const parsedNodes = chain.nodeParts.map(parseNode);
    if (parsedNodes.some((node) => !node)) {
      return {
        ok: false,
        reason:
          "Use simple node labels in [square], (rounded), or {diamond} shapes.",
      };
    }
    for (const node of parsedNodes) {
      if (!nodes.has(node.id)) {
        nodes.set(node.id, node);
      } else if (node.label !== node.id) {
        nodes.set(node.id, node);
      }
      if (nodes.size > MAX_NODES) {
        return {
          ok: false,
          reason: `Keep diagrams to ${MAX_NODES} nodes or fewer.`,
        };
      }
    }
    for (let i = 0; i < parsedNodes.length - 1; i += 1) {
      const from = parsedNodes[i];
      const to = parsedNodes[i + 1];
      if (from.id === to.id) {
        return { ok: false, reason: "A node cannot point to itself." };
      }
      edges.push([from.id, to.id, chain.edgeLabels[i] || null]);
      if (edges.length > MAX_EDGES) {
        return {
          ok: false,
          reason: `Keep diagrams to ${MAX_EDGES} arrows or fewer.`,
        };
      }
    }
  }

  if (nodes.size < 2 || edges.length < 1) {
    return { ok: false, reason: "Add at least two connected nodes." };
  }

  // Assign ranks in discovery order while breaking any back-edge cycles gracefully
  // so cyclical science/CS processes (e.g., Water Cycle, loops) still render!
  const nodeIds = [...nodes.keys()];
  const orderMap = new Map(nodeIds.map((id, idx) => [id, idx]));
  const indegree = new Map(nodeIds.map((id) => [id, 0]));
  const outgoing = new Map(nodeIds.map((id) => [id, []]));
  const backEdges = new Set();

  edges.forEach(([from, to], idx) => {
    // Detect obvious back-edges to earlier nodes if they would create a cycle
    outgoing.get(from).push({ to, idx });
    indegree.set(to, indegree.get(to) + 1);
  });

  const rank = new Map(nodeIds.map((id) => [id, 0]));
  const visitedSet = new Set();
  const queue = nodeIds.filter((id) => indegree.get(id) === 0);
  if (queue.length === 0 && nodeIds.length > 0) {
    // Pure cycle (e.g. A --> B --> C --> A): start at the first node
    queue.push(nodeIds[0]);
  }

  while (visitedSet.size < nodeIds.length) {
    if (queue.length === 0) {
      // Pick the earliest unvisited node to break remaining cycle
      const nextUnvisited = nodeIds.find((id) => !visitedSet.has(id));
      if (!nextUnvisited) break;
      queue.push(nextUnvisited);
    }
    const id = queue.shift();
    if (visitedSet.has(id)) continue;
    visitedSet.add(id);

    for (const { to, idx } of outgoing.get(id)) {
      if (visitedSet.has(to)) {
        backEdges.add(idx);
        continue;
      }
      rank.set(to, Math.max(rank.get(to), rank.get(id) + 1));
      indegree.set(to, Math.max(0, indegree.get(to) - 1));
      if (indegree.get(to) === 0) {
        queue.push(to);
      }
    }
  }

  const levels = new Map();
  for (const id of nodeIds) {
    const level = rank.get(id) || 0;
    if (!levels.has(level)) levels.set(level, []);
    levels.get(level).push(id);
  }

  return {
    ok: true,
    direction,
    nodes: [...nodes.values()],
    edges,
    backEdges: [...backEdges],
    orderMap,
    levels: [...levels.entries()].sort((a, b) => a[0] - b[0]),
  };
}

/**
 * Parse a structured `visual` / `visual-demo` / `chart` block into a rich visual spec.
 *
 * Supported types:
 * 1. `fraction` / `fractions` / `fraction-compare`
 * 2. `number-line` / `numberline`
 * 3. `bar-chart` / `chart` / `bars`
 * 4. `process` / `cycle` / `steps` / `timeline` / `layers`
 * 5. `coordinate-plane` / `plot` / `graph`
 * 6. `geometry` / `shape`
 * 7. `comparison` / `versus`
 */
export function parseVisualDemo(source) {
  const raw = String(source || "").trim();
  if (!raw) return null;

  // Support JSON if the model emits JSON inside ```visual
  if (raw.startsWith("{") && raw.endsWith("}")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.type) {
        return normalizeVisualSpec(parsed);
      }
    } catch {
      /* fall through to line parser */
    }
  }

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("//"));
  if (!lines.length) return null;

  const meta = {};
  const items = [];

  for (const line of lines) {
    const kv = /^([a-zA-Z_][\w-]*)\s*:\s*(.+)$/.exec(line);
    if (
      kv &&
      /^(type|title|caption|subtitle|min|max|step|den|denominator|num|numerator|unit|shape|formula|line|slope|intercept|x|y|left|right|highlight|jump|points|bars)$/i.test(
        kv[1]
      )
    ) {
      meta[kv[1].toLowerCase()] = kv[2].trim();
      continue;
    }
    items.push(line.replace(/^[-*•]\s*/, "").trim());
  }

  return normalizeVisualSpec({ ...meta, items });
}

function parseFractionToken(str) {
  const m = /(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(String(str || ""));
  if (!m) return null;
  const num = Number(m[1]);
  const den = Number(m[2]);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return { num, den };
}

function normalizeVisualSpec(raw) {
  const rawType = String(raw.type || "").toLowerCase().trim();
  const title = cleanLabel(raw.title || raw.subtitle || "");
  const caption = cleanLabel(raw.caption || "");
  const items = Array.isArray(raw.items) ? raw.items : [];

  // Auto-detect type if omitted
  let type = rawType;
  if (!type) {
    if (raw.num != null && raw.den != null) type = "fraction";
    else if (raw.bars || items.some((i) => /^\d+\s*\/\s*\d+/.test(i))) type = "fraction";
    else if (raw.min != null && raw.max != null) type = "number-line";
    else if (raw.shape) type = "geometry";
    else if (raw.slope != null || raw.line || raw.points?.includes("(")) type = "coordinate-plane";
    else if (items.some((i) => /^[^:|]+:\s*-?\d+(\.\d+)?(\s*%|\s*\|.*)?$/.test(i))) type = "bar-chart";
    else type = "process";
  }

  // 1. Fraction bars / comparison
  if (
    type === "fraction" ||
    type === "fractions" ||
    type === "fraction-bar" ||
    type === "fraction-bars" ||
    type === "fraction-compare"
  ) {
    const bars = [];
    if (raw.bars) {
      for (const part of String(raw.bars).split(/[,;]/)) {
        const segs = part.split("|").map((s) => s.trim());
        const frac = parseFractionToken(segs[0]);
        if (frac) {
          bars.push({
            num: frac.num,
            den: Math.min(24, Math.max(1, Math.round(frac.den))),
            label: segs[1] || `${frac.num}/${frac.den}`,
            note: segs[2] || "",
          });
        }
      }
    }
    for (const item of items) {
      const segs = item.split("|").map((s) => s.trim());
      const frac = parseFractionToken(segs[0]);
      if (frac) {
        bars.push({
          num: frac.num,
          den: Math.min(24, Math.max(1, Math.round(frac.den))),
          label: segs[1] || `${frac.num}/${frac.den}`,
          note: segs[2] || "",
        });
      }
    }
    if (!bars.length && (raw.num != null || raw.numerator != null)) {
      const num = Number(raw.num ?? raw.numerator ?? 1);
      const den = Math.min(24, Math.max(1, Number(raw.den ?? raw.denominator ?? 4)));
      bars.push({
        num,
        den,
        label: raw.label || `${num}/${den}`,
        note: caption,
      });
    }
    if (bars.length) {
      return {
        kind: "fraction-bars",
        title: title || "Fraction Visual Model",
        caption,
        bars: bars.slice(0, 6),
      };
    }
  }

  // 2. Number line
  if (type === "number-line" || type === "numberline" || type === "line") {
    let min = Number(raw.min ?? 0);
    let max = Number(raw.max ?? 1);
    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max) || max <= min) max = min + 1;
    const den = Number(raw.den ?? raw.denominator ?? 0);
    let step = Number(raw.step ?? (den > 0 ? (max - min) / den : (max - min) / 4));
    if (!Number.isFinite(step) || step <= 0) step = (max - min) / 4;

    const points = [];
    const parsePointToken = (token) => {
      const t = String(token || "").trim();
      if (!t) return;
      const frac = parseFractionToken(t);
      const numMatch = /^(-?\d+(?:\.\d+)?)/.exec(t);
      let val = null;
      let display = "";
      if (frac) {
        val = frac.num / frac.den;
        display = `${frac.num}/${frac.den}`;
      } else if (numMatch) {
        val = Number(numMatch[1]);
        display = String(val);
      }
      if (val != null && Number.isFinite(val)) {
        const labelMatch = /\(([^)]+)\)|\|(.+)$/.exec(t);
        const ptLabel = cleanLabel(labelMatch?.[1] || labelMatch?.[2] || display);
        points.push({ value: val, display, label: ptLabel });
      }
    };

    if (raw.points) {
      String(raw.points)
        .split(/[,;]/)
        .forEach(parsePointToken);
    }
    items.forEach(parsePointToken);
    if (!points.length && raw.num != null && raw.den != null) {
      const n = Number(raw.num);
      const d = Math.max(1, Number(raw.den));
      min = 0;
      max = Math.max(1, Math.ceil(n / d));
      step = 1 / d;
      points.push({ value: n / d, display: `${n}/${d}`, label: `${n}/${d}` });
    }

    let jump = null;
    if (raw.jump) {
      const jm = /([^\s-]+)\s*->\s*([^\s(|]+)(?:\s*(?:\(([^)]+)\)|\|(.+)))?/.exec(
        String(raw.jump)
      );
      if (jm) {
        const parseVal = (s) => {
          const f = parseFractionToken(s);
          return f ? f.num / f.den : Number(s);
        };
        const from = parseVal(jm[1]);
        const to = parseVal(jm[2]);
        if (Number.isFinite(from) && Number.isFinite(to)) {
          jump = {
            from,
            to,
            label: cleanLabel(jm[3] || jm[4] || ""),
          };
        }
      }
    }

    return {
      kind: "number-line",
      title: title || "Number Line Demonstration",
      caption,
      min,
      max,
      step,
      den: den > 0 ? den : null,
      points: points.slice(0, 8),
      jump,
    };
  }

  // 3. Bar chart
  if (type === "bar-chart" || type === "chart" || type === "bars") {
    const unit = cleanLabel(raw.unit || "");
    const rows = [];
    for (const item of items) {
      const segs = item.split("|").map((s) => s.trim());
      const kv = /^([^:]+):\s*(-?\d+(?:\.\d+)?)\s*(%|[a-zA-Z]+)?$/.exec(segs[0]);
      if (kv) {
        rows.push({
          label: cleanLabel(kv[1]),
          value: Number(kv[2]),
          unit: kv[3] || unit,
          note: segs[1] || "",
        });
      }
    }
    if (rows.length) {
      return {
        kind: "bar-chart",
        title: title || "Visual Data Comparison",
        caption,
        rows: rows.slice(0, 8),
      };
    }
  }

  // 4. Coordinate plane / function plot
  if (
    type === "coordinate-plane" ||
    type === "plot" ||
    type === "graph" ||
    type === "coordinates"
  ) {
    let slope = raw.slope != null ? Number(raw.slope) : null;
    let intercept = raw.intercept != null ? Number(raw.intercept) : 0;
    if (raw.line && slope == null) {
      // Parse y = mx + b
      const lm = /y\s*=\s*([+-]?\s*\d*(?:\.\d+)?)?\s*x\s*([+-]\s*\d+(?:\.\d+)?)?/i.exec(
        String(raw.line)
      );
      if (lm) {
        const mRaw = (lm[1] || "").replace(/\s+/g, "");
        slope = mRaw === "" || mRaw === "+" ? 1 : mRaw === "-" ? -1 : Number(mRaw);
        intercept = lm[2] ? Number(lm[2].replace(/\s+/g, "")) : 0;
      }
    }
    const points = [];
    const ptSource = [raw.points || "", ...items].join(" ; ");
    const ptRegex = /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*(?:["'“]([^"'”]+)["'”]|([a-zA-Z0-9_+-]+))?/g;
    let pm;
    while ((pm = ptRegex.exec(ptSource)) !== null) {
      points.push({
        x: Number(pm[1]),
        y: Number(pm[2]),
        label: cleanLabel(pm[3] || pm[4] || `(${pm[1]}, ${pm[2]})`),
      });
    }
    return {
      kind: "coordinate-plane",
      title: title || (raw.line ? `Graph of ${raw.line}` : "Coordinate Plane"),
      caption,
      slope: Number.isFinite(slope) ? slope : null,
      intercept: Number.isFinite(intercept) ? intercept : 0,
      lineLabel: cleanLabel(raw.line || ""),
      points: points.slice(0, 8),
    };
  }

  // 5. Geometry
  if (type === "geometry" || type === "shape") {
    const shape = String(raw.shape || "triangle").toLowerCase().trim();
    const labels = {};
    const labelStr = [raw.labels || "", ...items].join(", ");
    for (const part of labelStr.split(/[,;|]/)) {
      const kv = /^([a-zA-Z0-9_ ]+?)\s*[=:]\s*(.+)$/.exec(part.trim());
      if (kv) {
        labels[kv[1].trim().toLowerCase()] = cleanLabel(kv[2]);
      }
    }
    return {
      kind: "geometry",
      title: title || "Geometric Model",
      caption,
      shape,
      labels,
      formula: cleanLabel(raw.formula || ""),
    };
  }

  // 6. Comparison (side-by-side columns)
  if (type === "comparison" || type === "versus" || type === "compare") {
    const leftTitle = cleanLabel(raw.left || "Concept A");
    const rightTitle = cleanLabel(raw.right || "Concept B");
    const pairs = items
      .map((item) => {
        const parts = item.split("|").map((s) => cleanLabel(s));
        if (parts.length >= 3) {
          return { aspect: parts[0], left: parts[1], right: parts[2] };
        }
        if (parts.length === 2) {
          return { aspect: "", left: parts[0], right: parts[1] };
        }
        return null;
      })
      .filter(Boolean);
    if (pairs.length) {
      return {
        kind: "comparison",
        title: title || `${leftTitle} vs. ${rightTitle}`,
        caption,
        leftTitle,
        rightTitle,
        pairs: pairs.slice(0, 6),
      };
    }
  }

  // 7. Process / Cycle / Steps / Layers (default structured visual card)
  const steps = items
    .map((item, idx) => {
      const cleaned = item.replace(/^\d+[.)]\s*/, "").trim();
      const parts = cleaned.split("|").map((s) => cleanLabel(s));
      return {
        step: idx + 1,
        title: parts[0] || `Step ${idx + 1}`,
        detail: parts.slice(1).join(" · ") || "",
      };
    })
    .filter((s) => s.title);

  if (!steps.length) return null;

  return {
    kind:
      type === "cycle"
        ? "cycle"
        : type === "layers" || type === "scale" || type === "anatomy"
          ? "layers"
          : "process",
    title:
      title ||
      (type === "cycle"
        ? "Cycle Diagram"
        : type === "layers"
          ? "Layered Structure"
          : "Visual Step-by-Step Breakdown"),
    caption,
    steps: steps.slice(0, 8),
  };
}
