import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { listProjects, reorderProjects } from "@/lib/cms";

export async function PATCH(request) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    const ids = Array.isArray(payload?.ids) ? payload.ids : [];
    if (!ids.length) {
      return NextResponse.json({ ok: false, error: "No project ids provided." }, { status: 400 });
    }

    await reorderProjects(ids);
    const projects = await listProjects({ includeUnpublished: true });
    return NextResponse.json({ ok: true, projects });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to reorder projects." },
      { status: 400 },
    );
  }
}
