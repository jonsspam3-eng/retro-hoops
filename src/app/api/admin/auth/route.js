import { NextResponse } from "next/server";
import {
  getAdminCookieName,
  getAdminSessionCookieValue,
  isAdminPasswordRequired,
  isLocalAdminEnabled,
  verifyAdminPassword,
} from "@/lib/content-store";

export async function POST(request) {
  if (!isLocalAdminEnabled()) {
    return NextResponse.json({ ok: false, error: "Admin is disabled." }, { status: 403 });
  }

  if (!isAdminPasswordRequired()) {
    return NextResponse.json({ ok: true, passwordRequired: false });
  }

  try {
    const payload = await request.json();
    if (!verifyAdminPassword(payload?.password)) {
      return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, passwordRequired: true });
    response.cookies.set(getAdminCookieName(), getAdminSessionCookieValue(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAdminCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
