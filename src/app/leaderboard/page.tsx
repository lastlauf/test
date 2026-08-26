import Leaderboard from "@/components/Leaderboard";
import { Empty, PageTitle } from "@/components/ui";
import type { BoardPayload } from "@/lib/payloads";
import {
  activeTournament,
  getTournament,
  listMatchViews,
  listRounds,
  teamStandings,
  tournamentLeaderboard,
} from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const tournament = (t ? getTournament(t) : null) ?? activeTournament();
  if (!tournament) {
    return (
      <>
        <PageTitle kicker="Leaderboard" title="No tournament" />
        <Empty>Nothing has been played yet.</Empty>
      </>
    );
  }

  const initial: BoardPayload = {
    tournament,
    rounds: listRounds(tournament.id).map((round) => ({
      round,
      matches: listMatchViews(round.id).map((m) => ({
        id: m.id,
        name: m.name,
        status: m.state.status,
        decided: m.state.decided,
        thru: m.state.thru,
        sides: m.sides,
        winner: m.state.winner,
      })),
    })),
    teams: teamStandings(tournament.id),
    leaderboard: tournamentLeaderboard(tournament.id),
    fetchedAt: new Date().toISOString(),
  };

  return (
    <>
      <PageTitle kicker="Leaderboard" title={tournament.name} />
      <Leaderboard initial={initial} />
    </>
  );
}
