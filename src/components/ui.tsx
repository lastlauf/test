import Link from "next/link";
import type { ReactNode } from "react";

export function PageTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <h1 className="min-w-0">{title}</h1>
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
  return <section className={`tsi-panel p-5 ${className}`}>{children}</section>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <Panel className="!py-10 text-center">
      <p className="text-[15px] tsi-muted">{children}</p>
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
    <div className="tsi-panel px-4 py-4">
      <p className="text-[13px] font-semibold tsi-muted">{label}</p>
      <p className="tsi-num mt-1 text-[28px] font-extrabold leading-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[13px] tsi-muted">{sub}</p>}
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
