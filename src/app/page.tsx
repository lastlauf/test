import Link from "next/link";
import LiveTournament from "@/components/LiveTournament";
import { PageTitle, Panel } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import { FORMAT_GUIDES } from "@/lib/game-guides";
import { listOpenGames } from "@/lib/games";
import { activeTournament, buildBoard } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [player, tournament, games] = await Promise.all([
    currentPlayer(),
    activeTournament(),
    listOpenGames(),
  ]);

  if (tournament) {
    const initial = await buildBoard(tournament);
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
        />
        <LiveTournament initial={initial} myPlayerId={player?.id ?? null} />
      </>
    );
  }

  return (
    <>
      <PageTitle kicker="Turkey Slice Invitational" title="Nothing on the tee yet" />

      <div className="tsi-stack">
        {games.length > 0 ? (
          <section>
            <h2 className="mb-4">Games in play</h2>
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
                            {game.players.length} of {game.capacity}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-[14px] tsi-muted">
                          {game.players.map((p) => p.displayName).join(" · ") ||
                            "Waiting for players"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </section>
        ) : (
          <Panel className="!py-10 text-center">
            <p className="text-[16px] font-semibold">No games have been started.</p>
            <p className="mx-auto mt-2 max-w-[22rem] text-[15px] tsi-muted">
              Anyone with an account can start one — pick a format, and the rest of the
              group joins from their own phones.
            </p>
          </Panel>
        )}

        <Link href="/games" className="tsi-btn tsi-btn-primary w-full">
          {games.length > 0 ? "Start or join a game" : "Start a game"}
        </Link>

        {!player && (
          <p className="text-center text-[15px] tsi-muted">
            <Link href="/login" className="underline">
              Sign in
            </Link>{" "}
            to play. You can watch without an account.
          </p>
        )}
      </div>
    </>
  );
}
