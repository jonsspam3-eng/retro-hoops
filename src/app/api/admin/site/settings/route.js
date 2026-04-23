import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { updateSiteSettings } from "@/lib/cms";

export async function PUT(request) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    await updateSiteSettings(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to update settings section." },
      { status: 400 },
    );
  }
}
