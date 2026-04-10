import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getAdminCookieName,
  isAdminSessionValid,
  isAdminPasswordRequired,
  isLocalAdminEnabled,
  readContentStore,
  writeContentStore,
} from "@/lib/content-store";

async function isAuthorizedRequest() {
  if (!isAdminPasswordRequired()) {
    return true;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(getAdminCookieName())?.value;
  return isAdminSessionValid(sessionCookie);
}

export async function GET() {
  if (!isLocalAdminEnabled()) {
    return NextResponse.json({ ok: false, error: "Admin is disabled." }, { status: 403 });
  }
  if (!(await isAuthorizedRequest())) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const content = await readContentStore();
  return NextResponse.json(content);
}

async function saveContent(request) {
  if (!isLocalAdminEnabled()) {
    return NextResponse.json({ ok: false, error: "Admin is disabled." }, { status: 403 });
  }
  if (!(await isAuthorizedRequest())) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const saved = await writeContentStore(payload);
    return NextResponse.json({ ok: true, content: saved });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to save content." },
      { status: 400 },
    );
  }
}

export async function POST(request) {
  return saveContent(request);
}

export async function PUT(request) {
  return saveContent(request);
}
