import { timingSafeEqual } from "node:crypto";
import { pool } from "@/lib/db";
import { buildSeedSql } from "@/lib/demo-seed";
import { fail, json } from "@/lib/api";

/**
 * Resets a demo deployment to the seeded tournament.
 *
 * Only available when TSI_SEED_TOKEN is set, and only to a caller who presents
 * it — deployments that don't set it have no seeding endpoint at all.
 */
export async function POST(request: Request) {
  const expected = process.env.TSI_SEED_TOKEN;
  if (!expected) return fail("Seeding is not enabled on this deployment.", 404);

  const supplied = request.headers.get("x-seed-token") ?? "";
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return fail("Bad seed token.", 403);
  }

  const { sql, liveTournamentId, password } = buildSeedSql();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    return fail(error instanceof Error ? error.message : "Seeding failed.", 500);
  } finally {
    client.release();
  }

  const counts = await pool().query(
    `SELECT (SELECT COUNT(*)::int FROM players) AS players,
            (SELECT COUNT(*)::int FROM tournaments) AS tournaments,
            (SELECT COUNT(*)::int FROM matches) AS matches,
            (SELECT COUNT(*)::int FROM scores) AS scores`,
  );
  return json({ seeded: counts.rows[0], liveTournamentId, demoPassword: password });
}
