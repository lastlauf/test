import Link from "next/link";
import { notFound } from "next/navigation";
import { Scorecard } from "@/components/Scorecard";
import { PageTitle, Panel, Stat, TeamPill } from "@/components/ui";
import { FORMAT_LABEL, sideName } from "@/lib/scoring";
import {
  getTournamentByYear,
  listRounds,
  loadRounds,
  teamStandings,
  tournamentLeaderboard,
} from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function ArchiveYearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const tournament = await getTournamentByYear(Number(year));
  if (!tournament) notFound();

  const roundRows = await listRounds(tournament.id);
  const [bundles, teams, board] = await Promise.all([
    loadRounds(roundRows.map((r) => r.id)),
    teamStandings(tournament.id),
    tournamentLeaderboard(tournament.id),
  ]);
  const lowNet = [...board].sort((a, b) => a.netToPar - b.netToPar)[0];
  const lowGross = [...board].sort((a, b) => a.toPar - b.toPar)[0];

  return (
    <>
      <PageTitle
        kicker={tournament.status === "complete" ? "Final" : tournament.status}
        title={tournament.name}
        action={
          <Link href="/archive" className="text-[14px] font-semibold">
            All years
          </Link>
        }
      />

      <div className="space-y-4">
        <Panel className="flex flex-wrap items-center gap-3">
          {teams.map((team) => (
            <span key={team.teamId} className="flex items-center gap-2">
              <TeamPill name={team.name} color={team.color} />
              <span className="tsi-num text-2xl font-bold">{team.points}</span>
            </span>
          ))}
          {tournament.champion && (
            <span className="ml-auto text-sm font-bold">🏆 {tournament.champion}</span>
          )}
        </Panel>

        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Low net"
            value={lowNet ? lowNet.displayName.split(" ")[0] : "—"}
            sub={
              lowNet ? `${lowNet.net} (${lowNet.netToPar >= 0 ? "+" : ""}${lowNet.netToPar})` : ""
            }
          />
          <Stat
            label="Low gross"
            value={lowGross ? lowGross.displayName.split(" ")[0] : "—"}
            sub={
              lowGross
                ? `${lowGross.gross} (${lowGross.toPar >= 0 ? "+" : ""}${lowGross.toPar})`
                : ""
            }
          />
        </div>

        {roundRows.map((round) => {
          const bundle = bundles.get(round.id);
          const matches = bundle?.matches ?? [];
          return (
            <Panel key={round.id} className="space-y-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold">{round.name}</h2>
                <span className="text-[13px] tsi-muted">
                  {FORMAT_LABEL[round.format]}
                </span>
              </div>
              {matches.map((match) => (
                <div key={match.id} className="space-y-2">
                  <p className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-bold">
                      {sideName(match.sides[0])} <span className="tsi-muted">v</span>{" "}
                      {sideName(match.sides[1])}
                    </span>
                    <span className="shrink-0 font-bold">{match.state.status}</span>
                  </p>
                  <Scorecard match={match} holes={bundle?.holes ?? []} />
                </div>
              ))}
              {matches.length === 0 && (
                <p className="font-semibold tsi-muted">No matches recorded.</p>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
