import { notFound } from "next/navigation";
import Link from "next/link";
import ScoreEntry from "@/components/ScoreEntry";
import { PageTitle } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import type { MatchPayload } from "@/lib/payloads";
import { getMatchView, loadRound } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function ScoreMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const match = await getMatchView(matchId);
  if (!match) notFound();
  const bundle = (await loadRound(match.roundId))!;
  const player = await currentPlayer();

  const payload: MatchPayload = {
    match,
    round: bundle.round,
    holes: bundle.holes,
    fetchedAt: new Date().toISOString(),
  };

  return (
    <>
      <PageTitle
        kicker={bundle.round.name}
        title={match.name}
        action={
          <Link href="/score" className="text-[14px] font-semibold">
            All matches
          </Link>
        }
      />
      <ScoreEntry initial={payload} canEdit={Boolean(player)} />
    </>
  );
}
