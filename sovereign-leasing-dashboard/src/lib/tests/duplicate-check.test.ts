import test from "node:test";
import assert from "node:assert/strict";
import { detectDuplicateLead } from "@/lib/duplicate-check";
import { seedLeads } from "@/lib/seed-data";

test("detects duplicate by gmail message id", () => {
  const duplicate = detectDuplicateLead(seedLeads, {
    gmailMessageId: "gmail_seed_msg_001",
    gmailThreadId: "other_thread",
    email: "new@email.com",
    listingId: null,
    receivedAt: "2026-06-05T00:00:00.000Z",
  });

  assert.ok(duplicate);
  assert.equal(duplicate?.reason, "gmail_message_id");
});

test("detects fallback duplicate by email listing and date", () => {
  const duplicate = detectDuplicateLead(seedLeads, {
    gmailMessageId: undefined,
    gmailThreadId: undefined,
    email: "priya@email.com",
    listingId: "listing_ues_11f",
    receivedAt: "2026-06-04T00:00:00.000Z",
  });

  assert.ok(duplicate);
  assert.equal(duplicate?.reason, "email_listing_date");
});
