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
  listRounds,
  listTeams,
  listTees,
  listTournaments,
  loadRounds,
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
        <PageTitle title="Not your job" />
        <Empty>
          Only a TSI admin can set up tournaments. The first account created on this
          deployment is the admin.
        </Empty>
      </>
    );
  }

  const { t } = await searchParams;
  const selected = (t ? await getTournament(t) : null) ?? (await activeTournament());
  const rounds = selected ? await listRounds(selected.id) : [];
  const bundles = await loadRounds(rounds.map((r) => r.id));
  const matchesByRound: Record<string, MatchView[]> = {};
  for (const round of rounds) {
    matchesByRound[round.id] = bundles.get(round.id)?.matches ?? [];
  }

  const courseRows = await listCourses();
  const [players, courses, tournaments, teams, entries] = await Promise.all([
    listPlayers(),
    Promise.all(
      courseRows.map(async (course) => ({ ...course, tees: await listTees(course.id) })),
    ),
    listTournaments(),
    selected ? listTeams(selected.id) : Promise.resolve([]),
    selected ? listEntries(selected.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageTitle title="Tournament setup" />
      <Admin
        players={players}
        courses={courses}
        tournaments={tournaments}
        selected={selected}
        teams={teams}
        entries={entries}
        rounds={rounds}
        matchesByRound={matchesByRound}
      />
    </>
  );
}
