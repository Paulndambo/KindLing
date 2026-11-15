/** Confidence cues across recent exchanges, scaled consistently from 0–100. */
export default function ConfidenceChart({ points = [] }) {
  const values = points
    .filter((value) => typeof value === "number" && Number.isFinite(value))
    .map((value) => Math.max(0, Math.min(100, value)));
  if (!values.length) return null;
  const width = 360;
  const height = 200;
  const left = 33;
  const right = width - 14;
  const top = 20;
  const bottom = height - 35;
  const coords = values.map((value, index) => [
    values.length === 1
      ? (left + right) / 2
      : left + (index / (values.length - 1)) * (right - left),
    bottom - (value / 100) * (bottom - top),
  ]);
  const line = coords
    .map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`)
    .join(" ");
  const [lastX, lastY] = coords[coords.length - 1];
  const area = `${line} L ${lastX} ${bottom} L ${coords[0][0]} ${bottom} Z`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label={`Confidence across ${values.length} recent exchanges: ${values.join(", ")} percent. Latest: ${values[values.length - 1]} percent.`}
    >
      {[0, 50, 100].map((value) => {
        const y = bottom - (value / 100) * (bottom - top);
        return (
          <g key={value}>
            <line
              x1={left}
              y1={y}
              x2={right}
              y2={y}
              stroke="#e3eadb"
              strokeDasharray="3 4"
            />
            <text
              x="1"
              y={y + 3}
              fontSize="9"
              fill="#7c8e70"
              fontFamily="inherit"
            >
              {value}%
            </text>
          </g>
        );
      })}
      <path d={area} fill="#89a873" opacity=".1" />
      <path
        d={line}
        fill="none"
        stroke="#71935b"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="#71935b" />
      ))}
      <circle
        cx={lastX}
        cy={lastY}
        r="5"
        fill="#71935b"
        stroke="#fff"
        strokeWidth="2"
      />
      <text
        x={left}
        y={height - 10}
        fontSize="9"
        fill="#7c8e70"
        fontFamily="inherit"
      >
        Earlier
      </text>
      <text
        x={right}
        y={height - 10}
        textAnchor="end"
        fontSize="9"
        fill="#7c8e70"
        fontFamily="inherit"
      >
        Latest exchange
      </text>
    </svg>
  );
}
