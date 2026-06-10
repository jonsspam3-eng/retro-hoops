import test from "node:test";
import assert from "node:assert/strict";
import { parseInquiryMessage } from "@/lib/inquiry-parser";

test("parses key inquiry fields", () => {
  const parsed = parseInquiryMessage({
    id: "msg_1",
    threadId: "thread_1",
    subject: "I am interested in 245 E 87th St apt 11F",
    bodyText:
      "Hi, my phone is (212) 555-1212. Budget is $3,800. We are 2 occupants. Move-in date July 1, 2026. Household income $180,000. No pets. Can I schedule a showing this week?",
    fromEmail: "alex@email.com",
    fromName: "Alex Rivera",
    receivedAt: "2026-06-04T10:00:00.000Z",
    source: "DIRECT_EMAIL",
    sourceFilter: "DIRECT_EMAIL",
    sourceConfidence: 0.81,
    isInquiry: true,
  });

  assert.equal(parsed.clientName, "Alex Rivera");
  assert.equal(parsed.phone, "(212) 555-1212");
  assert.equal(parsed.budget, 3800);
  assert.equal(parsed.occupants, 2);
  assert.equal(parsed.annualIncome, 180000);
  assert.equal(parsed.pets, "No pets");
  assert.equal(parsed.gmailMessageId, "msg_1");
  assert.equal(parsed.gmailThreadId, "thread_1");
});
