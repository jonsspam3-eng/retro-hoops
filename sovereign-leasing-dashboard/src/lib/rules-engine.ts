import type {
  LeadRecord,
  LeadStatus,
  ListingRecord,
  QualificationRuleRecord,
  QualificationStatus,
} from "@/lib/types";

export type QualificationResult = {
  status: QualificationStatus;
  score: number;
  notes: string;
  reasons: string[];
  recommendedNextAction: string;
};

function daysUntilMoveIn(lead: LeadRecord): number | null {
  if (!lead.desiredMoveInDate) {
    return null;
  }

  const moveIn = new Date(lead.desiredMoveInDate).getTime();
  const today = Date.now();
  return Math.max(0, Math.round((moveIn - today) / (1000 * 60 * 60 * 24)));
}

function statusFromScore(score: number): QualificationStatus {
  if (score >= 75) return "QUALIFIED";
  if (score >= 50) return "POSSIBLY_QUALIFIED";
  if (score >= 30) return "NEEDS_MORE_INFO";
  return "NOT_QUALIFIED";
}

export function qualificationStatusToLeadStatus(status: QualificationStatus): LeadStatus {
  switch (status) {
    case "QUALIFIED":
      return "QUALIFIED";
    case "POSSIBLY_QUALIFIED":
      return "POSSIBLY_QUALIFIED";
    case "NEEDS_MORE_INFO":
      return "NEEDS_MORE_INFO";
    default:
      return "NOT_QUALIFIED";
  }
}

export function evaluateLeadQualification({
  lead,
  listing,
  rules,
}: {
  lead: LeadRecord;
  listing?: ListingRecord | null;
  rules: QualificationRuleRecord[];
}): QualificationResult {
  const activeRules = rules.filter((rule) => rule.isActive && (!rule.listingId || rule.listingId === listing?.id));
  const fallbackIncomeMultiple = listing?.incomeRequirementX ?? 40;
  const fallbackGuarantorMultiple = listing?.guarantorRequirementX ?? 80;
  const fallbackMoveInDays = 60;
  const fallbackMaxOccupantsPerBedroom = 2;

  let score = 0;
  const reasons: string[] = [];

  const incomeMultiple =
    activeRules.find((rule) => rule.criteria.incomeMultiple)?.criteria.incomeMultiple ?? fallbackIncomeMultiple;
  const guarantorMultiple =
    activeRules.find((rule) => rule.criteria.guarantorMultiple)?.criteria.guarantorMultiple ?? fallbackGuarantorMultiple;
  const moveInWindow =
    activeRules.find((rule) => rule.criteria.moveInWindowDays)?.criteria.moveInWindowDays ?? fallbackMoveInDays;
  const maxOccupantsPerBedroom =
    activeRules.find((rule) => rule.criteria.maxOccupantsPerBedroom)?.criteria.maxOccupantsPerBedroom ??
    fallbackMaxOccupantsPerBedroom;

  if (!listing) {
    score += 8;
    reasons.push("Listing match pending; base score applied until listing assignment.");
  }

  if (listing && lead.annualIncome) {
    const requiredIncome = listing.rent * incomeMultiple;
    if (lead.annualIncome >= requiredIncome) {
      score += 35;
      reasons.push(`Income appears strong (${lead.annualIncome.toLocaleString()} >= ${requiredIncome.toLocaleString()}).`);
    } else if (lead.needsGuarantor) {
      score += 20;
      reasons.push(
        `Income below ${incomeMultiple}x, but guarantor path exists (target ${guarantorMultiple}x for guarantor).`,
      );
    } else {
      score += 6;
      reasons.push(`Income appears below ${incomeMultiple}x requirement.`);
    }
  } else {
    reasons.push("Annual income missing; qualification cannot be finalized.");
  }

  const moveInDays = daysUntilMoveIn(lead);
  if (moveInDays === null) {
    reasons.push("Move-in timeline missing.");
  } else if (moveInDays <= moveInWindow) {
    score += 15;
    reasons.push(`Move-in timeline (${moveInDays} days) fits current availability window.`);
  } else {
    score += 7;
    reasons.push(`Move-in timeline (${moveInDays} days) is outside ideal ${moveInWindow}-day window.`);
  }

  if (listing && lead.occupants) {
    const occupancyLimit = Math.max(1, listing.beds * maxOccupantsPerBedroom);
    if (lead.occupants <= occupancyLimit) {
      score += 15;
      reasons.push(`Occupancy (${lead.occupants}) fits policy for ${listing.beds}-bed listing.`);
    } else {
      reasons.push(`Occupancy (${lead.occupants}) may exceed policy (${occupancyLimit}).`);
    }
  } else {
    reasons.push("Occupancy data incomplete.");
  }

  const petPolicyText = listing?.petPolicy?.toLowerCase() ?? "";
  const petText = lead.pets?.toLowerCase() ?? "";
  if (!lead.pets) {
    reasons.push("Pet information missing.");
  } else if (petPolicyText.includes("no") && petText.includes("dog")) {
    reasons.push("Pet policy conflict detected for dogs.");
  } else {
    score += 10;
    reasons.push("Pet profile appears compatible or reviewable.");
  }

  if (lead.employmentDetails) {
    score += 8;
    reasons.push("Employment details provided.");
  }

  if (lead.creditReadiness) {
    score += 5;
    reasons.push("Credit readiness details provided.");
  }

  const completenessFields = [
    lead.desiredMoveInDate,
    lead.occupants,
    lead.annualIncome,
    lead.pets,
    lead.employmentDetails,
    lead.needsGuarantor,
  ];
  const completeness = Math.round(
    (completenessFields.filter((value) => value !== null && value !== undefined && value !== "").length /
      completenessFields.length) *
      100,
  );
  score += Math.round(completeness / 10);

  score = Math.max(0, Math.min(100, score));
  const status = statusFromScore(score);

  let recommendedNextAction = "Send a qualification follow-up and gather missing details.";
  if (status === "QUALIFIED") {
    recommendedNextAction = "Offer showing windows and move to application readiness if showing completes.";
  } else if (status === "POSSIBLY_QUALIFIED") {
    recommendedNextAction = "Request missing documentation and confirm guarantor/income details.";
  } else if (status === "NOT_QUALIFIED") {
    recommendedNextAction = "Escalate to admin for manual review and alternate listing suggestion.";
  }

  return {
    status,
    score,
    notes: reasons.join(" "),
    reasons,
    recommendedNextAction,
  };
}
