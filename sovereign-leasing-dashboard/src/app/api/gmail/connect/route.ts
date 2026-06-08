import { getAppSession } from "@/lib/auth";
import { normalizeGmailError, resolveGmailProvider } from "@/lib/gmail";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getAppSession();
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admin users can connect Gmail." }, { status: 403 });
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
    return NextResponse.redirect(url);
  } catch (error) {
    const normalized = normalizeGmailError(error);
    return NextResponse.redirect(
      new URL(`/gmail-import?oauth_error=${encodeURIComponent(normalized.message)}`, appUrl),
    );
  }
}
