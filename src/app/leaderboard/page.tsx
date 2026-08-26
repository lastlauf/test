import Leaderboard from "@/components/Leaderboard";
import { Empty, PageTitle } from "@/components/ui";
import { activeTournament, buildBoard, getTournament } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const tournament = (t ? await getTournament(t) : null) ?? (await activeTournament());
  if (!tournament) {
    return (
      <>
        <PageTitle kicker="Leaderboard" title="No tournament" />
        <Empty>Nothing has been played yet.</Empty>
      </>
    );
  }

  return (
    <>
      <PageTitle kicker="Leaderboard" title={tournament.name} />
      <Leaderboard initial={await buildBoard(tournament)} />
    </>
  );
}
