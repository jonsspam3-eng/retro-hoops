import test from "node:test";
import assert from "node:assert/strict";
import { detectInquirySource } from "@/lib/inquiry-detection";

test("detects StreetEasy leasing inquiry", () => {
  const result = detectInquirySource({
    sender: "leads@streeteasy.com",
    subject: "StreetEasy inquiry for 101 Warren St",
    body: "Client asks: is this still available and can I schedule a showing?",
    listingLinks: ["https://streeteasy.com/building/101-warren-st-2a"],
  });

  assert.equal(result.source, "STREETEASY");
  assert.equal(result.isInquiry, true);
  assert.ok(result.confidence >= 0.8);
});

test("flags newsletter as non-inquiry", () => {
  const result = detectInquirySource({
    sender: "newsletter@marketwatch.com",
    subject: "Weekly market trends",
    body: "No listing or apartment details included.",
    listingLinks: [],
  });

  assert.equal(result.isInquiry, false);
});
