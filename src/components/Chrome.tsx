"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  { href: "/games", label: "Games", Icon: IconScore },
  { href: "/bets", label: "Bets", Icon: IconBets },
  { href: "/players", label: "Players", Icon: IconPlayers },
  { href: "/archive", label: "Archive", Icon: IconArchive },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // Scorecards live under /score but belong to the Games tab.
  if (href === "/games") return pathname.startsWith("/games") || pathname.startsWith("/score");
  return pathname === href || pathname.startsWith(`${href}/`);
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
            className="flex flex-col items-center justify-center gap-1.5 py-3"
            style={{
              color: active ? "var(--tsi-text)" : "var(--tsi-muted)",
              minHeight: 60,
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
