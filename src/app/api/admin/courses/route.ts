import { currentPlayer } from "@/lib/auth";
import { tx, uid } from "@/lib/db";
import { fail, json, readJson } from "@/lib/api";
import { listCourses } from "@/lib/tsi";

interface Body {
  name: string;
  city?: string;
  state?: string;
  tees?: { name: string; rating: number; slope: number; yardage?: number }[];
  holes?: { number: number; par: number; strokeIndex: number; yardage?: number }[];
}

export async function GET() {
  return json({ courses: await listCourses() });
}

export async function POST(request: Request) {
  const player = await currentPlayer();
  if (!player?.is_admin) return fail("Only a TSI admin can add courses.", 403);
  const body = await readJson<Body>(request);
  if (!body.name?.trim()) return fail("Course needs a name.");
  const holes = body.holes ?? [];
  if (holes.length !== 18) return fail("Enter all 18 holes (par and stroke index).");
  const indexes = new Set(holes.map((h) => h.strokeIndex));
  if (indexes.size !== 18) return fail("Stroke indexes must be 1-18 with no repeats.");

  const courseId = uid("crs");
  await tx(async (q) => {
    await q.run("INSERT INTO courses (id, name, city, state) VALUES (?, ?, ?, ?)", [
      courseId,
      body.name.trim(),
      body.city ?? null,
      body.state ?? null,
    ]);
    for (const h of holes) {
      await q.run(
        "INSERT INTO holes (id, course_id, number, par, stroke_index, yardage) VALUES (?, ?, ?, ?, ?, ?)",
        [uid("hol"), courseId, h.number, h.par, h.strokeIndex, h.yardage ?? null],
      );
    }
    for (const t of body.tees ?? []) {
      await q.run(
        "INSERT INTO tees (id, course_id, name, rating, slope, yardage) VALUES (?, ?, ?, ?, ?, ?)",
        [uid("tee"), courseId, t.name, t.rating, t.slope, t.yardage ?? null],
      );
    }
  });

  return json({ courses: await listCourses() }, 201);
}
