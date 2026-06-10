import test from "node:test";
import assert from "node:assert/strict";
import { createGmailDraftFromLead, importSelectedGmailMessages } from "@/lib/gmail";
import { getFallbackStore } from "@/lib/fallback-store";
import { getLeadById } from "@/lib/repository";

function resetFallbackStore() {
  (globalThis as { __sovereignStore?: unknown }).__sovereignStore = undefined;
}

test("creates draft in mock provider and updates lead status", async () => {
  resetFallbackStore();
  const result = await createGmailDraftFromLead({
    leadId: "lead_lee_1",
    userId: "user_admin",
    actorId: "user_admin",
  });

  assert.equal(result.draftResult.provider, "MOCK");
  const lead = await getLeadById("lead_lee_1");
  assert.equal(lead?.status, "DRAFT_CREATED");
  assert.ok(result.draftResult.body.includes("Human Review Required"));
});

test("prevents duplicate import of same mock Gmail message", async () => {
  resetFallbackStore();
  const first = await importSelectedGmailMessages({
    userId: "user_admin",
    actorId: "user_admin",
    messageIds: ["gmail_mock_001"],
  });

  assert.equal(first[0]?.duplicate, false);

  const second = await importSelectedGmailMessages({
    userId: "user_admin",
    actorId: "user_admin",
    messageIds: ["gmail_mock_001"],
  });

  assert.equal(second[0]?.duplicate, true);

  const store = getFallbackStore();
  const importedCount = store.leads.filter((lead) => lead.gmailMessageId === "gmail_mock_001").length;
  assert.equal(importedCount, 1);
});
