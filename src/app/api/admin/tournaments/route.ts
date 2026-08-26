import { currentPlayer } from "@/lib/auth";
import { db, uid } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { listTournaments } from "@/lib/tsi";

interface Body {
  year: number;
  name?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  teams?: { name: string; color?: string }[];
}

export async function POST(request: Request) {
  const player = await currentPlayer();
  if (!player?.is_admin) return fail("Only a TSI admin can create a tournament.", 403);
  const body = await readJson<Body>(request);
  const year = Number(body.year);
  if (!Number.isInteger(year)) return fail("Enter the tournament year.");

  const id = uid("trn");
  db().transaction(() => {
    db()
      .prepare(
        `INSERT INTO tournaments (id, year, name, course_id, start_date, end_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        year,
        body.name?.trim() || `${year} Turkey Slice Invitational`,
        body.courseId ?? null,
        body.startDate ?? null,
        body.endDate ?? null,
        body.status ?? "upcoming",
      );
    const team = db().prepare(
      "INSERT INTO teams (id, tournament_id, name, color) VALUES (?, ?, ?, ?)",
    );
    for (const t of body.teams ?? []) {
      team.run(uid("tm"), id, t.name, t.color ?? "#1d4ed8");
    }
  })();

  return json({ tournaments: listTournaments(), id }, 201);
}

export async function GET() {
  return json({ tournaments: listTournaments() });
}
