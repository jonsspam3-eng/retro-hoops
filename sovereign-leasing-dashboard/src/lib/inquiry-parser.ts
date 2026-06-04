import type { GmailInquiryMessage } from "@/lib/types";

export type ParsedInquiry = {
  clientName: string;
  clientEmail: string;
  phone?: string;
  originalSender: string;
  inquirySource: GmailInquiryMessage["source"];
  subject: string;
  body: string;
  gmailMessageId: string;
  gmailThreadId: string;
  listingAddress?: string;
  apartmentNumber?: string;
  desiredMoveInDate?: string;
  budget?: number;
  pets?: string;
  occupants?: number;
  showingAvailability?: string;
  annualIncome?: number;
  employmentDetails?: string;
  needsGuarantor?: boolean;
  voucherProgram?: string;
  missingFields: string[];
  listingLinks: string[];
};

const addressPattern = /\b\d{1,5}\s+[a-z0-9.'\-\s]+(?:street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|place|pl|court|ct|way)\b/gi;
const unitPattern = /\b(?:apt|apartment|unit|#)\s*([a-z0-9-]+)/i;
const phonePattern = /(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const moneyPattern = /\$\s*([\d,]{3,})/g;
const incomePattern = /(income|salary|household income)[^\d$]{0,20}\$\s*([\d,]{4,})/i;
const occupantPattern = /(\d{1,2})\s+(?:occupants|people|tenants|adults|roommates)/i;
const moveInPattern = /move[- ]?in(?:\s+date)?[:\s]+([a-z0-9,\-/ ]{4,25})/i;

function parseNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Client";
  return local
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseDateLoose(value: string): string | undefined {
  const clean = value.replace(/\s+/g, " ").trim();
  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return undefined;
}

export function parseInquiryMessage(message: GmailInquiryMessage): ParsedInquiry {
  const body = message.bodyText;
  const listingLinks = Array.from(body.matchAll(/https?:\/\/\S+/g)).map((match) => match[0]);

  const phone = body.match(phonePattern)?.[0];
  const address = body.match(addressPattern)?.[0];
  const apartmentNumber = body.match(unitPattern)?.[1]?.toUpperCase();

  const budgetMatches = Array.from(body.matchAll(moneyPattern)).map((match) => Number(match[1].replaceAll(",", "")));
  const budget = budgetMatches.length > 0 ? Math.min(...budgetMatches) : undefined;

  const incomeMatch = body.match(incomePattern);
  const annualIncome = incomeMatch?.[2] ? Number(incomeMatch[2].replaceAll(",", "")) : undefined;

  const occupantMatch = body.match(occupantPattern);
  const occupants = occupantMatch?.[1] ? Number(occupantMatch[1]) : undefined;

  const moveInMatch = body.match(moveInPattern)?.[1];
  const desiredMoveInDate = moveInMatch ? parseDateLoose(moveInMatch) : undefined;

  const pets = /no pets/i.test(body)
    ? "No pets"
    : /pet|dog|cat/i.test(body)
      ? body.match(/(?:pet|pets|dog|dogs|cat|cats)[^\n.]{0,60}/i)?.[0]
      : undefined;

  const showingAvailability = /showing|available (?:this )?week|time/i.test(body)
    ? body.match(/(?:showing|available)[^\n.]{0,80}/i)?.[0]
    : undefined;

  const employmentDetails = /employed|student|self-employed|job|work/i.test(body)
    ? body.match(/(?:employed|student|self-employed|job|work)[^\n.]{0,80}/i)?.[0]
    : undefined;

  const needsGuarantor = /guarantor/i.test(body) ? true : undefined;
  const voucherProgram = /voucher|section 8|cityfheps|fheps|program/i.test(body)
    ? body.match(/(?:voucher|section 8|cityfheps|program)[^\n.]{0,80}/i)?.[0]
    : undefined;

  const missingFields: string[] = [];
  if (!desiredMoveInDate) missingFields.push("desired_move_in_date");
  if (!occupants) missingFields.push("occupants");
  if (!pets) missingFields.push("pets");
  if (!annualIncome) missingFields.push("annual_income");
  if (needsGuarantor === undefined) missingFields.push("guarantor_need");
  if (!employmentDetails) missingFields.push("employment_or_student_status");
  if (!showingAvailability) missingFields.push("showing_availability");

  return {
    clientName: message.fromName?.trim() || parseNameFromEmail(message.fromEmail),
    clientEmail: message.fromEmail,
    phone,
    originalSender: `${message.fromName ?? "Unknown"} <${message.fromEmail}>`,
    inquirySource: message.source,
    subject: message.subject,
    body,
    gmailMessageId: message.id,
    gmailThreadId: message.threadId,
    listingAddress: address,
    apartmentNumber,
    desiredMoveInDate,
    budget,
    pets,
    occupants,
    showingAvailability,
    annualIncome,
    employmentDetails,
    needsGuarantor,
    voucherProgram,
    missingFields,
    listingLinks,
  };
}
