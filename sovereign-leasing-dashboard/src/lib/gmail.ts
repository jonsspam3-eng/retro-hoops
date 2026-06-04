import { google } from "googleapis";
import crypto from "node:crypto";
import { detectDuplicateLead } from "@/lib/duplicate-check";
import { getFallbackStore, makeId } from "@/lib/fallback-store";
import { detectInquirySource } from "@/lib/inquiry-detection";
import { parseInquiryMessage } from "@/lib/inquiry-parser";
import { matchListingForInquiry } from "@/lib/listing-matcher";
import {
  addInboundMessageFromImport,
  addOutboundMessage,
  createLead,
  getLeadById,
  listLeads,
  listListings,
  listTemplates,
  saveLeadAiDraft,
  updateLeadStatus,
} from "@/lib/repository";
import { renderTemplate } from "@/lib/template-renderer";
import { generateAiReplyDraft, generateMissingInfoAnalysis } from "@/lib/ai";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import type {
  GmailConnectionRecord,
  GmailInquiryMessage,
  GmailInquirySourceFilter,
  ImportOutcome,
  LeadRecord,
} from "@/lib/types";

type OAuthTokenPayload = {
  accessToken: string;
  refreshToken?: string | null;
  scope?: string | null;
  tokenType?: string | null;
  expiryDate?: number | null;
  email?: string | null;
};

export type GmailDraftRequest = {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
};

export type GmailDraftResult = {
  provider: "GOOGLE" | "MOCK";
  draftId: string;
  threadId?: string;
  subject: string;
  body: string;
};

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
  "openid",
  "email",
  "profile",
];

function isGoogleEnvConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI,
  );
}

function tokenSecret(): string {
  return process.env.GMAIL_TOKEN_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "";
}

