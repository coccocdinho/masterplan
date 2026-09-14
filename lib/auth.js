import "server-only";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const COOKIE_NAME = "mp_session";
const EXPIRES_IN = "8h";
const MAX_AGE_SECONDS = 8 * 60 * 60;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing JWT_SECRET — set it in .env.local");
  return s;
}

export async function hashPw(plain) {
  return bcrypt.hash(plain, 10);
}

export async function checkPw(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function signSession(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    secret(),
    { expiresIn: EXPIRES_IN }
  );
}

export function verifySession(token) {
  try {
    return jwt.verify(token, secret());
  } catch {
    return null;
  }
}

/** Server Components / Route Handlers: read + verify the session cookie. Returns {id,username,role} or null. */
export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function sessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}
