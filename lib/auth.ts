import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "nova_studio_session";
function signature(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function makeSession() {
  const value = `${Date.now()}`;
  return `${value}.${signature(value)}`;
}
export async function isAuthenticated() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return false;
  const [value, supplied] = token.split(".");
  if (!value || !supplied || Date.now() - Number(value) > 1000 * 60 * 60 * 24 * 14) return false;
  const expected = signature(value);
  const a = Buffer.from(supplied, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export const sessionCookieName = COOKIE;
