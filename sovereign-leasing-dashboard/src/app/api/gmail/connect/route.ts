import { getAppSession } from "@/lib/auth";
import { buildGoogleOAuthUrl } from "@/lib/gmail";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getAppSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admin users can connect Gmail." }, { status: 403 });
  }

  try {
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        ts: Date.now(),
      }),
      "utf8",
    ).toString("base64url");

    const url = buildGoogleOAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start Gmail OAuth.";
    return NextResponse.redirect(
      new URL(`/gmail-import?oauth_error=${encodeURIComponent(message)}`, process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
    );
  }
}
