import { NextResponse } from "next/server";
import {
  isLocalAdminEnabled,
  readContentStore,
  writeContentStore,
} from "@/lib/content-store";

export async function GET() {
  if (!isLocalAdminEnabled()) {
    return NextResponse.json({ ok: false, error: "Admin is disabled." }, { status: 403 });
  }

  const content = await readContentStore();
  return NextResponse.json(content);
}

async function saveContent(request) {
  if (!isLocalAdminEnabled()) {
    return NextResponse.json({ ok: false, error: "Admin is disabled." }, { status: 403 });
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
