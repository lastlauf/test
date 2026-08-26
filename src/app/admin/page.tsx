import { redirect } from "next/navigation";
import Admin from "@/components/Admin";
import { Empty, PageTitle } from "@/components/ui";
import { currentPlayer, listPlayers } from "@/lib/auth";
import type { MatchView } from "@/lib/tsi";
import {
  activeTournament,
  getTournament,
  listCourses,
  listEntries,
  listMatchViews,
  listRounds,
  listTeams,
  listTees,
  listTournaments,
} from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const player = await currentPlayer();
  if (!player) redirect("/login");
  if (player.is_admin !== 1) {
    return (
      <>
        <PageTitle kicker="Admin" title="Not your job" />
        <Empty>
          Only a TSI admin can set up tournaments. The first account created on this
          deployment is the admin.
        </Empty>
      </>
    );
  }

  const { t } = await searchParams;
  const selected = (t ? getTournament(t) : null) ?? activeTournament();
  const rounds = selected ? listRounds(selected.id) : [];
  const matchesByRound: Record<string, MatchView[]> = {};
  for (const round of rounds) matchesByRound[round.id] = listMatchViews(round.id);

  return (
    <>
      <PageTitle kicker="Admin" title="Tournament setup" />
      <Admin
        players={listPlayers()}
        courses={listCourses().map((course) => ({ ...course, tees: listTees(course.id) }))}
        tournaments={listTournaments()}
        selected={selected}
        teams={selected ? listTeams(selected.id) : []}
        entries={selected ? listEntries(selected.id) : []}
        rounds={rounds}
        matchesByRound={matchesByRound}
      />
    </>
  );
}
