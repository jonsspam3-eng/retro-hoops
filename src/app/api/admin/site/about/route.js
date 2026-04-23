import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { getSiteConfig, updateAboutSection } from "@/lib/cms";

export async function GET() {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  const config = await getSiteConfig();
  return NextResponse.json({
    ok: true,
    about: config.about,
    pageHeaders: config.pageHeaders,
  });
}

export async function PUT(request) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    const updated = await updateAboutSection({
      aboutParagraphs: payload.aboutParagraphs || [],
      aboutSections: payload.aboutSections || [],
      pageHeaders: payload.pageHeaders || undefined,
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to update about section." },
      { status: 400 },
    );
  }
}
