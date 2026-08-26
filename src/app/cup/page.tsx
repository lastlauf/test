import Link from "next/link";
import { SectionNav } from "@/components/SectionNav";
import { Empty, PageTitle, Panel } from "@/components/ui";
import { FORMAT_GUIDES } from "@/lib/game-guides";
import { listArchivedGames } from "@/lib/games";
import { listTournaments, teamStandings } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function CupPage() {
  const [rows, games] = await Promise.all([listTournaments(), listArchivedGames()]);
  const tournaments = await Promise.all(
    rows.map(async (tournament) => ({
      tournament,
      teams: await teamStandings(tournament.id),
    })),
  );

  return (
    <>
      <PageTitle kicker="Record book" title="Tournaments" />
      <SectionNav />

      <div className="tsi-stack">
        <section>
          <h2 className="mb-2">Every cup played</h2>
          <p className="mb-5 text-[15px] tsi-muted">
            Each year, the two team totals it finished on, and who took it. Open one
            for the session-by-session card.
          </p>
          <div className="tsi-stack-tight">
            {tournaments.map(({ tournament, teams }) => (
              <Link key={tournament.id} href={`/cup/${tournament.year}`} className="block">
                <Panel className="flex items-center justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block text-[22px] font-extrabold">
                      {tournament.year}
                    </span>
                    <span className="mt-0.5 block truncate text-[14px] tsi-muted">
                      {tournament.champion
                        ? `Won by ${tournament.champion}`
                        : tournament.status === "active"
                          ? "In progress"
                          : "Not yet played"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tsi-num block text-[18px] font-bold">
                      {teams.length ? teams.map((t) => t.points).join(" – ") : "—"}
                    </span>
                    <span className="block text-[12px] font-semibold tsi-muted">
                      {teams.map((t) => t.name).join(" · ")}
                    </span>
                  </span>
                </Panel>
              </Link>
            ))}
            {tournaments.length === 0 && (
              <Empty>No tournaments yet. They appear here once one is set up.</Empty>
            )}
          </div>
        </section>

        {games.length > 0 && (
          <section>
            <h2 className="mb-2">Archived games</h2>
            <p className="mb-5 text-[15px] tsi-muted">
              One-off games started from the app and put away afterwards.
            </p>
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
                          {game.players.map((p) => p.displayName).join(" · ") ||
                            "No players"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </section>
        )}
      </div>
    </>
  );
}
