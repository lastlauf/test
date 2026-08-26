"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scroller } from "@/components/Scroller";

/**
 * The pills inside one tournament: scoped to a year, so they belong on the page
 * rather than in the tab bar.
 */
export function CupNav({ year }: { year: number }) {
  const pathname = usePathname();
  const links = [
    { href: `/cup/${year}`, label: "Leaderboard" },
    { href: `/cup/${year}/players`, label: "Players" },
    { href: `/cup/${year}/information`, label: "Information" },
  ];
  return (
    <Scroller as="nav" ariaLabel="Tournament" className="-mx-5 mb-8" innerClassName="px-5">
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
    </Scroller>
  );
}
