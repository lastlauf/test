import { fail, json, readJson } from "@/lib/api";
import { currentPlayer } from "@/lib/auth";
import {
  deleteCourse,
  getCourseDetail,
  readCourseInput,
  updateCourse,
} from "@/lib/cup";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getCourseDetail(id);
  if (!detail) return fail("No such course.", 404);
  return json(detail);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await currentPlayer();
  if (!player) return fail("Sign in to edit a course.", 401);
  const { id } = await params;
  if (!(await getCourseDetail(id))) return fail("No such course.", 404);

  const body = await readJson<Record<string, unknown>>(request);
  const input = readCourseInput(body);
  if (typeof input === "string") return fail(input);
  await updateCourse(id, input);
  return json({ ok: true, id });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const player = await currentPlayer();
  if (!player) return fail("Sign in to delete a course.", 401);
  const { id } = await params;
  const result = await deleteCourse(id);
  if (!result.ok) return fail(result.reason, 409);
  return json({ ok: true });
}
