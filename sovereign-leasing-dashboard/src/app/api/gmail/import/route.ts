import { getAppSession } from "@/lib/auth";
import { importSelectedGmailMessages } from "@/lib/gmail";
import { gmailImportRoles, hasRole } from "@/lib/security";
import { NextResponse } from "next/server";

function assertGmailImportRole(role?: string) {
  if (!hasRole(role, gmailImportRoles)) {
    throw new Error("Your role does not have Gmail import permissions.");
  }
}

export async function GET(request: Request) {
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const session = await getAppSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  try {
    assertGmailImportRole(session.user.role);
    const url = new URL(request.url);
    const messageId = url.searchParams.get("messageId");
    if (!messageId) {
      return NextResponse.redirect(
        new URL("/gmail-import?oauth_error=Message+ID+is+required+for+import", appUrl),
      );
    }

    const [outcome] = await importSelectedGmailMessages({
      userId: session.user.id,
      actorId: session.user.id,
      messageIds: [messageId],
    });

    if (!outcome) {
      return NextResponse.redirect(
        new URL("/gmail-import?oauth_error=No+import+outcome+returned", appUrl),
      );
    }

    return NextResponse.redirect(
      new URL(
        `/leads/${outcome.leadId}?imported=1${outcome.duplicate ? "&duplicate=1" : ""}`,
        appUrl,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail import failed.";
    return NextResponse.redirect(
      new URL(`/gmail-import?oauth_error=${encodeURIComponent(message)}`, appUrl),
    );
  }
}
