import type {
  EmailTemplateRecord,
  LeadRecord,
  LeadQualificationRecord,
  LeadStatus,
  ListingRecord,
  QualificationRuleRecord,
  TeamUser,
} from "@/lib/types";

const pwHash = "$2b$10$C5YOhMLFQgwRfySkzWf0JeEFnWzrbeZSvf524qw3HvNhnXeHNdvpW";

export const seedUsers: TeamUser[] = [
  {
    id: "user_admin",
    name: "Ariana Chen",
    email: "admin@sovereignnyc.com",
    phone: "212-555-1100",
    role: "ADMIN",
    passwordHash: pwHash,
    isActive: true,
  },
  {
    id: "user_agent_1",
    name: "Marcus Bell",
    email: "mbell@sovereignnyc.com",
    phone: "212-555-2200",
    role: "AGENT",
    passwordHash: pwHash,
    isActive: true,
  },
  {
    id: "user_assistant_1",
    name: "Sofia Ruiz",
    email: "ops@sovereignnyc.com",
    phone: "212-555-3300",
    role: "ASSISTANT",
    passwordHash: pwHash,
    isActive: true,
  },
  {
    id: "user_viewer_1",
    name: "Reporting Viewer",
    email: "viewer@sovereignnyc.com",
    role: "READ_ONLY",
    passwordHash: pwHash,
    isActive: true,
  },
];

export const seedListings: ListingRecord[] = [
  {
    id: "listing_tribeca_2a",
    address: "101 Warren St",
    apartmentNumber: "2A",
    rent: 5200,
    beds: 2,
    baths: 1,
    neighborhood: "Tribeca",
    availabilityDate: "2026-06-20T00:00:00.000Z",
    agentId: "user_agent_1",
    showingInstructions: "24-hour notice. Building concierge check-in required.",
    petPolicy: "Cats allowed, small dogs case-by-case",
    incomeRequirementX: 40,
    guarantorRequirementX: 80,
    brokerFeeStatus: "No Fee",
    platformLinks: {
      streeteasy: "https://streeteasy.com/building/101-warren-st-2a",
      realtymx: "https://realtymx.com/listings/101-warren-2a",
    },
    status: "ACTIVE",
  },
  {
    id: "listing_ues_11f",
    address: "245 E 87th St",
    apartmentNumber: "11F",
    rent: 3600,
    beds: 1,
    baths: 1,
    neighborhood: "Upper East Side",
    availabilityDate: "2026-06-15T00:00:00.000Z",
    agentId: "user_agent_1",
    showingInstructions: "Tenant occupied. Tuesday/Thursday showings only.",
    petPolicy: "No dogs, cats allowed",
    incomeRequirementX: 40,
    guarantorRequirementX: 80,
    brokerFeeStatus: "15% Fee",
    platformLinks: {
      zillow: "https://www.zillow.com/homedetails/245-E-87th-St-11F",
    },
    status: "ACTIVE",
  },
];

