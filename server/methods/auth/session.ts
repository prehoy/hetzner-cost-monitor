import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import dayjs from "dayjs";
import db from "../../db/client";
import { sessions } from "../../db/schema";
import { tEnv } from "../../env";

// Session cookie holds just the opaque token (house style stores JSON; a bare
// token is enough here). Returns the session row or null.
export async function getSession(c: Context) {
  const token = getCookie(c, tEnv.AUTH_COOKIE_KEY);
  if (!token) return null;
  const s = await db.query.sessions.findFirst({ where: eq(sessions.token, token) });
  if (!s || s.expiresAt.getTime() < Date.now()) return null;
  return s;
}

// Guard for protected routes: returns the session, or null after writing a 401.
export async function requireAuth(c: Context) {
  const s = await getSession(c);
  if (!s) {
    c.status(401);
    return null;
  }
  return s;
}

export async function createSession(c: Context, userId: number) {
  const token = Bun.randomUUIDv7();
  const expiresAt = dayjs().add(30, "days").toDate();
  await db.insert(sessions).values({ token, userId, expiresAt });
  setCookie(c, tEnv.AUTH_COOKIE_KEY, token, {
    path: "/",
    expires: expiresAt,
    httpOnly: true,
    secure: tEnv.COOKIE_SECURE,
    sameSite: "lax",
  });
  return { token, expiresAt };
}
