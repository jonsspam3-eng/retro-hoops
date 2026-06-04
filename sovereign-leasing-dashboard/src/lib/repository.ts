import { getFallbackStore, makeId } from "@/lib/fallback-store";
import { evaluateLeadQualification, qualificationStatusToLeadStatus } from "@/lib/rules-engine";
import { prisma } from "@/lib/prisma";
import type {
  AuditLogRecord,
  DashboardMetrics,
  EmailTemplateRecord,
  LeadNoteRecord,
  LeadQualificationRecord,
  LeadRecord,
  LeadStatus,
  ListingRecord,
  QualificationRuleRecord,
  TeamUser,
} from "@/lib/types";

function shouldUseFallback(): boolean {
  return !process.env.DATABASE_URL;
}

function toIso(value?: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapListing(listing: {
  id: string;
  address: string;
  apartmentNumber: string;
  rent: number;
  beds: number;
  baths: number;
  neighborhood: string;
  availabilityDate?: Date | string | null;
  agentId?: string | null;
  showingInstructions?: string | null;
  petPolicy?: string | null;
  incomeRequirementX: number;
  guarantorRequirementX: number;
  brokerFeeStatus?: string | null;
  platformLinks?: unknown;
  status: ListingRecord["status"];
}): ListingRecord {
  return {
    id: listing.id,
    address: listing.address,
    apartmentNumber: listing.apartmentNumber,
    rent: listing.rent,
    beds: listing.beds,
    baths: listing.baths,
    neighborhood: listing.neighborhood,
    availabilityDate: toIso(listing.availabilityDate),
    agentId: listing.agentId,
    showingInstructions: listing.showingInstructions,
    petPolicy: listing.petPolicy,
    incomeRequirementX: listing.incomeRequirementX,
    guarantorRequirementX: listing.guarantorRequirementX,
    brokerFeeStatus: listing.brokerFeeStatus,
    platformLinks: (listing.platformLinks as Record<string, string> | undefined) ?? undefined,
    status: listing.status,
  };
}

function mapLead(lead: {
  id: string;
  clientName: string;
  email: string;
  phone?: string | null;
  originalSender?: string | null;
  inquirySubject?: string | null;
  listingId?: string | null;
  source: LeadRecord["source"];
  inquiryMessage: string;
  desiredMoveInDate?: Date | string | null;
  budget?: number | null;
  pets?: string | null;
  occupants?: number | null;
  annualIncome?: number | null;
  employmentDetails?: string | null;
  needsGuarantor?: boolean | null;
  voucherProgram?: string | null;
  creditReadiness?: string | null;
  showingAvailability?: string | null;
  gmailMessageId?: string | null;
  gmailThreadId?: string | null;
  gmailImportedAt?: Date | string | null;
  sourceDetectionResult?: string | null;
  sourceDetectionConfidence?: number | null;
  listingMatchConfidence?: number | null;
  listingMatchReason?: string | null;
  missingFields?: unknown;
  lastAiDraft?: string | null;
  lastAiDraftGeneratedAt?: Date | string | null;
  status: LeadStatus;
  score?: number | null;
  qualificationReason?: string | null;
  responsivenessScore: number;
  completenessScore: number;
  recommendedNextAction?: string | null;
  assignedAgentId?: string | null;
  followUpDate?: Date | string | null;
  receivedAt: Date | string;
  parsedFields?: unknown;
}): LeadRecord {
  return {
    id: lead.id,
    clientName: lead.clientName,
    email: lead.email,
    phone: lead.phone,
    originalSender: lead.originalSender,
    inquirySubject: lead.inquirySubject,
    listingId: lead.listingId,
    source: lead.source,
    inquiryMessage: lead.inquiryMessage,
    desiredMoveInDate: toIso(lead.desiredMoveInDate),
    budget: lead.budget,
    pets: lead.pets,
    occupants: lead.occupants,
    annualIncome: lead.annualIncome,
    employmentDetails: lead.employmentDetails,
    needsGuarantor: lead.needsGuarantor,
    voucherProgram: lead.voucherProgram,
    creditReadiness: lead.creditReadiness,
    showingAvailability: lead.showingAvailability,
    gmailMessageId: lead.gmailMessageId,
    gmailThreadId: lead.gmailThreadId,
    gmailImportedAt: toIso(lead.gmailImportedAt),
    sourceDetectionResult: lead.sourceDetectionResult,
    sourceDetectionConfidence: lead.sourceDetectionConfidence,
    listingMatchConfidence: lead.listingMatchConfidence,
    listingMatchReason: lead.listingMatchReason,
    missingFields: (lead.missingFields as string[] | undefined) ?? [],
    lastAiDraft: lead.lastAiDraft,
    lastAiDraftGeneratedAt: toIso(lead.lastAiDraftGeneratedAt),
    status: lead.status,
    score: lead.score,
    qualificationReason: lead.qualificationReason,
    responsivenessScore: lead.responsivenessScore,
    completenessScore: lead.completenessScore,
    recommendedNextAction: lead.recommendedNextAction,
    assignedAgentId: lead.assignedAgentId,
    followUpDate: toIso(lead.followUpDate),
    receivedAt: toIso(lead.receivedAt) ?? new Date().toISOString(),
    parsedFields: (lead.parsedFields as Record<string, unknown> | undefined) ?? undefined,
  };
}

async function runWithFallback<T>(dbFn: () => Promise<T>, fallbackFn: () => T | Promise<T>): Promise<T> {
  if (shouldUseFallback()) {
    return fallbackFn();
  }

  try {
    return await dbFn();
  } catch {
    return fallbackFn();
  }
}

export function isFallbackMode(): boolean {
  return shouldUseFallback();
}

export async function listTeamMembers(): Promise<TeamUser[]> {
  return runWithFallback(
    async () => {
      const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
      return users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        passwordHash: user.passwordHash,
        isActive: user.isActive,
      }));
    },
    () => getFallbackStore().users,
  );
}

