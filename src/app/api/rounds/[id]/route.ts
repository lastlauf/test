import { json, fail } from "@/lib/api";
import { getCourse, loadRound, roundLeaderboard } from "@/lib/tsi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bundle = await loadRound(id);
  if (!bundle) return fail("Round not found.", 404);
  return json({
    round: bundle.round,
    course: await getCourse(bundle.round.course_id),
    tee: bundle.tee,
    holes: bundle.holes,
    matches: bundle.matches,
    leaderboard: await roundLeaderboard(id),
    fetchedAt: new Date().toISOString(),
  });
}
