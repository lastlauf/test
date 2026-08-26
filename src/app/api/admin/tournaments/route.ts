import { currentPlayer } from "@/lib/auth";
import { tx, uid } from "@/lib/db";
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
  await tx(async (q) => {
    await q.run(
      `INSERT INTO tournaments (id, year, name, course_id, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        year,
        body.name?.trim() || `${year} Turkey Slice Invitational`,
        body.courseId ?? null,
        body.startDate ?? null,
        body.endDate ?? null,
        body.status ?? "upcoming",
      ],
    );
    for (const t of body.teams ?? []) {
      await q.run("INSERT INTO teams (id, tournament_id, name, color) VALUES (?, ?, ?, ?)", [
        uid("tm"),
        id,
        t.name,
        t.color ?? "#1d4ed8",
      ]);
    }
  });

  return json({ tournaments: await listTournaments(), id }, 201);
}

export async function GET() {
  return json({ tournaments: await listTournaments() });
}
