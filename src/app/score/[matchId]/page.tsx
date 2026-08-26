import { notFound } from "next/navigation";
import Link from "next/link";
import ScoreEntry from "@/components/ScoreEntry";
import { PageTitle } from "@/components/ui";
import { currentPlayer } from "@/lib/auth";
import type { MatchPayload } from "@/lib/payloads";
import { getHoles, getMatchView, getRound } from "@/lib/tsi";

export const dynamic = "force-dynamic";

export default async function ScoreMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const match = getMatchView(matchId);
  if (!match) notFound();
  const round = getRound(match.roundId)!;
  const player = await currentPlayer();

  const payload: MatchPayload = {
    match,
    round,
    holes: getHoles(round.course_id),
    fetchedAt: new Date().toISOString(),
  };

  return (
    <>
      <PageTitle
        kicker={round.name}
        title={match.name}
        action={
          <Link href="/score" className="text-sm font-bold underline">
            All matches
          </Link>
        }
      />
      <ScoreEntry initial={payload} canEdit={Boolean(player)} />
    </>
  );
}
