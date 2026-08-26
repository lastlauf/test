import { currentPlayer } from "@/lib/auth";
import { db, uid } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { getHoles, getMatchView, getRound } from "@/lib/tsi";

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
  const match = getMatchView(id);
  if (!match) return fail("Match not found.", 404);
  const round = getRound(match.roundId)!;
  const holeNumbers = new Set(getHoles(round.course_id).map((h) => h.number));

  const body = await readJson<{ scores: ScoreInput[] }>(request);
  const scores = Array.isArray(body.scores) ? body.scores : [];
  if (!scores.length) return fail("No scores supplied.");

  const validSubjects = new Set<string>();
  for (const side of match.sides) {
    validSubjects.add(`side:${side.id}`);
    for (const p of side.players) validSubjects.add(`player:${p.id}`);
  }

  const upsert = db().prepare(
    `INSERT INTO scores (id, match_id, hole, subject_type, subject_id, gross, putts, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
     ON CONFLICT (match_id, hole, subject_type, subject_id)
     DO UPDATE SET gross = excluded.gross, putts = excluded.putts,
                   updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
  );
  const clear = db().prepare(
    "DELETE FROM scores WHERE match_id = ? AND hole = ? AND subject_type = ? AND subject_id = ?",
  );

  const rejected: string[] = [];
  const apply = db().transaction((rows: ScoreInput[]) => {
    for (const row of rows) {
      if (!holeNumbers.has(Number(row.hole))) {
        rejected.push(`hole ${row.hole}`);
        continue;
      }
      if (!validSubjects.has(`${row.subjectType}:${row.subjectId}`)) {
        rejected.push(`${row.subjectType} ${row.subjectId}`);
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
        clear.run(match.id, Number(row.hole), row.subjectType, row.subjectId);
        continue;
      }
      upsert.run(
        uid("scr"),
        match.id,
        Number(row.hole),
        row.subjectType,
        row.subjectId,
        gross,
        putts,
        player.id,
      );
    }
  });
  apply(scores);

  const updated = getMatchView(match.id)!;
  if (updated.state.decided && updated.status !== "complete") {
    db().prepare("UPDATE matches SET status = 'complete' WHERE id = ?").run(match.id);
  } else if (updated.state.thru > 0 && updated.status === "upcoming") {
    db().prepare("UPDATE matches SET status = 'live' WHERE id = ?").run(match.id);
  }
  if (round.status === "upcoming" && updated.state.thru > 0) {
    db().prepare("UPDATE rounds SET status = 'live' WHERE id = ?").run(round.id);
  }

  return json({ match: getMatchView(match.id), rejected });
}
