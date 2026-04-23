import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { createProject, listProjects } from "@/lib/cms";

export async function GET() {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }
  const projects = await listProjects({ includeUnpublished: true });
  return NextResponse.json({ ok: true, projects });
}

export async function POST(request) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }
  try {
    const payload = await request.json();
    const project = await createProject(payload);
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unable to create project" },
      { status: 400 },
    );
  }
}
