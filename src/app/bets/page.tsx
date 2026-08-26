import Link from "next/link";
import Bets from "@/components/Bets";
import { Empty, PageTitle } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import type { LedgerPayload } from "@/lib/payloads";
import { sideName } from "@/lib/scoring";
import {
  activeTournament,
  getRound,
  listRounds,
  listWagers,
  loadRound,
  roundLedger,
} from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function BetsPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const { r } = await searchParams;
  const [player, tournament] = await Promise.all([currentPlayer(), activeTournament()]);
  if (!tournament) {
    return (
      <>
        <PageTitle kicker="Side action" title="Bets" />
        <Empty>No tournament to bet on yet.</Empty>
      </>
    );
  }

  const rounds = await listRounds(tournament.id);
  const round =
    (r ? await getRound(r) : null) ??
    rounds.find((item) => item.status === "live") ??
    rounds[0];
  if (!round) {
    return (
      <>
        <PageTitle kicker="Side action" title="Bets" />
        <Empty>No rounds scheduled yet.</Empty>
      </>
    );
  }

  const bundle = await loadRound(round.id);
  const matches = bundle?.matches ?? [];
  const playerMap = new Map<string, string>();
  for (const match of matches) {
    for (const side of match.sides) {
      for (const p of side.players) playerMap.set(p.id, p.displayName);
    }
  }

  const [ledger, wagers] = await Promise.all([
    roundLedger(round.id),
    listWagers(round.id),
  ]);
  const initialLedger: LedgerPayload = {
    ledger,
    fetchedAt: new Date().toISOString(),
  };

  return (
    <>
      <PageTitle kicker="Side action" title="Bets & ledger" />
      {rounds.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {rounds.map((item) => (
            <Link
              key={item.id}
              href={`/bets?r=${item.id}`}
              className="tsi-tap flex items-center rounded-xl border-2 px-3 text-sm font-black"
              style={{
                borderColor: item.id === round.id ? "var(--color-ink)" : "var(--tsi-line)",
                background: item.id === round.id ? "var(--color-ink)" : "transparent",
                color: item.id === round.id ? "#fff" : "var(--tsi-text)",
              }}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
      <Bets
        roundId={round.id}
        roundName={round.name}
        canEdit={Boolean(player)}
        matches={matches.map((match) => ({
          id: match.id,
          name: match.name,
          label: `${match.name}: ${sideName(match.sides[0])} v ${sideName(match.sides[1])}`,
        }))}
        players={[...playerMap.entries()].map(([id, name]) => ({ id, name }))}
        wagers={wagers}
        initialLedger={initialLedger}
      />
    </>
  );
}
