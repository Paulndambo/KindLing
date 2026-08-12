export default function MasteryPathSvg() {
  return (
    <svg
      className="path-svg"
      viewBox="0 0 360 220"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 190 C 70 190, 60 130, 110 130 S 170 60, 210 60 S 270 100, 320 40"
        stroke="rgba(246,242,233,0.22)"
        strokeWidth="3"
        fill="none"
        strokeDasharray="1 10"
        strokeLinecap="round"
      />
      <path
        d="M20 190 C 70 190, 60 130, 110 130 S 170 60, 210 60"
        stroke="#E4A32A"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="20" cy="190" r="7" fill="#E4A32A" />
      <circle cx="110" cy="130" r="7" fill="#E4A32A" />
      <circle cx="210" cy="60" r="9" fill="#3E8A8F" />
      <circle
        cx="210"
        cy="60"
        r="15"
        fill="none"
        stroke="#3E8A8F"
        strokeWidth="2"
        opacity="0.5"
      >
        <animate attributeName="r" values="9;18;9" dur="2.4s" repeatCount="indefinite" />
        <animate
          attributeName="opacity"
          values="0.6;0;0.6"
          dur="2.4s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx="270"
        cy="100"
        r="7"
        fill="none"
        stroke="rgba(246,242,233,0.4)"
        strokeWidth="2"
      />
      <circle
        cx="320"
        cy="40"
        r="7"
        fill="none"
        stroke="rgba(246,242,233,0.4)"
        strokeWidth="2"
      />
      <text
        x="20"
        y="210"
        fill="rgba(246,242,233,0.55)"
        fontSize="10"
        fontFamily="Inter"
        textAnchor="middle"
      >
        Counting parts
      </text>
      <text
        x="110"
        y="150"
        fill="rgba(246,242,233,0.55)"
        fontSize="10"
        fontFamily="Inter"
        textAnchor="middle"
      >
        Equal shares
      </text>
      <text
        x="222"
        y="48"
        fill="#F3C868"
        fontSize="10.5"
        fontWeight="600"
        fontFamily="Inter"
      >
        Comparing fractions
      </text>
      <text
        x="270"
        y="122"
        fill="rgba(246,242,233,0.4)"
        fontSize="10"
        fontFamily="Inter"
        textAnchor="middle"
      >
        Adding fractions
      </text>
      <text
        x="320"
        y="62"
        fill="rgba(246,242,233,0.4)"
        fontSize="10"
        fontFamily="Inter"
        textAnchor="middle"
      >
        Mixed numbers
      </text>
    </svg>
  );
}
