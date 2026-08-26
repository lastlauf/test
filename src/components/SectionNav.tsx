"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The record book's own nav. The tab bar gets you into this section; these
 * pills move you around inside it without spending four of the five tabs.
 */
const LINKS = [
  { href: "/cup", label: "Tournaments" },
  { href: "/rounds", label: "Rounds" },
  { href: "/stats", label: "Stats" },
  { href: "/courses", label: "Courses" },
];

export function SectionNav({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Record book"
      className={`tsi-table-wrap -mx-5 mb-8 px-5 ${className}`}
    >
      <ul className="flex gap-2">
        {LINKS.map(({ href, label }) => {
          const active =
            href === "/cup" ? pathname.startsWith("/cup") : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="tsi-rule inline-flex items-center rounded-full px-4 text-[14px] font-semibold"
                style={{
                  minHeight: 40,
                  background: active ? "var(--tsi-text)" : "var(--tsi-shell)",
                  color: active ? "var(--tsi-shell)" : "var(--tsi-text)",
                }}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The pills inside one tournament. Kept separate from the section nav because
 * these are scoped to a year and disappear when you leave it.
 */
export function CupNav({ year }: { year: number }) {
  const pathname = usePathname();
  const links = [
    { href: `/cup/${year}`, label: "Leaderboard" },
    { href: `/cup/${year}/players`, label: "Players" },
    { href: `/cup/${year}/information`, label: "Information" },
  ];
  return (
    <nav aria-label="Tournament" className="tsi-table-wrap -mx-5 mb-8 px-5">
      <ul className="flex gap-2">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="tsi-rule inline-flex items-center rounded-full px-4 text-[14px] font-semibold"
                style={{
                  minHeight: 40,
                  background: active ? "var(--tsi-text)" : "var(--tsi-shell)",
                  color: active ? "var(--tsi-shell)" : "var(--tsi-text)",
                }}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
