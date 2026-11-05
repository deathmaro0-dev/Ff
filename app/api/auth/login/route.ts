import { NextRequest, NextResponse } from "next/server";
import { makeSession, sessionCookieName } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = body?.password;

  if (!process.env.STUDIO_PASSWORD || !process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Не настроены STUDIO_PASSWORD и SESSION_SECRET в переменных Netlify." }, { status: 503 });
  }

  if (typeof password !== "string" || password.length === 0 || password !== process.env.STUDIO_PASSWORD) {
    return NextResponse.json({ error: "Неверный пароль." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, makeSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
  return response;
}
