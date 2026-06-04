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

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{lead.clientName}</h2>
            <p className="text-sm text-[#6d6f78]">{lead.email} · {lead.phone ?? "No phone provided"}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill label={lead.status} />
            <span className="rounded-full bg-[#fff0d8] px-2.5 py-1 text-xs font-semibold text-[#7c4a08]">
              {lead.status === "DRAFT_CREATED" ? "Draft Created — Human Review Required" : "Human Review Required"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-semibold">Original imported email</h3>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{lead.inquiryMessage}</p>
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
              <p><span className="font-semibold">Move-in:</span> {lead.desiredMoveInDate ? new Date(lead.desiredMoveInDate).toLocaleDateString() : "Missing"}</p>
              <p><span className="font-semibold">Budget:</span> {lead.budget ? `$${lead.budget.toLocaleString()}` : "Missing"}</p>
              <p><span className="font-semibold">Occupants:</span> {lead.occupants ?? "Missing"}</p>
              <p><span className="font-semibold">Pets:</span> {lead.pets ?? "Missing"}</p>
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
              <p className="mt-2 text-xs text-[#6d6f78]">{aiSummary.rationale} ({aiSummary.model})</p>
            </div>
            <div className="mt-2 rounded-xl bg-[#f8f6f3] p-3 text-sm">
              <p className="font-semibold">Missing info check</p>
              <p className="mt-1 whitespace-pre-wrap">{aiMissing.content}</p>
              <p className="mt-2 text-xs text-[#6d6f78]">{aiMissing.rationale} ({aiMissing.model})</p>
            </div>
          </div>

          <div className="card space-y-3">
            <h3 className="text-lg font-semibold">Gmail draft workflow</h3>
            <p className="text-xs text-[#6d6f78]">AI-generated draft · Review before sending · Do not rely on AI for final applicant approval.</p>

            <form action={regenerateAiDraftAction} className="space-y-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <button type="submit">Regenerate AI Draft</button>
            </form>

            <form action={createGmailDraftForLeadAction} className="space-y-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <select name="templateId" defaultValue={activeTemplate?.id ?? ""}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <input name="showingTimes" placeholder="Showing times (e.g. Tue 5:30pm, Thu 6:00pm)" defaultValue="Tue 5:30pm, Thu 6:00pm" />
              <input name="applicationLink" placeholder="Application link" defaultValue="https://example.com/application" />
              <button type="submit">Create Gmail Draft</button>
            </form>

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
