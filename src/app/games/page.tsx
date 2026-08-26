import Games from "@/components/Games";
import { PageTitle } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import { listOpenGames } from "@/lib/games";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const [player, games] = await Promise.all([currentPlayer(), listOpenGames()]);
  return (
    <>
      <PageTitle title="Games" />
      <Games games={games} myPlayerId={player?.id ?? null} />
    </>
  );
}
