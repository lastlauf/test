import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db, uid } from "./db";

export const SESSION_COOKIE = "tsi_session";
const SESSION_DAYS = 60;

export interface Player {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  ghin: string | null;
  handicap_index: number;
  photo: string | null;
  member_since: number | null;
  bio: string | null;
  is_admin: number;
}

const PLAYER_COLUMNS =
  "id, username, display_name, email, ghin, handicap_index, photo, member_since, bio, is_admin";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

export function createSession(playerId: string): { token: string; expires: Date } {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db()
    .prepare("INSERT INTO sessions (token, player_id, expires_at) VALUES (?, ?, ?)")
    .run(token, playerId, expires.toISOString());
  return { token, expires };
}

export async function setSessionCookie(token: string, expires: Date) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  jar.delete(SESSION_COOKIE);
}

export async function currentPlayer(): Promise<Player | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT p.${PLAYER_COLUMNS.split(", ").join(", p.")}
       FROM sessions s JOIN players p ON p.id = s.player_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`,
    )
    .get(token) as Player | undefined;
  return row ?? null;
}

export async function requirePlayer(): Promise<Player> {
  const player = await currentPlayer();
  if (!player) throw new AuthError("Sign in to continue");
  return player;
}

export class AuthError extends Error {}

export function findPlayerByUsername(username: string): (Player & { password_hash: string | null }) | null {
  return (
    (db()
      .prepare(`SELECT ${PLAYER_COLUMNS}, password_hash FROM players WHERE username = ?`)
      .get(username) as (Player & { password_hash: string | null }) | undefined) ?? null
  );
}

export function getPlayer(id: string): Player | null {
  return (
    (db().prepare(`SELECT ${PLAYER_COLUMNS} FROM players WHERE id = ?`).get(id) as
      | Player
      | undefined) ?? null
  );
}

export function listPlayers(): Player[] {
  return db()
    .prepare(`SELECT ${PLAYER_COLUMNS} FROM players ORDER BY display_name COLLATE NOCASE`)
    .all() as Player[];
}

export interface CreatePlayerInput {
  username: string;
  displayName: string;
  password?: string;
  email?: string | null;
  googleSub?: string | null;
  handicapIndex?: number;
  ghin?: string | null;
  memberSince?: number | null;
}

export function createPlayer(input: CreatePlayerInput): Player {
  const id = uid("plr");
  const isFirst =
    (db().prepare("SELECT COUNT(*) AS n FROM players").get() as { n: number }).n === 0;
  db()
    .prepare(
      `INSERT INTO players
         (id, username, display_name, email, password_hash, google_sub, ghin,
          handicap_index, member_since, is_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.username,
      input.displayName,
      input.email ?? null,
      input.password ? hashPassword(input.password) : null,
      input.googleSub ?? null,
      input.ghin ?? null,
      input.handicapIndex ?? 18,
      input.memberSince ?? new Date().getFullYear(),
      isFirst ? 1 : 0,
    );
  return getPlayer(id)!;
}

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function appOrigin(): string {
  return process.env.APP_ORIGIN ?? "http://localhost:3000";
}

export function validateUsername(username: string): string | null {
  if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
    return "Username must be 3-24 characters: letters, numbers, dot, dash or underscore.";
  }
  return null;
}
