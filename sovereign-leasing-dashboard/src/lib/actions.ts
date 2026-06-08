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
  updateLeadListing,
  updateLeadStatus,
} from "@/lib/repository";
import { getAppSession } from "@/lib/auth";
import {
  createGmailDraftFromLead,
  disconnectGmailConnection,
  importSelectedGmailMessages,
  runGmailDebugAction,
} from "@/lib/gmail";
import { generateAiReplyDraft } from "@/lib/ai";
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
  if (role !== "ADMIN") {
    throw new Error("Only admins can perform this action");
  }
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

  const password = requiredString(formData.get("password"), "Password");
  const passwordHash = await hash(password, 10);
  const member = await createTeamMember({
    name: requiredString(formData.get("name"), "Name"),
    email: requiredString(formData.get("email"), "Email"),
    role: requiredString(formData.get("role"), "Role") as never,
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
  assertEditor(user.role);

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
  assertEditor(user.role);

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
  assertEditor(user.role);

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

export async function disconnectGmailAction() {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertAdmin(user.role);
  await disconnectGmailConnection(user.id);
  revalidatePath("/gmail-import");
  revalidatePath("/admin/gmail-debug");
  redirect("/admin/gmail-debug?debug_message=Disconnected+Gmail+connection");
}

export async function runGmailDebugActionForm(formData: FormData) {
  const session = await getAppSession();
  const user = requireSessionUser(session);
  assertAdmin(user.role);
  const action = requiredString(formData.get("action"), "Debug action") as Parameters<
    typeof runGmailDebugAction
  >[0]["action"];
  const result = await runGmailDebugAction({
    userId: user.id,
    action,
  });
  revalidatePath("/admin/gmail-debug");
  redirect(
    `/admin/gmail-debug?debug_action=${encodeURIComponent(action)}&debug_ok=${result.ok ? "1" : "0"}&debug_message=${encodeURIComponent(result.message)}`,
  );
}
