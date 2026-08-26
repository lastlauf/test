"use client";

import Link from "next/link";
import type { BoardPayload } from "@/lib/payloads";
import { sideName } from "@/lib/scoring";
import { useLive } from "./useLive";
import { Panel, TeamDot } from "./ui";

function toPar(value: number, holes: number) {
  if (holes === 0) return "—";
  return value === 0 ? "E" : value > 0 ? `+${value}` : `${value}`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
        .flatMap((r) => r.matches)
        .find(
          (m) => m.sides.some((s) => s.players.some((p) => p.id === myPlayerId)) && !m.decided,
        )
    : undefined;

  return (
    <div className="space-y-5">
      <p className="flex items-center justify-between gap-2 text-[13px] tsi-muted">
        <span>
          {online
            ? `Live${updatedAt ? ` · updated ${updatedAt.toLocaleTimeString()}` : ""}`
            : "Offline — showing the last scores this phone saw"}
        </span>
        <Link href={`/leaderboard?t=${tournament.id}`} className="font-semibold">
          Full board
        </Link>
      </p>

      {teams.length === 2 && (
        <Panel className="!py-5">
          <div className="flex items-center justify-between gap-3">
            {[teams[0], teams[1]].map((team, i) => (
              <div key={team.teamId} className={i === 1 ? "text-right" : ""}>
                <p
                  className={`mb-1 flex items-center gap-1.5 text-[13px] font-semibold tsi-muted ${
                    i === 1 ? "flex-row-reverse" : ""
                  }`}
                >
                  <TeamDot color={team.color} />
                  {team.name}
                </p>
                <p className="tsi-num text-[40px] font-extrabold leading-none">
                  {team.points}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {myMatch && (
        <Link href={`/score/${myMatch.id}`} className="tsi-btn tsi-btn-primary w-full">
          Enter scores — {myMatch.name}
        </Link>
      )}

      {liveRound && (
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-[17px] font-bold">{liveRound.round.name}</h2>
            <span className="text-[13px] tsi-muted">{titleCase(liveRound.round.format)}</span>
          </div>
          <Panel className="!p-0">
            <ul>
              {liveRound.matches.map((match, i) => (
                <li key={match.id} className={i > 0 ? "tsi-rule-t" : ""}>
                  <Link href={`/score/${match.id}`} className="block px-4 py-3">
                    <span className="block truncate text-[15px] font-semibold">
                      {sideName(match.sides[0])}
                      <span className="tsi-muted"> v </span>
                      {sideName(match.sides[1])}
                    </span>
                    <span className="mt-0.5 flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="tsi-muted">{match.name}</span>
                      <span className="font-semibold">{match.status}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {liveRound.matches.length === 0 && (
                <li className="px-4 py-3 text-[15px] tsi-muted">No pairings set yet.</li>
              )}
            </ul>
          </Panel>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold">Net leaderboard</h2>
          <Link
            href={`/leaderboard?t=${tournament.id}`}
            className="text-[13px] font-semibold tsi-muted"
          >
            All {leaderboard.length}
          </Link>
        </div>
        <Panel className="!p-0">
          <ol>
            {leaderboard.slice(0, 5).map((row, i) => (
              <li
                key={row.playerId}
                className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "tsi-rule-t" : ""}`}
              >
                <span className="tsi-num w-4 text-right text-[15px] tsi-muted">{i + 1}</span>
                <Link
                  href={`/players/${row.username}`}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <TeamDot color={row.teamColor} />
                  <span className="truncate text-[15px] font-semibold">{row.displayName}</span>
                </Link>
                <span className="tsi-num w-12 text-right text-[17px] font-bold">
                  {toPar(row.netToPar, row.holesPlayed)}
                </span>
                <span className="tsi-num w-10 text-right text-[13px] tsi-muted">
                  {row.holesPlayed}h
                </span>
              </li>
            ))}
            {leaderboard.length === 0 && (
              <li className="px-4 py-3 text-[15px] tsi-muted">No scores posted yet.</li>
            )}
          </ol>
        </Panel>
      </section>
    </div>
  );
}
