import { fail, json } from "@/lib/api";
import { buildBoard, getTournament } from "@/lib/tsi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) return fail("Tournament not found.", 404);
  return json(await buildBoard(tournament));
}
