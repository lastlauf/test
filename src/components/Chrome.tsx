"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* Line icons, 22px, one stroke weight. */

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20H4v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

function IconCup() {
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

function IconRounds() {
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

function IconStats() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M5 20V12M12 20V4M19 20v-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCourses() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M7 20V4l10 3.5L7 11"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M4.5 20h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function IconArchive() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <rect x="3.5" y="4" width="17" height="4.5" rx="1.5" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M5.5 8.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M10 12h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Home", Icon: IconHome },
  { href: "/cup", label: "Cups", Icon: IconCup },
  { href: "/rounds", label: "Rounds", Icon: IconRounds },
  { href: "/stats", label: "Stats", Icon: IconStats },
  { href: "/courses", label: "Courses", Icon: IconCourses },
  { href: "/archive", label: "Archive", Icon: IconArchive },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // The original app — live board, games, bets, scorecards, roster — all sits
  // behind the archive tab.
  if (href === "/archive") {
    return ["/archive", "/games", "/bets", "/score", "/leaderboard", "/players"].some(
      (root) => pathname === root || pathname.startsWith(`${root}/`),
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}


export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tsi-tabbar" aria-label="Main">
      <div className="tsi-tabbar-inner">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="tsi-tabbar-tab"
              style={{ color: active ? "var(--tsi-text)" : "var(--tsi-muted)" }}
            >
              <Icon />
              <span
                className="text-[11px] md:text-[13px]"
                style={{ fontWeight: active ? 700 : 500 }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