export async function listListings(): Promise<ListingRecord[]> {
  return runWithFallback(
    async () => {
      const rows = await prisma.listing.findMany({ orderBy: { createdAt: "desc" } });
      return rows.map((row) => mapListing(row));
    },
    () => getFallbackStore().listings,
  );
}

export async function listLeads(filters?: {
  status?: LeadStatus;
  source?: string;
  listingId?: string;
}): Promise<LeadRecord[]> {
  return runWithFallback(
    async () => {
      const rows = await prisma.lead.findMany({
        where: {
          status: filters?.status,
          source: filters?.source as never,
          listingId: filters?.listingId,
        },
        orderBy: { receivedAt: "desc" },
      });
      return rows.map((row) => mapLead(row));
    },
    () => {
      const store = getFallbackStore();
      return store.leads
        .filter((lead) => (filters?.status ? lead.status === filters.status : true))
        .filter((lead) => (filters?.source ? lead.source === filters.source : true))
        .filter((lead) => (filters?.listingId ? lead.listingId === filters.listingId : true));
    },
  );
}

export async function getLeadById(id: string): Promise<LeadRecord | null> {
  return runWithFallback(
    async () => {
      const row = await prisma.lead.findUnique({ where: { id } });
      return row ? mapLead(row) : null;
    },
    () => getFallbackStore().leads.find((lead) => lead.id === id) ?? null,
  );
}

export async function findLeadByGmailIdentifiers(input: {
  gmailMessageId?: string;
  gmailThreadId?: string;
}): Promise<LeadRecord | null> {
  return runWithFallback(
    async () => {
      if (input.gmailMessageId) {
        const byMessage = await prisma.lead.findUnique({ where: { gmailMessageId: input.gmailMessageId } });
        if (byMessage) return mapLead(byMessage);
      }

      if (input.gmailThreadId) {
        const byThread = await prisma.lead.findFirst({
          where: { gmailThreadId: input.gmailThreadId },
          orderBy: { receivedAt: "desc" },
        });
        if (byThread) return mapLead(byThread);
      }

      return null;
    },
    () => {
      const store = getFallbackStore();
      if (input.gmailMessageId) {
        const byMessage = store.leads.find((lead) => lead.gmailMessageId === input.gmailMessageId);
        if (byMessage) return byMessage;
      }
      if (input.gmailThreadId) {
        return store.leads.find((lead) => lead.gmailThreadId === input.gmailThreadId) ?? null;
      }
      return null;
    },
  );
}

