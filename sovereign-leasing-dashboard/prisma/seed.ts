import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const UserRole = {
  ADMIN: "ADMIN",
  AGENT: "AGENT",
  ASSISTANT: "ASSISTANT",
  READ_ONLY: "READ_ONLY",
} as const;

const InquirySource = {
  STREETEASY: "STREETEASY",
  WEBSITE: "WEBSITE",
} as const;

const LeadStatus = {
  QUALIFIED: "QUALIFIED",
  POSSIBLY_QUALIFIED: "POSSIBLY_QUALIFIED",
} as const;

const ListingStatus = {
  ACTIVE: "ACTIVE",
} as const;

const QualificationStatus = {
  QUALIFIED: "QUALIFIED",
  POSSIBLY_QUALIFIED: "POSSIBLY_QUALIFIED",
} as const;

const EmailMode = {
  DRAFT_REVIEW: "DRAFT_REVIEW",
  AUTO_SEND: "AUTO_SEND",
} as const;

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.aiRecommendation.deleteMany();
  await prisma.showingAppointment.deleteMany();
  await prisma.leadFollowUp.deleteMany();
  await prisma.followUpStep.deleteMany();
  await prisma.followUpSequence.deleteMany();
  await prisma.emailMessage.deleteMany();
  await prisma.emailThread.deleteMany();
  await prisma.leadQualification.deleteMany();
  await prisma.leadNote.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.qualificationRule.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.applicationChecklist.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash("Sovereign123!", 10);

  const [admin, agent, assistant, viewer] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Ariana Chen",
        email: "Admin@srealty.nyc",
        role: UserRole.ADMIN,
        phone: "212-555-1100",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        name: "Marcus Bell",
        email: "mbell@sovereignnyc.com",
        role: UserRole.AGENT,
        phone: "212-555-2200",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        name: "Sofia Ruiz",
        email: "ops@sovereignnyc.com",
        role: UserRole.ASSISTANT,
        phone: "212-555-3300",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        name: "Reporting Viewer",
        email: "viewer@sovereignnyc.com",
        role: UserRole.READ_ONLY,
        passwordHash,
      },
    }),
  ]);

  const tribeca = await prisma.listing.create({
    data: {
      address: "101 Warren St",
      apartmentNumber: "2A",
      rent: 5200,
      beds: 2,
      baths: 1,
      neighborhood: "Tribeca",
      availabilityDate: new Date("2026-06-20T00:00:00.000Z"),
      agentId: agent.id,
      showingInstructions: "24-hour notice. Building concierge check-in required.",
      petPolicy: "Cats allowed, small dogs case-by-case",
      incomeRequirementX: 40,
      guarantorRequirementX: 80,
      brokerFeeStatus: "No Fee",
      platformLinks: {
        streeteasy: "https://streeteasy.com/building/101-warren-st-2a",
      },
      status: ListingStatus.ACTIVE,
    },
  });

  const ues = await prisma.listing.create({
    data: {
      address: "245 E 87th St",
      apartmentNumber: "11F",
      rent: 3600,
      beds: 1,
      baths: 1,
      neighborhood: "Upper East Side",
      availabilityDate: new Date("2026-06-15T00:00:00.000Z"),
      agentId: agent.id,
      showingInstructions: "Tenant occupied. Tuesday/Thursday showings only.",
      petPolicy: "No dogs, cats allowed",
      incomeRequirementX: 40,
      guarantorRequirementX: 80,
      brokerFeeStatus: "15% Fee",
      platformLinks: {
        zillow: "https://www.zillow.com/homedetails/245-E-87th-St-11F",
      },
      status: ListingStatus.ACTIVE,
    },
  });

  const leadJordan = await prisma.lead.create({
    data: {
      clientName: "Jordan Smith",
      email: "jordan.smith@email.com",
      phone: "917-555-9911",
      listingId: tribeca.id,
      source: InquirySource.STREETEASY,
      inquiryMessage:
        "Hi, I am interested in 101 Warren St 2A. Looking to move by July 1st. We are 2 working professionals with one cat.",
      desiredMoveInDate: new Date("2026-07-01T00:00:00.000Z"),
      budget: 5600,
      pets: "1 cat",
      occupants: 2,
      annualIncome: 235000,
      employmentDetails: "Both full-time employed",
      needsGuarantor: false,
      creditReadiness: "700+",
      status: LeadStatus.QUALIFIED,
      score: 86,
      qualificationReason: "Income and occupancy fit listing requirements.",
      responsivenessScore: 80,
      completenessScore: 90,
      recommendedNextAction: "Offer showing slots for this week.",
      assignedAgentId: agent.id,
      followUpDate: new Date("2026-06-04T15:00:00.000Z"),
      receivedAt: new Date("2026-06-03T14:10:00.000Z"),
      parsedFields: {
        listingAddress: "101 Warren St",
        apartmentNumber: "2A",
        sourcePlatform: "StreetEasy",
      },
    },
  });

  const leadPriya = await prisma.lead.create({
    data: {
      clientName: "Priya Patel",
      email: "priya@email.com",
      listingId: ues.id,
      source: InquirySource.WEBSITE,
      inquiryMessage:
        "Interested in 245 E 87th St apt 11F. I am a student with guarantor support and flexible move-in date.",
      desiredMoveInDate: new Date("2026-06-22T00:00:00.000Z"),
      budget: 3500,
      pets: "No pets",
      occupants: 1,
      annualIncome: 42000,
      employmentDetails: "Graduate student",
      needsGuarantor: true,
      creditReadiness: "Limited history",
      status: LeadStatus.POSSIBLY_QUALIFIED,
      score: 61,
      qualificationReason: "Requires guarantor income verification.",
      responsivenessScore: 70,
      completenessScore: 75,
      recommendedNextAction: "Request guarantor documents and preferred showing windows.",
      receivedAt: new Date("2026-06-03T16:40:00.000Z"),
      parsedFields: {
        listingAddress: "245 E 87th St",
        apartmentNumber: "11F",
        sourcePlatform: "Website",
      },
    },
  });

  await prisma.leadQualification.createMany({
    data: [
      {
        leadId: leadJordan.id,
        listingId: tribeca.id,
        status: QualificationStatus.QUALIFIED,
        score: 86,
        notes: "Income and occupancy strongly match requirements.",
        reasons: ["Income exceeds 40x rent", "Move-in timeline fits", "Pet policy compatible"],
      },
      {
        leadId: leadPriya.id,
        listingId: ues.id,
        status: QualificationStatus.POSSIBLY_QUALIFIED,
        score: 61,
        notes: "Guarantor path may qualify the lead.",
        reasons: ["Needs guarantor verification", "Move-in timeline fits"],
      },
    ],
  });

  await prisma.qualificationRule.createMany({
    data: [
      {
        name: "Default Income-to-Rent Requirement",
        description: "Household income should be at least 40x monthly rent.",
        isActive: true,
        weight: 30,
        createdById: admin.id,
        criteria: {
          incomeMultiple: 40,
          guarantorMultiple: 80,
        },
      },
      {
        name: "Move-In Window",
        description: "Move-in should be within 60 days of inquiry.",
        isActive: true,
        weight: 15,
        createdById: assistant.id,
        criteria: {
          moveInWindowDays: 60,
        },
      },
    ],
  });

  await prisma.emailTemplate.createMany({
    data: [
      {
        name: "Initial Qualification Reply",
        category: "INITIAL_REPLY",
        mode: EmailMode.DRAFT_REVIEW,
        subject: "Thanks for your inquiry about {{listing_address}} {{apartment_number}}",
        body:
          "Hi {{client_name}},\n\nThanks for your interest in {{listing_address}} {{apartment_number}} (rent: ${{rent}}). Please share your move-in date, household size, pets, annual income, guarantor need, and preferred showing times.\n\nBest,\n{{agent_name}}",
      },
      {
        name: "Follow-Up 24h",
        category: "FOLLOW_UP",
        mode: EmailMode.AUTO_SEND,
        subject: "Quick follow-up on {{listing_address}}",
        body:
          "Hi {{client_name}},\n\nFollowing up on your inquiry. If still interested, share your qualification details and preferred showing windows.\n\nBest,\n{{agent_name}}",
      },
    ],
  });

  await prisma.applicationChecklist.create({
    data: {
      listingId: tribeca.id,
      name: "Tribeca Application Packet",
      items: [
        "Photo ID",
        "Proof of income",
        "Bank statements",
        "Employment letter",
        "Guarantor documents if applicable",
      ],
    },
  });

  await prisma.emailThread.create({
    data: {
      leadId: leadJordan.id,
      provider: "MANUAL",
      subject: "Inquiry for 101 Warren St 2A",
      messages: {
        create: [
          {
            direction: "INBOUND",
            subject: "Inquiry for 101 Warren St 2A",
            bodyText:
              "Hi, I am interested in 101 Warren St 2A. Looking to move by July 1st. We are 2 working professionals with one cat.",
            senderEmail: "jordan.smith@email.com",
            recipientEmail: "leasing@sovereignnyc.com",
          },
          {
            direction: "OUTBOUND",
            subject: "Re: Inquiry for 101 Warren St 2A",
            bodyText:
              "Thanks Jordan. Can you share annual household income and preferred showing windows this week?",
            senderEmail: "mbell@sovereignnyc.com",
            recipientEmail: "jordan.smith@email.com",
          },
        ],
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      leadId: leadJordan.id,
      action: "SEED_DATA_INITIALIZED",
      entityType: "SYSTEM",
      entityId: "seed",
      metadata: {
        users: [admin.id, agent.id, assistant.id, viewer.id],
      },
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
