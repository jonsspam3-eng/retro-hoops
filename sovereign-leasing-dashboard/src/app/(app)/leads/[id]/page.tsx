import {
  addLeadNoteAction,
  assignLeadAction,
  draftLeadReplyAction,
  evaluateLeadAction,
  sendLeadReplyAction,
  updateLeadStatusAction,
} from "@/lib/actions";
import { generateAiReplyDraft, generateAiSummary, generateMissingInfoAnalysis } from "@/lib/ai";
import { renderTemplate } from "@/lib/template-renderer";
import {
  getLeadById,
  listLeadMessages,
  listLeadNotes,
  listLeadQualifications,
  listListings,
  listTeamMembers,
  listTemplates,
} from "@/lib/repository";
import { StatusPill } from "@/components/status-pill";
import { leadStatuses } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, listings, notes, history, templates, team, qualifications] = await Promise.all([
    getLeadById(id),
    listListings(),
    listLeadNotes(id),
    listLeadMessages(id),
    listTemplates(),
    listTeamMembers(),
    listLeadQualifications(id),
  ]);

  if (!lead) {
    notFound();
  }

  const listing = listings.find((item) => item.id === lead.listingId);
  const aiSummary = await generateAiSummary({ lead, listing });
  const aiMissing = await generateMissingInfoAnalysis({ lead, listing });
  const aiReply = await generateAiReplyDraft({ lead, listing });
  const defaultTemplate = templates[0];
  const mergedReply = defaultTemplate
    ? renderTemplate(defaultTemplate.body, {
        client_name: lead.clientName,
        listing_address: listing?.address ?? "the requested listing",
        apartment_number: listing?.apartmentNumber ?? "",
        rent: listing?.rent ?? "TBD",
        agent_name: "Sovereign Leasing Team",
        showing_times: "Tue 5:30 PM or Thu 6:00 PM",
        application_link: "https://example.com/apply",
      })
    : aiReply.content;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{lead.clientName}</h2>
            <p className="text-sm text-[#6d6f78]">{lead.email} · {lead.phone ?? "No phone provided"}</p>
          </div>
          <StatusPill label={lead.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-semibold">Inquiry details</h3>
            <p className="mt-2 text-sm leading-relaxed">{lead.inquiryMessage}</p>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <p><span className="font-semibold">Source:</span> {lead.source}</p>
              <p><span className="font-semibold">Listing:</span> {listing ? `${listing.address} ${listing.apartmentNumber}` : "Unmatched"}</p>
              <p><span className="font-semibold">Move-in:</span> {lead.desiredMoveInDate ? new Date(lead.desiredMoveInDate).toLocaleDateString() : "Not provided"}</p>
              <p><span className="font-semibold">Budget:</span> {lead.budget ? `$${lead.budget.toLocaleString()}` : "Not provided"}</p>
              <p><span className="font-semibold">Income:</span> {lead.annualIncome ? `$${lead.annualIncome.toLocaleString()}` : "Not provided"}</p>
              <p><span className="font-semibold">Occupants:</span> {lead.occupants ?? "Not provided"}</p>
              <p><span className="font-semibold">Pets:</span> {lead.pets ?? "Not provided"}</p>
              <p><span className="font-semibold">Guarantor:</span> {lead.needsGuarantor === null || lead.needsGuarantor === undefined ? "Unknown" : lead.needsGuarantor ? "Yes" : "No"}</p>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold">Qualification</h3>
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
                  <p className="mt-1 text-sm whitespace-pre-wrap">{message.bodyText}</p>
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

          <div className="card">
            <h3 className="text-lg font-semibold">Draft / send reply</h3>
            <form action={draftLeadReplyAction} className="space-y-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="to" value={lead.email} />
              <input name="subject" defaultValue={defaultTemplate?.subject ?? `Re: Inquiry from ${lead.clientName}`} required />
              <textarea name="body" rows={8} defaultValue={mergedReply} required />
              <button type="submit">Save draft (placeholder Gmail)</button>
            </form>

            <form action={sendLeadReplyAction} className="mt-2 space-y-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="to" value={lead.email} />
              <input name="subject" defaultValue={`Re: Inquiry from ${lead.clientName}`} required />
              <textarea name="body" rows={6} defaultValue={aiReply.content} required />
              <button type="submit">Send now (placeholder Gmail)</button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