export async function listLeadNotes(leadId: string): Promise<LeadNoteRecord[]> {
  return runWithFallback(
    async () => {
      const rows = await prisma.leadNote.findMany({
        where: { leadId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((note) => ({
        id: note.id,
        leadId: note.leadId,
        authorId: note.authorId,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
      }));
    },
    () =>
      getFallbackStore()
        .notes.filter((note) => note.leadId === leadId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function listLeadMessages(leadId: string) {
  return runWithFallback(
    async () => {
      const thread = await prisma.emailThread.findUnique({
        where: { leadId },
        include: { messages: { orderBy: { sentAt: "asc" } } },
      });
      return (
        thread?.messages.map((message) => ({
          id: message.id,
          leadId,
          direction: message.direction,
          subject: message.subject,
          bodyText: message.bodyText,
          senderEmail: message.senderEmail,
          recipientEmail: message.recipientEmail,
          gmailMessageId: message.gmailMessageId,
          gmailThreadId: message.gmailThreadId,
          sentAt: message.sentAt.toISOString(),
          status: message.status,
        })) ?? []
      );
    },
    () => getFallbackStore().messages.filter((message) => message.leadId === leadId),
  );
}

export async function listLeadActivityLog(leadId: string): Promise<AuditLogRecord[]> {
  return runWithFallback(
    async () => {
      const rows = await prisma.auditLog.findMany({
        where: { leadId },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      return rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        leadId: row.leadId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: (row.metadata as Record<string, unknown> | undefined) ?? undefined,
        createdAt: row.createdAt.toISOString(),
      }));
    },
    () =>
      getFallbackStore()
        .auditLogs.filter((log) => log.leadId === leadId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function listTemplates(): Promise<EmailTemplateRecord[]> {
  return runWithFallback(
    async () => {
      const rows = await prisma.emailTemplate.findMany({ orderBy: { createdAt: "desc" } });
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        mode: row.mode,
        listingId: row.listingId,
        leadStatus: row.leadStatus,
        subject: row.subject,
        body: row.body,
        isActive: row.isActive,
      }));
    },
    () => getFallbackStore().templates,
  );
}

export async function listQualificationRules(): Promise<QualificationRuleRecord[]> {
  return runWithFallback(
    async () => {
      const rows = await prisma.qualificationRule.findMany({ orderBy: { createdAt: "desc" } });
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        listingId: row.listingId,
        isActive: row.isActive,
        weight: row.weight,
        criteria: (row.criteria as QualificationRuleRecord["criteria"]) ?? {},
      }));
    },
    () => getFallbackStore().rules,
  );
}

export async function listLeadQualifications(leadId: string): Promise<LeadQualificationRecord[]> {
  return runWithFallback(
    async () => {
      const rows = await prisma.leadQualification.findMany({
        where: { leadId },
        orderBy: { evaluatedAt: "desc" },
      });
      return rows.map((row) => ({
        id: row.id,
        leadId: row.leadId,
        listingId: row.listingId,
        status: row.status,
        score: row.score,
        notes: row.notes,
        reasons: (row.reasons as string[]) ?? [],
        evaluatedAt: row.evaluatedAt.toISOString(),
      }));
    },
    () =>
      getFallbackStore()
        .qualifications.filter((row) => row.leadId === leadId)
        .sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt)),
  );
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const leads = await listLeads();

  return {
    newInquiries: leads.filter((lead) => lead.status === "NEW" || lead.status === "IMPORTED").length,
    needsReply: leads.filter((lead) => ["NEEDS_REPLY", "NEEDS_MORE_INFO", "NEEDS_REVIEW"].includes(lead.status)).length,
    qualifiedLeads: leads.filter((lead) => lead.status === "QUALIFIED").length,
    followUps: leads.filter((lead) => ["FOLLOW_UP", "FOLLOW_UP_NEEDED"].includes(lead.status)).length,
    showingRequested: leads.filter((lead) => lead.status === "SHOWING_REQUESTED").length,
    applicationRequested: leads.filter((lead) => lead.status === "APPLICATION_REQUESTED").length,
    archived: leads.filter((lead) => ["ARCHIVED", "NOT_QUALIFIED"].includes(lead.status)).length,
  };
}

