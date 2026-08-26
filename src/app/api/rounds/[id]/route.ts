import { json, fail } from "@/lib/api";
import {
  getCourse,
  getHoles,
  getRound,
  getTee,
  listMatchViews,
  roundLeaderboard,
} from "@/lib/tsi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const round = getRound(id);
  if (!round) return fail("Round not found.", 404);
  return json({
    round,
    course: getCourse(round.course_id),
    tee: getTee(round.tee_id),
    holes: getHoles(round.course_id),
    matches: listMatchViews(round.id),
    leaderboard: roundLeaderboard(round.id),
    fetchedAt: new Date().toISOString(),
  });
}
