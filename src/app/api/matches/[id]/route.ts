import { json, fail } from "@/lib/api";
import { getHoles, getMatchView, getRound } from "@/lib/tsi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const match = getMatchView(id);
  if (!match) return fail("Match not found.", 404);
  const round = getRound(match.roundId)!;
  return json({
    match,
    round,
    holes: getHoles(round.course_id),
    fetchedAt: new Date().toISOString(),
  });
}
