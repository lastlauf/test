import Link from "next/link";
import { Empty, PageTitle, Panel } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import { FORMAT_LABEL, sideName } from "@/lib/scoring";
import { activeTournament, listRounds, loadRounds } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function ScoreIndexPage() {
  const [player, tournament] = await Promise.all([currentPlayer(), activeTournament()]);
  if (!tournament) {
    return (
      <>
        <PageTitle kicker="Scoring" title="Nothing to score yet" />
        <Empty>
          Set up a tournament in{" "}
          <Link href="/admin" className="underline">
            admin
          </Link>{" "}
          first.
        </Empty>
      </>
    );
  }

  const roundRows = await listRounds(tournament.id);
  const bundles = await loadRounds(roundRows.map((r) => r.id));
  const rounds = roundRows.map((round) => ({
    round,
    matches: bundles.get(round.id)?.matches ?? [],
  }));

  return (
    <>
      <PageTitle kicker={tournament.name} title="Pick your match" />
      <div className="space-y-4">
        {rounds.map(({ round, matches }) => (
          <Panel key={round.id}>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">{round.name}</h2>
              <span className="text-[13px] tsi-muted">
                {round.status}
              </span>
            </div>
            <p className="mb-3 text-sm font-bold tsi-muted">{FORMAT_LABEL[round.format]}</p>
            <ul className="space-y-2">
              {matches.map((match) => {
                const mine =
                  player &&
                  match.sides.some((s) => s.players.some((p) => p.id === player.id));
                return (
                  <li key={match.id}>
                    <Link
                      href={`/score/${match.id}`}
                      className="block rounded-xl tsi-rule px-3 py-3"
                      style={{
                        borderColor: mine ? "var(--color-turkey)" : "var(--tsi-line)",
                        borderWidth: mine ? 3 : 2,
                      }}
                    >
                      <span className="block truncate font-bold">
                        {sideName(match.sides[0])}
                        <span className="tsi-muted"> v </span>
                        {sideName(match.sides[1])}
                      </span>
                      <span className="mt-0.5 flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold tsi-muted">
                          {match.name}
                          {mine ? " · your match" : ""}
                        </span>
                        <span className="text-sm font-bold">{match.state.status}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {matches.length === 0 && (
                <li className="tsi-muted font-semibold">No pairings yet.</li>
              )}
            </ul>
          </Panel>
        ))}
        {rounds.length === 0 && <Empty>No rounds have been added for this year.</Empty>}
      </div>
    </>
  );
}
