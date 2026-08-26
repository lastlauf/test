import { fail, json, readJson } from "@/lib/api";
import { currentPlayer } from "@/lib/auth";
import { createCourse, listCourseRows, readCourseInput } from "@/lib/cup";

export async function GET() {
  return json({ courses: await listCourseRows() });
}

export async function POST(request: Request) {
  const player = await currentPlayer();
  if (!player) return fail("Sign in to add a course.", 401);
  const body = await readJson<Record<string, unknown>>(request);
  const input = readCourseInput(body);
  if (typeof input === "string") return fail(input);
  const id = await createCourse(input);
  return json({ ok: true, id }, 201);
}
