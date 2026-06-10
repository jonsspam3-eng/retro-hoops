import { generateAiReplyDraft } from "@/lib/ai";
import { getAppSession } from "@/lib/auth";
import { hasRole } from "@/lib/security";
import { getLeadById, listListings } from "@/lib/repository";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session?.user?.id || !hasRole(session.user.role, ["SUPER_ADMIN", "ADMIN", "MANAGER", "AGENT", "MARKETING_ASSISTANT", "ASSISTANT"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { leadId?: string };
  if (!body.leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  const lead = await getLeadById(body.leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const listing = lead.listingId ? (await listListings()).find((item) => item.id === lead.listingId) : null;
  const draft = await generateAiReplyDraft({ lead, listing });

  return NextResponse.json({ draft });
}
