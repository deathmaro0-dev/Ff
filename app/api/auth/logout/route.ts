import { NextResponse } from "next/server";
import { sessionCookieName } from "../../../../lib/auth";
export async function POST() {
  const response = NextResponse.redirect(new URL("/login", process.env.APP_URL || "http://localhost:3000"));
  response.cookies.set(sessionCookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
