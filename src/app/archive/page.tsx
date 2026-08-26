import Link from "next/link";
import { PageTitle, Panel } from "@/components/ui";
import { FORMAT_GUIDES } from "@/lib/game-guides";
import { listArchivedGames, listOpenGames } from "@/lib/games";

export const dynamic = "force-dynamic";

/**
 * The original Turkey Slice app, kept whole. The record book is the front door
 * now, but everything you need on the course still works exactly as it did.
 */
export default async function ArchivePage() {
  const [open, archived] = await Promise.all([listOpenGames(), listArchivedGames()]);

  const tools = [
    {
      href: "/leaderboard",
      title: "Live board",
      blurb: "Gross and net leaderboards that update as scores land.",
    },
    {
      href: "/games",
      title: "Games",
      blurb:
        open.length > 0
          ? `${open.length} game${open.length === 1 ? "" : "s"} open — start one or join in.`
          : "Start a fourball, foursomes or singles from your phone.",
    },
    {
      href: "/bets",
      title: "Bets",
      blurb: "Match, Nassau, skins and head-to-head, with the payout ledger.",
    },
    {
      href: "/players",
      title: "Players",
      blurb: "The roster, with handicaps and lifetime records.",
    },
  ];

  return (
    <>
      <PageTitle kicker="The original app" title="Archive" />

      <div className="tsi-stack">
        <section>
          <h2 className="mb-2">Everything for a round in play</h2>
          <p className="mb-5 text-[15px] tsi-muted">
            The record book covers what has already happened. This is the half that
            runs while you are out there, and none of it has changed.
          </p>
          <div className="tsi-stack-tight">
            {tools.map((tool) => (
              <Link key={tool.href} href={tool.href} className="block">
                <Panel className="flex items-center justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block text-[17px] font-bold">{tool.title}</span>
                    <span className="mt-0.5 block text-[14px] tsi-muted">
                      {tool.blurb}
                    </span>
                  </span>
                  <span aria-hidden className="shrink-0 text-[18px] font-bold">
                    →
                  </span>
                </Panel>
              </Link>
            ))}
          </div>
        </section>

        {archived.length > 0 && (
          <section>
            <h2 className="mb-2">Archived games</h2>
            <p className="mb-5 text-[15px] tsi-muted">
              One-off games that were played and put away.
            </p>
            <Panel className="!p-0">
              <ul>
                {archived.map((game, i) => {
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