export const seedLeads: LeadRecord[] = [
  {
    id: "lead_jordan_1",
    clientName: "Jordan Smith",
    email: "jordan.smith@email.com",
    phone: "917-555-9911",
    listingId: "listing_tribeca_2a",
    source: "STREETEASY",
    inquiryMessage:
      "Hi, I am interested in 101 Warren St 2A. Looking to move by July 1st. We are 2 working professionals with one cat.",
    desiredMoveInDate: "2026-07-01T00:00:00.000Z",
    budget: 5600,
    pets: "1 cat",
    occupants: 2,
    annualIncome: 235000,
    employmentDetails: "Both full-time employed",
    needsGuarantor: false,
    creditReadiness: "700+",
    status: "QUALIFIED",
    score: 86,
    qualificationReason: "Income and occupancy fit listing requirements.",
    responsivenessScore: 80,
    completenessScore: 90,
    recommendedNextAction: "Offer showing slots for this week.",
    assignedAgentId: "user_agent_1",
    followUpDate: "2026-06-04T15:00:00.000Z",
    receivedAt: "2026-06-03T14:10:00.000Z",
    parsedFields: {
      listingAddress: "101 Warren St",
      apartmentNumber: "2A",
      sourcePlatform: "StreetEasy",
    },
  },
  {
    id: "lead_priya_1",
    clientName: "Priya Patel",
    email: "priya@email.com",
    listingId: "listing_ues_11f",
    source: "WEBSITE",
    inquiryMessage:
      "Interested in 245 E 87th St apt 11F. I am a student with guarantor support and flexible move-in date.",
    desiredMoveInDate: "2026-06-22T00:00:00.000Z",
    budget: 3500,
    pets: "No pets",
    occupants: 1,
    annualIncome: 42000,
    employmentDetails: "Graduate student",
    needsGuarantor: true,
    creditReadiness: "Limited history",
    status: "POSSIBLY_QUALIFIED",
    score: 61,
    qualificationReason: "Requires guarantor income verification.",
    responsivenessScore: 70,
    completenessScore: 75,
    recommendedNextAction: "Request guarantor documents and preferred showing windows.",
    receivedAt: "2026-06-03T16:40:00.000Z",
    parsedFields: {
      listingAddress: "245 E 87th St",
      apartmentNumber: "11F",
      sourcePlatform: "Website",
    },
  },
  {
    id: "lead_lee_1",
    clientName: "Daniel Lee",
    email: "dlee@email.com",
    source: "EMAIL",
    inquiryMessage:
      "Hello, is your Tribeca 2 bedroom still available? We can move immediately but have not finalized income docs yet.",
    budget: 4800,
    pets: "Dog",
    occupants: 3,
    status: "NEEDS_MORE_INFO",
    score: 38,
    qualificationReason: "Missing income details and pet policy mismatch risk.",
    responsivenessScore: 60,
    completenessScore: 40,
    recommendedNextAction: "Send qualification questionnaire and clarify pet policy.",
    receivedAt: "2026-06-03T17:20:00.000Z",
    parsedFields: {
      listingAddress: "101 Warren St",
      sourcePlatform: "Email",
    },
  },
];

export const seedQualificationRules: QualificationRuleRecord[] = [
  {
    id: "rule_income_default",
    name: "Default Income-to-Rent Requirement",
    description: "Household income should be at least 40x monthly rent.",
    isActive: true,
    weight: 30,
    criteria: {
      incomeMultiple: 40,
      guarantorMultiple: 80,
    },
  },
  {
    id: "rule_movein_window",
    name: "Move-In Window",
    description: "Move-in should be within 60 days of inquiry.",
    isActive: true,
    weight: 15,
    criteria: {
      moveInWindowDays: 60,
    },
  },
  {
    id: "rule_pet_fit_tribeca",
    name: "Tribeca Pet Fit",
    description: "Tribeca listing accepts cats and small dogs only.",
    listingId: "listing_tribeca_2a",
    isActive: true,
    weight: 10,
    criteria: {
      allowPets: true,
    },
  },
];

export const seedTemplates: EmailTemplateRecord[] = [
  {
    id: "template_initial_reply",
    name: "Initial Qualification Reply",
    category: "INITIAL_REPLY",
    mode: "DRAFT_REVIEW",
    subject: "Thanks for your inquiry about {{listing_address}} {{apartment_number}}",
    body:
      "Hi {{client_name}},\n\nThanks for your interest in {{listing_address}} {{apartment_number}} (rent: ${{rent}}). To help us schedule the right next steps, can you confirm your ideal move-in date, household size, pets, annual income, guarantor need, and showing availability this week?\n\nBest,\n{{agent_name}}\nSovereign Realty NYC",
    isActive: true,
  },
  {
    id: "template_followup_24h",
    name: "Follow-Up 24h",
    category: "FOLLOW_UP",
    mode: "AUTO_SEND",
    subject: "Quick follow-up on {{listing_address}}",
    body:
      "Hi {{client_name}},\n\nJust checking in regarding your inquiry on {{listing_address}} {{apartment_number}}. If you are still interested, share your preferred showing times and qualification details so we can move quickly.\n\nBest,\n{{agent_name}}",
    isActive: true,
  },
  {
    id: "template_application_ready",
    name: "Application Readiness",
    category: "APPLICATION",
    mode: "DRAFT_REVIEW",
    subject: "Application instructions for {{listing_address}}",
    body:
      "Hi {{client_name}},\n\nGreat news — based on your profile, you can begin the application process. Please submit: photo ID, proof of income, bank statements, and guarantor documents if needed. Application link: {{application_link}}\n\nThanks,\n{{agent_name}}",
    isActive: true,
  },
];

