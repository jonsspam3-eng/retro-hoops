import {
  archiveLeadFromPipelineAction,
  createGmailFollowUpDraftAction,
  generateFollowUpDraftAction,
  markFollowUpCompletedAction,
  markLeadStaleAction,
  pauseFollowUpsAction,
  resumeFollowUpsAction,
  upsertFollowUpSequenceAction,
} from "@/lib/actions";
import { getAppSession } from "@/lib/auth";
import { detectPauseReason, groupPipelineLeads } from "@/lib/follow-up";
import { listFollowUpSequences, listListings, listPipelineLeads, listTeamMembers, listTemplates } from "@/lib/repository";
import { followUpStages, inquirySources, leadStatuses, showingStatuses, type PipelineFilters } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatIso(value?: string | null) {
  if (!value) return "N/A";
  return value.replace("T", " ").slice(0, 16);
}

function mapFilterValue(value?: string) {
  if (!value || value === "ALL") return undefined;
  return value;
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const session = await getAppSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const filters: PipelineFilters = {
    agentId: mapFilterValue(params.agentId),
    listingId: mapFilterValue(params.listingId),
    source: (mapFilterValue(params.source) as PipelineFilters["source"]) ?? "ALL",
    qualificationStatus: (mapFilterValue(params.qualificationStatus) as PipelineFilters["qualificationStatus"]) ?? "ALL",
    followUpStage: (mapFilterValue(params.followUpStage) as PipelineFilters["followUpStage"]) ?? "ALL",
    due: (mapFilterValue(params.due) as PipelineFilters["due"]) ?? "ALL",
    showingStatus: (mapFilterValue(params.showingStatus) as PipelineFilters["showingStatus"]) ?? "ALL",
  };

  const [leads, team, listings, templates, sequences] = await Promise.all([
    listPipelineLeads(filters),
    listTeamMembers(),
    listListings(),
    listTemplates(),
    listFollowUpSequences(),
  ]);
  const buckets = groupPipelineLeads(leads);
  const listingById = new Map(listings.map((listing) => [listing.id, listing]));
  const firstFollowUpTemplate =
    templates.find((template) => template.id === "template_followup_24h") ??
    templates.find((template) => template.category === "FOLLOW_UP");

  const bucketCards = [
    { label: "Due Today", data: buckets.dueToday, tone: "border-[#d6c4ae] bg-[#fffaf3]" },
    { label: "Overdue", data: buckets.overdue, tone: "border-rose-200 bg-rose-50" },
    { label: "Waiting on Client", data: buckets.waitingOnClient, tone: "border-sky-200 bg-sky-50" },
    { label: "Waiting on Agent", data: buckets.waitingOnAgent, tone: "border-amber-200 bg-amber-50" },
    { label: "Qualified, No Showing Scheduled", data: buckets.qualifiedNoShowing, tone: "border-emerald-200 bg-emerald-50" },
    { label: "Draft Created, Not Sent", data: buckets.draftCreatedNotSent, tone: "border-indigo-200 bg-indigo-50" },
    { label: "Stale Leads Recommended for Archive", data: buckets.staleRecommended, tone: "border-zinc-300 bg-zinc-50" },
  ];

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Follow-Up Pipeline</h2>
        <p className="mt-1 text-sm text-[#6d6f78]">
          Phase 3 workflow board for follow-up queues, showing progression, and human-reviewed Gmail drafts.
        </p>
      </div>

      <div className="card">
        <form className="grid grid-cols-1 gap-2 md:grid-cols-4 xl:grid-cols-8" method="get">
          <select name="agentId" defaultValue={params.agentId ?? "ALL"}>
            <option value="ALL">All agents</option>
            {team.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <select name="listingId" defaultValue={params.listingId ?? "ALL"}>
            <option value="ALL">All listings</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.address} {listing.apartmentNumber}
              </option>
            ))}
          </select>
          <select name="source" defaultValue={params.source ?? "ALL"}>
            <option value="ALL">All sources</option>
            {inquirySources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <select name="qualificationStatus" defaultValue={params.qualificationStatus ?? "ALL"}>
            <option value="ALL">All qualification status</option>
            {leadStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select name="followUpStage" defaultValue={params.followUpStage ?? "ALL"}>
            <option value="ALL">All follow-up stages</option>
            {followUpStages.map((stage) => (
              <option key={stage} value={stage}>
                {stage.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select name="showingStatus" defaultValue={params.showingStatus ?? "ALL"}>
            <option value="ALL">All showing status</option>
            {showingStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select name="due" defaultValue={params.due ?? "ALL"}>
            <option value="ALL">All due dates</option>
            <option value="DUE_TODAY">Due Today</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          <button type="submit">Apply filters</button>
        </form>
      </div>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {bucketCards.map((bucket) => (
          <div key={bucket.label} className={`card border ${bucket.tone}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{bucket.label}</h3>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#6d6f78]">
                {bucket.data.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {bucket.data.length === 0 ? (
                <p className="text-sm text-[#6d6f78]">No leads in this bucket.</p>
              ) : null}
              {bucket.data.map((lead) => {
                const listing = lead.listingId ? listingById.get(lead.listingId) : null;
                const pauseReason = detectPauseReason({ lead, listing }) ?? lead.followUpPauseReason;
                return (
                <div key={lead.id} className="rounded-xl border border-[#e8e2da] bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link href={`/leads/${lead.id}`} className="font-semibold text-[#0f2d93] hover:underline">
                        {lead.clientName}
                      </Link>
                      <p className="text-xs text-[#6d6f78]">
                        {lead.email} · Stage: {(lead.followUpStage ?? "INITIAL_REPLY").replaceAll("_", " ")}
                      </p>
                    </div>
                    <p className="text-xs text-[#6d6f78]">Due: {formatIso(lead.nextFollowUpAt)}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#6d6f78]">
                    <p>Showing: {(lead.showingStatus ?? "NOT_REQUESTED").replaceAll("_", " ")}</p>
                    <p>Pause reason: {pauseReason ?? "N/A"}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    <form action={generateFollowUpDraftAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button type="submit">Generate Draft</button>
                    </form>
                    <form action={createGmailFollowUpDraftAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <input type="hidden" name="templateId" value={firstFollowUpTemplate?.id ?? ""} />
                      <input type="hidden" name="showingTimes" value={(lead.offeredShowingTimes ?? []).join(", ")} />
                      <input type="hidden" name="applicationLink" value="https://srealty.nyc/apply" />
                      <button type="submit">Gmail Draft</button>
                    </form>
                    <form action={markFollowUpCompletedAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button type="submit">Mark Completed</button>
                    </form>
                    <form action={lead.followUpPaused ? resumeFollowUpsAction : pauseFollowUpsAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <input type="hidden" name="pauseReason" value="MANUAL_PAUSE" />
                      <button type="submit">{lead.followUpPaused ? "Resume" : "Pause"}</button>
                    </form>
                    <form action={markLeadStaleAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button type="submit">Mark Stale</button>
                    </form>
                    <form action={archiveLeadFromPipelineAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button type="submit">Archive</button>
                    </form>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {isAdmin ? (
        <section className="card">
          <h3 className="text-lg font-semibold">Follow-Up Sequences (Admin)</h3>
          <p className="mt-1 text-sm text-[#6d6f78]">
            Edit timing, template mapping, status, and listing/source targeting for follow-up automation.
          </p>
          <div className="mt-3 space-y-3">
            {sequences.length === 0 ? (
              <form action={upsertFollowUpSequenceAction} className="rounded-xl border border-[#e8e2da] p-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <input name="name" defaultValue="Default Sovereign Follow-Up" placeholder="Sequence name" required />
                  <select name="state" defaultValue="ACTIVE">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                  <select name="source" defaultValue="">
                    <option value="">All sources</option>
                    {inquirySources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                  <input name="delayStep1" type="number" min={1} defaultValue={24} placeholder="Step 1 delay (hours)" />
                  <input name="delayStep2" type="number" min={1} defaultValue={48} placeholder="Step 2 delay (hours)" />
                  <input name="delayStep3" type="number" min={1} defaultValue={144} placeholder="Step 3 delay (hours)" />
                </div>
                <div className="mt-2">
                  <button type="submit">Create default sequence</button>
                </div>
              </form>
            ) : null}
            {sequences.map((sequence) => (
              <form key={sequence.id} action={upsertFollowUpSequenceAction} className="rounded-xl border border-[#e8e2da] p-3">
                <input type="hidden" name="sequenceId" value={sequence.id} />
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <input name="name" defaultValue={sequence.name} placeholder="Sequence name" required />
                  <select name="state" defaultValue={sequence.state}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                  <select name="source" defaultValue={sequence.source ?? ""}>
                    <option value="">All sources</option>
                    {inquirySources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                  <input
                    name="delayStep1"
                    type="number"
                    min={1}
                    defaultValue={sequence.steps.find((step) => step.stepOrder === 1)?.delayHours ?? 24}
                    placeholder="Step 1 delay (hours)"
                  />
                  <input
                    name="delayStep2"
                    type="number"
                    min={1}
                    defaultValue={sequence.steps.find((step) => step.stepOrder === 2)?.delayHours ?? 48}
                    placeholder="Step 2 delay (hours)"
                  />
                  <input
                    name="delayStep3"
                    type="number"
                    min={1}
                    defaultValue={sequence.steps.find((step) => step.stepOrder === 3)?.delayHours ?? 144}
                    placeholder="Step 3 delay (hours)"
                  />
                  <select name="templateIdStep1" defaultValue={sequence.steps.find((step) => step.stepOrder === 1)?.templateId ?? ""}>
                    <option value="">Template for Step 1</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <select name="templateIdStep2" defaultValue={sequence.steps.find((step) => step.stepOrder === 2)?.templateId ?? ""}>
                    <option value="">Template for Step 2</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <select name="templateIdStep3" defaultValue={sequence.steps.find((step) => step.stepOrder === 3)?.templateId ?? ""}>
                    <option value="">Template for Step 3</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2">
                  <button type="submit">Save sequence</button>
                </div>
              </form>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
