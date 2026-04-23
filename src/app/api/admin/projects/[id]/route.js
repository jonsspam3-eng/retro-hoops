import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { deleteProject, updateProject } from "@/lib/cms";

export async function PUT(request, { params }) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    const project = await updateProject(params.id, payload);
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to update project." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request, { params }) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  try {
    await deleteProject(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete project." },
      { status: 400 },
    );
  }
}
