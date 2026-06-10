import { getAppSession } from "@/lib/auth";
import { normalizeGmailError, resolveGmailProvider } from "@/lib/gmail";
import { writeAuditLog } from "@/lib/audit";
import { gmailSettingsRoles, hasRole } from "@/lib/security";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getAppSession();
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  if (!hasRole(session.user.role, gmailSettingsRoles)) {
    return NextResponse.json({ error: "Only Admin/Super Admin users can connect Gmail." }, { status: 403 });
  }

  try {
    const provider = await resolveGmailProvider(session.user.id);
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        ts: Date.now(),
      }),
      "utf8",
    ).toString("base64url");

    const url = await provider.connectUrl(state);
    await writeAuditLog({
      actorId: session.user.id,
      action: "GMAIL_CONNECT_INITIATED",
      entityType: "GMAIL_CONNECTION",
      entityId: session.user.id,
    });
    return NextResponse.redirect(url);
  } catch (error) {
    const normalized = normalizeGmailError(error);
    await writeAuditLog({
      actorId: session.user.id,
      action: "GMAIL_CONNECT_FAILED",
      entityType: "GMAIL_CONNECTION",
      entityId: session.user.id,
      metadata: { error: normalized.message },
    });
    return NextResponse.redirect(
      new URL(`/gmail-import?oauth_error=${encodeURIComponent(normalized.message)}`, appUrl),
    );
  }
}
