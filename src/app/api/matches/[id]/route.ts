import { json, fail } from "@/lib/api";
import { getMatchView, loadRound } from "@/lib/tsi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const match = await getMatchView(id);
  if (!match) return fail("Match not found.", 404);
  const bundle = (await loadRound(match.roundId))!;
  return json({
    match,
    round: bundle.round,
    holes: bundle.holes,
    fetchedAt: new Date().toISOString(),
  });
}
