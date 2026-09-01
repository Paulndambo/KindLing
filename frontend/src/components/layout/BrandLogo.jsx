export default function BrandLogo({ onClick, title = "Kindling home" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`brand${onClick ? " brand-btn" : ""}`}
      onClick={onClick}
      title={onClick ? title : undefined}
      aria-label={onClick ? title : undefined}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 30 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="15" cy="15" r="14" fill="#1F3A34" />
        <path
          d="M15 7C15 7 10.5 12 10.5 16.5C10.5 19.5 12.5 21.5 15 21.5C17.5 21.5 19.5 19.5 19.5 16.5C19.5 12 15 7 15 7Z"
          fill="#E4A32A"
        />
        <path
          d="M15 12C15 12 13 14.8 13 17C13 18.4 13.9 19.3 15 19.3C16.1 19.3 17 18.4 17 17C17 14.8 15 12 15 12Z"
          fill="#F6F2E9"
        />
      </svg>
      <span>Kindling</span>
    </Tag>
  );
}
