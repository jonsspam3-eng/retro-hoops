import { getAppSession } from "@/lib/auth";
import { completeGoogleOAuth } from "@/lib/gmail";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getAppSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/gmail-import?oauth_error=Missing+Google+OAuth+callback+parameters", process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
    );
  }

  try {
    const parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      userId?: string;
    };

    if (!parsedState.userId || parsedState.userId !== session.user.id) {
      return NextResponse.redirect(
        new URL("/gmail-import?oauth_error=Invalid+OAuth+state", process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
      );
    }

    await completeGoogleOAuth(code, session.user.id);
    return NextResponse.redirect(new URL("/gmail-import?connected=1", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google OAuth callback failed";
    return NextResponse.redirect(
      new URL(`/gmail-import?oauth_error=${encodeURIComponent(message)}`, process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
    );
  }
}