function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptToken(value: string): string {
  const secret = tokenSecret();
  if (!secret) {
    throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY (or NEXTAUTH_SECRET) is required for OAuth token storage.");
  }
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${encrypted.toString("base64")}.${tag.toString("base64")}`;
}

function decryptToken(value: string): string {
  const secret = tokenSecret();
  if (!secret) {
    throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY (or NEXTAUTH_SECRET) is required for OAuth token storage.");
  }
  const [ivRaw, encryptedRaw, tagRaw] = value.split(".");
  const key = deriveKey(secret);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivRaw, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function createOAuthClient() {
  if (!isGoogleEnvConfigured()) {
    throw new Error(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.",
    );
  }

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

function decodeBase64Url(content: string): string {
  const normalized = content.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function parseFromHeader(raw: string): { email: string; name?: string } {
  const emailMatch = raw.match(/<([^>]+)>/);
  const email = emailMatch?.[1] ?? raw.trim();
  const name = raw.replace(/<[^>]+>/, "").replace(/"/g, "").trim();
  return {
    email,
    name: name.length > 0 && name !== email ? name : undefined,
  };
}

function extractBodyText(payload: {
  mimeType?: string;
  body?: { data?: string | null };
  parts?: Array<{
    mimeType?: string;
    body?: { data?: string | null };
    parts?: unknown[];
  }>;
}): string {
  if (payload.body?.data && payload.mimeType === "text/plain") {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts?.length) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part.parts && part.parts.length) {
        const nested = extractBodyText(part as any);
        if (nested) {
          return nested;
        }
      }
    }
  }

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  return "";
}

function filterBySource(messages: GmailInquiryMessage[], filter: GmailInquirySourceFilter) {
  if (filter === "ALL") return messages;
  return messages.filter((message) => message.sourceFilter === filter);
}

function buildMimeMessage(input: GmailDraftRequest) {
  const mime = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.body,
  ].join("\r\n");

  return Buffer.from(mime)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getStoredConnection(userId: string): Promise<
  | (GmailConnectionRecord & {
      accessTokenEncrypted: string;
      refreshTokenEncrypted?: string | null;
      scope?: string | null;
      tokenType?: string | null;
    })
  | null
> {
  if (!process.env.DATABASE_URL) {
    return getFallbackStore().gmailConnections.find(
      (connection) => connection.userId === userId && connection.isActive,
    ) ?? null;
  }

  try {
    const connection = await prisma.gmailConnection.findFirst({
      where: {
        userId,
        provider: "GOOGLE",
        isActive: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!connection) return null;

    return {
      id: connection.id,
      userId: connection.userId,
      provider: connection.provider,
      email: connection.email,
      isActive: connection.isActive,
      expiresAt: connection.expiresAt?.toISOString() ?? null,
      lastError: connection.lastError,
      accessTokenEncrypted: connection.accessTokenEncrypted,
      refreshTokenEncrypted: connection.refreshTokenEncrypted,
      scope: connection.scope,
      tokenType: connection.tokenType,
    };
  } catch {
    return getFallbackStore().gmailConnections.find(
      (connection) => connection.userId === userId && connection.isActive,
    ) ?? null;
  }
}

async function saveConnection(userId: string, tokenPayload: OAuthTokenPayload) {
  const encryptedAccess = encryptToken(tokenPayload.accessToken);
  const encryptedRefresh = tokenPayload.refreshToken ? encryptToken(tokenPayload.refreshToken) : null;

  if (!process.env.DATABASE_URL) {
    const store = getFallbackStore();
    const existing = store.gmailConnections.find((connection) => connection.userId === userId);
    const next = {
      id: existing?.id ?? makeId("gmail_conn"),
      userId,
      provider: "GOOGLE",
      email: tokenPayload.email ?? existing?.email ?? null,
      isActive: true,
      expiresAt: tokenPayload.expiryDate ? new Date(tokenPayload.expiryDate).toISOString() : existing?.expiresAt ?? null,
      lastError: null,
      accessTokenEncrypted: encryptedAccess,
      refreshTokenEncrypted: encryptedRefresh ?? existing?.refreshTokenEncrypted ?? null,
      scope: tokenPayload.scope ?? existing?.scope ?? null,
      tokenType: tokenPayload.tokenType ?? existing?.tokenType ?? null,
    };
    const others = store.gmailConnections.filter((connection) => connection.userId !== userId);
    store.gmailConnections = [...others, next];
    return;
  }

  await prisma.gmailConnection.upsert({
    where: {
      userId_provider: {
        userId,
        provider: "GOOGLE",
      },
    },
    update: {
      email: tokenPayload.email,
      isActive: true,
      accessTokenEncrypted: encryptedAccess,
      refreshTokenEncrypted: encryptedRefresh,
      scope: tokenPayload.scope,
      tokenType: tokenPayload.tokenType,
      expiresAt: tokenPayload.expiryDate ? new Date(tokenPayload.expiryDate) : null,
      lastError: null,
    },
    create: {
      userId,
      provider: "GOOGLE",
      email: tokenPayload.email,
      isActive: true,
      accessTokenEncrypted: encryptedAccess,
      refreshTokenEncrypted: encryptedRefresh,
      scope: tokenPayload.scope,
      tokenType: tokenPayload.tokenType,
      expiresAt: tokenPayload.expiryDate ? new Date(tokenPayload.expiryDate) : null,
    },
  });
}

async function buildAuthorizedClient(userId: string) {
  const connection = await getStoredConnection(userId);
  if (!connection) {
    return null;
  }

  const oauthClient = createOAuthClient();
  oauthClient.setCredentials({
    access_token: decryptToken(connection.accessTokenEncrypted),
    refresh_token: connection.refreshTokenEncrypted ? decryptToken(connection.refreshTokenEncrypted) : undefined,
    expiry_date: connection.expiresAt ? new Date(connection.expiresAt).getTime() : undefined,
  });

  const expiresAtMs = connection.expiresAt ? new Date(connection.expiresAt).getTime() : 0;
  if (expiresAtMs > 0 && expiresAtMs <= Date.now() + 60_000) {
    try {
      const refreshed = await oauthClient.refreshAccessToken();
      await saveConnection(userId, {
        accessToken: refreshed.credentials.access_token ?? decryptToken(connection.accessTokenEncrypted),
        refreshToken: refreshed.credentials.refresh_token ?? (connection.refreshTokenEncrypted ? decryptToken(connection.refreshTokenEncrypted) : null),
        expiryDate: refreshed.credentials.expiry_date,
        scope: refreshed.credentials.scope,
        tokenType: refreshed.credentials.token_type,
        email: connection.email,
      });
      oauthClient.setCredentials(refreshed.credentials);
    } catch {
      return null;
    }
  }

  return oauthClient;
}

function messageToInquiry(message: {
  id: string;
  threadId: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
    mimeType?: string;
    body?: { data?: string | null };
    parts?: Array<{
      mimeType?: string;
      body?: { data?: string | null };
      parts?: unknown[];
    }>;
  };
  internalDate?: string;
  snippet?: string;
}): GmailInquiryMessage {
  const headers = message.payload?.headers ?? [];
  const subject = headers.find((header) => header.name?.toLowerCase() === "subject")?.value ?? "(no subject)";
  const fromHeader = headers.find((header) => header.name?.toLowerCase() === "from")?.value ?? "unknown@example.com";
  const from = parseFromHeader(fromHeader);
  const bodyText = extractBodyText(message.payload ?? {}) || message.snippet || "";
  const listingLinks = Array.from(bodyText.matchAll(/https?:\/\/\S+/g)).map((match) => match[0]);
  const detection = detectInquirySource({
    sender: from.email,
    subject,
    body: bodyText,
    listingLinks,
  });

  return {
    id: message.id,
    threadId: message.threadId,
    subject,
    bodyText,
    fromEmail: from.email,
    fromName: from.name,
    receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString(),
    source: detection.source,
    sourceFilter: detection.sourceFilter,
    sourceConfidence: detection.confidence,
    isInquiry: detection.isInquiry,
    listingLink: listingLinks[0],
  };
}

async function listRealGmailMessages(userId: string, limit = 20): Promise<GmailInquiryMessage[]> {
  const auth = await buildAuthorizedClient(userId);
  if (!auth) {
    return [];
  }

  const gmail = google.gmail({ version: "v1", auth });
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults: limit,
    q: "newer_than:30d",
  });

  const ids = listResponse.data.messages?.map((message) => message.id).filter(Boolean) as string[];
  const fullMessages = await Promise.all(
    ids.map(async (messageId) =>
      gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      }),
    ),
  );

  return fullMessages
    .map((response) => response.data)
    .filter((message) => Boolean(message.id && message.threadId))
    .map((message) =>
      messageToInquiry({
        id: message.id!,
        threadId: message.threadId!,
        payload: message.payload as any,
        internalDate: message.internalDate ?? undefined,
        snippet: message.snippet ?? undefined,
      }),
    );
}

async function listMockMessages(): Promise<GmailInquiryMessage[]> {
  const store = getFallbackStore();
  const messages = store.mockGmailMessages;
  if (!messages || !Array.isArray(messages)) {
    console.error("[gmail.ts] mockGmailMessages is undefined or not an array:", typeof messages, messages);
    return [];
  }
  return messages;
}

export async function getGmailConnectionState(userId: string): Promise<{
  mode: "LIVE" | "MOCK";
  configured: boolean;
  connected: boolean;
  connection?: GmailConnectionRecord | null;
  message: string;
}> {
  const configured = isGoogleEnvConfigured();
  const connection = configured ? await getStoredConnection(userId) : null;

  if (!configured) {
    return {
      mode: "MOCK",
      configured: false,
      connected: false,
      connection: null,
      message: "Google OAuth env vars are missing. Running in mock Gmail mode.",
    };
  }

  if (!connection) {
    return {
      mode: "MOCK",
      configured: true,
      connected: false,
      connection: null,
      message: "Google OAuth is configured but account is not connected yet. Mock mode is enabled.",
    };
  }

  return {
    mode: "LIVE",
    configured: true,
    connected: true,
    connection,
    message: `Connected Gmail account: ${connection.email ?? "Unknown"}`,
  };
}

export function buildGoogleOAuthUrl(state: string) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
  });
}

export async function completeGoogleOAuth(code: string, userId: string) {
  const client = createOAuthClient();
  const tokens = await client.getToken(code);
  client.setCredentials(tokens.tokens);

  let email: string | null = null;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const profile = await oauth2.userinfo.get();
    email = profile.data.email ?? null;
  } catch {
    email = null;
  }

  if (!tokens.tokens.access_token) {
    throw new Error("Google OAuth response did not include an access token.");
  }

  await saveConnection(userId, {
    accessToken: tokens.tokens.access_token,
    refreshToken: tokens.tokens.refresh_token,
    scope: tokens.tokens.scope,
    tokenType: tokens.tokens.token_type,
    expiryDate: tokens.tokens.expiry_date,
    email,
  });

  return { email };
}

export async function fetchGmailInquiryMessages(input: {
  userId: string;
  sourceFilter?: GmailInquirySourceFilter;
  includeNonInquiry?: boolean;
}): Promise<{
  mode: "LIVE" | "MOCK";
  connectionState: Awaited<ReturnType<typeof getGmailConnectionState>>;
  messages: GmailInquiryMessage[];
}> {
  const sourceFilter = input.sourceFilter ?? "ALL";
  const includeNonInquiry = input.includeNonInquiry ?? false;
  const [state, existingLeads, listings] = await Promise.all([
    getGmailConnectionState(input.userId),
    listLeads(),
    listListings(),
  ]);

  let connectionState = state;
  let baseMessages: GmailInquiryMessage[] = [];

  if (connectionState.mode === "LIVE") {
    try {
      baseMessages = await listRealGmailMessages(input.userId);
    } catch (error) {
      baseMessages = await listMockMessages();
      connectionState = {
        ...connectionState,
        mode: "MOCK",
        message:
          error instanceof Error
            ? `Gmail fetch failed: ${error.message}. Falling back to mock mode.`
            : "Gmail fetch failed. Falling back to mock mode.",
      };
    }
  } else {
    baseMessages = await listMockMessages();
  }

  const hydrated = baseMessages.map((message) => {
    const parsed = parseInquiryMessage(message);
    const listingMatch = matchListingForInquiry(listings, {
      listingAddress: parsed.listingAddress,
      apartmentNumber: parsed.apartmentNumber,
      listingLinks: parsed.listingLinks,
      budget: parsed.budget,
      subject: parsed.subject,
      body: parsed.body,
    });

    const duplicate = detectDuplicateLead(existingLeads, {
      gmailMessageId: message.id,
      gmailThreadId: message.threadId,
      email: message.fromEmail,
      listingId: listingMatch.listingId,
      receivedAt: message.receivedAt,
    });

    return {
      ...message,
      importedLeadId: duplicate?.duplicateLead.id,
      duplicateReason: duplicate?.reason,
    };
  });

  const byInquiry = includeNonInquiry ? hydrated : hydrated.filter((message) => message.isInquiry);
  const filtered = filterBySource(byInquiry, sourceFilter);

  return {
    mode: connectionState.mode,
    connectionState,
    messages: filtered,
  };
}

export async function importSelectedGmailMessages(input: {
  userId: string;
  actorId?: string;
  messageIds: string[];
}): Promise<ImportOutcome[]> {
  if (input.messageIds.length === 0) {
    return [];
  }

  const [{ messages }, listings, existingLeads] = await Promise.all([
    fetchGmailInquiryMessages({ userId: input.userId, includeNonInquiry: true }),
    listListings(),
    listLeads(),
  ]);

  const selected = messages.filter((message) => input.messageIds.includes(message.id));
  const outcomes: ImportOutcome[] = [];

  for (const message of selected) {
    const parsed = parseInquiryMessage(message);
    const listingMatch = matchListingForInquiry(listings, {
      listingAddress: parsed.listingAddress,
      apartmentNumber: parsed.apartmentNumber,
      listingLinks: parsed.listingLinks,
      budget: parsed.budget,
      subject: parsed.subject,
      body: parsed.body,
    });

    const duplicate = detectDuplicateLead(existingLeads, {
      gmailMessageId: parsed.gmailMessageId,
      gmailThreadId: parsed.gmailThreadId,
      email: parsed.clientEmail,
      listingId: listingMatch.listingId,
      receivedAt: message.receivedAt,
    });

    if (duplicate) {
      outcomes.push({
        messageId: message.id,
        leadId: duplicate.duplicateLead.id,
        duplicate: true,
        duplicateReason: duplicate.reason,
      });
      continue;
    }

    const status: LeadRecord["status"] = parsed.missingFields.length > 0 ? "NEEDS_REVIEW" : "IMPORTED";
    const lead = await createLead({
      clientName: parsed.clientName,
      email: parsed.clientEmail,
      phone: parsed.phone,
      originalSender: parsed.originalSender,
      inquirySubject: parsed.subject,
      source: parsed.inquirySource,
      inquiryMessage: parsed.body,
      listingId: listingMatch.listingId,
      desiredMoveInDate: parsed.desiredMoveInDate,
      budget: parsed.budget,
      pets: parsed.pets,
      occupants: parsed.occupants,
      annualIncome: parsed.annualIncome,
      employmentDetails: parsed.employmentDetails,
      needsGuarantor: parsed.needsGuarantor,
      voucherProgram: parsed.voucherProgram,
      showingAvailability: parsed.showingAvailability,
      gmailMessageId: parsed.gmailMessageId,
      gmailThreadId: parsed.gmailThreadId,
      gmailImportedAt: message.receivedAt,
      sourceDetectionResult: message.source,
      sourceDetectionConfidence: message.sourceConfidence,
      listingMatchConfidence: listingMatch.confidence,
      listingMatchReason: listingMatch.reason,
      missingFields: parsed.missingFields,
      status,
      parsedFields: {
        listingAddress: parsed.listingAddress,
        apartmentNumber: parsed.apartmentNumber,
        listingLinks: parsed.listingLinks,
      },
    });

    await addInboundMessageFromImport({
      leadId: lead.id,
      subject: parsed.subject,
      bodyText: parsed.body,
      senderEmail: parsed.clientEmail,
      recipientEmail: "leasing@sovereignnyc.com",
      gmailMessageId: parsed.gmailMessageId,
      gmailThreadId: parsed.gmailThreadId,
    });

    await writeAuditLog({
      actorId: input.actorId,
      leadId: lead.id,
      action: "GMAIL_INQUIRY_IMPORTED",
      entityType: "LEAD",
      entityId: lead.id,
      metadata: {
        gmailMessageId: parsed.gmailMessageId,
        gmailThreadId: parsed.gmailThreadId,
        source: message.source,
        sourceConfidence: message.sourceConfidence,
        listingMatchConfidence: listingMatch.confidence,
        listingMatchReason: listingMatch.reason,
      },
    });

    existingLeads.unshift(lead);
    outcomes.push({
      messageId: message.id,
      leadId: lead.id,
      duplicate: false,
    });
  }

  return outcomes;
}

export async function createGmailDraftFromLead(input: {
  leadId: string;
  userId: string;
  actorId?: string;
  templateId?: string;
  agentName?: string;
  showingTimes?: string;
  applicationLink?: string;
}) {
  const lead = await getLeadById(input.leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }

  const [templates, listings] = await Promise.all([listTemplates(), listListings()]);
  const listing = listings.find((item) => item.id === lead.listingId);
  const template =
    (input.templateId ? templates.find((row) => row.id === input.templateId) : null) ?? templates[0];
  if (!template) {
    throw new Error("No email template is configured.");
  }

  const missingAnalysis = await generateMissingInfoAnalysis({ lead, listing });
  const aiReply = await generateAiReplyDraft({ lead, listing });

  const draftBody = renderTemplate(template.body, {
    client_name: lead.clientName,
    listing_address: listing?.address ?? "Listing pending confirmation",
    apartment_number: listing?.apartmentNumber ?? "",
    rent: listing?.rent ?? "TBD",
    agent_name: input.agentName ?? "Sovereign Leasing Team",
    showing_times: input.showingTimes ?? "Please share preferred showing windows",
    application_link: input.applicationLink ?? "https://example.com/application",
  });

  const enrichedDraft = `${draftBody}

---
AI-generated draft
Review before sending
Do not rely on AI for final applicant approval

Additional missing info to request:
${missingAnalysis.content}`;

  await saveLeadAiDraft(lead.id, enrichedDraft);

  const request: GmailDraftRequest = {
    to: lead.email,
    subject: renderTemplate(template.subject, {
      client_name: lead.clientName,
      listing_address: listing?.address ?? "Listing",
      apartment_number: listing?.apartmentNumber ?? "",
      rent: listing?.rent ?? "TBD",
      agent_name: input.agentName ?? "Sovereign Leasing Team",
      showing_times: input.showingTimes ?? "",
      application_link: input.applicationLink ?? "",
    }),
    body: enrichedDraft,
    threadId: lead.gmailThreadId ?? undefined,
  };

  const connection = await getGmailConnectionState(input.userId);
  let draftResult: GmailDraftResult;

  if (connection.mode === "LIVE") {
    const auth = await buildAuthorizedClient(input.userId);
    if (!auth) {
      throw new Error("Connected Gmail credentials are unavailable or expired.");
    }

    const gmail = google.gmail({ version: "v1", auth });
    const response = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          threadId: request.threadId,
          raw: buildMimeMessage(request),
        },
      },
    });

    draftResult = {
      provider: "GOOGLE",
      draftId: response.data.id ?? makeId("gmail_draft"),
      threadId: request.threadId,
      subject: request.subject,
      body: request.body,
    };
  } else {
    const store = getFallbackStore();
    const draftId = makeId("mock_draft");
    store.mockDrafts.push({
      id: draftId,
      threadId: request.threadId,
      to: request.to,
      subject: request.subject,
      body: request.body,
      createdAt: new Date().toISOString(),
    });

    draftResult = {
      provider: "MOCK",
      draftId,
      threadId: request.threadId,
      subject: request.subject,
      body: request.body,
    };
  }

  await addOutboundMessage({
    leadId: lead.id,
    subject: request.subject,
    bodyText: request.body,
    senderEmail: "leasing@sovereignnyc.com",
    recipientEmail: lead.email,
    status: "DRAFT_CREATED_HUMAN_REVIEW_REQUIRED",
    gmailThreadId: request.threadId,
    gmailMessageId: draftResult.draftId,
  });

  await updateLeadStatus(lead.id, "DRAFT_CREATED");

  await writeAuditLog({
    actorId: input.actorId,
    leadId: lead.id,
    action: "GMAIL_DRAFT_CREATED",
    entityType: "EMAIL_DRAFT",
    entityId: draftResult.draftId,
    metadata: {
      provider: draftResult.provider,
      gmailThreadId: request.threadId,
      templateId: template.id,
      aiReplyModel: aiReply.model,
    },
  });

  return {
    draftResult,
    aiMissingInfo: missingAnalysis.content,
    aiReplyModel: aiReply.model,
  };
}
