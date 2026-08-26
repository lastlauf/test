import { fail, json } from "@/lib/api";
import { getRound, roundLedger } from "@/lib/tsi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await getRound(id))) return fail("Round not found.", 404);
  return json({ ledger: await roundLedger(id), fetchedAt: new Date().toISOString() });
}
