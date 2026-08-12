/**
 * Simple confidence sparkline. Pass `points` as 0–100 values for the week.
 */
export default function ConfidenceChart({ points = [40, 48, 45, 58, 66, 74, 82] }) {
  const width = 320;
  const height = 160;
  const padX = 8;
  const padY = 16;
  const bottom = height - 28;

  const min = 0;
  const max = 100;
  const n = Math.max(points.length, 2);

  const coords = points.map((p, i) => {
    const x = padX + (i / (n - 1)) * (width - padX * 2);
    const y = padY + (1 - (p - min) / (max - min)) * (bottom - padY);
    return [x, y];
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const area = `${line} L ${coords[coords.length - 1][0]} ${bottom} L ${coords[0][0]} ${bottom} Z`;
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <line x1="0" y1="130" x2={width} y2="130" stroke="#EDE6D4" strokeWidth="1" />
      <line x1="0" y1="90" x2={width} y2="90" stroke="#EDE6D4" strokeWidth="1" />
      <line x1="0" y1="50" x2={width} y2="50" stroke="#EDE6D4" strokeWidth="1" />
      <path d={area} fill="#3E8A8F" opacity="0.08" />
      <path
        d={line}
        fill="none"
        stroke="#3E8A8F"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="4.5" fill="#E4A32A" />
      <text x="0" y="148" fontSize="9" fill="#5C6B63" fontFamily="Inter">
        Start
      </text>
      <text x={width - 28} y="148" fontSize="9" fill="#5C6B63" fontFamily="Inter">
        Now
      </text>
    </svg>
  );
}
