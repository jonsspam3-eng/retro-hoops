import { importGmailMessagesAction, quickImportAndOpenLeadAction } from "@/lib/actions";
import { requireAppUser } from "@/lib/auth";
import { buildGmailQuery, fetchGmailInquiryMessages, getRequiredGoogleRedirectUri } from "@/lib/gmail";
import { gmailImportRoles, gmailSettingsRoles, hasRole } from "@/lib/security";
import { gmailSourceFilters } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

export const dynamic = "force-dynamic";

function formatIso(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

export default async function GmailImportPage({
  searchParams,
}: {
  searchParams?: Promise<{ source?: string; connected?: string; oauth_error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const sourceFilter = (params.source as
    | "ALL"
    | "STREETEASY"
    | "ZILLOW"
    | "REALTYMX"
    | "WEBSITE"
    | "DIRECT_EMAIL"
    | "UNKNOWN") ?? "ALL";
  const user = await requireAppUser();
  const canManageGmailSettings = hasRole(user.role, gmailSettingsRoles);
  const canImportGmail = hasRole(user.role, gmailImportRoles);
  const { mode, connectionState, messages } = await fetchGmailInquiryMessages({
    userId: user.id,
    sourceFilter,
    query: buildGmailQuery(30),
  });

  const connected = params.connected === "1";
  const oauthError = params.oauth_error;
  const importable = messages.filter((message) => !message.importedLeadId && message.isInquiry);
  const firstImportable = importable[0];

  return (
    <div className="space-y-4">
      {connected ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Gmail account connected successfully.
        </div>
      ) : null}
      {oauthError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Gmail connection error: {decodeURIComponent(oauthError)}
        </div>
      ) : null}

      <div className="card">
        <h2 className="text-xl font-semibold">Gmail Inquiry Import</h2>
        <p className="mt-1 text-sm text-[#6d6f78]">
          Fastest workflow: connect Gmail, import inquiry, review parsed lead, create draft.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[#ece8e3] bg-[#fdfaf6] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6d6f78]">Step 1</p>
            <p className="mt-1 text-sm font-medium">Connect inbox</p>
            <p className="mt-1 text-xs text-[#6d6f78]">
              {mode === "LIVE" ? "Connected Gmail active" : "Using mock mode until OAuth is configured"}
            </p>
          </div>
          <div className="rounded-xl border border-[#ece8e3] bg-[#fdfaf6] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6d6f78]">Step 2</p>
            <p className="mt-1 text-sm font-medium">Import inquiries</p>
            <p className="mt-1 text-xs text-[#6d6f78]">{importable.length} ready to import in this filtered view</p>
          </div>
          <div className="rounded-xl border border-[#ece8e3] bg-[#fdfaf6] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6d6f78]">Step 3</p>
            <p className="mt-1 text-sm font-medium">Create Gmail draft</p>
            <p className="mt-1 text-xs text-[#6d6f78]">Draft Created — Human Review Required · No emails are sent automatically</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {canManageGmailSettings ? (
            <a
              href="/api/gmail/connect"
              className="inline-flex rounded-lg bg-[#050b23] px-3 py-2 text-sm text-white hover:bg-[#111f4a]"
            >
              Connect Gmail Inbox
            </a>
          ) : (
            <span className="rounded-lg border border-[#d9d4cc] bg-[#f8f6f3] px-3 py-2 text-xs text-[#6d6f78]">
              Ask an Admin/Super Admin to connect Gmail.
            </span>
          )}

          <a href={`/gmail-import?source=${sourceFilter}`} className="rounded-lg border border-[#d9d4cc] bg-white px-3 py-2 text-sm text-[#050b23] hover:bg-[#f8f6f3]">
            Refresh inbox
          </a>

          {firstImportable && canImportGmail ? (
            <form action={quickImportAndOpenLeadAction}>
              <input type="hidden" name="messageId" value={firstImportable.id} />
              <button type="submit">Import first inquiry & open lead</button>
            </form>
          ) : (
            <span className="rounded-lg border border-[#d9d4cc] bg-[#f8f6f3] px-3 py-2 text-xs text-[#6d6f78]">
              No importable inquiry in current filter.
            </span>
          )}
        </div>

        <div className="mt-3 rounded-xl border border-[#e3d6c9] bg-[#fff6ee] p-3 text-sm">
          <p className="font-semibold">Mode: {mode === "LIVE" ? "Connected Gmail" : "Mock Gmail"}</p>
          <p>{connectionState.message}</p>
          <p className="mt-1 text-xs text-[#6d6f78]">
            Required Google redirect URI: <span className="font-mono">{getRequiredGoogleRedirectUri()}</span>
          </p>
          {connectionState.connection?.lastError ? (
            <p className="mt-1 text-xs text-rose-700">Last Gmail error: {connectionState.connection.lastError}</p>
          ) : null}
          {canManageGmailSettings ? (
            <p className="mt-1 text-xs">
              <a href="/admin/gmail-debug" className="text-[#0f2d93] hover:underline">
                Open admin Gmail debug panel
              </a>
            </p>
          ) : null}
        </div>
      </div>

      <div className="card">
        <form method="get" className="grid grid-cols-1 gap-2 md:grid-cols-[220px_180px]">
          <select name="source" defaultValue={sourceFilter}>
            {gmailSourceFilters.map((filter) => (
              <option key={filter} value={filter}>
                {filter.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <button type="submit">Apply source filter</button>
        </form>
      </div>

      <form action={importGmailMessagesAction} className="card overflow-x-auto">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-sm text-[#6d6f78]">
            Select inquiries and run bulk import. Duplicate message/thread imports are blocked automatically.
          </p>
          <button type="submit" disabled={!canImportGmail}>Bulk import selected</button>
        </div>

        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[#6d6f78]">
              <th className="pb-2">Select</th>
              <th className="pb-2">Source</th>
              <th className="pb-2">Sender</th>
              <th className="pb-2">Subject</th>
              <th className="pb-2">Received</th>
              <th className="pb-2">Snippet</th>
              <th className="pb-2">Detection</th>
              <th className="pb-2">Import status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((message) => (
              <tr key={message.id} className="border-t border-[#ece8e3] align-top">
                <td className="py-2">
                  <input
                    type="checkbox"
                    name="messageIds"
                    value={message.id}
                    disabled={Boolean(message.importedLeadId)}
                  />
                </td>
                <td className="py-2">
                  <StatusPill label={message.sourceFilter} />
                </td>
                <td className="py-2">
                  <p className="font-medium">{message.fromName ?? message.fromEmail}</p>
                  <p className="text-xs text-[#6d6f78]">{message.fromEmail}</p>
                </td>
                <td className="py-2">
                  <p className="font-medium">{message.subject}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[#6d6f78]">{message.bodyText}</p>
                </td>
                <td className="py-2">{formatIso(message.receivedAt)}</td>
                <td className="py-2">
                  <p className="max-w-[220px] text-xs text-[#6d6f78]">{message.snippet ?? message.bodyText.slice(0, 160)}</p>
                </td>
                <td className="py-2">
                  <p>{Math.round(message.sourceConfidence * 100)}% confidence</p>
                  <p className="text-xs text-[#6d6f78]">
                    {message.isInquiry ? "Likely leasing inquiry" : "Low inquiry confidence"}
                  </p>
                </td>
                <td className="py-2">
                  {message.importedLeadId ? (
                    <div>
                      <p className="text-xs font-semibold text-emerald-700">Already imported</p>
                      <a href={`/leads/${message.importedLeadId}`} className="text-xs text-[#0f2d93] hover:underline">
                        Open lead
                      </a>
                      {message.duplicateReason ? (
                        <p className="text-xs text-[#6d6f78]">Duplicate rule: {message.duplicateReason}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6d6f78]">Ready to import</p>
                  )}
                </td>
                <td className="py-2">
                  <div className="flex flex-col gap-1">
                    {canManageGmailSettings ? (
                      <a
                        href={`/admin/gmail-debug?messageId=${encodeURIComponent(message.id)}`}
                        className="text-xs text-[#0f2d93] hover:underline"
                      >
                        View raw message
                      </a>
                    ) : null}
                    {!message.importedLeadId && canImportGmail ? (
                      <a
                        href={`/api/gmail/import?messageId=${encodeURIComponent(message.id)}`}
                        className="text-left text-xs text-[#0f2d93] hover:underline"
                      >
                        Import this message
                      </a>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </form>
    </div>
  );
}
