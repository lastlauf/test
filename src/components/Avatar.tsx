export function Avatar({
  name,
  photo,
  size = 44,
}: {
  name: string;
  photo?: string | null;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  if (photo) {
    return (
      // Photos are user-uploaded data URLs or Google avatars; plain <img> keeps
      // the optimizer out of it.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full tsi-rule object-cover"
        style={{ borderColor: "var(--tsi-line)", width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full tsi-rule font-bold"
      style={{
        width: size,
        height: size,
        borderColor: "var(--tsi-line)",
        fontSize: size * 0.36,
      }}
    >
      {initials || "?"}
    </span>
  );
}
