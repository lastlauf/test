"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/* Line icons, 22px, one stroke weight. */

function IconLive() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      <path
        d="M6.6 6.6a7.6 7.6 0 0 0 0 10.8M17.4 17.4a7.6 7.6 0 0 0 0-10.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconScore() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <rect
        x="4"
        y="3.5"
        width="16"
        height="17"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M8 9h8M8 13h8M8 17h4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBets() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M14.2 5.4A5.5 5.5 0 1 1 9.8 18.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPlayers() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <circle cx="12" cy="8.5" r="3.8" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M4.8 20a7.2 7.2 0 0 1 14.4 0"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconArchive() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M7 4h10v5a5 5 0 0 1-10 0V4Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M7 5.5H4.6a3 3 0 0 0 3 3M17 5.5h2.4a3 3 0 0 1-3 3M12 14v3.5M8.5 20.5h7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Live", Icon: IconLive },
  { href: "/score", label: "Score", Icon: IconScore },
  { href: "/bets", label: "Bets", Icon: IconBets },
  { href: "/players", label: "Players", Icon: IconPlayers },
  { href: "/archive", label: "Archive", Icon: IconArchive },
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
      className="tsi-tap flex items-center justify-center rounded-full"
      aria-pressed={on}
      aria-label={on ? "Sunlight mode on" : "Sunlight mode off"}
      title="Sunlight mode"
      style={{
        background: on ? "var(--tsi-text)" : "transparent",
        color: on ? "var(--tsi-shell)" : "var(--tsi-muted)",
        width: 40,
        height: 40,
        minWidth: 40,
        minHeight: 40,
      }}
      onClick={() => {
        const next = !on;
        setOn(next);
        document.documentElement.dataset.sun = next ? "on" : "off";
        window.localStorage.setItem("tsi.sun", next ? "on" : "off");
      }}
    >
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.9" />
        <path
          d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6 17 17M7 7 5.4 5.4"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="tsi-rule-t fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5"
      style={{
        background: "var(--tsi-shell)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Main"
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center justify-center gap-1 py-2.5"
            style={{
              color: active ? "var(--tsi-text)" : "var(--tsi-muted)",
              minHeight: 56,
            }}
          >
            <Icon />
            <span
              className="text-[11px]"
              style={{ fontWeight: active ? 700 : 500 }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
