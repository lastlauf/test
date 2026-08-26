"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PlayerStatRow } from "@/lib/cup";
import { Scroller } from "@/components/Scroller";

type Column = {
  key: keyof PlayerStatRow | "name";
  label: string;
  numeric: boolean;
  /** Longer help shown under the table rather than crammed into the heading. */
  note?: string;
};

const COLUMNS: Column[] = [
  { key: "name", label: "Player", numeric: false },
  { key: "matches", label: "Matches", numeric: true },
  { key: "wins", label: "W", numeric: true },
  { key: "losses", label: "L", numeric: true },
  { key: "ties", label: "T", numeric: true },
  { key: "points", label: "Points", numeric: true, note: "a win is 1, a halved match is ½ each" },
  { key: "winPercent", label: "Win %", numeric: true, note: "points as a share of matches played" },
  { key: "birdies", label: "Birdies+", numeric: true, note: "holes played in a birdie or better" },
];

export function StatsTable({ rows }: { rows: PlayerStatRow[] }) {
  const [sort, setSort] = useState<{ key: Column["key"]; desc: boolean }>({
    key: "points",
    desc: true,
  });

  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      if (sort.key === "name") return a.displayName.localeCompare(b.displayName);
      const av = a[sort.key];
      const bv = b[sort.key];
      // A player with no matches has no win percentage; park them at the bottom
      // either way rather than letting null sort as zero.
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return Number(av) - Number(bv);
    });
    if (sort.desc && sort.key !== "name") out.reverse();
    return out;
  }, [rows, sort]);

  const toggle = (key: Column["key"]) =>
    setSort((prev) =>
      prev.key === key ? { key, desc: !prev.desc } : { key, desc: key !== "name" },
    );

  return (
    <>
      <Scroller className="tsi-panel !p-0">
        <table className="tsi-table">
          <thead>
            <tr>
              {COLUMNS.map((column) => {
                const active = sort.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={column.numeric ? "tsi-col-num" : "tsi-col-lead"}
                    aria-sort={
                      active ? (sort.desc ? "descending" : "ascending") : "none"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => toggle(column.key)}
                      className="inline-flex items-center gap-1 uppercase"
                      style={{ color: active ? "var(--tsi-text)" : "inherit" }}
                    >
                      {column.label}
                      <span aria-hidden style={{ opacity: active ? 1 : 0.25 }}>
                        {active && !sort.desc ? "▲" : "▼"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.playerId}>
                <td className="tsi-col-lead">
                  <Link href={`/players/${row.username}`} className="font-semibold underline">
                    {row.displayName}
                  </Link>
                </td>
                <td className="tsi-col-num">{row.matches}</td>
                <td className="tsi-col-num">{row.wins}</td>
                <td className="tsi-col-num">{row.losses}</td>
                <td className="tsi-col-num">{row.ties}</td>
                <td className="tsi-col-num">{row.points % 1 === 0 ? row.points : row.points.toFixed(1)}</td>
                <td className="tsi-col-num">
                  {row.winPercent == null ? "—" : `${row.winPercent.toFixed(1)}%`}
                </td>
                <td className="tsi-col-num">{row.birdies}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-10 text-center tsi-muted">
                  No matches have been played yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Scroller>

      <ul className="mt-4 space-y-1.5">
        {COLUMNS.filter((c) => c.note).map((column) => (
          <li key={column.key} className="flex gap-3 text-[14px] tsi-muted">
            <span className="w-20 shrink-0 font-semibold">{column.label}</span>
            <span>{column.note}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
