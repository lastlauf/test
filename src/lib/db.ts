import { Pool, type PoolClient } from "pg";

/**
 * Postgres access. Query strings keep `?` placeholders — they are rewritten to
 * $1..$n here — so the SQL in the rest of the app stays readable.
 */

let instance: Pool | null = null;

/**
 * Connection string sources, in order. DATABASE_URL is what this app
 * documents, but the hosted-Postgres integrations on most platforms inject
 * their own names — Vercel's Supabase and Neon integrations set POSTGRES_URL —
 * so a database attached through a marketplace integration works without
 * anyone having to copy a second copy of the same credential.
 */
const CONNECTION_VARS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
  "DATABASE_POSTGRES_URL",
  "SUPABASE_DB_URL",
];

function connectionString(): string {
  for (const name of CONNECTION_VARS) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  // A variable that exists but holds an empty string is a different bug from
  // one that was never set, and the two are easy to confuse in a hosting
  // dashboard. Report them separately. Names only — never values.
  const empty = CONNECTION_VARS.filter(
    (name) => name in process.env && !process.env[name]?.trim(),
  );
  if (empty.length) {
    throw new Error(
      `${empty.join(", ")} ${empty.length === 1 ? "is" : "are"} set but empty. ` +
        "The variable exists with a blank value — re-enter the connection string " +
        "in the platform's environment variables and redeploy.",
    );
  }
  const present = Object.keys(process.env)
    .filter((key) => /postgres|database|supabase/i.test(key))
    .sort();
  throw new Error(
    `No Postgres connection string found. Looked for ${CONNECTION_VARS.join(", ")}. ` +
      `Database-related variables visible to this process: ${present.length ? present.join(", ") : "none"}. ` +
      "In development, copy .env.example to .env.local. On a deployment, set the " +
      "variable for the Production environment and redeploy — a build started " +
      "before the variable existed will not pick it up.",
  );
}

export function pool(): Pool {
  if (instance) return instance;
  const url = connectionString();
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  instance = new Pool({
    connectionString: url,
    // Serverless functions get a small pool each; the pooler multiplexes them.
    max: Number(process.env.PGPOOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: local ? undefined : { rejectUnauthorized: false },
  });
  instance.on("error", (error) => {
    console.error("postgres pool error", error);
  });
  return instance;
}

function toPositional(text: string): string {
  let index = 0;
  return text.replace(/\?/g, () => `$${++index}`);
}

export interface Queryable {
  all<T>(text: string, params?: unknown[]): Promise<T[]>;
  one<T>(text: string, params?: unknown[]): Promise<T | null>;
  run(text: string, params?: unknown[]): Promise<number>;
}

function queryable(runner: Pool | PoolClient): Queryable {
  return {
    async all<T>(text: string, params: unknown[] = []): Promise<T[]> {
      const result = await runner.query(toPositional(text), params);
      return result.rows as T[];
    },
    async one<T>(text: string, params: unknown[] = []): Promise<T | null> {
      const result = await runner.query(toPositional(text), params);
      return (result.rows[0] as T) ?? null;
    },
    async run(text: string, params: unknown[] = []): Promise<number> {
      const result = await runner.query(toPositional(text), params);
      return result.rowCount ?? 0;
    },
  };
}

export function db(): Queryable {
  return queryable(pool());
}

/** Runs `fn` inside a transaction, rolling back if it throws. */
export async function tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(queryable(client));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export function uid(prefix = ""): string {
  const raw = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return prefix ? `${prefix}_${raw}` : raw;
}
