import { fail, json } from "@/lib/api";
import {
  getTournament,
  listMatchViews,
  listRounds,
  teamStandings,
  tournamentLeaderboard,
} from "@/lib/tsi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tournament = getTournament(id);
  if (!tournament) return fail("Tournament not found.", 404);
  const rounds = listRounds(tournament.id);
  return json({
    tournament,
    rounds: rounds.map((round) => ({
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
  });
}
