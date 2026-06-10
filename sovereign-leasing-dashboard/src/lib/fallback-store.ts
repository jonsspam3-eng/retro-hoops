import {
  seedEmailMessages,
  seedFollowUpSequences,
  seedLeadNotes,
  seedLeads,
  seedListings,
  seedMockGmailMessages,
  seedQualificationRules,
  seedQualifications,
  seedTemplates,
  seedUsers,
} from "@/lib/seed-data";
import type {
  AuditLogRecord,
  EmailTemplateRecord,
  FollowUpSequenceRecord,
  GmailConnectionRecord,
  EmailThreadMessage,
  GmailInquiryMessage,
  LeadNoteRecord,
  LeadQualificationRecord,
  LeadRecord,
  ListingRecord,
  QualificationRuleRecord,
  TeamUser,
} from "@/lib/types";

type InMemoryStore = {
  users: TeamUser[];
  listings: ListingRecord[];
  leads: LeadRecord[];
  qualifications: LeadQualificationRecord[];
  templates: EmailTemplateRecord[];
  rules: QualificationRuleRecord[];
  notes: LeadNoteRecord[];
  messages: EmailThreadMessage[];
  auditLogs: AuditLogRecord[];
  gmailConnections: Array<
    GmailConnectionRecord & {
      accessTokenEncrypted: string;
      refreshTokenEncrypted?: string | null;
      scope?: string | null;
      tokenType?: string | null;
    }
  >;
  mockGmailMessages: GmailInquiryMessage[];
  mockDrafts: Array<{
    id: string;
    threadId?: string;
    to: string;
    subject: string;
    body: string;
    createdAt: string;
  }>;
  followUpSequences: FollowUpSequenceRecord[];
};

const globalStore = globalThis as unknown as { __sovereignStore?: InMemoryStore };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function makeStore(): InMemoryStore {
  return {
    users: clone(seedUsers),
    listings: clone(seedListings),
    leads: clone(seedLeads),
    qualifications: clone(seedQualifications),
    templates: clone(seedTemplates),
    rules: clone(seedQualificationRules),
    notes: clone(seedLeadNotes),
    messages: clone(seedEmailMessages),
    auditLogs: [],
    gmailConnections: [],
    mockGmailMessages: clone(seedMockGmailMessages),
    mockDrafts: [],
    followUpSequences: clone(seedFollowUpSequences),
  };
}

export function getFallbackStore(): InMemoryStore {
  if (!globalStore.__sovereignStore) {
    globalStore.__sovereignStore = makeStore();
  }

  return globalStore.__sovereignStore;
}

export function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
