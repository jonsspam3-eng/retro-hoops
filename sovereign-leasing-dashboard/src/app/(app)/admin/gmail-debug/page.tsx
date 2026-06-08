import {
  disconnectGmailAction,
  runGmailDebugActionForm,
} from "@/lib/actions";
import { requireAppUser } from "@/lib/auth";
import { getGmailDebugSnapshot, getGmailMessageDetail } from "@/lib/gmail";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatIso(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

export default async function GmailDebugPage({
  searchParams,
}: {
  searchParams?: Promise<{
    debug_action?: string;
    debug_ok?: string;
    debug_message?: string;
    debug_error?: string;
    messageId?: string;
  }>;
}) {
  const user = await requireAppUser();
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const snapshot = await getGmailDebugSnapshot(user.id);
  const selectedMessageId = params.messageId ? String(params.messageId) : undefined;
  const messageDetail = selectedMessageId
    ? await getGmailMessageDetail({ userId: user.id, messageId: selectedMessageId })
    : null;

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Admin Gmail Debug</h2>
        <p className="mt-1 text-sm text-[#6d6f78]">
          Internal diagnostics for Sovereign Realty NYC Gmail integration.
        </p>
      </div>

      {params.debug_message ? (
        <div
          className={`rounded-xl border p-3 text-sm ${
            params.debug_ok === "1"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <p className="font-semibold">
            {params.debug_action ? `${params.debug_action.replaceAll("_", " ")}:` : "Debug result:"}
          </p>
          <p>{params.debug_message}</p>
        </div>
      ) : null}

      <div className="card grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#6d6f78]">Connection</p>
          <p className="mt-1 text-sm font-medium">{snapshot.mode === "LIVE" ? "Live Gmail" : "Mock Gmail"}</p>
          <p className="text-xs text-[#6d6f78]">{snapshot.statusMessage}</p>
          <p className="mt-2 text-sm">Connected email: {snapshot.connectedEmail ?? "Not connected"}</p>
          <p className="text-sm">Access token exists: {snapshot.accessTokenExists ? "Yes" : "No"}</p>
          <p className="text-sm">Refresh token exists: {snapshot.refreshTokenExists ? "Yes" : "No"}</p>
          <p className="text-sm">
            Token refresh works:{" "}
            {snapshot.tokenRefreshWorks === null
              ? "Not tested"
              : snapshot.tokenRefreshWorks
                ? "Yes"
                : "No"}
          </p>
          <p className="text-xs text-[#6d6f78]">{snapshot.tokenRefreshMessage}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-[#6d6f78]">OAuth config</p>
          <p className="mt-1 text-sm">Current redirect URI: {snapshot.currentRedirectUri ?? "Not set"}</p>
          <p className="text-sm">Required redirect URI: {snapshot.requiredRedirectUri}</p>
          <p className="mt-2 text-sm">Granted scopes: {snapshot.grantedScopes.join(", ") || "None"}</p>
          <p className="text-sm">Required scopes: {snapshot.requiredScopes.join(", ")}</p>
          <p className="mt-2 text-sm">Last Gmail API error: {snapshot.lastGmailApiError ?? "None"}</p>
          {snapshot.oauthConfigMissing.length ? (
            <p className="text-sm text-rose-700">
              Missing env vars: {snapshot.oauthConfigMissing.join(", ")}
            </p>
          ) : (
            <p className="text-sm text-emerald-700">OAuth env vars are configured.</p>
          )}
        </div>
      </div>

      <div className="card">
        <p className="text-sm font-semibold">Debug actions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={runGmailDebugActionForm}>
            <input type="hidden" name="action" value="test_connection" />
            <button type="submit">Test Gmail Connection</button>
          </form>
          <form action={runGmailDebugActionForm}>
            <input type="hidden" name="action" value="list_recent_messages" />
            <button type="submit">List Recent Messages</button>
          </form>
          <form action={runGmailDebugActionForm}>
            <input type="hidden" name="action" value="read_first_message" />
            <button type="submit">Read First Message</button>
          </form>
          <form action={runGmailDebugActionForm}>
            <input type="hidden" name="action" value="run_mock_import_test" />
            <button type="submit">Run Mock Import Test</button>
          </form>
          <form action={disconnectGmailAction}>
            <button type="submit" className="bg-rose-700 hover:bg-rose-800">
              Disconnect Gmail
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Read message details</h3>
        <form method="get" className="mt-2 flex gap-2">
          <input
            type="text"
            name="messageId"
            defaultValue={selectedMessageId}
            placeholder="Enter Gmail message ID"
          />
          <button type="submit">Read message</button>
        </form>

        {messageDetail ? (
          <div className="mt-3 space-y-2 text-sm">
            <p><span className="font-semibold">Subject:</span> {messageDetail.subject}</p>
            <p><span className="font-semibold">From:</span> {messageDetail.fromName ?? messageDetail.fromEmail} ({messageDetail.fromEmail})</p>
            <p><span className="font-semibold">Date:</span> {formatIso(messageDetail.receivedAt)}</p>
            <p><span className="font-semibold">Snippet:</span> {messageDetail.snippet ?? "None"}</p>
            <p><span className="font-semibold">Thread:</span> {messageDetail.threadId}</p>
            <p><span className="font-semibold">Imported:</span> {messageDetail.importedLeadId ? `Yes (lead ${messageDetail.importedLeadId})` : "No"}</p>
            <p className="font-semibold">Plain text body</p>
            <pre className="max-h-56 overflow-auto rounded-lg bg-[#f8f6f3] p-3 text-xs">{messageDetail.bodyText}</pre>
            <p className="font-semibold">Raw payload</p>
            <pre className="max-h-72 overflow-auto rounded-lg bg-[#f8f6f3] p-3 text-xs">
              {JSON.stringify(messageDetail.rawPayload ?? {}, null, 2)}
            </pre>
          </div>
        ) : selectedMessageId ? (
          <p className="mt-2 text-sm text-rose-700">No message was found for ID: {selectedMessageId}</p>
        ) : (
          <p className="mt-2 text-sm text-[#6d6f78]">Enter a message ID or use “Read First Message”.</p>
        )}
      </div>
    </div>
  );
}
