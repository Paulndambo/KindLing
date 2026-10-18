const DEFAULT_NODES = [
  "Counting parts",
  "Equal shares",
  "Comparing fractions",
  "Adding fractions",
  "Mixed numbers",
];

export default function MasteryPathSvg({ nodes = DEFAULT_NODES }) {
  const labels =
    Array.isArray(nodes) && nodes.length >= 5 ? nodes : DEFAULT_NODES;

  return (
    <svg
      className="path-svg"
      viewBox="0 0 380 218"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="kdlPathGlow" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E4A32A" />
          <stop offset="65%" stopColor="#F3C868" />
          <stop offset="100%" stopColor="#3E8A8F" />
        </linearGradient>
        <radialGradient id="kdlActiveHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(62, 138, 143, 0.45)" />
          <stop offset="100%" stopColor="rgba(62, 138, 143, 0)" />
        </radialGradient>
      </defs>

      {/* Subtle grid baseline */}
      <line
        x1="16"
        y1="192"
        x2="364"
        y2="192"
        stroke="rgba(246,242,233,0.07)"
        strokeWidth="1"
      />
      <line
        x1="16"
        y1="126"
        x2="364"
        y2="126"
        stroke="rgba(246,242,233,0.06)"
        strokeWidth="1"
        strokeDasharray="3 6"
      />
      <line
        x1="16"
        y1="60"
        x2="364"
        y2="60"
        stroke="rgba(246,242,233,0.06)"
        strokeWidth="1"
        strokeDasharray="3 6"
      />

      {/* Upcoming dotted path */}
      <path
        d="M32 182 C 82 182, 72 126, 122 126 S 182 58, 222 58 S 282 96, 338 38"
        stroke="rgba(246,242,233,0.24)"
        strokeWidth="3"
        fill="none"
        strokeDasharray="2 9"
        strokeLinecap="round"
      />

      {/* Completed + active glowing path */}
      <path
        d="M32 182 C 82 182, 72 126, 122 126 S 182 58, 222 58"
        stroke="url(#kdlPathGlow)"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Node 1: Mastered */}
      <circle cx="32" cy="182" r="9" fill="#E4A32A" />
      <path
        d="M28.5 182 L31 184.5 L35.8 179.5"
        stroke="#1F3A34"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Node 2: Mastered */}
      <circle cx="122" cy="126" r="9" fill="#E4A32A" />
      <path
        d="M118.5 126 L121 128.5 L125.8 123.5"
        stroke="#1F3A34"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Node 3: Active in-session node */}
      <circle cx="222" cy="58" r="24" fill="url(#kdlActiveHalo)" />
      <circle
        cx="222"
        cy="58"
        r="15"
        fill="none"
        stroke="#5EC2C6"
        strokeWidth="2"
        opacity="0.55"
      >
        <animate
          attributeName="r"
          values="10;20;10"
          dur="2.4s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.65;0;0.65"
          dur="2.4s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx="222"
        cy="58"
        r="10"
        fill="#3E8A8F"
        stroke="#F6F2E9"
        strokeWidth="2.2"
      />
      <circle cx="222" cy="58" r="3.5" fill="#F3C868" />

      {/* Node 4: Upcoming */}
      <circle
        cx="284"
        cy="96"
        r="7.5"
        fill="#1F3A34"
        stroke="rgba(246,242,233,0.45)"
        strokeWidth="2"
      />

      {/* Node 5: Goal / Mastery */}
      <circle
        cx="338"
        cy="38"
        r="8"
        fill="#1F3A34"
        stroke="rgba(243,200,104,0.55)"
        strokeWidth="2"
      />

      {/* Labels */}
      <text
        x="38"
        y="206"
        fill="rgba(246,242,233,0.72)"
        fontSize="10"
        fontWeight="500"
        fontFamily="Inter, sans-serif"
        textAnchor="middle"
      >
        {labels[0]}
      </text>
      <text
        x="122"
        y="150"
        fill="rgba(246,242,233,0.72)"
        fontSize="10"
        fontWeight="500"
        fontFamily="Inter, sans-serif"
        textAnchor="middle"
      >
        {labels[1]}
      </text>

      {/* Active Node Callout Pill */}
      <rect
        x="154"
        y="14"
        width="136"
        height="24"
        rx="12"
        fill="rgba(243, 200, 104, 0.16)"
        stroke="rgba(243, 200, 104, 0.45)"
        strokeWidth="1"
      />
      <text
        x="222"
        y="30"
        fill="#F3C868"
        fontSize="10.5"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
        textAnchor="middle"
      >
        {labels[2]}
      </text>

      <text
        x="284"
        y="119"
        fill="rgba(246,242,233,0.48)"
        fontSize="10"
        fontFamily="Inter, sans-serif"
        textAnchor="middle"
      >
        {labels[3]}
      </text>
      <text
        x="334"
        y="61"
        fill="rgba(246,242,233,0.52)"
        fontSize="10"
        fontFamily="Inter, sans-serif"
        textAnchor="middle"
      >
        {labels[4]}
      </text>
    </svg>
  );
}