export async function createLead(input: {
  clientName: string;
  email: string;
  source: LeadRecord["source"] | string;
  inquiryMessage: string;
  listingId?: string | null;
  phone?: string | null;
  originalSender?: string | null;
  inquirySubject?: string | null;
  desiredMoveInDate?: string | null;
  budget?: number | null;
  pets?: string | null;
  occupants?: number | null;
  annualIncome?: number | null;
  employmentDetails?: string | null;
  needsGuarantor?: boolean | null;
  voucherProgram?: string | null;
  showingAvailability?: string | null;
  gmailMessageId?: string | null;
  gmailThreadId?: string | null;
  gmailImportedAt?: string | null;
  sourceDetectionResult?: string | null;
  sourceDetectionConfidence?: number | null;
  listingMatchConfidence?: number | null;
  listingMatchReason?: string | null;
  missingFields?: string[];
  parsedFields?: Record<string, unknown>;
  status?: LeadStatus;
}) {
  const status = input.status ?? "NEW";
  return runWithFallback(
    async () => {
      const row = await prisma.lead.create({
        data: {
          clientName: input.clientName,
          email: input.email,
          phone: input.phone,
          originalSender: input.originalSender,
          inquirySubject: input.inquirySubject,
          source: input.source as never,
          inquiryMessage: input.inquiryMessage,
          listingId: input.listingId || null,
          desiredMoveInDate: toDate(input.desiredMoveInDate),
          budget: input.budget,
          pets: input.pets,
          occupants: input.occupants,
          annualIncome: input.annualIncome,
          employmentDetails: input.employmentDetails,
          needsGuarantor: input.needsGuarantor,
          voucherProgram: input.voucherProgram,
          showingAvailability: input.showingAvailability,
          gmailMessageId: input.gmailMessageId,
          gmailThreadId: input.gmailThreadId,
          gmailImportedAt: toDate(input.gmailImportedAt),
          sourceDetectionResult: input.sourceDetectionResult,
          sourceDetectionConfidence: input.sourceDetectionConfidence,
          listingMatchConfidence: input.listingMatchConfidence,
          listingMatchReason: input.listingMatchReason,
          missingFields: input.missingFields,
          status: status as never,
          responsivenessScore: 0,
          completenessScore: 0,
          parsedFields: input.parsedFields,
        },
      });
      return mapLead(row);
    },
    () => {
      const store = getFallbackStore();
      const lead: LeadRecord = {
        id: makeId("lead"),
        clientName: input.clientName,
        email: input.email,
        phone: input.phone,
        originalSender: input.originalSender,
        inquirySubject: input.inquirySubject,
        source: (input.source as LeadRecord["source"]) || "MANUAL",
        inquiryMessage: input.inquiryMessage,
        listingId: input.listingId || null,
        desiredMoveInDate: input.desiredMoveInDate,
        budget: input.budget,
        pets: input.pets,
        occupants: input.occupants,
        annualIncome: input.annualIncome,
        employmentDetails: input.employmentDetails,
        needsGuarantor: input.needsGuarantor,
        voucherProgram: input.voucherProgram,
        showingAvailability: input.showingAvailability,
        gmailMessageId: input.gmailMessageId,
        gmailThreadId: input.gmailThreadId,
        gmailImportedAt: input.gmailImportedAt,
        sourceDetectionResult: input.sourceDetectionResult,
        sourceDetectionConfidence: input.sourceDetectionConfidence,
        listingMatchConfidence: input.listingMatchConfidence,
        listingMatchReason: input.listingMatchReason,
        missingFields: input.missingFields ?? [],
        status,
        responsivenessScore: 0,
        completenessScore: 0,
        receivedAt: new Date().toISOString(),
        parsedFields: input.parsedFields,
      };
      store.leads.unshift(lead);
      return lead;
    },
  );
}

