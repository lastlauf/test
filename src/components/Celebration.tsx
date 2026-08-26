"use client";

import { useEffect, useMemo } from "react";

const COLORS = [
  "var(--color-turkey)",
  "var(--color-fairway)",
  "var(--color-gravy)",
  "var(--color-flag)",
  "var(--tsi-text)",
];

/**
 * The moment a game starts. Deliberately short — it plays over the tap that
 * created the game and gets out of the way before the scorecard loads.
 * Reduced-motion users get the message without the confetti, because the
 * global motion rule collapses the animations to nothing.
 */
export default function Celebration({
  title,
  subtitle,
  onDone,
  duration = 1700,
}: {
  title: string;
  subtitle?: string;
  onDone?: () => void;
  duration?: number;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        id: i,
        left: Math.round(Math.random() * 100),
        drift: Math.round((Math.random() - 0.5) * 160),
        spin: Math.round(Math.random() * 900 - 450),
        delay: Math.round(Math.random() * 320),
        life: 1200 + Math.round(Math.random() * 700),
        color: COLORS[i % COLORS.length],
        width: 7 + Math.round(Math.random() * 5),
        height: 11 + Math.round(Math.random() * 8),
      })),
    [],
  );

  useEffect(() => {
    if (!onDone) return;
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [onDone, duration]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden"
      style={{ background: "color-mix(in srgb, var(--tsi-shell) 90%, transparent)" }}
      role="status"
      aria-live="polite"
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          aria-hidden
          className="tsi-confetti absolute top-0 rounded-[2px]"
          style={{
            left: `${piece.left}%`,
            width: piece.width,
            height: piece.height,
            background: piece.color,
            animationDelay: `${piece.delay}ms`,
            animationDuration: `${piece.life}ms`,
            ["--tsi-drift" as string]: `${piece.drift}px`,
            ["--tsi-spin" as string]: `${piece.spin}deg`,
          }}
        />
      ))}
      {/* Solid backing so the message reads over whatever is on the page. */}
      <div
        className="tsi-pop tsi-rule mx-6 rounded-2xl px-7 py-8 text-center"
        style={{ background: "var(--tsi-shell)" }}
      >
        <p className="text-[34px] font-extrabold leading-tight tracking-[-0.03em]">{title}</p>
        {subtitle && <p className="mt-2.5 text-[16px] tsi-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
