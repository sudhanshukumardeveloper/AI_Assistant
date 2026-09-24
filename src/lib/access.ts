import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const SESSION_COOKIE = "aegis_session";
const SESSION_DAYS = 7;

export function randomToken() { return crypto.randomBytes(32).toString("hex"); }
export function hashToken(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }
export function appUrl() { return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""); }

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.accessSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) {
    if (session) await db.accessSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  await db.accessSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  return session.user;
}

export async function createSession(userId: string) {
  const token = randomToken();
  await db.accessSession.create({ data: { tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400 });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await db.accessSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookieStore.delete(SESSION_COOKIE);
}
