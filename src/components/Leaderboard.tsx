"use client";

import Link from "next/link";
import { useState } from "react";
import type { BoardPayload } from "@/lib/payloads";
import { sideName } from "@/lib/scoring";
import { useLive } from "./useLive";
import { Panel, TeamPill } from "./ui";

type View = "net" | "gross" | "matches";

function toPar(value: number, holes: number) {
  if (holes === 0) return "—";
  return value === 0 ? "E" : value > 0 ? `+${value}` : `${value}`;
}

export default function Leaderboard({ initial }: { initial: BoardPayload }) {
  const [view, setView] = useState<View>("net");
  const { data, online, updatedAt } = useLive<BoardPayload>(
    `/api/tournaments/${initial.tournament.id}/board`,
    initial,
  );
  const { leaderboard, teams, rounds } = data;

  const sorted = [...leaderboard].sort((a, b) =>
    view === "gross" ? a.toPar - b.toPar : a.netToPar - b.netToPar,
  );

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-3 gap-1 rounded-xl border-2 p-1"
        style={{ borderColor: "var(--tsi-line)" }}
        role="tablist"
        aria-label="Leaderboard view"
      >
        {(["net", "gross", "matches"] as View[]).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            onClick={() => setView(option)}
            className="tsi-tap rounded-lg text-sm font-black uppercase tracking-wide"
            style={{
              background: view === option ? "var(--color-ink)" : "transparent",
              color: view === option ? "#fff" : "var(--tsi-text)",
            }}
          >
            {option}
          </button>
        ))}
      </div>

      <p className="text-xs font-bold uppercase tracking-widest tsi-muted">
        {online ? "● Live" : "○ Offline — last known"}
        {updatedAt && online ? ` · ${updatedAt.toLocaleTimeString()}` : ""}
      </p>

      {teams.length > 0 && (
        <Panel className="flex flex-wrap items-center gap-3">
          {teams.map((team) => (
            <span key={team.teamId} className="flex items-center gap-2">
              <TeamPill name={team.name} color={team.color} />
              <span className="tsi-num text-xl font-black">{team.points}</span>
            </span>
          ))}
          <span className="ml-auto text-xs font-bold uppercase tracking-widest tsi-muted">
            Match points
          </span>
        </Panel>
      )}

      {view !== "matches" && (
        <Panel className="!p-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-black uppercase tracking-widest tsi-muted">
                <th className="px-3 py-2">#</th>
                <th className="px-1 py-2">Player</th>
                <th className="px-2 py-2 text-right">{view === "gross" ? "Gross" : "Net"}</th>
                <th className="px-2 py-2 text-right">Tot</th>
                <th className="px-3 py-2 text-right">Thru</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={row.playerId}
                  className="border-t-2"
                  style={{ borderColor: "var(--tsi-line)" }}
                >
                  <td className="tsi-num px-3 py-2 font-black">{i + 1}</td>
                  <td className="px-1 py-2">
                    <Link href={`/players/${row.username}`} className="font-bold">
                      {row.displayName}
                    </Link>
                    <span className="ml-2">
                      <TeamPill name={row.teamName} color={row.teamColor} />
                    </span>
                  </td>
                  <td className="tsi-num px-2 py-2 text-right text-lg font-black">
                    {toPar(view === "gross" ? row.toPar : row.netToPar, row.holesPlayed)}
                  </td>
                  <td className="tsi-num px-2 py-2 text-right font-bold">
                    {view === "gross" ? row.gross || "—" : row.net || "—"}
                  </td>
                  <td className="tsi-num px-3 py-2 text-right font-bold tsi-muted">
                    {row.holesPlayed}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center font-semibold tsi-muted">
                    No scores posted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      )}

      {view === "matches" &&
        rounds.map(({ round, matches }) => (
          <Panel key={round.id}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-black">{round.name}</h2>
              <span className="text-xs font-extrabold uppercase tracking-widest tsi-muted">
                {round.format}
              </span>
            </div>
            <ul className="space-y-2">
              {matches.map((match) => (
                <li key={match.id}>
                  <Link
                    href={`/score/${match.id}`}
                    className="block rounded-xl border-2 px-3 py-2"
                    style={{ borderColor: "var(--tsi-line)" }}
                  >
                    <span className="block truncate font-bold">
                      {sideName(match.sides[0])}
                      <span className="tsi-muted"> v </span>
                      {sideName(match.sides[1])}
                    </span>
                    <span className="block text-sm font-black">{match.status}</span>
                  </Link>
                </li>
              ))}
              {matches.length === 0 && (
                <li className="font-semibold tsi-muted">No pairings yet.</li>
              )}
            </ul>
          </Panel>
        ))}
    </div>
  );
}