export async function createListing(input: {
  address: string;
  apartmentNumber: string;
  rent: number;
  beds: number;
  baths: number;
  neighborhood: string;
  petPolicy?: string;
  status: ListingRecord["status"];
}) {
  return runWithFallback(
    async () => {
      const row = await prisma.listing.create({
        data: {
          address: input.address,
          apartmentNumber: input.apartmentNumber,
          rent: input.rent,
          beds: input.beds,
          baths: input.baths,
          neighborhood: input.neighborhood,
          petPolicy: input.petPolicy,
          status: input.status as never,
        },
      });
      return mapListing(row);
    },
    () => {
      const store = getFallbackStore();
      const listing: ListingRecord = {
        id: makeId("listing"),
        address: input.address,
        apartmentNumber: input.apartmentNumber,
        rent: input.rent,
        beds: input.beds,
        baths: input.baths,
        neighborhood: input.neighborhood,
        petPolicy: input.petPolicy,
        incomeRequirementX: 40,
        guarantorRequirementX: 80,
        status: input.status,
      };
      store.listings.unshift(listing);
      return listing;
    },
  );
}

export async function createTemplate(input: {
  name: string;
  category: string;
  mode: EmailTemplateRecord["mode"];
  subject: string;
  body: string;
}) {
  return runWithFallback(
    async () => {
      const row = await prisma.emailTemplate.create({
        data: {
          name: input.name,
          category: input.category,
          mode: input.mode as never,
          subject: input.subject,
          body: input.body,
          isActive: true,
        },
      });
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        mode: row.mode,
        listingId: row.listingId,
        leadStatus: row.leadStatus,
        subject: row.subject,
        body: row.body,
        isActive: row.isActive,
      };
    },
    () => {
      const store = getFallbackStore();
      const template: EmailTemplateRecord = {
        id: makeId("template"),
        name: input.name,
        category: input.category,
        mode: input.mode,
        subject: input.subject,
        body: input.body,
        isActive: true,
      };
      store.templates.unshift(template);
      return template;
    },
  );
}

export async function createRule(input: {
  name: string;
  description: string;
  weight: number;
  listingId?: string;
  criteria: QualificationRuleRecord["criteria"];
}) {
  return runWithFallback(
    async () => {
      const row = await prisma.qualificationRule.create({
        data: {
          name: input.name,
          description: input.description,
          weight: input.weight,
          listingId: input.listingId || null,
          criteria: input.criteria,
          isActive: true,
        },
      });
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        listingId: row.listingId,
        isActive: row.isActive,
        weight: row.weight,
        criteria: row.criteria as QualificationRuleRecord["criteria"],
      };
    },
    () => {
      const store = getFallbackStore();
      const rule: QualificationRuleRecord = {
        id: makeId("rule"),
        name: input.name,
        description: input.description,
        listingId: input.listingId,
        isActive: true,
        weight: input.weight,
        criteria: input.criteria,
      };
      store.rules.unshift(rule);
      return rule;
    },
  );
}

export async function createTeamMember(input: {
  name: string;
  email: string;
  role: TeamUser["role"];
  passwordHash: string;
}) {
  return runWithFallback(
    async () => {
      const row = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: input.role as never,
          passwordHash: input.passwordHash,
        },
      });
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        passwordHash: row.passwordHash,
        isActive: row.isActive,
      };
    },
    () => {
      const store = getFallbackStore();
      const member: TeamUser = {
        id: makeId("user"),
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: input.passwordHash,
        isActive: true,
      };
      store.users.push(member);
      return member;
    },
  );
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  return runWithFallback(
    async () => {
      const row = await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: status as never,
        },
      });
      return mapLead(row);
    },
    () => {
      const store = getFallbackStore();
      const lead = store.leads.find((item) => item.id === leadId);
      if (!lead) return null;
      lead.status = status;
      return lead;
    },
  );
}

