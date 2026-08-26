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
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {kicker && (
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] tsi-muted">
            {kicker}
          </p>
        )}
        <h1 className="text-2xl font-black leading-tight tracking-tight">{title}</h1>
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
      <p className="tsi-muted font-semibold">{children}</p>
    </Panel>
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
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white"
      style={{ background: color ?? "#334155" }}
    >
      {name}
    </span>
  );
}

/** Circle/square treatment golfers expect: birdie ringed, bogey boxed. */
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
  const base = "inline-grid place-items-center tsi-num font-black h-8 w-8";
  if (diff <= -2) {
    return (
      <span
        className={`${base} rounded-full ${className}`}
        style={{ boxShadow: "0 0 0 2px var(--color-birdie), 0 0 0 4px var(--tsi-shell), 0 0 0 6px var(--color-birdie)" }}
      >
        {gross}
      </span>
    );
  }
  if (diff === -1) {
    return (
      <span
        className={`${base} rounded-full border-2 ${className}`}
        style={{ borderColor: "var(--color-birdie)", color: "var(--color-birdie)" }}
      >
        {gross}
      </span>
    );
  }
  if (diff === 1) {
    return (
      <span
        className={`${base} border-2 ${className}`}
        style={{ borderColor: "var(--tsi-text)" }}
      >
        {gross}
      </span>
    );
  }
  if (diff >= 2) {
    return (
      <span
        className={`${base} border-4 border-double ${className}`}
        style={{ borderColor: "var(--tsi-text)" }}
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
    <div className="tsi-panel px-3 py-2">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] tsi-muted">
        {label}
      </p>
      <p className="tsi-num text-2xl font-black leading-tight">{value}</p>
      {sub && <p className="text-xs font-semibold tsi-muted">{sub}</p>}
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
