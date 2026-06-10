"use server";

import { writeAuditLog } from "@/lib/audit";
import {
  addLeadNote,
  assignLead,
  createLead,
  createListing,
  createRule,
  createTeamMember,
  createTemplate,
  evaluateLead,
  getLeadById,
  listListings,
  saveLeadAiDraft,
  updateLeadWorkflowState,
  updateLeadListing,
  updateLeadStatus,
  upsertFollowUpSequence,
} from "@/lib/repository";
import { getAppSession } from "@/lib/auth";
import {
  createGmailDraftFromLead,
  disconnectGmailConnection,
  importSelectedGmailMessages,
  runGmailDebugAction,
} from "@/lib/gmail";
import { generateAiReplyDraft } from "@/lib/ai";
import { calculateNextFollowUpAt, determineFollowUpStage } from "@/lib/follow-up";
import { adminRoles, debugToolsEnabled, gmailImportRoles, gmailSettingsRoles, hasRole } from "@/lib/security";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function requiredString(value: FormDataEntryValue | null, name: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${name} is required`);
  }
  return normalized;
}

function requireSessionUser(session: Awaited<ReturnType<typeof getAppSession>>) {
  if (!session?.user?.id) {
    throw new Error("You must be signed in to perform this action.");
  }
  return session.user;
}

function assertEditor(role?: string) {
  if (!role) {
    throw new Error("You must be signed in to perform this action.");
  }
  if (role === "READ_ONLY") {
    throw new Error("Read-only users cannot modify records");
  }
}

function assertAdmin(role?: string) {
  if (!hasRole(role, adminRoles)) {
    throw new Error("Only admins can perform this action");
  }
}

function assertGmailOperator(role?: string) {
  if (!hasRole(role, gmailImportRoles)) {
    throw new Error("Your role does not have Gmail import permissions.");
  }
}

function assertGmailSettings(role?: string) {
  if (!hasRole(role, gmailSettingsRoles)) {
    throw new Error("Only Admin and Super Admin users can manage Gmail settings.");
  }
}

function parseStringList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDateTimeInput(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();

  const usPattern = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2})$/);
  if (usPattern) {
    const [, month, day, year, hour, minute] = usPattern;
    const fallback = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    );
    if (!Number.isNaN(fallback.getTime())) {
      return fallback.toISOString();
    }
  }

  return null;
}

export async function createLeadAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);

  const lead = await createLead({
    clientName: requiredString(formData.get("clientName"), "Client name"),
    email: requiredString(formData.get("email"), "Email"),
    source: requiredString(formData.get("source"), "Source"),
    inquiryMessage: requiredString(formData.get("inquiryMessage"), "Inquiry message"),
    listingId: String(formData.get("listingId") ?? "") || undefined,
  });

  await writeAuditLog({
    actorId: user.id,
    leadId: lead.id,
    action: "LEAD_CREATED",
    entityType: "LEAD",
    entityId: lead.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/leads");
}

export async function createListingAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);

  const listing = await createListing({
    address: requiredString(formData.get("address"), "Address"),
    apartmentNumber: requiredString(formData.get("apartmentNumber"), "Apartment number"),
    rent: Number(requiredString(formData.get("rent"), "Rent")),
    beds: Number(requiredString(formData.get("beds"), "Beds")),
    baths: Number(requiredString(formData.get("baths"), "Baths")),
    neighborhood: requiredString(formData.get("neighborhood"), "Neighborhood"),
    petPolicy: String(formData.get("petPolicy") ?? "") || undefined,
    status: requiredString(formData.get("status"), "Status") as never,
  });

  await writeAuditLog({
    actorId: user.id,
    action: "LISTING_CREATED",
    entityType: "LISTING",
    entityId: listing.id,
  });

  revalidatePath("/listings");
  revalidatePath("/dashboard");
}

export async function createTemplateAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);

  const template = await createTemplate({
    name: requiredString(formData.get("name"), "Template name"),
    category: requiredString(formData.get("category"), "Category"),
    mode: requiredString(formData.get("mode"), "Mode") as never,
    subject: requiredString(formData.get("subject"), "Subject"),
    body: requiredString(formData.get("body"), "Body"),
  });

  await writeAuditLog({
    actorId: user.id,
    action: "TEMPLATE_CREATED",
    entityType: "TEMPLATE",
    entityId: template.id,
  });

  revalidatePath("/templates");
}

export async function createRuleAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertAdmin(user.role);

  const criteriaText = String(formData.get("criteria") ?? "{}");
  const criteria = JSON.parse(criteriaText);

  const rule = await createRule({
    name: requiredString(formData.get("name"), "Rule name"),
    description: requiredString(formData.get("description"), "Description"),
    weight: Number(requiredString(formData.get("weight"), "Weight")),
    listingId: String(formData.get("listingId") ?? "") || undefined,
    criteria,
  });

  await writeAuditLog({
    actorId: user.id,
    action: "RULE_CREATED",
    entityType: "QUALIFICATION_RULE",
    entityId: rule.id,
    metadata: { criteria },
  });

  revalidatePath("/rules");
}

export async function createTeamMemberAction(formData: FormData) {
  const session = await getAppSession();
  const actor = requireSessionUser(session);
  assertAdmin(actor.role);
  const role = requiredString(formData.get("role"), "Role") as never;
  if (role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
    throw new Error("Only a Super Admin can create another Super Admin.");
  }

  const password = requiredString(formData.get("password"), "Password");
  const passwordHash = await hash(password, 10);
  const member = await createTeamMember({
    name: requiredString(formData.get("name"), "Name"),
    email: requiredString(formData.get("email"), "Email"),
    role,
    passwordHash,
  });

  await writeAuditLog({
    actorId: actor.id,
    action: "TEAM_MEMBER_CREATED",
    entityType: "USER",
    entityId: member.id,
  });

  revalidatePath("/team");
}

export async function addLeadNoteAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);

  const leadId = requiredString(formData.get("leadId"), "Lead");
  await addLeadNote({
    leadId,
    authorId: user.id,
    content: requiredString(formData.get("content"), "Note"),
  });

  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "LEAD_NOTE_ADDED",
    entityType: "LEAD_NOTE",
    entityId: leadId,
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function updateLeadStatusAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);

  const leadId = requiredString(formData.get("leadId"), "Lead");
  const status = requiredString(formData.get("status"), "Status") as never;
  await updateLeadStatus(leadId, status);
  if (status === "ARCHIVED") {
    await updateLeadWorkflowState(leadId, {
      followUpPaused: true,
      followUpPauseReason: "LEAD_ARCHIVED",
      followUpStage: "ARCHIVED",
      showingStatus: "ARCHIVED",
    });
  }
  if (status === "NOT_QUALIFIED") {
    await updateLeadWorkflowState(leadId, {
      followUpPaused: true,
      followUpPauseReason: "NOT_INTERESTED",
    });
  }

  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "LEAD_STATUS_UPDATED",
    entityType: "LEAD",
    entityId: leadId,
    metadata: { status },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}

export async function assignLeadAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);

  const leadId = requiredString(formData.get("leadId"), "Lead");
  const agentId = String(formData.get("agentId") ?? "").trim() || null;
  await assignLead(leadId, agentId);

  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "LEAD_ASSIGNED",
    entityType: "LEAD",
    entityId: leadId,
    metadata: { assignedAgentId: agentId },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  redirect(`/leads/${leadId}?draft_created=1`);
}

export async function assignLeadListingAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);

  const leadId = requiredString(formData.get("leadId"), "Lead");
  const listingId = String(formData.get("listingId") ?? "").trim() || null;
  await updateLeadListing(leadId, listingId);

  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "LEAD_LISTING_UPDATED",
    entityType: "LEAD",
    entityId: leadId,
    metadata: { listingId },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

export async function evaluateLeadAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);

  const leadId = requiredString(formData.get("leadId"), "Lead");
  const evaluation = await evaluateLead(leadId);

  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "LEAD_EVALUATED",
    entityType: "LEAD_QUALIFICATION",
    entityId: leadId,
    metadata: {
      score: evaluation.score,
      status: evaluation.status,
    },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  revalidatePath("/leads");
}

export async function importGmailMessagesAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertGmailOperator(user.role);

  const messageIds = formData
    .getAll("messageIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  await importSelectedGmailMessages({
    userId: user.id,
    actorId: user.id,
    messageIds,
  });

  revalidatePath("/gmail-import");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}


export async function quickImportAndOpenLeadAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertGmailOperator(user.role);

  const messageId = requiredString(formData.get("messageId"), "Message ID");
  const outcomes = await importSelectedGmailMessages({
    userId: user.id,
    actorId: user.id,
    messageIds: [messageId],
  });

  const outcome = outcomes[0];
  if (!outcome) {
    throw new Error("No import outcome was returned.");
  }

  revalidatePath("/gmail-import");
  revalidatePath("/leads");
  revalidatePath("/dashboard");

  redirect(`/leads/${outcome.leadId}?imported=1${outcome.duplicate ? "&duplicate=1" : ""}`);
}

export async function createGmailDraftForLeadAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertGmailOperator(user.role);

  const leadId = requiredString(formData.get("leadId"), "Lead");
  await createGmailDraftFromLead({
    leadId,
    userId: user.id,
    actorId: user.id,
    templateId: String(formData.get("templateId") ?? "") || undefined,
    showingTimes: String(formData.get("showingTimes") ?? "") || undefined,
    applicationLink: String(formData.get("applicationLink") ?? "") || undefined,
    agentName: user.name ?? "Sovereign Leasing Team",
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  redirect(`/leads/${leadId}?draft_created=1`);
}

export async function regenerateAiDraftAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);

  const leadId = requiredString(formData.get("leadId"), "Lead");
  const lead = await getLeadById(leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }

  const listings = await listListings();
  const listing = listings.find((item) => item.id === lead.listingId);
  const aiDraft = await generateAiReplyDraft({ lead, listing });
  await saveLeadAiDraft(leadId, aiDraft.content);

  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "AI_DRAFT_REGENERATED",
    entityType: "LEAD",
    entityId: leadId,
    metadata: { model: aiDraft.model },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function generateFollowUpDraftAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);

  const leadId = requiredString(formData.get("leadId"), "Lead");
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error("Lead not found");
  const listings = await listListings();
  const listing = listings.find((row) => row.id === lead.listingId);

  const draft = await generateAiReplyDraft({ lead, listing });
  await saveLeadAiDraft(leadId, draft.content);

  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "FOLLOW_UP_DRAFT_GENERATED",
    entityType: "LEAD",
    entityId: leadId,
    metadata: { model: draft.model },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function createGmailFollowUpDraftAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertGmailOperator(user.role);

  const leadId = requiredString(formData.get("leadId"), "Lead");
  const templateId = String(formData.get("templateId") ?? "").trim() || undefined;
  const showingTimes = parseStringList(formData.get("showingTimes")).join(", ");
  const applicationLink = String(formData.get("applicationLink") ?? "").trim() || undefined;

  await createGmailDraftFromLead({
    leadId,
    userId: user.id,
    actorId: user.id,
    templateId,
    showingTimes: showingTimes || undefined,
    applicationLink,
    agentName: user.name ?? "Sovereign Realty NYC Leasing Team",
  });

  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "GMAIL_FOLLOW_UP_DRAFT_CREATED",
    entityType: "LEAD",
    entityId: leadId,
    metadata: { templateId },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
  redirect(`/leads/${leadId}?draft_created=1`);
}

export async function markFollowUpCompletedAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);

  const leadId = requiredString(formData.get("leadId"), "Lead");
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error("Lead not found");

  const followUpAttemptCount = (lead.followUpAttemptCount ?? 0) + 1;
  const nowIso = new Date().toISOString();
  const followUpStage = determineFollowUpStage(followUpAttemptCount);
  const nextFollowUpAt = calculateNextFollowUpAt({
    lastContactedAt: nowIso,
    lastClientReplyAt: lead.lastClientReplyAt,
    followUpAttemptCount,
  });

  await updateLeadWorkflowState(leadId, {
    lastContactedAt: nowIso,
    followUpAttemptCount,
    followUpStage,
    nextFollowUpAt,
    followUpPaused: false,
    followUpPauseReason: null,
    status: followUpStage === "STALE_RECOMMENDED" ? "FOLLOW_UP_NEEDED" : "FOLLOW_UP",
  });

  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "FOLLOW_UP_MARKED_COMPLETED",
    entityType: "LEAD",
    entityId: leadId,
    metadata: { followUpAttemptCount, followUpStage, nextFollowUpAt },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function pauseFollowUpsAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);

  const leadId = requiredString(formData.get("leadId"), "Lead");
  const pauseReason = String(formData.get("pauseReason") ?? "").trim() || "MANUAL_PAUSE";
  await updateLeadWorkflowState(leadId, {
    followUpPaused: true,
    followUpPauseReason: pauseReason,
  });
  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "FOLLOW_UP_PAUSED",
    entityType: "LEAD",
    entityId: leadId,
    metadata: { pauseReason },
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function resumeFollowUpsAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);
  const leadId = requiredString(formData.get("leadId"), "Lead");
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error("Lead not found");

  await updateLeadWorkflowState(leadId, {
    followUpPaused: false,
    followUpPauseReason: null,
    nextFollowUpAt:
      lead.nextFollowUpAt ??
      calculateNextFollowUpAt({
        lastContactedAt: lead.lastContactedAt,
        lastClientReplyAt: lead.lastClientReplyAt,
        followUpAttemptCount: lead.followUpAttemptCount,
      }),
  });
  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "FOLLOW_UP_RESUMED",
    entityType: "LEAD",
    entityId: leadId,
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function markLeadStaleAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);
  const leadId = requiredString(formData.get("leadId"), "Lead");

  await updateLeadWorkflowState(leadId, {
    followUpStage: "STALE_RECOMMENDED",
    status: "FOLLOW_UP_NEEDED",
  });

  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "LEAD_MARKED_STALE",
    entityType: "LEAD",
    entityId: leadId,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function archiveLeadFromPipelineAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);
  const leadId = requiredString(formData.get("leadId"), "Lead");

  await updateLeadWorkflowState(leadId, {
    status: "ARCHIVED",
    followUpStage: "ARCHIVED",
    followUpPaused: true,
    followUpPauseReason: "LEAD_ARCHIVED",
    showingStatus: "ARCHIVED",
  });

  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "LEAD_ARCHIVED",
    entityType: "LEAD",
    entityId: leadId,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function upsertFollowUpSequenceAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertAdmin(user.role);

  const sequenceId = String(formData.get("sequenceId") ?? "").trim() || undefined;
  const templateIds = [
    String(formData.get("templateIdStep1") ?? "").trim() || null,
    String(formData.get("templateIdStep2") ?? "").trim() || null,
    String(formData.get("templateIdStep3") ?? "").trim() || null,
  ];
  const delays = [
    Number(String(formData.get("delayStep1") ?? "24")),
    Number(String(formData.get("delayStep2") ?? "48")),
    Number(String(formData.get("delayStep3") ?? "144")),
  ];

  await upsertFollowUpSequence({
    id: sequenceId,
    name: requiredString(formData.get("name"), "Name"),
    listingId: String(formData.get("listingId") ?? "").trim() || null,
    source: (String(formData.get("source") ?? "").trim() || null) as never,
    leadStatus: (String(formData.get("leadStatus") ?? "").trim() || null) as never,
    state: requiredString(formData.get("state"), "State") as "ACTIVE" | "PAUSED" | "COMPLETED",
    steps: delays.map((delay, index) => ({
      stepOrder: index + 1,
      delayHours: Number.isFinite(delay) && delay > 0 ? delay : index === 0 ? 24 : index === 1 ? 48 : 144,
      templateId: templateIds[index],
    })),
  });

  await writeAuditLog({
    actorId: user.id,
    action: "FOLLOW_UP_SEQUENCE_UPDATED",
    entityType: "FOLLOW_UP_SEQUENCE",
    entityId: sequenceId ?? "new",
  });

  revalidatePath("/pipeline");
}

export async function markShowingRequestedAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);
  const leadId = requiredString(formData.get("leadId"), "Lead");
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error("Lead not found");
  const requestedTimes = parseStringList(formData.get("requestedShowingTimes"));

  await updateLeadWorkflowState(leadId, {
    status: "SHOWING_REQUESTED",
    showingStatus: "SHOWING_REQUESTED",
    requestedShowingTimes: requestedTimes,
    followUpPaused: true,
    followUpPauseReason: "SHOWING_SCHEDULED",
  });

  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "SHOWING_REQUESTED",
    entityType: "LEAD",
    entityId: leadId,
    metadata: { requestedTimes },
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function offerShowingTimesAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);
  const leadId = requiredString(formData.get("leadId"), "Lead");
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error("Lead not found");
  const offeredTimes = parseStringList(formData.get("offeredShowingTimes"));

  await updateLeadWorkflowState(leadId, {
    showingStatus: "TIMES_OFFERED",
    offeredShowingTimes: offeredTimes,
    followUpPaused: true,
    followUpPauseReason: "SHOWING_SCHEDULED",
  });
  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "SHOWING_TIMES_OFFERED",
    entityType: "LEAD",
    entityId: leadId,
    metadata: { offeredTimes },
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function confirmShowingAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);
  const leadId = requiredString(formData.get("leadId"), "Lead");
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error("Lead not found");
  const confirmedAt = parseDateTimeInput(formData.get("confirmedShowingAt"));

  await updateLeadWorkflowState(leadId, {
    showingStatus: "SHOWING_CONFIRMED",
    confirmedShowingAt: confirmedAt,
    showingAgentId: String(formData.get("showingAgentId") ?? "").trim() || null,
    showingLocation: String(formData.get("showingLocation") ?? "").trim() || null,
    accessInstructions: String(formData.get("accessInstructions") ?? "").trim() || null,
    followUpPaused: true,
    followUpPauseReason: "SHOWING_SCHEDULED",
  });
  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "SHOWING_CONFIRMED",
    entityType: "LEAD",
    entityId: leadId,
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function markShowingCompletedAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);
  const leadId = requiredString(formData.get("leadId"), "Lead");
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error("Lead not found");

  await updateLeadWorkflowState(leadId, {
    showingStatus: "SHOWING_COMPLETED",
    showedAt: new Date().toISOString(),
    postShowingNotes: String(formData.get("postShowingNotes") ?? "").trim() || null,
    followUpPaused: false,
    followUpPauseReason: null,
  });
  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "SHOWING_COMPLETED",
    entityType: "LEAD",
    entityId: leadId,
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function markNoShowAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);
  const leadId = requiredString(formData.get("leadId"), "Lead");
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error("Lead not found");
  const noShowReason = String(formData.get("noShowReason") ?? "").trim() || "No-show";

  await updateLeadWorkflowState(leadId, {
    showingStatus: "NO_SHOW",
    noShowReason,
    followUpPaused: false,
    followUpPauseReason: null,
  });
  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "SHOWING_NO_SHOW_MARKED",
    entityType: "LEAD",
    entityId: leadId,
    metadata: { noShowReason },
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function requestRescheduleAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);
  const leadId = requiredString(formData.get("leadId"), "Lead");
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error("Lead not found");
  await updateLeadWorkflowState(leadId, {
    showingStatus: "RESCHEDULE_NEEDED",
    followUpPaused: false,
    followUpPauseReason: null,
  });
  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "SHOWING_RESCHEDULE_REQUESTED",
    entityType: "LEAD",
    entityId: leadId,
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function draftApplicationInstructionsAction(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertEditor(user.role);
  const leadId = requiredString(formData.get("leadId"), "Lead");
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error("Lead not found");
  await updateLeadWorkflowState(leadId, {
    status: "APPLICATION_REQUESTED",
    showingStatus: "APPLICATION_REQUESTED",
    applicationInstructionsDraftedAt: new Date().toISOString(),
    followUpPaused: true,
    followUpPauseReason: "APPLICATION_INSTRUCTIONS_SENT",
  });
  await writeAuditLog({
    actorId: user.id,
    leadId,
    action: "APPLICATION_INSTRUCTIONS_DRAFTED",
    entityType: "LEAD",
    entityId: leadId,
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function disconnectGmailAction() {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertGmailSettings(user.role);
  await disconnectGmailConnection(user.id);
  await writeAuditLog({
    actorId: user.id,
    action: "GMAIL_DISCONNECTED",
    entityType: "GMAIL_CONNECTION",
    entityId: user.id,
  });
  revalidatePath("/gmail-import");
  revalidatePath("/admin/gmail-debug");
  redirect("/admin/gmail-debug?debug_message=Disconnected+Gmail+connection");
}

export async function runGmailDebugActionForm(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertGmailSettings(user.role);
  if (process.env.NODE_ENV === "production" && !debugToolsEnabled()) {
    throw new Error("Debug tools are disabled in production.");
  }
  const action = requiredString(formData.get("action"), "Debug action") as Parameters<
    typeof runGmailDebugAction
  >[0]["action"];
  const result = await runGmailDebugAction({
    userId: user.id,
    action,
  });
  await writeAuditLog({
    actorId: user.id,
    action: "GMAIL_DEBUG_ACTION_RUN",
    entityType: "GMAIL_DEBUG",
    entityId: action,
    metadata: { ok: result.ok, message: result.message },
  });
  revalidatePath("/admin/gmail-debug");
  redirect(
    `/admin/gmail-debug?debug_action=${encodeURIComponent(action)}&debug_ok=${result.ok ? "1" : "0"}&debug_message=${encodeURIComponent(result.message)}`,
  );
}
