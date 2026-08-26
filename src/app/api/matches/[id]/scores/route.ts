import { currentPlayer } from "@/lib/auth";
import { db, tx, uid } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { writableSubject } from "@/lib/scoring";
import { getMatchView, loadRound } from "@/lib/tsi";

interface ScoreInput {
  hole: number;
  subjectType: "player" | "side";
  subjectId: string;
  gross: number | null;
  putts?: number | null;
}

/**
 * Batch upsert. Phones queue holes locally when signal drops on the course and
 * flush the whole queue in one request when they come back.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await currentPlayer();
  if (!player) return fail("Sign in to post scores.", 401);
  const { id } = await params;
  const match = await getMatchView(id);
  if (!match) return fail("Match not found.", 404);
  const bundle = (await loadRound(match.roundId))!;
  const holeNumbers = new Set(bundle.holes.map((h) => h.number));

  const body = await readJson<{ scores: ScoreInput[] }>(request);
  const scores = Array.isArray(body.scores) ? body.scores : [];
  if (!scores.length) return fail("No scores supplied.");

  // A player posts their own score and nobody else's. In foursomes the pair
  // shares one ball, so either partner may post the side's score.
  const mine = writableSubject(match.sides, match.format, player.id);
  if (!mine) {
    return fail("You can only post scores for a match you are playing in.", 403);
  }
  const validSubjects = new Set<string>([`${mine.type}:${mine.id}`]);

  const rejected: string[] = [];
  await tx(async (q) => {
    for (const row of scores) {
      if (!holeNumbers.has(Number(row.hole))) {
        rejected.push(`hole ${row.hole}`);
        continue;
      }
      if (!validSubjects.has(`${row.subjectType}:${row.subjectId}`)) {
        rejected.push(`${row.subjectType} ${row.subjectId} — not your score`);
        continue;
      }
      const gross = row.gross == null || row.gross === 0 ? null : Number(row.gross);
      if (gross != null && (!Number.isInteger(gross) || gross < 1 || gross > 20)) {
        rejected.push(`hole ${row.hole} score ${row.gross}`);
        continue;
      }
      const putts =
        row.putts == null || row.putts === 0 ? null : Math.max(0, Number(row.putts));
      if (gross == null && putts == null) {
        await q.run(
          "DELETE FROM scores WHERE match_id = ? AND hole = ? AND subject_type = ? AND subject_id = ?",
          [match.id, Number(row.hole), row.subjectType, row.subjectId],
        );
        continue;
      }
      await q.run(
        `INSERT INTO scores (id, match_id, hole, subject_type, subject_id, gross, putts, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, now(), ?)
         ON CONFLICT (match_id, hole, subject_type, subject_id)
         DO UPDATE SET gross = excluded.gross, putts = excluded.putts,
                       updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
        [
          uid("scr"),
          match.id,
          Number(row.hole),
          row.subjectType,
          row.subjectId,
          gross,
          putts,
          player.id,
        ],
      );
    }
  });

  const updated = (await getMatchView(match.id))!;
  if (updated.state.decided && updated.status !== "complete") {
    await db().run("UPDATE matches SET status = 'complete' WHERE id = ?", [match.id]);
  } else if (updated.state.thru > 0 && updated.status === "upcoming") {
    await db().run("UPDATE matches SET status = 'live' WHERE id = ?", [match.id]);
  }
  if (bundle.round.status === "upcoming" && updated.state.thru > 0) {
    await db().run("UPDATE rounds SET status = 'live' WHERE id = ?", [bundle.round.id]);
  }

  return json({ match: await getMatchView(match.id), rejected });
}
