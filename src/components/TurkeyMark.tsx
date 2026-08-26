/**
 * The TSI bird: a turkey in a golf visor, standing over a ball it has no
 * intention of playing.
 *
 * Flat fills with one thin outline in the text colour, so it reads the same in
 * the default theme and in sunlight mode where everything goes black on white.
 * Tail feathers alternate the two team colours.
 *
 * Geometry notes: the fan pivots on the body's centre and the feathers run
 * long enough for their bases to sit under the body, so the fan reads as one
 * shape behind the bird rather than five petals stuck to its back.
 */
export function TurkeyMark({
  size = 128,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const feathers = [-48, -24, 0, 24, 48];
  return (
    <svg
      viewBox="0 0 134 116"
      width={size}
      height={(size * 116) / 134}
      className={className}
      role="img"
      aria-label="A turkey in a golf visor standing beside a golf ball"
      style={{ color: "var(--tsi-text)" }}
    >
      <g
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Tail fan */}
        {feathers.map((angle, i) => (
          <rect
            key={angle}
            x="62"
            y="6"
            width="16"
            height="64"
            rx="8"
            transform={`rotate(${angle} 70 80)`}
            fill={i % 2 === 0 ? "var(--color-turkey)" : "var(--color-fairway)"}
          />
        ))}

        {/* Legs, behind the body */}
        <path d="M62 97v12M77 97v12M56 109h11M71 109h11" fill="none" strokeWidth="3.2" />

        {/* Neck, then body over its base */}
        <path d="M56 76 45 62" fill="none" stroke="var(--color-gravy)" strokeWidth="14" />
        <ellipse cx="70" cy="80" rx="23" ry="21" fill="var(--color-gravy)" />

        {/* Head */}
        <circle cx="38" cy="56" r="13.5" fill="var(--color-gravy)" />
        {/* Snood */}
        <path d="M27 54c-3 4-3 11 0 14 3 2 6 0 6-4" fill="var(--color-flag)" strokeWidth="2.4" />
        {/* Beak */}
        <path d="M26 60l-11 4 11 5z" fill="#e8a33d" strokeWidth="2.4" />
        {/* Eye */}
        <circle cx="40" cy="54" r="2.6" fill="currentColor" stroke="none" />
        {/* Visor: cap over the crown, brim out over the beak */}
        <path d="M25 49a13.5 13.5 0 0 1 26 0z" fill="var(--color-fairway)" />
        <path
          d="M25.5 49h-10a3 3 0 0 0 0 6h6"
          fill="var(--color-fairway)"
        />

        {/* Golf ball */}
        <circle cx="114" cy="101" r="9" fill="#fff" />
        <g fill="currentColor" stroke="none">
          <circle cx="111" cy="98" r="1.1" />
          <circle cx="115.5" cy="97.5" r="1.1" />
          <circle cx="117" cy="102" r="1.1" />
          <circle cx="112" cy="103.5" r="1.1" />
        </g>
      </g>
    </svg>
  );
}

/**
 * The compact mark: a golf ball with three tail feathers behind it. Built to
 * stay legible at 24px in a header, where the full bird turns to mush.
 */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      style={{ color: "var(--tsi-text)" }}
    >
      <g stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
        {[-38, 0, 38].map((angle, i) => (
          <rect
            key={angle}
            x="13.2"
            y="2"
            width="5.6"
            height="17"
            rx="2.8"
            transform={`rotate(${angle} 16 20)`}
            fill={i === 1 ? "var(--color-fairway)" : "var(--tsi-accent)"}
          />
        ))}
        <circle cx="16" cy="21.5" r="9.2" fill="#fff" />
      </g>
    </svg>
  );
}
