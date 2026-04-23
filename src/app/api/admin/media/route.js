import { NextResponse } from "next/server";
import { createMedia, listMedia } from "@/lib/cms";
import { requireAdminRequest } from "@/lib/auth";

export async function GET(request) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }
  const { searchParams } = new URL(request.url);
  const collection = searchParams.get("collection") || undefined;
  const media = await listMedia({ collection });
  return NextResponse.json({ ok: true, media });
}

export async function POST(request) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    const media = await createMedia(payload);
    return NextResponse.json({ ok: true, media });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to create media asset." },
      { status: 400 },
    );
  }
}
