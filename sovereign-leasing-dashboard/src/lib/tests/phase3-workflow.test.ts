import assert from "node:assert/strict";
import test from "node:test";
import { writeAuditLog } from "@/lib/audit";
import { generateAiNextActionRecommendation } from "@/lib/ai";
import { getFallbackStore } from "@/lib/fallback-store";
import {
  calculateNextFollowUpAt,
  detectPauseReason,
  determineFollowUpStage,
  groupPipelineLeads,
} from "@/lib/follow-up";
import { createGmailDraftFromLead } from "@/lib/gmail";
import { listLeadActivityLog } from "@/lib/repository";
import { assertShowingTransition, canTransitionShowingStatus } from "@/lib/showing-workflow";
import { renderTemplate } from "@/lib/template-renderer";

function resetFallbackStore() {
  (globalThis as { __sovereignStore?: unknown }).__sovereignStore = undefined;
}

test("calculates follow-up due date from default sequence", () => {
  const next = calculateNextFollowUpAt({
    lastContactedAt: "2026-06-01T12:00:00.000Z",
    followUpAttemptCount: 0,
  });
  assert.equal(next, "2026-06-02T12:00:00.000Z");
});

test("returns null follow-up due date when client already replied", () => {
  const next = calculateNextFollowUpAt({
    lastContactedAt: "2026-06-01T12:00:00.000Z",
    lastClientReplyAt: "2026-06-01T13:00:00.000Z",
    followUpAttemptCount: 1,
  });
  assert.equal(next, null);
});

test("maps follow-up stage progression by attempt count", () => {
  assert.equal(determineFollowUpStage(0), "INITIAL_REPLY");
  assert.equal(determineFollowUpStage(1), "FOLLOW_UP_1");
  assert.equal(determineFollowUpStage(2), "FOLLOW_UP_2");
  assert.equal(determineFollowUpStage(3), "FINAL_FOLLOW_UP");
  assert.equal(determineFollowUpStage(4), "STALE_RECOMMENDED");
});

test("detects pause reason from client response and manual pause", () => {
  const clientReplied = detectPauseReason({
    lead: {
      id: "lead_pause_1",
      clientName: "Client",
      email: "client@example.com",
      source: "EMAIL",
      inquiryMessage: "Hello",
      status: "FOLLOW_UP",
      responsivenessScore: 0,
      completenessScore: 0,
      receivedAt: "2026-06-01T00:00:00.000Z",
      lastContactedAt: "2026-06-02T00:00:00.000Z",
      lastClientReplyAt: "2026-06-03T00:00:00.000Z",
    },
  });
  assert.equal(clientReplied, "CLIENT_REPLIED");

  const manualPause = detectPauseReason({
    lead: {
      id: "lead_pause_2",
      clientName: "Client",
      email: "client@example.com",
      source: "EMAIL",
      inquiryMessage: "Hello",
      status: "FOLLOW_UP",
      responsivenessScore: 0,
      completenessScore: 0,
      receivedAt: "2026-06-01T00:00:00.000Z",
      followUpPaused: true,
      followUpPauseReason: "MANUAL_PAUSE",
    },
  });
  assert.equal(manualPause, "MANUAL_PAUSE");
});

