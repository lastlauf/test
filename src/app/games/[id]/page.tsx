import Link from "next/link";
import { notFound } from "next/navigation";
import Bets from "@/components/Bets";
import GameActions from "@/components/GameActions";
import { PageTitle, Panel } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import { FORMAT_GUIDES } from "@/lib/game-guides";
import { getGame } from "@/lib/games";
import type { LedgerPayload } from "@/lib/payloads";
import { sideName } from "@/lib/scoring";
import { listMatchViews, listWagers, roundLedger } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [player, game] = await Promise.all([currentPlayer(), getGame(id)]);
  if (!game) notFound();

  const guide = FORMAT_GUIDES.find((g) => g.format === game.round.format);
  const [matches, wagers, ledger] = await Promise.all([
    listMatchViews(game.round.id),
    listWagers(game.round.id),
    roundLedger(game.round.id),
  ]);
  const match = matches[0];
  const playerMap = new Map<string, string>();
  for (const side of match?.sides ?? []) {
    for (const p of side.players) playerMap.set(p.id, p.displayName);
  }

  const initialLedger: LedgerPayload = { ledger, fetchedAt: new Date().toISOString() };
  const isCreator = Boolean(player && game.createdBy === player.id);
  const inGame = Boolean(player && game.players.some((p) => p.id === player.id));

  return (
    <>
      <PageTitle
        title={`${guide?.name ?? game.round.name}${
          game.round.status === "archived" ? " (archived)" : ""
        }`}
        action={
          <Link href="/games" className="text-[14px] font-semibold tsi-muted">
            All games
          </Link>
        }
      />

      <div className="tsi-stack">
        <Panel>
          <p className="text-[15px]">
            {match ? (
              <>
                {sideName(match.sides[0])} <span className="tsi-muted">v</span>{" "}
                {sideName(match.sides[1])}
              </>
            ) : (
              "Waiting for players"
            )}
          </p>
          <p className="mt-1.5 text-[14px] tsi-muted">
            {match?.state.status ?? "Not started"} · started by{" "}
            {game.creatorName ?? "someone"}
          </p>
          {match && (
            <Link href={`/score/${match.id}`} className="tsi-btn tsi-btn-primary mt-5 w-full">
              {inGame ? "Open your scorecard" : "View the scorecard"}
            </Link>
          )}
        </Panel>

        <section>
          <h2 className="mb-2">Bets on this game</h2>
          <p className="mb-5 text-[15px] tsi-muted">
            Anyone in the game can add one. Every bet settles off the same scores, and
            the ledger below nets them into who owes whom.
          </p>
          {match ? (
            <Bets
              roundId={game.round.id}
              roundName={guide?.name ?? game.round.name}
              canEdit={Boolean(player) && game.round.status !== "archived"}
              matches={[
                {
                  id: match.id,
                  name: match.name,
                  label: `${sideName(match.sides[0])} v ${sideName(match.sides[1])}`,
                },
              ]}
              players={[...playerMap.entries()].map(([pid, name]) => ({ id: pid, name }))}
              wagers={wagers}
              initialLedger={initialLedger}
            />
          ) : (
            <Panel>
              <p className="text-[15px] tsi-muted">Bets open once the game has players.</p>
            </Panel>
          )}
        </section>

        {isCreator && game.round.status !== "archived" && (
          <GameActions roundId={game.round.id} />
        )}
      </div>
    </>
  );
}
