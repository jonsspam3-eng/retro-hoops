import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { getSiteConfig, updateHomepageSection } from "@/lib/cms";

export async function GET() {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  const config = await getSiteConfig();
  return NextResponse.json({
    siteName: config.siteName,
    siteTitle: config.siteTitle,
    logoPath: config.logoPath,
    locationLabel: config.locationLabel,
    homepageLinks: config.homepageLinks,
    navigationLinks: config.navigationLinks,
    archiveBottomLinks: config.archiveBottomLinks,
    pageHeaders: config.pageHeaders,
    projectDetailBackLabel: config.projectDetailBackLabel,
    photographyCategories: config.photographyCategories,
  });
}

export async function PUT(request) {
  const denied = await requireAdminRequest();
  if (denied) {
    return denied;
  }

  try {
    const payload = await request.json();
    const updated = await updateHomepageSection(payload);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to update homepage content." },
      { status: 400 },
    );
  }
}