test("groups pipeline buckets for due, overdue, stale, and qualified states", () => {
  const grouped = groupPipelineLeads(
    [
      {
        id: "lead_due",
        clientName: "Due",
        email: "due@example.com",
        source: "EMAIL",
        inquiryMessage: "msg",
        status: "FOLLOW_UP",
        followUpPaused: false,
        nextFollowUpAt: "2026-06-09T15:00:00.000Z",
        responsivenessScore: 0,
        completenessScore: 0,
        receivedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "lead_overdue",
        clientName: "Overdue",
        email: "overdue@example.com",
        source: "EMAIL",
        inquiryMessage: "msg",
        status: "FOLLOW_UP",
        followUpPaused: false,
        nextFollowUpAt: "2026-06-08T10:00:00.000Z",
        responsivenessScore: 0,
        completenessScore: 0,
        receivedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "lead_qualified",
        clientName: "Qualified",
        email: "qualified@example.com",
        source: "EMAIL",
        inquiryMessage: "msg",
        status: "QUALIFIED",
        showingStatus: "NOT_REQUESTED",
        responsivenessScore: 0,
        completenessScore: 0,
        receivedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "lead_stale",
        clientName: "Stale",
        email: "stale@example.com",
        source: "EMAIL",
        inquiryMessage: "msg",
        status: "FOLLOW_UP_NEEDED",
        followUpStage: "STALE_RECOMMENDED",
        responsivenessScore: 0,
        completenessScore: 0,
        receivedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
    new Date("2026-06-09T12:00:00.000Z"),
  );

  assert.equal(grouped.dueToday.length, 1);
  assert.equal(grouped.overdue.length, 1);
  assert.equal(grouped.qualifiedNoShowing.length, 1);
  assert.equal(grouped.staleRecommended.length, 1);
});

test("renders follow-up and showing template variables", () => {
  const rendered = renderTemplate(
    "Hi {{client_name}} {{listing_address}} {{showing_date}} {{showing_time}} {{missing_fields}} {{access_instructions}}",
    {
      client_name: "Taylor",
      listing_address: "101 Warren St",
      showing_date: "2026-06-12",
      showing_time: "17:30",
      missing_fields: "income docs",
      access_instructions: "Check in with concierge",
    },
  );
  assert.equal(rendered, "Hi Taylor 101 Warren St 2026-06-12 17:30 income docs Check in with concierge");
});

test("validates showing workflow transitions", () => {
  assert.equal(canTransitionShowingStatus("SHOWING_REQUESTED", "TIMES_OFFERED"), true);
  assert.equal(canTransitionShowingStatus("NOT_REQUESTED", "SHOWING_COMPLETED"), false);
  assert.equal(assertShowingTransition("TIMES_OFFERED", "SHOWING_CONFIRMED"), "SHOWING_CONFIRMED");
  assert.throws(() => assertShowingTransition("ARCHIVED", "SHOWING_REQUESTED"));
});

test("creates mock Gmail follow-up draft and stores draft record", async () => {
  resetFallbackStore();
  const result = await createGmailDraftFromLead({
    leadId: "lead_lee_1",
    userId: "user_admin",
    actorId: "user_admin",
    templateId: "template_followup_24h",
    showingTimes: "Tue 5:30 PM",
    applicationLink: "https://srealty.nyc/apply",
  });
  assert.equal(result.draftResult.provider, "MOCK");
  const store = getFallbackStore();
  const draft = store.mockDrafts.find((item) => item.id === result.draftResult.draftId);
  assert.ok(draft);
  assert.ok(draft?.body.includes("Review before sending"));
});

test("writes follow-up activity log entry", async () => {
  resetFallbackStore();
  await writeAuditLog({
    actorId: "user_admin",
    leadId: "lead_lee_1",
    action: "FOLLOW_UP_MARKED_COMPLETED",
    entityType: "LEAD",
    entityId: "lead_lee_1",
  });
  const entries = await listLeadActivityLog("lead_lee_1");
  assert.equal(entries[0]?.action, "FOLLOW_UP_MARKED_COMPLETED");
});

test("returns advisory AI next-action wording", async () => {
  resetFallbackStore();
  const store = getFallbackStore();
  const lead = store.leads.find((item) => item.id === "lead_jordan_1");
  assert.ok(lead);
  const listing = store.listings.find((item) => item.id === lead?.listingId);
  const output = await generateAiNextActionRecommendation({
    lead: lead!,
    listing: listing ?? null,
  });
  assert.ok(output.content.includes("AI Recommendation"));
  assert.ok(output.content.includes("Human Review Required"));
  assert.ok(output.content.includes("Suggested Next Action"));
});
