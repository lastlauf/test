/**
 * The TSI bird: a turkey in a golf cap, one wing round a club, standing over a
 * ball it has no intention of playing.
 *
 * Flat fills with one thin outline in the text colour, so it reads the same in
 * the default theme and in sunlight mode where everything goes black on white.
 * Tail feathers alternate the two team colours.
 *
 * Geometry notes: the fan is symmetric about the body's centre line and pivots
 * on the body, so every feather base sits under the body and the fan reads as
 * one shape behind the bird. The head sits on the centre line, in front of the
 * middle feather — the fan is wide and tall enough to stay legible around it.
 */
export function TurkeyMark({
  size = 128,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const feathers = [-38, -19, 0, 19, 38];
  return (
    <svg
      viewBox="0 0 160 150"
      width={size}
      height={(size * 150) / 160}
      className={className}
      role="img"
      aria-label="A turkey in a golf cap standing over a ball on a tee"
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
            x="68"
            y="10"
            width="24"
            height="76"
            rx="12"
            transform={`rotate(${angle} 80 104)`}
            fill={i % 2 === 0 ? "var(--color-turkey)" : "var(--color-fairway)"}
          />
        ))}

        {/* Legs, behind the body */}
        <path
          d="M69 120v18M91 120v18M62 138h13M84 138h13"
          fill="none"
          strokeWidth="3.4"
        />

        {/* Neck, then the body and head over its ends */}
        <rect
          x="69"
          y="58"
          width="22"
          height="34"
          rx="11"
          fill="var(--color-gravy)"
        />
        <ellipse cx="80" cy="101" rx="32" ry="26" fill="var(--color-gravy)" />

        {/* Folded wing */}
        <path d="M98 88c6 6 6 16-1 22" fill="none" />

        {/* Head */}
        <circle cx="80" cy="50" r="20" fill="var(--color-gravy)" />
        {/* Beak */}
        <path d="M94 57l21 7-21 7z" fill="#e8a33d" strokeWidth="2.6" />
        {/* Snood, a drop off the top of the beak */}
        <path
          d="M95 54c4 4 4 10 0 13"
          fill="none"
          stroke="var(--color-flag)"
          strokeWidth="4.5"
        />
        {/* Eye */}
        <circle cx="86" cy="54" r="3.2" fill="currentColor" stroke="none" />
        {/* Cap, worn backwards: crown over the head, brim out to the left */}
        <path d="M58 48a22 22 0 0 1 44 0z" fill="var(--color-fairway)" />
        <path d="M58 48H45a4 4 0 0 0 0 8h11" fill="var(--color-fairway)" />

        {/* Ball on a tee */}
        <path d="M132 138v-10M127 128h10" fill="none" strokeWidth="3.4" />
        <circle cx="132" cy="115" r="11" fill="#fff" />
        <g fill="currentColor" stroke="none">
          <circle cx="128" cy="112" r="1.3" />
          <circle cx="133.5" cy="110.5" r="1.3" />
          <circle cx="136.5" cy="115.5" r="1.3" />
          <circle cx="130" cy="118" r="1.3" />
        </g>
      </g>
    </svg>
  );
}
