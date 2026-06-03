import { getFallbackStore, makeId } from "@/lib/fallback-store";
import { evaluateLeadQualification, qualificationStatusToLeadStatus } from "@/lib/rules-engine";
import { prisma } from "@/lib/prisma";
import type {
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

function mapListing(listing: any): ListingRecord {
  return {
    id: listing.id,
    address: listing.address,
    apartmentNumber: listing.apartmentNumber,
    rent: listing.rent,
    beds: listing.beds,
    baths: listing.baths,
    neighborhood: listing.neighborhood,
    availabilityDate: listing.availabilityDate?.toISOString?.() ?? listing.availabilityDate ?? null,
    agentId: listing.agentId,
    showingInstructions: listing.showingInstructions,
    petPolicy: listing.petPolicy,
    incomeRequirementX: listing.incomeRequirementX,
    guarantorRequirementX: listing.guarantorRequirementX,
    brokerFeeStatus: listing.brokerFeeStatus,
    platformLinks: listing.platformLinks ?? undefined,
    status: listing.status,
  };
}

function mapLead(lead: any): LeadRecord {
  return {
    id: lead.id,
    clientName: lead.clientName,
    email: lead.email,
    phone: lead.phone,
    listingId: lead.listingId,
    source: lead.source,
    inquiryMessage: lead.inquiryMessage,
    desiredMoveInDate: lead.desiredMoveInDate?.toISOString?.() ?? lead.desiredMoveInDate ?? null,
    budget: lead.budget,
    pets: lead.pets,
    occupants: lead.occupants,
    annualIncome: lead.annualIncome,
    employmentDetails: lead.employmentDetails,
    needsGuarantor: lead.needsGuarantor,
    voucherProgram: lead.voucherProgram,
    creditReadiness: lead.creditReadiness,
    status: lead.status,
    score: lead.score,
    qualificationReason: lead.qualificationReason,
    responsivenessScore: lead.responsivenessScore,
    completenessScore: lead.completenessScore,
    recommendedNextAction: lead.recommendedNextAction,
    assignedAgentId: lead.assignedAgentId,
    followUpDate: lead.followUpDate?.toISOString?.() ?? lead.followUpDate ?? null,
    receivedAt: lead.receivedAt?.toISOString?.() ?? lead.receivedAt,
    parsedFields: lead.parsedFields ?? undefined,
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
      return rows.map(mapListing);
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
          source: filters?.source as any,
          listingId: filters?.listingId,
        },
        orderBy: { receivedAt: "desc" },
      });
      return rows.map(mapLead);
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
          sentAt: message.sentAt.toISOString(),
          status: message.status,
        })) ?? []
      );
    },
    () => getFallbackStore().messages.filter((message) => message.leadId === leadId),
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
    newInquiries: leads.filter((lead) => lead.status === "NEW").length,
    needsReply: leads.filter((lead) => lead.status === "NEEDS_REPLY" || lead.status === "NEEDS_MORE_INFO").length,
    qualifiedLeads: leads.filter((lead) => lead.status === "QUALIFIED").length,
    followUps: leads.filter((lead) => lead.status === "FOLLOW_UP").length,
    showingRequested: leads.filter((lead) => lead.status === "SHOWING_REQUESTED").length,
    applicationRequested: leads.filter((lead) => lead.status === "APPLICATION_REQUESTED").length,
    archived: leads.filter((lead) => lead.status === "ARCHIVED" || lead.status === "NOT_QUALIFIED").length,
  };
}

export function isFallbackMode(): boolean {
  return shouldUseFallback();
}

export async function createLead(input: {
  clientName: string;
  email: string;
  source: string;
  inquiryMessage: string;
  listingId?: string;
}) {
  return runWithFallback(
    async () => {
      const row = await prisma.lead.create({
        data: {
          clientName: input.clientName,
          email: input.email,
          source: input.source as any,
          inquiryMessage: input.inquiryMessage,
          listingId: input.listingId || null,
          status: "NEW",
          responsivenessScore: 0,
          completenessScore: 0,
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
        source: (input.source as LeadRecord["source"]) || "MANUAL",
        inquiryMessage: input.inquiryMessage,
        listingId: input.listingId || null,
        status: "NEW",
        responsivenessScore: 0,
        completenessScore: 0,
        receivedAt: new Date().toISOString(),
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
          status: input.status as any,
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
          mode: input.mode as any,
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
          role: input.role as any,
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
          status: status as any,
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
}) {
  return runWithFallback(
    async () => {
      let thread = await prisma.emailThread.findUnique({ where: { leadId: input.leadId } });
      if (!thread) {
        thread = await prisma.emailThread.create({
          data: {
            leadId: input.leadId,
            subject: input.subject,
            provider: "MANUAL",
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
        sentAt: new Date().toISOString(),
        status: input.status ?? "SENT",
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
