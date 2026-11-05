import { NextResponse } from "next/server";
import { sessionCookieName } from "../../../../lib/auth";

export async function POST(req: Request) {
  const response = NextResponse.redirect(new URL("/login", req.url), 303);
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}
