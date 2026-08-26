"use client";

import Link from "next/link";
import type { BoardPayload } from "@/lib/payloads";
import { sideName } from "@/lib/scoring";
import { useLive } from "./useLive";
import { Panel } from "./ui";

function toPar(value: number, holes: number) {
  if (holes === 0) return "—";
  return value === 0 ? "E" : value > 0 ? `+${value}` : `${value}`;
}

export default function LiveTournament({
  initial,
  myPlayerId,
}: {
  initial: BoardPayload;
  myPlayerId: string | null;
}) {
  const { data, online, updatedAt } = useLive<BoardPayload>(
    `/api/tournaments/${initial.tournament.id}/board`,
    initial,
  );
  const { tournament, teams, rounds, leaderboard } = data;

  const liveRound =
    rounds.find((r) => r.round.status === "live") ??
    rounds.find((r) => r.round.status === "upcoming") ??
    rounds[rounds.length - 1];

  const myMatch = myPlayerId
    ? rounds
        .flatMap((r) => r.matches.map((m) => ({ ...m, roundId: r.round.id })))
        .find((m) => m.sides.some((s) => s.players.some((p) => p.id === myPlayerId)) && !m.decided)
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-widest tsi-muted">
        <span>
          {online ? "● Live" : "○ Offline — showing last known"}
          {updatedAt && online ? ` · ${updatedAt.toLocaleTimeString()}` : ""}
        </span>
        <Link href={`/leaderboard?t=${tournament.id}`} className="underline">
          Full board
        </Link>
      </div>

      {teams.length === 2 && (
        <Panel className="!p-0 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
            <div className="p-4" style={{ background: teams[0].color, color: "#fff" }}>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] opacity-90">
                {teams[0].name}
              </p>
              <p className="tsi-num text-5xl font-black leading-none">{teams[0].points}</p>
            </div>
            <div
              className="grid place-items-center px-3 text-sm font-black"
              style={{ background: "var(--tsi-shell)" }}
            >
              vs
            </div>
            <div
              className="p-4 text-right"
              style={{ background: teams[1].color, color: "#fff" }}
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] opacity-90">
                {teams[1].name}
              </p>
              <p className="tsi-num text-5xl font-black leading-none">{teams[1].points}</p>
            </div>
          </div>
        </Panel>
      )}

      {myMatch && (
        <Link
          href={`/score/${myMatch.id}`}
          className="tsi-btn tsi-btn-primary w-full text-base"
        >
          ✎ Enter scores — {myMatch.name}
        </Link>
      )}

      {liveRound && (
        <Panel>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-black">{liveRound.round.name}</h2>
            <span className="text-xs font-extrabold uppercase tracking-widest tsi-muted">
              {liveRound.round.format}
            </span>
          </div>
          <ul className="space-y-2">
            {liveRound.matches.map((match) => (
              <li key={match.id}>
                <Link
                  href={`/score/${match.id}`}
                  className="block rounded-xl border-2 px-3 py-3"
                  style={{ borderColor: "var(--tsi-line)" }}
                >
                  <span className="block truncate font-bold">
                    {sideName(match.sides[0])}
                    <span className="tsi-muted"> v </span>
                    {sideName(match.sides[1])}
                  </span>
                  <span className="mt-0.5 flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold tsi-muted">{match.name}</span>
                    <span className="text-sm font-black">{match.status}</span>
                  </span>
                </Link>
              </li>
            ))}
            {liveRound.matches.length === 0 && (
              <li className="tsi-muted font-semibold">No pairings set yet.</li>
            )}
          </ul>
        </Panel>
      )}

      <Panel>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-black">Net leaderboard</h2>
          <Link href={`/leaderboard?t=${tournament.id}`} className="text-sm font-bold underline">
            All {leaderboard.length}
          </Link>
        </div>
        <ol className="space-y-1">
          {leaderboard.slice(0, 5).map((row, i) => (
            <li key={row.playerId} className="flex items-center gap-3 py-1">
              <span className="tsi-num w-6 text-right font-black">{i + 1}</span>
              <Link href={`/players/${row.username}`} className="flex min-w-0 flex-1 items-center gap-2">
                {row.teamColor && (
                  <span
                    aria-label={row.teamName ?? undefined}
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: row.teamColor }}
                  />
                )}
                <span className="truncate font-bold">{row.displayName}</span>
              </Link>
              <span className="tsi-num w-14 text-right font-black">
                {toPar(row.netToPar, row.holesPlayed)}
              </span>
              <span className="tsi-num w-12 text-right text-sm tsi-muted">
                {row.holesPlayed}h
              </span>
            </li>
          ))}
          {leaderboard.length === 0 && (
            <li className="tsi-muted font-semibold">No scores posted yet.</li>
          )}
        </ol>
      </Panel>
    </div>
  );
}