export async function updateLeadListing(leadId: string, listingId: string | null) {
  return runWithFallback(
    async () => {
      const row = await prisma.lead.update({
        where: { id: leadId },
        data: { listingId },
      });
      return mapLead(row);
    },
    () => {
      const store = getFallbackStore();
      const lead = store.leads.find((item) => item.id === leadId);
      if (!lead) return null;
      lead.listingId = listingId;
      return lead;
    },
  );
}

export async function saveLeadAiDraft(leadId: string, draftBody: string) {
  return runWithFallback(
    async () => {
      const row = await prisma.lead.update({
        where: { id: leadId },
        data: {
          lastAiDraft: draftBody,
          lastAiDraftGeneratedAt: new Date(),
        },
      });
      return mapLead(row);
    },
    () => {
      const store = getFallbackStore();
      const lead = store.leads.find((item) => item.id === leadId);
      if (!lead) return null;
      lead.lastAiDraft = draftBody;
      lead.lastAiDraftGeneratedAt = new Date().toISOString();
      return lead;
    },
  );
}

export async function assignLead(leadId: string, assignedAgentId: string | null) {
  return runWithFallback(
    async () => {
      const row = await prisma.lead.update({
        where: { id: leadId },
        data: { assignedAgentId },
      });
      return mapLead(row);
    },
    () => {
      const store = getFallbackStore();
      const lead = store.leads.find((item) => item.id === leadId);
      if (!lead) return null;
      lead.assignedAgentId = assignedAgentId;
      return lead;
    },
  );
}

export async function addLeadNote(input: { leadId: string; authorId?: string | null; content: string }) {
  return runWithFallback(
    async () => {
      const row = await prisma.leadNote.create({
        data: {
          leadId: input.leadId,
          authorId: input.authorId,
          content: input.content,
        },
      });
      return {
        id: row.id,
        leadId: row.leadId,
        authorId: row.authorId,
        content: row.content,
        createdAt: row.createdAt.toISOString(),
      };
    },
    () => {
      const store = getFallbackStore();
      const note: LeadNoteRecord = {
        id: makeId("note"),
        leadId: input.leadId,
        authorId: input.authorId,
        content: input.content,
        createdAt: new Date().toISOString(),
      };
      store.notes.unshift(note);
      return note;
    },
  );
}

export async function addOutboundMessage(input: {
  leadId: string;
  subject: string;
  bodyText: string;
  senderEmail: string;
  recipientEmail: string;
  status?: string;
  gmailMessageId?: string;
  gmailThreadId?: string;
}) {
  return runWithFallback(
    async () => {
      let thread = await prisma.emailThread.findUnique({ where: { leadId: input.leadId } });
      if (!thread) {
        thread = await prisma.emailThread.create({
          data: {
            leadId: input.leadId,
            subject: input.subject,
            provider: input.gmailThreadId ? "GMAIL" : "MANUAL",
            externalThreadId: input.gmailThreadId,
          },
        });
      }

      await prisma.emailMessage.create({
        data: {
          threadId: thread.id,
          direction: "OUTBOUND",
          subject: input.subject,
          bodyText: input.bodyText,
          senderEmail: input.senderEmail,
          recipientEmail: input.recipientEmail,
          gmailMessageId: input.gmailMessageId,
          gmailThreadId: input.gmailThreadId,
          status: input.status ?? "SENT",
        },
      });
    },
    () => {
      const store = getFallbackStore();
      store.messages.push({
        id: makeId("msg"),
        leadId: input.leadId,
        direction: "OUTBOUND",
        subject: input.subject,
        bodyText: input.bodyText,
        senderEmail: input.senderEmail,
        recipientEmail: input.recipientEmail,
        gmailMessageId: input.gmailMessageId,
        gmailThreadId: input.gmailThreadId,
        sentAt: new Date().toISOString(),
        status: input.status ?? "SENT",
      });
    },
  );
}

