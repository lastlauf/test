/**
 * Seeds the demo Turkey Slice Invitational into DATABASE_URL.
 *
 *   npm run seed          apply the seed
 *   npm run seed -- --sql print the SQL instead of running it
 */

import { pool } from "../src/lib/db.ts";
import { buildSeedSql } from "../src/lib/demo-seed.ts";

const { sql, liveTournamentId, password } = buildSeedSql();

if (process.argv.includes("--sql")) {
  console.log(sql);
} else {
  const client = pool();
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  const counts = await client.query(
    `SELECT (SELECT COUNT(*) FROM players) AS players,
            (SELECT COUNT(*) FROM tournaments) AS tournaments,
            (SELECT COUNT(*) FROM matches) AS matches,
            (SELECT COUNT(*) FROM scores) AS scores`,
  );
  console.log("Seeded Turkey Slice Invitational:", counts.rows[0]);
  console.log(`Sign in as any username above with password: ${password}`);
  console.log(`Live tournament: ${liveTournamentId}`);
  await client.end();
}
