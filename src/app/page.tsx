import Link from "next/link";
import LiveTournament from "@/components/LiveTournament";
import { Empty, LinkButton, PageTitle } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import type { BoardPayload } from "@/lib/payloads";
import {
  activeTournament,
  listMatchViews,
  listRounds,
  teamStandings,
  tournamentLeaderboard,
} from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const player = await currentPlayer();
  const tournament = activeTournament();

  if (!tournament) {
    return (
      <>
        <PageTitle kicker="Turkey Slice Invitational" title="No tournament yet" />
        <Empty>
          <span className="block">Nothing has been set up.</span>
          <span className="mt-3 block">
            <Link href="/admin" className="underline">
              Open the admin setup
            </Link>{" "}
            to add a course, this year&apos;s field and the pairings.
          </span>
        </Empty>
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
      <PageTitle
        kicker={
          tournament.status === "active"
            ? "Playing now"
            : tournament.status === "complete"
              ? "Final"
              : "Up next"
        }
        title={tournament.name}
        action={
          !player ? (
            <LinkButton href="/login" variant="primary" className="!min-h-[44px] text-sm">
              Sign in
            </LinkButton>
          ) : null
        }
      />
      <LiveTournament initial={initial} myPlayerId={player?.id ?? null} />
    </>
  );
}