export async function addInboundMessageFromImport(input: {
  leadId: string;
  subject: string;
  bodyText: string;
  senderEmail: string;
  recipientEmail: string;
  gmailMessageId: string;
  gmailThreadId: string;
}) {
  return runWithFallback(
    async () => {
      let thread = await prisma.emailThread.findUnique({ where: { leadId: input.leadId } });
      if (!thread) {
        thread = await prisma.emailThread.create({
          data: {
            leadId: input.leadId,
            subject: input.subject,
            provider: "GMAIL",
            externalThreadId: input.gmailThreadId,
          },
        });
      }

      await prisma.emailMessage.create({
        data: {
          threadId: thread.id,
          direction: "INBOUND",
          subject: input.subject,
          bodyText: input.bodyText,
          senderEmail: input.senderEmail,
          recipientEmail: input.recipientEmail,
          gmailMessageId: input.gmailMessageId,
          gmailThreadId: input.gmailThreadId,
          status: "RECEIVED",
        },
      });
    },
    () => {
      const store = getFallbackStore();
      store.messages.push({
        id: makeId("msg"),
        leadId: input.leadId,
        direction: "INBOUND",
        subject: input.subject,
        bodyText: input.bodyText,
        senderEmail: input.senderEmail,
        recipientEmail: input.recipientEmail,
        gmailMessageId: input.gmailMessageId,
        gmailThreadId: input.gmailThreadId,
        sentAt: new Date().toISOString(),
        status: "RECEIVED",
      });
    },
  );
}

export async function evaluateLead(leadId: string) {
  const lead = await getLeadById(leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }

  const listings = await listListings();
  const listing = listings.find((item) => item.id === lead.listingId);
  const rules = await listQualificationRules();
  const result = evaluateLeadQualification({ lead, listing, rules });

  await runWithFallback(
    async () => {
      await prisma.leadQualification.create({
        data: {
          leadId,
          listingId: listing?.id,
          status: result.status,
          score: result.score,
          notes: result.notes,
          reasons: result.reasons,
        },
      });

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          score: result.score,
          status: qualificationStatusToLeadStatus(result.status),
          qualificationReason: result.notes,
          recommendedNextAction: result.recommendedNextAction,
        },
      });
    },
    () => {
      const store = getFallbackStore();
      store.qualifications.unshift({
        id: makeId("qual"),
        leadId,
        listingId: listing?.id,
        status: result.status,
        score: result.score,
        notes: result.notes,
        reasons: result.reasons,
        evaluatedAt: new Date().toISOString(),
      });
      const mutableLead = store.leads.find((item) => item.id === leadId);
      if (mutableLead) {
        mutableLead.score = result.score;
        mutableLead.status = qualificationStatusToLeadStatus(result.status);
        mutableLead.qualificationReason = result.notes;
        mutableLead.recommendedNextAction = result.recommendedNextAction;
      }
    },
  );

  return result;
}

export async function getReportingSnapshot() {
  const [leads, listings] = await Promise.all([listLeads(), listListings()]);

  const bySource = leads.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.source] = (acc[lead.source] ?? 0) + 1;
    return acc;
  }, {});

  const listingPerformance = listings.map((listing) => {
    const listingLeads = leads.filter((lead) => lead.listingId === listing.id);
    const qualifiedCount = listingLeads.filter((lead) => lead.status === "QUALIFIED").length;
    return {
      listingId: listing.id,
      listingLabel: `${listing.address} ${listing.apartmentNumber}`,
      inquiries: listingLeads.length,
      qualifiedCount,
      qualifiedRate: listingLeads.length ? Math.round((qualifiedCount / listingLeads.length) * 100) : 0,
    };
  });

  return {
    totalInquiries: leads.length,
    qualifiedLeadPercentage: leads.length
      ? Math.round((leads.filter((lead) => lead.status === "QUALIFIED").length / leads.length) * 100)
      : 0,
    bySource,
    listingPerformance,
    showingConversionRate:
      leads.length > 0
        ? Math.round((leads.filter((lead) => lead.status === "SHOWING_REQUESTED").length / leads.length) * 100)
        : 0,
    applicationConversionRate:
      leads.length > 0
        ? Math.round((leads.filter((lead) => lead.status === "APPLICATION_REQUESTED").length / leads.length) * 100)
        : 0,
  };
}
