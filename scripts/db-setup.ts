/** Applies db/schema.sql to the database in DATABASE_URL. Safe to re-run. */
import fs from "node:fs";
import path from "node:path";
import { pool } from "../src/lib/db.ts";

const sql = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
await pool().query(sql);
console.log("Schema applied to", process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ":***@"));
await pool().end();
