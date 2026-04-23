import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { updateContactSection } from "@/lib/cms";

export async function PUT(request) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    await updateContactSection(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to update contact content." },
      { status: 400 },
    );
  }
}
