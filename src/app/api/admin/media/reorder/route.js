import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { listMedia, reorderMedia } from "@/lib/cms";

export async function PATCH(request) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    const ids = Array.isArray(payload?.ids) ? payload.ids : [];
    if (!ids.length) {
      return NextResponse.json({ ok: false, error: "No media ids provided." }, { status: 400 });
    }

    await reorderMedia(ids);
    const media = await listMedia();
    return NextResponse.json({ ok: true, media });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to reorder media." },
      { status: 400 },
    );
  }
}
