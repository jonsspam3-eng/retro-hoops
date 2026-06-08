import {
  addLeadNoteAction,
  assignLeadAction,
  assignLeadListingAction,
  createGmailDraftForLeadAction,
  evaluateLeadAction,
  regenerateAiDraftAction,
  updateLeadStatusAction,
} from "@/lib/actions";
import { generateAiSummary, generateMissingInfoAnalysis } from "@/lib/ai";
import { CopyDraftButton } from "@/components/copy-draft-button";
import { StatusPill } from "@/components/status-pill";
import {
  getLeadById,
  listLeadActivityLog,
  listLeadMessages,
  listLeadNotes,
  listLeadQualifications,
  listListings,
  listTeamMembers,
  listTemplates,
} from "@/lib/repository";
import { leadStatuses } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ imported?: string; duplicate?: string }>;
}) {
  const { id } = await params;
  const pageParams = (await searchParams) ?? {};

  const [lead, listings, notes, history, templates, team, qualifications, activity] = await Promise.all([
    getLeadById(id),
    listListings(),
    listLeadNotes(id),
    listLeadMessages(id),
    listTemplates(),
    listTeamMembers(),
    listLeadQualifications(id),
    listLeadActivityLog(id),
  ]);

  if (!lead) {
    notFound();
  }

  const listing = listings.find((item) => item.id === lead.listingId);
  const aiSummary = await generateAiSummary({ lead, listing });
  const aiMissing = await generateMissingInfoAnalysis({ lead, listing });
  const activeTemplate = templates[0];
  const draftBody = lead.lastAiDraft ?? aiMissing.content;

  return (
    <div className="space-y-4">
      {pageParams.imported === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {pageParams.duplicate === "1"
            ? "This inquiry was already imported. Existing lead opened for review."
            : "Inquiry imported successfully. Review details and create a Gmail draft."}
        </div>
      ) : null}

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{lead.clientName}</h2>
            <p className="text-sm text-[#6d6f78]">{lead.email} · {lead.phone ?? "No phone provided"}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill label={lead.status} />
            <span className="rounded-full bg-[#fff0d8] px-2.5 py-1 text-xs font-semibold text-[#7c4a08]">
              {lead.status === "DRAFT_CREATED" ? "Draft Created — Human Review Required" : "Review before sending"}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Phase 2 quick actions</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[#ece8e3] bg-[#fdfaf6] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6d6f78]">Step 1</p>
            <p className="mt-1 text-sm font-medium">Confirm listing + lead details</p>
            <p className="mt-1 text-xs text-[#6d6f78]">Source confidence: {lead.sourceDetectionConfidence ? `${Math.round(lead.sourceDetectionConfidence * 100)}%` : "N/A"}</p>
          </div>
          <div className="rounded-xl border border-[#ece8e3] bg-[#fdfaf6] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6d6f78]">Step 2</p>
            <p className="mt-1 text-sm font-medium">Regenerate AI draft if needed</p>
            <form action={regenerateAiDraftAction} className="mt-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <button type="submit">Regenerate AI Draft</button>
            </form>
          </div>
          <div className="rounded-xl border border-[#ece8e3] bg-[#fdfaf6] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6d6f78]">Step 3</p>
            <p className="mt-1 text-sm font-medium">Create Gmail draft for review</p>
            <form action={createGmailDraftForLeadAction} className="mt-2 space-y-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="templateId" value={activeTemplate?.id ?? ""} />
              <input type="hidden" name="showingTimes" value="Tue 5:30pm, Thu 6:00pm" />
              <input type="hidden" name="applicationLink" value="https://example.com/application" />
              <button type="submit">Create Gmail Draft</button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-semibold">Original imported email</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{lead.inquiryMessage}</p>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <p><span className="font-semibold">Source:</span> {lead.source}</p>
              <p><span className="font-semibold">Subject:</span> {lead.inquirySubject ?? "Not captured"}</p>
              <p><span className="font-semibold">Original sender:</span> {lead.originalSender ?? "Not captured"}</p>
              <p><span className="font-semibold">Gmail message ID:</span> {lead.gmailMessageId ?? "N/A"}</p>
              <p><span className="font-semibold">Gmail thread ID:</span> {lead.gmailThreadId ?? "N/A"}</p>
              <p><span className="font-semibold">Imported at:</span> {lead.gmailImportedAt ? new Date(lead.gmailImportedAt).toLocaleString() : "N/A"}</p>
              <p><span className="font-semibold">Source detection:</span> {lead.sourceDetectionResult ?? "Not detected"}</p>
              <p><span className="font-semibold">Detection confidence:</span> {lead.sourceDetectionConfidence ? `${Math.round(lead.sourceDetectionConfidence * 100)}%` : "N/A"}</p>
              <p><span className="font-semibold">Listing match confidence:</span> {lead.listingMatchConfidence ? `${Math.round(lead.listingMatchConfidence * 100)}%` : "Unmatched"}</p>
              <p><span className="font-semibold">Listing match reason:</span> {lead.listingMatchReason ?? "Manual assignment required"}</p>
            </div>
            <p className="mt-3 text-xs text-[#6d6f78]">
              Missing parsed fields: {(lead.missingFields ?? []).length > 0 ? lead.missingFields?.join(", ") : "None"}
            </p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold">Listing assignment</h3>
            <p className="mt-1 text-sm text-[#6d6f78]">
              Current listing: {listing ? `${listing.address} ${listing.apartmentNumber}` : "Unmatched"}
            </p>
            <form action={assignLeadListingAction} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <select name="listingId" defaultValue={lead.listingId ?? ""}>
                <option value="">Unmatched listing</option>
                {listings.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.address} {row.apartmentNumber}
                  </option>
                ))}
              </select>
              <button type="submit">Save listing assignment</button>
            </form>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold">Qualification & workflow status</h3>
            <p className="mt-1 text-sm text-[#6d6f78]">Score: {lead.score ?? "Not scored"}</p>
            <p className="mt-2 text-sm">{lead.qualificationReason ?? "No evaluation notes available yet."}</p>
            <p className="mt-2 text-sm font-medium">Recommended next action: {lead.recommendedNextAction ?? "Run qualification to generate recommendation."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={evaluateLeadAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <button type="submit">Run qualification engine</button>
              </form>
              <form action={updateLeadStatusAction} className="flex items-center gap-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <select name="status" defaultValue={lead.status}>
                  {leadStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <button type="submit">Update status</button>
              </form>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {qualifications.map((row) => (
                <div key={row.id} className="rounded-xl border border-[#ece8e3] p-2">
                  <p className="font-semibold">{row.status.replaceAll("_", " ")} · {row.score}</p>
                  <p>{row.notes}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold">Email thread history</h3>
            <div className="mt-3 space-y-2">
              {history.map((message) => (
                <div key={message.id} className="rounded-xl border border-[#ece8e3] p-3">
                  <p className="text-xs text-[#6d6f78]">
                    {message.direction} · {new Date(message.sentAt).toLocaleString()} · {message.status}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{message.subject}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{message.bodyText}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-semibold">Assignment & notes</h3>
            <form action={assignLeadAction} className="mt-3 space-y-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <select name="agentId" defaultValue={lead.assignedAgentId ?? ""}>
                <option value="">Unassigned</option>
                {team
                  .filter((member) => member.role === "AGENT" || member.role === "ADMIN")
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
              <button type="submit">Assign</button>
            </form>

            <form action={addLeadNoteAction} className="mt-3 space-y-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <textarea name="content" rows={4} placeholder="Add internal note..." required />
              <button type="submit">Save note</button>
            </form>

            <div className="mt-3 space-y-2 text-sm">
              {notes.map((note) => (
                <div key={note.id} className="rounded-xl border border-[#ece8e3] p-2">
                  <p>{note.content}</p>
                  <p className="mt-1 text-xs text-[#6d6f78]">{new Date(note.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold">AI assistant</h3>
            <div className="mt-2 rounded-xl bg-[#f8f6f3] p-3 text-sm">
              <p className="font-semibold">Inquiry summary</p>
              <p className="mt-1 whitespace-pre-wrap">{aiSummary.content}</p>
            </div>
            <div className="mt-2 rounded-xl bg-[#f8f6f3] p-3 text-sm">
              <p className="font-semibold">Missing info check</p>
              <p className="mt-1 whitespace-pre-wrap">{aiMissing.content}</p>
            </div>
          </div>

          <div className="card space-y-3">
            <h3 className="text-lg font-semibold">Gmail draft workflow</h3>
            <p className="text-xs text-[#6d6f78]">AI-generated draft · Review before sending · Do not rely on AI for final applicant approval.</p>
            <div className="rounded-xl border border-[#ece8e3] bg-[#f8f6f3] p-3 text-sm">
              <p className="font-semibold">Latest draft preview</p>
              <p className="mt-2 whitespace-pre-wrap">{draftBody}</p>
              <div className="mt-3">
                <CopyDraftButton text={draftBody} />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold">Activity log</h3>
            <div className="mt-3 space-y-2 text-sm">
              {activity.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-[#ece8e3] p-2">
                  <p className="font-semibold">{entry.action.replaceAll("_", " ")}</p>
                  <p className="text-xs text-[#6d6f78]">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
