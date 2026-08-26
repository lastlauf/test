"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RoundListRow } from "@/lib/cup";

/**
 * The scoring sheet: one line per player per session, or per pair where the
 * pair shared a ball. The original list ran to hundreds of rows with no way to
 * narrow it, so this one filters.
 */
export function RoundsTable({ rows }: { rows: RoundListRow[] }) {
  const [query, setQuery] = useState("");
  const [tournament, setTournament] = useState("all");

  const tournaments = useMemo(
    () => [...new Set(rows.map((r) => r.tournamentName))].sort(),
    [rows],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (tournament !== "all" && row.tournamentName !== tournament) return false;
      if (!needle) return true;
      return (
        row.subject.toLowerCase().includes(needle) ||
        row.courseName.toLowerCase().includes(needle)
      );
    });
  }, [rows, query, tournament]);

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="min-w-[12rem] flex-1">
          <span className="tsi-label">Search</span>
          <input
            className="tsi-field"
            type="search"
            placeholder="Player or course"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="min-w-[12rem] flex-1">
          <span className="tsi-label">Tournament</span>
          <select
            className="tsi-field"
            value={tournament}
            onChange={(event) => setTournament(event.target.value)}
          >
            <option value="all">All</option>
            {tournaments.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-4 text-[14px] tsi-muted">
        {shown.length} of {rows.length} rounds
      </p>

      <div className="tsi-panel tsi-table-wrap !p-0">
        <table className="tsi-table">
          <thead>
            <tr>
              <th scope="col" className="tsi-col-lead">Player</th>
              <th scope="col">Cup</th>
              <th scope="col">Course</th>
              <th scope="col">Date</th>
              <th scope="col" className="tsi-col-num">Gross</th>
              <th scope="col" className="tsi-col-num">Hcp</th>
              <th scope="col" className="tsi-col-num">Net</th>
              <th scope="col" className="tsi-col-num">Session</th>
              <th scope="col"><span className="sr-only">Scorecard</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={`${row.matchId}-${row.subject}-${i}`}>
                <td className="tsi-col-lead font-semibold">{row.subject}</td>
                <td className="tsi-muted">{row.tournamentLabel}</td>
                <td>{row.courseName}</td>
                <td className="tsi-muted">{row.playedOn ?? "—"}</td>
                <td className="tsi-col-num">{row.gross}</td>
                <td className="tsi-col-num">{row.handicap}</td>
                <td className="tsi-col-num">{row.net}</td>
                <td className="tsi-col-num">{row.session}</td>
                <td>
                  <Link
                    href={`/score/${row.matchId}`}
                    className="tsi-rule inline-flex items-center rounded-lg px-3 text-[13px] font-semibold"
                    style={{ minHeight: 36 }}
                  >
                    Card
                  </Link>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center tsi-muted">
                  {rows.length === 0
                    ? "No scores have been posted yet."
                    : "Nothing matches that filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
