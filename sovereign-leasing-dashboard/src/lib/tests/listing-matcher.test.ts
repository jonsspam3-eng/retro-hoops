import test from "node:test";
import assert from "node:assert/strict";
import { matchListingForInquiry } from "@/lib/listing-matcher";
import { seedListings } from "@/lib/seed-data";

test("matches listing with strong signals", () => {
  const result = matchListingForInquiry(seedListings, {
    listingAddress: "101 Warren Street",
    apartmentNumber: "2A",
    listingLinks: ["https://streeteasy.com/building/101-warren-st-2a"],
    budget: 5400,
    subject: "StreetEasy inquiry for 101 Warren St 2A",
    body: "Can I see apartment 2A at 101 Warren St?",
  });

  assert.equal(result.listingId, "listing_tribeca_2a");
  assert.ok(result.confidence >= 0.7);
});

test("returns unmatched for weak signals", () => {
  const result = matchListingForInquiry(seedListings, {
    listingAddress: undefined,
    apartmentNumber: undefined,
    listingLinks: [],
    budget: 1800,
    subject: "Need a cheap room",
    body: "Looking for options in another city.",
  });

  assert.equal(result.listingId, null);
});
