/**
 * The TSI bird. Flat geometric shapes with heavy outlines so it survives both
 * the default theme and sunlight mode, where everything collapses to pure
 * black on pure white. Tail feathers alternate the two team colours.
 */
export function TurkeyMark({
  size = 132,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const feathers = [-72, -48, -24, 0, 24, 48, 72];
  return (
    <svg
      viewBox="0 0 124 108"
      width={size}
      height={(size * 108) / 124}
      className={className}
      role="img"
      aria-label="A turkey standing next to a golf ball"
      style={{ color: "var(--tsi-text)" }}
    >
      <g
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Tail fan */}
        {feathers.map((angle, i) => (
          <rect
            key={angle}
            x="49"
            y="2"
            width="18"
            height="46"
            rx="9"
            transform={`rotate(${angle} 58 76)`}
            fill={i % 2 === 0 ? "var(--color-turkey)" : "var(--color-fairway)"}
          />
        ))}

        {/* Legs, drawn before the body so they read as behind it */}
        <path
          d="M52 86v13M65 86v13M46 99h12M59 99h12"
          fill="none"
          strokeWidth="4"
        />

        {/* Neck */}
        <path
          d="M48 64 40 45"
          fill="none"
          stroke="var(--color-gravy)"
          strokeWidth="13"
        />
        <path d="M48 64 40 45" fill="none" strokeWidth="3" opacity="0" />

        {/* Body */}
        <ellipse cx="58" cy="74" rx="24" ry="21" fill="var(--color-gravy)" />

        {/* Wing */}
        <path
          d="M64 62c10 1 16 9 13 17-7 4-15 1-18-6-2-5 0-10 5-11Z"
          fill="var(--color-turkey)"
        />
        <path
          d="M67 70c3 2 5 4 6 7"
          fill="none"
          strokeWidth="2.5"
          stroke="var(--color-paper)"
        />

        {/* Head */}
        <circle cx="38" cy="39" r="11" fill="var(--color-gravy)" />
        {/* Snood */}
        <path
          d="M29 33c-4 3-5 10-2 14 2 3 6 1 6-3"
          fill="var(--color-flag)"
          strokeWidth="2.5"
        />
        {/* Beak */}
        <path d="M28 41 17 44l11 5z" fill="#f59e0b" strokeWidth="2.5" />
        {/* Eye */}
        <circle cx="40" cy="35" r="3.6" fill="#fff" strokeWidth="2" />
        <circle cx="39.4" cy="35" r="1.5" fill="currentColor" stroke="none" />

        {/* Golf ball */}
        <circle cx="101" cy="95" r="8.5" fill="#fff" />
        <g fill="currentColor" stroke="none">
          <circle cx="98" cy="92" r="1.1" />
          <circle cx="102" cy="91" r="1.1" />
          <circle cx="104" cy="95" r="1.1" />
          <circle cx="99" cy="97" r="1.1" />
        </g>
      </g>
    </svg>
  );
}
