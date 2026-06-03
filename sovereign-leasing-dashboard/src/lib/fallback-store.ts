import {
  seedEmailMessages,
  seedLeadNotes,
  seedLeads,
  seedListings,
  seedQualificationRules,
  seedQualifications,
  seedTemplates,
  seedUsers,
} from "@/lib/seed-data";
import type {
  EmailTemplateRecord,
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
  messages: typeof seedEmailMessages;
  auditLogs: Array<{
    id: string;
    actorId?: string | null;
    leadId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  }>;
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
