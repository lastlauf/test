"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { href: "/", label: "Live", glyph: "◉" },
  { href: "/score", label: "Score", glyph: "✎" },
  { href: "/bets", label: "Bets", glyph: "$" },
  { href: "/players", label: "Players", glyph: "☰" },
  { href: "/archive", label: "Archive", glyph: "★" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SunToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("tsi.sun") === "on";
    setOn(stored);
    document.documentElement.dataset.sun = stored ? "on" : "off";
  }, []);

  return (
    <button
      type="button"
      className="tsi-tap px-3 rounded-xl border-2 text-sm font-extrabold"
      style={{ borderColor: "var(--tsi-line)" }}
      aria-pressed={on}
      onClick={() => {
        const next = !on;
        setOn(next);
        document.documentElement.dataset.sun = next ? "on" : "off";
        window.localStorage.setItem("tsi.sun", next ? "on" : "off");
      }}
    >
      {on ? "☀ SUN ON" : "☀ SUN"}
    </button>
  );
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t-2"
      style={{
        background: "var(--tsi-shell)",
        borderColor: "var(--tsi-line)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Main"
    >
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-extrabold uppercase tracking-wide"
            style={{
              color: active ? "var(--tsi-text)" : "var(--tsi-muted)",
              borderTop: active ? "4px solid var(--color-turkey)" : "4px solid transparent",
              minHeight: 56,
            }}
          >
            <span aria-hidden className="text-lg leading-none">
              {tab.glyph}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
