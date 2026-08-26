"use client";

import Link from "next/link";
import { useState } from "react";
import type { BoardPayload } from "@/lib/payloads";
import { sideName } from "@/lib/scoring";
import { useLive } from "./useLive";
import { Panel, TeamDot } from "./ui";

type View = "net" | "gross" | "matches";

const VIEW_LABEL: Record<View, string> = {
  net: "Net",
  gross: "Gross",
  matches: "Matches",
};

function toPar(value: number, holes: number) {
  if (holes === 0) return "—";
  return value === 0 ? "E" : value > 0 ? `+${value}` : `${value}`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
      <div className="relative grid grid-cols-3 tsi-rule rounded-xl p-1">
        <span
          aria-hidden
          className="tsi-segment-thumb absolute inset-y-1 left-1 rounded-lg"
          style={{
            width: "calc(33.333% - 0.166rem)",
            background: "var(--tsi-text)",
            transform:
              view === "net"
                ? "translateX(0)"
                : view === "gross"
                  ? "translateX(100%)"
                  : "translateX(200%)",
          }}
        />
        {(["net", "gross", "matches"] as View[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setView(option)}
            aria-pressed={view === option}
            className="tsi-tap relative z-10 rounded-lg text-[14px]"
            style={{
              color: view === option ? "var(--tsi-shell)" : "var(--tsi-text)",
              fontWeight: view === option ? 700 : 500,
            }}
          >
            {VIEW_LABEL[option]}
          </button>
        ))}
      </div>

      <p className="flex items-center justify-between gap-3 text-[13px] tsi-muted">
        <span>
          {online
            ? `Live${updatedAt ? ` · updated ${updatedAt.toLocaleTimeString()}` : ""}`
            : "Offline — showing the last scores this phone saw"}
        </span>
        {teams.length > 0 && (
          <span className="flex items-center gap-3">
            {teams.map((team) => (
              <span key={team.teamId} className="flex items-center gap-1.5">
                <TeamDot color={team.color} />
                <span className="tsi-num font-bold" style={{ color: "var(--tsi-text)" }}>
                  {team.points}
                </span>
              </span>
            ))}
          </span>
        )}
      </p>

      {view !== "matches" && (
        <Panel className="!p-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[12px] tsi-muted">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="py-2 font-medium">Player</th>
                <th className="px-2 py-2 text-right font-medium">
                  {view === "gross" ? "Gross" : "Net"}
                </th>
                <th className="px-2 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">Thru</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={row.playerId} className="tsi-rule-t">
                  <td className="tsi-num px-4 py-2.5 text-[15px] tsi-muted">{i + 1}</td>
                  <td className="py-2.5">
                    <Link
                      href={`/players/${row.username}`}
                      className="flex items-center gap-2"
                    >
                      <TeamDot color={row.teamColor} />
                      <span className="text-[15px] font-semibold">{row.displayName}</span>
                    </Link>
                  </td>
                  <td className="tsi-num px-2 py-2.5 text-right text-[17px] font-bold">
                    {toPar(view === "gross" ? row.toPar : row.netToPar, row.holesPlayed)}
                  </td>
                  <td className="tsi-num px-2 py-2.5 text-right text-[15px]">
                    {view === "gross" ? row.gross || "—" : row.net || "—"}
                  </td>
                  <td className="tsi-num px-4 py-2.5 text-right text-[15px] tsi-muted">
                    {row.holesPlayed}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[15px] tsi-muted">
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
          <section key={round.id}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[17px] font-bold">{round.name}</h2>
              <span className="text-[13px] tsi-muted">{titleCase(round.format)}</span>
            </div>
            <Panel className="!p-0">
              <ul>
                {matches.map((match, i) => (
                  <li key={match.id} className={i > 0 ? "tsi-rule-t" : ""}>
                    <Link href={`/score/${match.id}`} className="block px-4 py-3">
                      <span className="block truncate text-[15px] font-semibold">
                        {sideName(match.sides[0])}
                        <span className="tsi-muted"> v </span>
                        {sideName(match.sides[1])}
                      </span>
                      <span className="text-[13px] tsi-muted">{match.status}</span>
                    </Link>
                  </li>
                ))}
                {matches.length === 0 && (
                  <li className="px-4 py-3 text-[15px] tsi-muted">No pairings yet.</li>
                )}
              </ul>
            </Panel>
          </section>
        ))}
    </div>
  );
}
