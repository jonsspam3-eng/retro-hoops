import type { GmailInquirySourceFilter, InquirySource } from "@/lib/types";

export type DetectionResult = {
  source: InquirySource;
  sourceFilter: GmailInquirySourceFilter;
  confidence: number;
  isInquiry: boolean;
  reasons: string[];
};

type DetectInput = {
  sender: string;
  subject: string;
  body: string;
  listingLinks?: string[];
};

const sourceSignals: Array<{
  source: InquirySource;
  sourceFilter: GmailInquirySourceFilter;
  patterns: RegExp[];
  senderPatterns?: RegExp[];
}> = [
  {
    source: "STREETEASY",
    sourceFilter: "STREETEASY",
    patterns: [/streeteasy/i, /street easy/i],
    senderPatterns: [/streeteasy/i],
  },
  {
    source: "ZILLOW",
    sourceFilter: "ZILLOW",
    patterns: [/zillow/i],
    senderPatterns: [/zillow/i],
  },
  {
    source: "REALTYMX",
    sourceFilter: "REALTYMX",
    patterns: [/realtymx/i],
    senderPatterns: [/realtymx/i],
  },
  {
    source: "WEBSITE",
    sourceFilter: "WEBSITE",
    patterns: [/website inquiry/i, /web form/i, /contact form/i, /company website/i],
  },
];

const inquiryPatterns = [
  /is (this|it) still available/i,
  /i'?m interested/i,
  /can i schedule a showing/i,
  /schedule (a )?showing/i,
  /apartment/i,
  /rental/i,
  /listing/i,
  /move[- ]?in/i,
  /budget/i,
];

export function normalizeSourceFilter(source: InquirySource): GmailInquirySourceFilter {
  if (source === "STREETEASY") return "STREETEASY";
  if (source === "ZILLOW") return "ZILLOW";
  if (source === "REALTYMX") return "REALTYMX";
  if (source === "WEBSITE") return "WEBSITE";
  if (source === "DIRECT_EMAIL" || source === "EMAIL") return "DIRECT_EMAIL";
  return "UNKNOWN";
}

export function detectInquirySource(input: DetectInput): DetectionResult {
  const combined = `${input.subject}
${input.body}`;
  const reasons: string[] = [];
  let bestSource: InquirySource = "UNKNOWN";
  let bestConfidence = 0.2;

  for (const candidate of sourceSignals) {
    let score = 0;
    const matchedPatterns = candidate.patterns.filter((pattern) => pattern.test(combined));
    const matchedSenders = (candidate.senderPatterns ?? []).filter((pattern) => pattern.test(input.sender));

    if (matchedPatterns.length > 0) {
      score += Math.min(0.35 + matchedPatterns.length * 0.12, 0.65);
    }

    if (matchedSenders.length > 0) {
      score += Math.min(0.35, matchedSenders.length * 0.2);
    }

    if (score > bestConfidence) {
      bestConfidence = score;
      bestSource = candidate.source;
      reasons.push(`Source signal matched: ${candidate.source}`);
    }
  }

  if (bestSource === "UNKNOWN") {
    const hasDirectEmailSignal = !/noreply|notification|automated/i.test(input.sender);
    if (hasDirectEmailSignal) {
      bestSource = "DIRECT_EMAIL";
      bestConfidence = 0.55;
      reasons.push("Classified as direct client email by sender pattern.");
    }
  }

  if (input.listingLinks?.some((link) => /streeteasy/i.test(link))) {
    bestSource = "STREETEASY";
    bestConfidence = Math.max(bestConfidence, 0.9);
    reasons.push("Detected StreetEasy listing URL.");
  }

  if (input.listingLinks?.some((link) => /zillow/i.test(link))) {
    bestSource = "ZILLOW";
    bestConfidence = Math.max(bestConfidence, 0.9);
    reasons.push("Detected Zillow listing URL.");
  }

  if (input.listingLinks?.some((link) => /realtymx/i.test(link))) {
    bestSource = "REALTYMX";
    bestConfidence = Math.max(bestConfidence, 0.9);
    reasons.push("Detected RealtyMX listing URL.");
  }

  const inquirySignalCount = inquiryPatterns.filter((pattern) => pattern.test(combined)).length;
  const negativeContext = /(newsletter|market update|unsubscribe|promo)/i.test(combined);
  const negatedInquiryTerms = /no\s+(?:listing|apartment|rental|showing)/i.test(combined);
  const isInquiry =
    !negativeContext &&
    !negatedInquiryTerms &&
    (inquirySignalCount >= 2 || (inquirySignalCount >= 1 && bestConfidence >= 0.6));

  if (inquirySignalCount > 0) {
    reasons.push(`Inquiry keyword signals: ${inquirySignalCount}`);
  }

  if (negativeContext || negatedInquiryTerms) {
    reasons.push("Detected non-inquiry/newsletter context.");
  }

  if (!isInquiry) {
    reasons.push("Insufficient leasing inquiry indicators.");
  }

  return {
    source: bestSource,
    sourceFilter: normalizeSourceFilter(bestSource),
    confidence: Math.max(0.1, Math.min(0.99, Number(bestConfidence.toFixed(2)))),
    isInquiry,
    reasons,
  };
}
