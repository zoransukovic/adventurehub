import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
const SECRET = process.env.JWT_SECRET as string;
const COOKIE = "ah_token";
const TTL = 60 * 60 * 24 * 14;
export type Payload = { userId: string; role: "TOURIST"|"GUIDE"|"ADMIN"; email: string };
export const sign = (p: Payload) => jwt.sign(p, SECRET, { expiresIn: TTL });
export const verify = (t: string): Payload|null => { try { return jwt.verify(t, SECRET) as Payload } catch { return null } };
export async function setToken(token: string) {
  const c = await cookies();
  c.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV==="production", sameSite: "lax", path: "/", maxAge: TTL });
}
export async function clearToken() { (await cookies()).delete(COOKIE); }
export async function getSession(): Promise<Payload|null> {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  return t ? verify(t) : null;
}
