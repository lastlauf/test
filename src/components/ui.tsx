import Link from "next/link";
import type { ReactNode } from "react";

export function PageTitle({
  kicker,
  title,
  action,
}: {
  kicker?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {kicker && (
          <p className="mb-0.5 text-[12px] font-semibold tsi-muted">{kicker}</p>
        )}
        <h1 className="text-[26px] font-extrabold leading-[1.1]">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`tsi-panel p-4 ${className}`}>{children}</section>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <Panel className="text-center">
      <p className="tsi-muted">{children}</p>
    </Panel>
  );
}

/** A team's colour as a dot — quieter than a filled pill next to a name. */
export function TeamDot({ color }: { color?: string | null }) {
  if (!color) return null;
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

export function TeamPill({
  name,
  color,
}: {
  name: string | null;
  color?: string | null;
}) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold tsi-muted">
      <TeamDot color={color} />
      {name}
    </span>
  );
}

/** Circle for a birdie, box for a bogey — the marks golfers already read. */
export function ScoreMark({
  gross,
  par,
  className = "",
}: {
  gross: number | null;
  par: number;
  className?: string;
}) {
  if (gross == null) return <span className={`tsi-muted ${className}`}>–</span>;
  const diff = gross - par;
  const base = "inline-grid place-items-center tsi-num font-bold h-8 w-8";
  if (diff <= -2) {
    return (
      <span
        className={`${base} rounded-full ${className}`}
        style={{
          boxShadow:
            "0 0 0 1.5px var(--color-flag), 0 0 0 3px var(--tsi-shell), 0 0 0 4.5px var(--color-flag)",
          color: "var(--color-flag)",
        }}
      >
        {gross}
      </span>
    );
  }
  if (diff === -1) {
    return (
      <span
        className={`${base} rounded-full ${className}`}
        style={{
          boxShadow: "0 0 0 1.5px var(--color-flag)",
          color: "var(--color-flag)",
        }}
      >
        {gross}
      </span>
    );
  }
  if (diff >= 1) {
    return (
      <span
        className={`${base} ${className}`}
        style={{ boxShadow: `0 0 0 ${diff >= 2 ? "1.5px" : "1.5px"} var(--tsi-text)` }}
      >
        {gross}
      </span>
    );
  }
  return <span className={`${base} ${className}`}>{gross}</span>;
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="tsi-panel px-3 py-3">
      <p className="text-[12px] font-semibold tsi-muted">{label}</p>
      <p className="tsi-num text-[26px] font-extrabold leading-tight">{value}</p>
      {sub && <p className="text-[12px] tsi-muted">{sub}</p>}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "default",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "default" | "primary";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`tsi-btn ${variant === "primary" ? "tsi-btn-primary" : ""} ${className}`}
    >
      {children}
    </Link>
  );
}
