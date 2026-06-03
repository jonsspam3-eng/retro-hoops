export type UserRole = "ADMIN" | "AGENT" | "ASSISTANT" | "READ_ONLY";
export type LeadStatus =
  | "NEW"
  | "NEEDS_REPLY"
  | "NEEDS_MORE_INFO"
  | "POSSIBLY_QUALIFIED"
  | "QUALIFIED"
  | "NOT_QUALIFIED"
  | "FOLLOW_UP"
  | "SHOWING_REQUESTED"
  | "APPLICATION_REQUESTED"
  | "ARCHIVED";

export type ListingStatus = "ACTIVE" | "PENDING" | "RENTED" | "INACTIVE";
export type InquirySource =
  | "STREETEASY"
  | "ZILLOW"
  | "REALTYMX"
  | "WEBSITE"
  | "EMAIL"
  | "MANUAL"
  | "OTHER";
export type QualificationStatus =
  | "QUALIFIED"
  | "POSSIBLY_QUALIFIED"
  | "NEEDS_MORE_INFO"
  | "NOT_QUALIFIED";
export type EmailMode = "AUTO_SEND" | "DRAFT_REVIEW" | "MANUAL_ONLY";

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
}

export interface ListingRecord {
  id: string;
  address: string;
  apartmentNumber: string;
  rent: number;
  beds: number;
  baths: number;
  neighborhood: string;
  availabilityDate?: string | null;
  agentId?: string | null;
  showingInstructions?: string | null;
  petPolicy?: string | null;
  incomeRequirementX: number;
  guarantorRequirementX: number;
  brokerFeeStatus?: string | null;
  platformLinks?: Record<string, string>;
  status: ListingStatus;
}

export interface LeadRecord {
  id: string;
  clientName: string;
  email: string;
  phone?: string | null;
  listingId?: string | null;
  source: InquirySource;
  inquiryMessage: string;
  desiredMoveInDate?: string | null;
  budget?: number | null;
  pets?: string | null;
  occupants?: number | null;
  annualIncome?: number | null;
  employmentDetails?: string | null;
  needsGuarantor?: boolean | null;
  voucherProgram?: string | null;
  creditReadiness?: string | null;
  status: LeadStatus;
  score?: number | null;
  qualificationReason?: string | null;
  responsivenessScore: number;
  completenessScore: number;
  recommendedNextAction?: string | null;
  assignedAgentId?: string | null;
  followUpDate?: string | null;
  receivedAt: string;
  parsedFields?: Record<string, unknown>;
}

export interface LeadQualificationRecord {
  id: string;
  leadId: string;
  listingId?: string | null;
  status: QualificationStatus;
  score: number;
  notes: string;
  reasons: string[];
  evaluatedAt: string;
}

export interface EmailTemplateRecord {
  id: string;
  name: string;
  category: string;
  mode: EmailMode;
  listingId?: string | null;
  leadStatus?: LeadStatus | null;
  subject: string;
  body: string;
  isActive: boolean;
}

export interface QualificationRuleRecord {
  id: string;
  name: string;
  description: string;
  listingId?: string | null;
  isActive: boolean;
  weight: number;
  criteria: {
    incomeMultiple?: number;
    guarantorMultiple?: number;
    maxOccupantsPerBedroom?: number;
    moveInWindowDays?: number;
    allowPets?: boolean;
  };
}

export interface LeadNoteRecord {
  id: string;
  leadId: string;
  authorId?: string | null;
  content: string;
  createdAt: string;
}

export interface EmailThreadMessage {
  id: string;
  leadId: string;
  direction: "INBOUND" | "OUTBOUND";
  subject: string;
  bodyText: string;
  senderEmail: string;
  recipientEmail: string;
  sentAt: string;
  status: string;
}

export interface DashboardMetrics {
  newInquiries: number;
  needsReply: number;
  qualifiedLeads: number;
  followUps: number;
  showingRequested: number;
  applicationRequested: number;
  archived: number;
}

export const leadStatuses: LeadStatus[] = [
  "NEW",
  "NEEDS_REPLY",
  "NEEDS_MORE_INFO",
  "POSSIBLY_QUALIFIED",
  "QUALIFIED",
  "NOT_QUALIFIED",
  "FOLLOW_UP",
  "SHOWING_REQUESTED",
  "APPLICATION_REQUESTED",
  "ARCHIVED",
];

export const inquirySources: InquirySource[] = [
  "STREETEASY",
  "ZILLOW",
  "REALTYMX",
  "WEBSITE",
  "EMAIL",
  "MANUAL",
  "OTHER",
];
