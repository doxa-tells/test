// web/catalog/lib/auth.ts
import "server-only";
import { cookies } from "next/headers";
import { randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { createSession, destroySession, getSessionUser, type AuthUser } from "./db";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomUUID();
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, pass_hash: string): Promise<boolean> {
  const [salt, storedHex] = pass_hash.split(":");
  const hash = scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(storedHex, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function setSession(user: AuthUser) {
  const id = randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30d
  await createSession(id, user.id, expires.toISOString());
  const c = cookies();
  c.set("session_id", id, { httpOnly: true, sameSite: "lax", path: "/", expires });
}

export async function clearSession() {
  const c = cookies();
  const sid = c.get("session_id")?.value;
  if (sid) await destroySession(sid);
  c.set("session_id", "", { httpOnly: true, sameSite: "lax", path: "/", expires: new Date(0) });
}

export async function currentUser(): Promise<AuthUser | undefined> {
  const sid = cookies().get("session_id")?.value;
  if (!sid) return undefined;
  return getSessionUser(sid);
}
