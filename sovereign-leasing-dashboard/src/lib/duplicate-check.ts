import type { LeadRecord } from "@/lib/types";

export type DuplicateResult = {
  duplicateLead: LeadRecord;
  reason: "gmail_message_id" | "gmail_thread_id" | "email_listing_date";
};

function isWithinDays(a: string, b: string, days: number): boolean {
  const aMs = new Date(a).getTime();
  const bMs = new Date(b).getTime();
  const diff = Math.abs(aMs - bMs);
  return diff <= days * 24 * 60 * 60 * 1000;
}

export function detectDuplicateLead(
  existingLeads: LeadRecord[],
  candidate: {
    gmailMessageId?: string;
    gmailThreadId?: string;
    email: string;
    listingId?: string | null;
    receivedAt: string;
  },
): DuplicateResult | null {
  if (candidate.gmailMessageId) {
    const byMessage = existingLeads.find((lead) => lead.gmailMessageId === candidate.gmailMessageId);
    if (byMessage) {
      return { duplicateLead: byMessage, reason: "gmail_message_id" };
    }
  }

  if (candidate.gmailThreadId) {
    const byThread = existingLeads.find(
      (lead) =>
        lead.gmailThreadId === candidate.gmailThreadId &&
        lead.email.toLowerCase() === candidate.email.toLowerCase(),
    );
    if (byThread) {
      return { duplicateLead: byThread, reason: "gmail_thread_id" };
    }
  }

  const fallback = existingLeads.find(
    (lead) =>
      lead.email.toLowerCase() === candidate.email.toLowerCase() &&
      (lead.listingId ?? null) === (candidate.listingId ?? null) &&
      isWithinDays(lead.receivedAt, candidate.receivedAt, 7),
  );

  if (fallback) {
    return { duplicateLead: fallback, reason: "email_listing_date" };
  }

  return null;
}
