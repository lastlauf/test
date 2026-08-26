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

export async function createSession(
  playerId: string,
): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db().run(
    "INSERT INTO sessions (token, player_id, expires_at) VALUES (?, ?, ?)",
    [token, playerId, expires.toISOString()],
  );
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
  if (token) await db().run("DELETE FROM sessions WHERE token = ?", [token]);
  jar.delete(SESSION_COOKIE);
}

export async function currentPlayer(): Promise<Player | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return db().one<Player>(
    `SELECT p.${PLAYER_COLUMNS.split(", ").join(", p.")}
     FROM sessions s JOIN players p ON p.id = s.player_id
     WHERE s.token = ? AND s.expires_at > now()`,
    [token],
  );
}

export class AuthError extends Error {}

export async function requirePlayer(): Promise<Player> {
  const player = await currentPlayer();
  if (!player) throw new AuthError("Sign in to continue");
  return player;
}

export async function findPlayerByUsername(
  username: string,
): Promise<(Player & { password_hash: string | null }) | null> {
  return db().one<Player & { password_hash: string | null }>(
    `SELECT ${PLAYER_COLUMNS}, password_hash FROM players WHERE lower(username) = lower(?)`,
    [username],
  );
}

export async function getPlayer(id: string): Promise<Player | null> {
  return db().one<Player>(`SELECT ${PLAYER_COLUMNS} FROM players WHERE id = ?`, [id]);
}

export async function listPlayers(): Promise<Player[]> {
  return db().all<Player>(
    `SELECT ${PLAYER_COLUMNS} FROM players ORDER BY lower(display_name)`,
  );
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

export async function createPlayer(input: CreatePlayerInput): Promise<Player> {
  const id = uid("plr");
  const counted = await db().one<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM players",
  );
  const isFirst = (counted?.n ?? 0) === 0;
  await db().run(
    `INSERT INTO players
       (id, username, display_name, email, password_hash, google_sub, ghin,
        handicap_index, member_since, is_admin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ],
  );
  return (await getPlayer(id))!;
}

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function appOrigin(): string {
  return (
    process.env.APP_ORIGIN ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  );
}

export function validateUsername(username: string): string | null {
  if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
    return "Username must be 3-24 characters: letters, numbers, dot, dash or underscore.";
  }
  return null;
}
