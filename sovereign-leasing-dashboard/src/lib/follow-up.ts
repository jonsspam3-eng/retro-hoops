import type { FollowUpStage, LeadRecord, ListingRecord } from "@/lib/types";

export const defaultFollowUpStepHours = [24, 48, 144];

export const followUpPauseReasons = [
  "CLIENT_REPLIED",
  "LEAD_ARCHIVED",
  "NOT_INTERESTED",
  "SHOWING_SCHEDULED",
  "APPLICATION_INSTRUCTIONS_SENT",
  "LISTING_INACTIVE",
  "MANUAL_PAUSE",
  "NEWER_GMAIL_CLIENT_RESPONSE",
] as const;

export type FollowUpPauseReason = (typeof followUpPauseReasons)[number];

export function toDateOrNull(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function calculateNextFollowUpAt(input: {
  lastContactedAt?: string | null;
  lastClientReplyAt?: string | null;
  followUpAttemptCount?: number;
  customStepHours?: number[];
}): string | null {
  const lastContactedAt = toDateOrNull(input.lastContactedAt);
  if (!lastContactedAt) return null;

  const lastClientReplyAt = toDateOrNull(input.lastClientReplyAt);
  if (lastClientReplyAt && lastClientReplyAt >= lastContactedAt) return null;

  const stepHours = input.customStepHours?.length ? input.customStepHours : defaultFollowUpStepHours;
  const currentAttempt = Math.max(0, input.followUpAttemptCount ?? 0);
  const nextDelay = stepHours[Math.min(currentAttempt, stepHours.length - 1)];
  const nextAt = new Date(lastContactedAt.getTime() + nextDelay * 60 * 60 * 1000);
  return nextAt.toISOString();
}

export function determineFollowUpStage(attemptCount: number): FollowUpStage {
  if (attemptCount <= 0) return "INITIAL_REPLY";
  if (attemptCount === 1) return "FOLLOW_UP_1";
  if (attemptCount === 2) return "FOLLOW_UP_2";
  if (attemptCount === 3) return "FINAL_FOLLOW_UP";
  return "STALE_RECOMMENDED";
}

export function detectPauseReason(input: {
  lead: LeadRecord;
  listing?: ListingRecord | null;
  hasNewerClientReplyInThread?: boolean;
}): FollowUpPauseReason | null {
  const { lead, listing } = input;

  if (lead.followUpPaused && lead.followUpPauseReason) {
    return lead.followUpPauseReason as FollowUpPauseReason;
  }
  if (lead.status === "ARCHIVED") return "LEAD_ARCHIVED";
  if (lead.status === "NOT_QUALIFIED") return "NOT_INTERESTED";
  if (lead.showingStatus === "SHOWING_CONFIRMED") return "SHOWING_SCHEDULED";
  if (lead.applicationInstructionsDraftedAt) return "APPLICATION_INSTRUCTIONS_SENT";
  if (listing && ["INACTIVE", "RENTED"].includes(listing.status)) return "LISTING_INACTIVE";
  if (input.hasNewerClientReplyInThread) return "NEWER_GMAIL_CLIENT_RESPONSE";

  const lastClientReplyAt = toDateOrNull(lead.lastClientReplyAt);
  const lastContactedAt = toDateOrNull(lead.lastContactedAt);
  if (lastClientReplyAt && (!lastContactedAt || lastClientReplyAt >= lastContactedAt)) {
    return "CLIENT_REPLIED";
  }

  return null;
}

export function groupPipelineLeads(leads: LeadRecord[], now = new Date()) {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const dueToday: LeadRecord[] = [];
  const overdue: LeadRecord[] = [];
  const waitingOnClient: LeadRecord[] = [];
  const waitingOnAgent: LeadRecord[] = [];
  const qualifiedNoShowing: LeadRecord[] = [];
  const draftCreatedNotSent: LeadRecord[] = [];
  const staleRecommended: LeadRecord[] = [];

  for (const lead of leads) {
    const nextFollowUp = toDateOrNull(lead.nextFollowUpAt);
    const lastContacted = toDateOrNull(lead.lastContactedAt);
    const lastClientReply = toDateOrNull(lead.lastClientReplyAt);

    if (nextFollowUp && nextFollowUp >= startOfDay && nextFollowUp < endOfDay && !lead.followUpPaused) {
      dueToday.push(lead);
    }
    if (nextFollowUp && nextFollowUp < now && !lead.followUpPaused) {
      overdue.push(lead);
    }
    if (lead.followUpPaused && lead.followUpPauseReason === "MANUAL_PAUSE") {
      waitingOnAgent.push(lead);
    }
    if (
      lastContacted &&
      (!lastClientReply || lastClientReply < lastContacted) &&
      !lead.followUpPaused &&
      lead.status !== "ARCHIVED"
    ) {
      waitingOnClient.push(lead);
    }
    if (lead.status === "QUALIFIED" && (!lead.showingStatus || lead.showingStatus === "NOT_REQUESTED")) {
      qualifiedNoShowing.push(lead);
    }
    if (lead.status === "DRAFT_CREATED") {
      draftCreatedNotSent.push(lead);
    }
    if (lead.followUpStage === "STALE_RECOMMENDED" || (lead.followUpAttemptCount ?? 0) >= 4) {
      staleRecommended.push(lead);
    }
  }

  return {
    dueToday,
    overdue,
    waitingOnClient,
    waitingOnAgent,
    qualifiedNoShowing,
    draftCreatedNotSent,
    staleRecommended,
  };
}
