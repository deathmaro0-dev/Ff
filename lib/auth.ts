import "server-only"; import { createHmac, timingSafeEqual } from "node:crypto"; import { cookies } from "next/headers";
const COOKIE = "nova_studio_session";
function signature(value: string) { const secret = process.env.SESSION_SECRET; if (!secret) throw new Error("SESSION_SECRET is not configured"); return createHmac("sha256", secret).update(value).digest("hex"); }
export function makeSession() { const value = ${Date.now()}; return ${value}.${signature(value)}; }
export function verifySessionToken(token: string | undefined | null) { if (!token || !process.env.SESSION_SECRET) return false;
const [value, supplied] = token.split("."); if (!value  !supplied  !/^\d+$/.test(value)) return false;
const issuedAt = Number(value); if ( !Number.isFinite(issuedAt)  issuedAt > Date.now() + 60_000  Date.now() - issuedAt > 1000 * 60 * 60 * 24 * 14 ) return false;
try { const expected = signature(value); const a = Buffer.from(supplied, "hex"); const b = Buffer.from(expected, "hex"); return a.length === b.length && timingSafeEqual(a, b); } catch { return false; } }
export async function isAuthenticated() { const store = await cookies(); return verifySessionToken(store.get(COOKIE)?.value); }
export const sessionCookieName = COOKIE;
