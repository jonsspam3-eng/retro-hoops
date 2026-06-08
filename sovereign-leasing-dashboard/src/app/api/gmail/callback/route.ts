import { getAppSession } from "@/lib/auth";
import { completeGoogleOAuth, normalizeGmailError } from "@/lib/gmail";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getAppSession();
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    const normalized = normalizeGmailError(oauthError);
    return NextResponse.redirect(
      new URL(`/gmail-import?oauth_error=${encodeURIComponent(normalized.message)}`, appUrl),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/gmail-import?oauth_error=Missing+Google+OAuth+callback+parameters", appUrl),
    );
  }

  try {
    const parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      userId?: string;
      ts?: number;
    };

    if (!parsedState.userId || parsedState.userId !== session.user.id) {
      return NextResponse.redirect(
        new URL("/gmail-import?oauth_error=Invalid+OAuth+state", appUrl),
      );
    }

    if (!parsedState.ts || Date.now() - parsedState.ts > 10 * 60_000) {
      return NextResponse.redirect(
        new URL("/gmail-import?oauth_error=OAuth+state+expired.+Please+retry+connect.", appUrl),
      );
    }

    await completeGoogleOAuth(code, session.user.id);
    return NextResponse.redirect(new URL("/gmail-import?connected=1", appUrl));
  } catch (error) {
    const normalized = normalizeGmailError(error);
    return NextResponse.redirect(
      new URL(`/gmail-import?oauth_error=${encodeURIComponent(normalized.message)}`, appUrl),
    );
  }
}
