import { db } from "@/lib/db";
import { json } from "@/lib/api";

/** Liveness probe that also proves the database connection works. */
export async function GET() {
  const started = Date.now();
  try {
    const row = await db().one<{ players: number }>(
      "SELECT COUNT(*)::int AS players FROM players",
    );
    return json({
      ok: true,
      players: row?.players ?? 0,
      databaseMs: Date.now() - started,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Database unreachable",
      },
      503,
    );
  }
}
