import Link from "next/link";
import { Empty, PageTitle, Panel } from "@/components/ui";
import { FORMAT_GUIDES } from "@/lib/game-guides";
import { listArchivedGames } from "@/lib/games";
import { listTournaments, teamStandings } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const [rows, games] = await Promise.all([listTournaments(), listArchivedGames()]);
  const tournaments = await Promise.all(
    rows.map(async (tournament) => ({
      tournament,
      teams: await teamStandings(tournament.id),
    })),
  );

  return (
    <>
      <PageTitle kicker="History" title="Archive" />

      <div className="tsi-stack">
        {games.length > 0 && (
          <section>
            <h2 className="mb-4">Archived games</h2>
            <Panel className="!p-0">
              <ul>
                {games.map((game, i) => {
                  const guide = FORMAT_GUIDES.find((g) => g.format === game.round.format);
                  return (
                    <li key={game.round.id} className={i > 0 ? "tsi-rule-t" : ""}>
                      <Link href={`/score/${game.matchId}`} className="block px-5 py-4">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-[16px] font-semibold">
                            {guide?.name ?? game.round.name}
                          </span>
                          <span className="text-[13px] tsi-muted">
                            {game.round.played_on ?? ""}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-[14px] tsi-muted">
                          {game.players.map((p) => p.displayName).join(" · ") || "No players"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </section>
        )}

        <section>
          {games.length > 0 && <h2 className="mb-4">Tournaments</h2>}
          <div className="tsi-stack-tight">
            {tournaments.map(({ tournament, teams }) => (
              <Link key={tournament.id} href={`/archive/${tournament.year}`} className="block">
                <Panel className="flex items-center justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block text-[22px] font-extrabold">{tournament.year}</span>
                    <span className="mt-0.5 block truncate text-[14px] tsi-muted">
                      {tournament.champion
                        ? `Champion: ${tournament.champion}`
                        : tournament.status === "active"
                          ? "In progress"
                          : "Not yet played"}
                    </span>
                  </span>
                  <span className="tsi-num shrink-0 text-right text-[16px] font-bold">
                    {teams.map((t) => t.points).join(" – ")}
                  </span>
                </Panel>
              </Link>
            ))}
            {tournaments.length === 0 && games.length === 0 && (
              <Empty>Nothing archived yet. Finished games land here.</Empty>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
