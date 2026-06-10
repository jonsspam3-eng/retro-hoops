import type { ListingRecord } from "@/lib/types";
import type { ParsedInquiry } from "@/lib/inquiry-parser";

export type ListingMatchResult = {
  listingId: string | null;
  confidence: number;
  reason: string;
};

function normalizeAddress(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/(street)/g, "st")
    .replace(/(avenue)/g, "ave")
    .replace(/(road)/g, "rd")
    .replace(/(boulevard)/g, "blvd")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchListingForInquiry(
  listings: ListingRecord[],
  parsed: Pick<ParsedInquiry, "listingAddress" | "apartmentNumber" | "listingLinks" | "budget" | "subject" | "body">,
): ListingMatchResult {
  if (listings.length === 0) {
    return { listingId: null, confidence: 0, reason: "No listings available" };
  }

  let best: ListingMatchResult = {
    listingId: null,
    confidence: 0,
    reason: "No confident listing match from address/link/rent signals.",
  };

  const normalizedParsedAddress = parsed.listingAddress ? normalizeAddress(parsed.listingAddress) : "";

  for (const listing of listings) {
    let score = 0;
    const reasons: string[] = [];
    const listingAddress = normalizeAddress(listing.address);

    if (normalizedParsedAddress && normalizedParsedAddress.includes(listingAddress)) {
      score += 0.7;
      reasons.push("Address match");
    } else if (normalizedParsedAddress) {
      const addressTokens = listingAddress.split(" ");
      const overlap = addressTokens.filter((token) => normalizedParsedAddress.includes(token)).length;
      if (overlap >= Math.max(2, Math.floor(addressTokens.length / 2))) {
        score += 0.45;
        reasons.push("Partial address overlap");
      }
    }

    if (parsed.apartmentNumber && parsed.apartmentNumber.toLowerCase() === listing.apartmentNumber.toLowerCase()) {
      score += 0.2;
      reasons.push("Apartment/unit match");
    }

    const links = Object.values(listing.platformLinks ?? {});
    if (links.length > 0 && parsed.listingLinks.some((candidate) => links.some((link) => candidate.includes(link)))) {
      score += 0.25;
      reasons.push("Listing URL match");
    }

    if (parsed.budget && parsed.budget >= listing.rent && parsed.budget <= listing.rent * 1.2) {
      score += 0.08;
      reasons.push("Budget close to rent");
    }

    if (parsed.subject.toLowerCase().includes(listing.address.toLowerCase()) || parsed.body.toLowerCase().includes(listing.address.toLowerCase())) {
      score += 0.12;
      reasons.push("Subject/body address mention");
    }

    const normalized = Math.min(0.99, Number(score.toFixed(2)));
    if (normalized > best.confidence) {
      best = {
        listingId: normalized >= 0.55 ? listing.id : null,
        confidence: normalized,
        reason: reasons.length > 0 ? reasons.join(" + ") : "Weak listing signals",
      };
    }
  }

  return best;
}
