import { getAppSession } from "@/lib/auth";
import { importSelectedGmailMessages } from "@/lib/gmail";
import { NextResponse } from "next/server";

function assertEditor(role?: string) {
  if (!role) {
    throw new Error("You must be signed in to import Gmail messages.");
  }
  if (role === "READ_ONLY") {
    throw new Error("Read-only users cannot import Gmail messages.");
  }
}

export async function GET(request: Request) {
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const session = await getAppSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  try {
    assertEditor(session.user.role);
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