export const seedQualifications: LeadQualificationRecord[] = [
  {
    id: "qual_1",
    leadId: "lead_jordan_1",
    listingId: "listing_tribeca_2a",
    status: "QUALIFIED",
    score: 86,
    notes: "Income and occupancy strongly match requirements.",
    reasons: ["Income exceeds 40x rent", "Move-in timeline fits", "Pet policy compatible"],
    evaluatedAt: "2026-06-03T14:15:00.000Z",
  },
  {
    id: "qual_2",
    leadId: "lead_priya_1",
    listingId: "listing_ues_11f",
    status: "POSSIBLY_QUALIFIED",
    score: 61,
    notes: "Guarantor path may qualify the lead.",
    reasons: ["Needs guarantor verification", "Move-in timeline fits"],
    evaluatedAt: "2026-06-03T16:50:00.000Z",
  },
];

export const seedEmailMessages = [
  {
    id: "msg_1",
    leadId: "lead_jordan_1",
    direction: "INBOUND" as const,
    subject: "Inquiry for 101 Warren St 2A",
    bodyText:
      "Hi, I am interested in 101 Warren St 2A. Looking to move by July 1st. We are 2 working professionals with one cat.",
    senderEmail: "jordan.smith@email.com",
    recipientEmail: "leasing@sovereignnyc.com",
    sentAt: "2026-06-03T14:10:00.000Z",
    status: "RECEIVED",
  },
  {
    id: "msg_2",
    leadId: "lead_jordan_1",
    direction: "OUTBOUND" as const,
    subject: "Re: Inquiry for 101 Warren St 2A",
    bodyText:
      "Thanks Jordan. Can you share household annual income and preferred showing windows this week?",
    senderEmail: "mbell@sovereignnyc.com",
    recipientEmail: "jordan.smith@email.com",
    sentAt: "2026-06-03T14:20:00.000Z",
    status: "SENT",
  },
  {
    id: "msg_3",
    leadId: "lead_priya_1",
    direction: "INBOUND" as const,
    subject: "Website inquiry - 245 E 87th St 11F",
    bodyText:
      "Interested in 245 E 87th St apt 11F. I am a student with guarantor support and flexible move-in date.",
    senderEmail: "priya@email.com",
    recipientEmail: "leasing@sovereignnyc.com",
    sentAt: "2026-06-03T16:40:00.000Z",
    status: "RECEIVED",
  },
];

export const seedLeadNotes = [
  {
    id: "note_1",
    leadId: "lead_priya_1",
    authorId: "user_assistant_1",
    content: "Requested guarantor employment letter and tax return summary.",
    createdAt: "2026-06-03T16:55:00.000Z",
  },
];

export const seedFollowUpPlan = {
  name: "Default leasing follow-up",
  steps: [
    { step: 1, delayHours: 0, template: "Initial reply" },
    { step: 2, delayHours: 24, template: "Follow-up 24h" },
    { step: 3, delayHours: 48, template: "Follow-up 48h" },
    { step: 4, delayHours: 144, template: "Final follow-up" },
  ],
};

export function createLeadStatusSummary(leads: LeadRecord[]): Record<LeadStatus, number> {
  return leads.reduce(
    (acc, lead) => {
      acc[lead.status] += 1;
      return acc;
    },
    {
      NEW: 0,
      NEEDS_REPLY: 0,
      NEEDS_MORE_INFO: 0,
      POSSIBLY_QUALIFIED: 0,
      QUALIFIED: 0,
      NOT_QUALIFIED: 0,
      FOLLOW_UP: 0,
      SHOWING_REQUESTED: 0,
      APPLICATION_REQUESTED: 0,
      ARCHIVED: 0,
    },
  );
}
