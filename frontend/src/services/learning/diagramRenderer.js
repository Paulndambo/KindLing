const NODE_PATTERN =
  /^([a-z][\w-]*)(?:\[([^\]]{1,80})\]|\(([^)]{1,80})\)|\{([^}]{1,80})\})?$/i;
const MAX_NODES = 12;
const MAX_EDGES = 16;

function parseNode(source) {
  const match = NODE_PATTERN.exec(source.trim());
  if (!match) return null;
  const [, id, square, rounded, diamond] = match;
  const label = (square || rounded || diamond || id).trim();
  if (!label) return null;
  return {
    id,
    label,
    shape: diamond ? "diamond" : rounded ? "rounded" : "box",
  };
}

/** Parse a deliberately small, safe Mermaid-like flowchart subset. */
export function parseLessonFlowchart(source) {
  const lines = String(source || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("%%"));
  const header = /^(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)$/i.exec(lines[0] || "");
  if (!header) return { ok: false, reason: "Use `flowchart TD` or `flowchart LR` as the first line." };

  const direction = header[1].toUpperCase();
  const nodes = new Map();
  const edges = [];
  for (const line of lines.slice(1)) {
    const parts = line.split("-->");
    if (parts.length < 1 || parts.length > 2) {
      return { ok: false, reason: "Use one arrow (`-->`) per line." };
    }
    const parsed = parts.map(parseNode);
    if (parsed.some((node) => !node)) {
      return { ok: false, reason: "Use simple node labels in [square], (rounded), or {diamond} shapes." };
    }
    for (const node of parsed) {
      if (!nodes.has(node.id)) nodes.set(node.id, node);
      else if (node.label !== node.id) nodes.set(node.id, node);
      if (nodes.size > MAX_NODES) {
        return { ok: false, reason: `Keep diagrams to ${MAX_NODES} nodes or fewer.` };
      }
    }
    if (parsed.length === 2) {
      if (parsed[0].id === parsed[1].id) {
        return { ok: false, reason: "A node cannot point to itself." };
      }
      edges.push([parsed[0].id, parsed[1].id]);
      if (edges.length > MAX_EDGES) {
        return { ok: false, reason: `Keep diagrams to ${MAX_EDGES} arrows or fewer.` };
      }
    }
  }

  if (nodes.size < 2 || edges.length < 1) {
    return { ok: false, reason: "Add at least two connected nodes." };
  }

  const indegree = new Map([...nodes.keys()].map((id) => [id, 0]));
  const outgoing = new Map([...nodes.keys()].map((id) => [id, []]));
  for (const [from, to] of edges) {
    outgoing.get(from).push(to);
    indegree.set(to, indegree.get(to) + 1);
  }
  const rank = new Map([...nodes.keys()].map((id) => [id, 0]));
  const queue = [...nodes.keys()].filter((id) => indegree.get(id) === 0);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift();
    visited += 1;
    for (const next of outgoing.get(id)) {
      rank.set(next, Math.max(rank.get(next), rank.get(id) + 1));
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  if (visited !== nodes.size) {
    return { ok: false, reason: "Use a one-way flow without loops." };
  }

  const levels = new Map();
  for (const id of nodes.keys()) {
    const level = rank.get(id);
    if (!levels.has(level)) levels.set(level, []);
    levels.get(level).push(id);
  }
  return {
    ok: true,
    direction,
    nodes: [...nodes.values()],
    edges,
    levels: [...levels.entries()].sort((a, b) => a[0] - b[0]),
  };
}
