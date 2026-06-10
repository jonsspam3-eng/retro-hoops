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
  findLeadByGmailIdentifiers,
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
  GmailInquiryMessageDetail,
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
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
];

function gmailOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_GMAIL_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_GMAIL_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: process.env.GOOGLE_GMAIL_REDIRECT_URI ?? process.env.GOOGLE_REDIRECT_URI ?? "",
  };
}

type GmailConnectionState = {
  mode: "LIVE" | "MOCK";
  configured: boolean;
  connected: boolean;
  connection?: GmailConnectionRecord | null;
  message: string;
};

type GmailErrorCode =
  | "redirect_uri_mismatch"
  | "invalid_client"
  | "access_denied"
  | "expired_or_revoked_token"
  | "insufficient_scopes"
  | "gmail_api_disabled"
  | "no_refresh_token"
  | "failed_message_fetch"
  | "failed_draft_creation"
  | "database_duplicate"
  | "unknown";

export type GmailDebugResult = {
  action: string;
  ok: boolean;
  message: string;
  data?: Record<string, unknown>;
};

export interface GmailProvider {
  connectUrl(state: string): Promise<string>;
  getConnectionStatus(userId: string): Promise<GmailConnectionState>;
  listRecentMessages(input: {
    userId: string;
    limit?: number;
    query?: string;
  }): Promise<GmailInquiryMessage[]>;
  getMessage(input: { userId: string; messageId: string }): Promise<GmailInquiryMessageDetail | null>;
  importMessageAsLead(input: { userId: string; actorId?: string; messageId: string }): Promise<ImportOutcome>;
  createDraftReply(input: {
    leadId: string;
    userId: string;
    actorId?: string;
    templateId?: string;
    agentName?: string;
    showingTimes?: string;
    applicationLink?: string;
  }): ReturnType<typeof createGmailDraftFromLead>;
  disconnect(userId: string): Promise<void>;
}

function isGoogleEnvConfigured() {
  const config = gmailOAuthConfig();
  return Boolean(
    config.clientId &&
      config.clientSecret &&
      config.redirectUri,
  );
}

function getAppBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}

export function getRequiredGoogleRedirectUri(): string {
  const config = gmailOAuthConfig();
  return config.redirectUri || `${getAppBaseUrl()}/api/gmail/callback`;
}

export function getGoogleScopes(): string[] {
  return [...GOOGLE_SCOPES];
}

export function validateOAuthConfig() {
  const config = gmailOAuthConfig();
  const missing: string[] = [];
  if (!config.clientId) missing.push("GOOGLE_GMAIL_CLIENT_ID");
  if (!config.clientSecret) missing.push("GOOGLE_GMAIL_CLIENT_SECRET");
  if (!config.redirectUri) missing.push("GOOGLE_GMAIL_REDIRECT_URI");
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.NEXTAUTH_URL && !process.env.APP_URL) missing.push("NEXTAUTH_URL or APP_URL");
  if (!process.env.ENCRYPTION_KEY && !process.env.GMAIL_TOKEN_ENCRYPTION_KEY) {
    missing.push("ENCRYPTION_KEY");
  }
  return {
    configured: missing.length === 0,
    missing,
    requiredRedirectUri: getRequiredGoogleRedirectUri(),
    scopes: getGoogleScopes(),
  };
}

function tokenSecret(): string {
  return process.env.ENCRYPTION_KEY || process.env.GMAIL_TOKEN_ENCRYPTION_KEY || "";
}

function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptToken(value: string): string {
  const secret = tokenSecret();
  if (!secret) {
    throw new Error("ENCRYPTION_KEY (or GMAIL_TOKEN_ENCRYPTION_KEY) is required for OAuth token storage.");
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
    throw new Error("ENCRYPTION_KEY (or GMAIL_TOKEN_ENCRYPTION_KEY) is required for OAuth token storage.");
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
  const config = gmailOAuthConfig();
  if (!isGoogleEnvConfigured()) {
    throw new Error(
      "Google OAuth is not configured. Set GOOGLE_GMAIL_CLIENT_ID, GOOGLE_GMAIL_CLIENT_SECRET, and GOOGLE_GMAIL_REDIRECT_URI.",
    );
  }

  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );
}

export function decodeBase64Url(content: string): string {
  const normalized = content.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  const padded = `${normalized}${"=".repeat(padLength)}`;
  return Buffer.from(padded, "base64").toString("utf8");
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

type GmailPayloadPart = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string | null };
  parts?: GmailPayloadPart[];
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function stripHtmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const withBreaks = withoutScripts
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(stripped).replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

function collectBodyParts(part: GmailPayloadPart, textParts: string[], htmlParts: string[]) {
  if (part.parts?.length) {
    for (const child of part.parts) {
      collectBodyParts(child, textParts, htmlParts);
    }
  }

  if (part.filename) {
    return;
  }

  if (!part.body?.data) {
    return;
  }

  const decoded = decodeBase64Url(part.body.data).trim();
  if (!decoded) {
    return;
  }

  if (part.mimeType?.startsWith("text/plain")) {
    textParts.push(decoded);
    return;
  }

  if (part.mimeType?.startsWith("text/html")) {
    htmlParts.push(decoded);
    return;
  }

  // Fallback for payloads without strict mime typing.
  textParts.push(decoded);
}

export function extractMessageBodies(payload: GmailPayloadPart): {
  plainTextBody: string;
  htmlBody?: string;
} {
  const textParts: string[] = [];
  const htmlParts: string[] = [];
  collectBodyParts(payload, textParts, htmlParts);
  const htmlBody = htmlParts.join("\n").trim() || undefined;
  const plainTextBody =
    textParts.join("\n").trim() ||
    (htmlBody ? stripHtmlToText(htmlBody) : "");

  return {
    plainTextBody,
    htmlBody,
  };
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return JSON.stringify(error);
}

export function normalizeGmailError(error: unknown): { code: GmailErrorCode; message: string } {
  const raw = getErrorText(error).toLowerCase();
  if (raw.includes("redirect_uri_mismatch")) {
    return {
      code: "redirect_uri_mismatch",
      message: "Google OAuth redirect URI mismatch. Verify GOOGLE_GMAIL_REDIRECT_URI in app settings and Google Cloud Console.",
    };
  }
  if (raw.includes("invalid_client")) {
    return { code: "invalid_client", message: "Invalid Google OAuth client credentials. Check GOOGLE_GMAIL_CLIENT_ID and GOOGLE_GMAIL_CLIENT_SECRET." };
  }
  if (raw.includes("access_denied")) {
    return { code: "access_denied", message: "Access denied in Google OAuth consent flow." };
  }
  if (raw.includes("invalid_grant") || raw.includes("revoked") || raw.includes("token has been expired")) {
    return {
      code: "expired_or_revoked_token",
      message: "Gmail token is expired or revoked. Disconnect and reconnect Gmail.",
    };
  }
  if (raw.includes("insufficient") && raw.includes("scope")) {
    return {
      code: "insufficient_scopes",
      message: "Connected Gmail account is missing required scopes (gmail.readonly, gmail.compose, openid, userinfo.email). Reconnect Gmail.",
    };
  }
  if (raw.includes("gmail api has not been used") || raw.includes("access_not_configured") || raw.includes("api not enabled")) {
    return {
      code: "gmail_api_disabled",
      message: "Gmail API is disabled in Google Cloud project. Enable Gmail API and retry.",
    };
  }
  if (raw.includes("refresh token") && raw.includes("missing")) {
    return {
      code: "no_refresh_token",
      message: "Google OAuth did not return a refresh token. Reconnect with prompt=consent and access_type=offline.",
    };
  }
  if (raw.includes("draft")) {
    return { code: "failed_draft_creation", message: "Failed to create Gmail draft. Check compose scope and reconnect if needed." };
  }
  if (raw.includes("fetch") || raw.includes("messages")) {
    return { code: "failed_message_fetch", message: "Failed to fetch Gmail messages. Check token status and Gmail API configuration." };
  }
  if (raw.includes("unique constraint") || raw.includes("p2002")) {
    return { code: "database_duplicate", message: "Duplicate import blocked by database unique constraint." };
  }
  return { code: "unknown", message: `Gmail operation failed: ${getErrorText(error)}` };
}

export function buildGmailQuery(days = 30): string {
  const recency = `newer_than:${days}d`;
  const queryA = `${recency} (StreetEasy OR Zillow OR RealtyMX OR apartment OR rental OR showing OR interested)`;
  const queryB = `${recency} subject:(inquiry)`;
  const queryC = `${recency} (\"Is this still available\" OR \"schedule a showing\" OR \"interested in\")`;
  return `${queryA} OR ${queryB} OR ${queryC}`;
}

function filterBySource(messages: GmailInquiryMessage[], filter: GmailInquirySourceFilter) {
  if (filter === "ALL") return messages;
  return messages.filter((message) => message.sourceFilter === filter);
}

export function buildMimeMessage(input: GmailDraftRequest) {
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
      lastImportError?: string | null;
      lastDraftError?: string | null;
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
      lastImportError: connection.lastImportError,
      lastDraftError: connection.lastDraftError,
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

async function setConnectionLastError(userId: string, lastError: string | null) {
  if (!process.env.DATABASE_URL) {
    const store = getFallbackStore();
    const connection = store.gmailConnections.find((item) => item.userId === userId && item.isActive);
    if (connection) {
      connection.lastError = lastError;
    }
    return;
  }

  await prisma.gmailConnection.updateMany({
    where: {
      userId,
      provider: "GOOGLE",
      isActive: true,
    },
    data: { lastError },
  });
}

async function setConnectionOperationError(
  userId: string,
  field: "lastImportError" | "lastDraftError",
  message: string | null,
) {
  if (!process.env.DATABASE_URL) {
    const store = getFallbackStore();
    const connection = store.gmailConnections.find((item) => item.userId === userId && item.isActive);
    if (connection) {
      if (field === "lastImportError") {
        connection.lastImportError = message;
      } else {
        connection.lastDraftError = message;
      }
    }
    return;
  }

  await prisma.gmailConnection.updateMany({
    where: {
      userId,
      provider: "GOOGLE",
      isActive: true,
    },
    data: { [field]: message },
  });
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
      lastImportError: existing?.lastImportError ?? null,
      lastDraftError: existing?.lastDraftError ?? null,
      accessTokenEncrypted: encryptedAccess,
      refreshTokenEncrypted: encryptedRefresh ?? existing?.refreshTokenEncrypted ?? null,
      scope: tokenPayload.scope ?? existing?.scope ?? null,
      tokenType: tokenPayload.tokenType ?? existing?.tokenType ?? null,
    };
    const others = store.gmailConnections.filter((connection) => connection.userId !== userId);
    store.gmailConnections = [...others, next];
    return;
  }

  const existing = await prisma.gmailConnection.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: "GOOGLE",
      },
    },
  });

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
      refreshTokenEncrypted: encryptedRefresh ?? existing?.refreshTokenEncrypted ?? null,
      scope: tokenPayload.scope ?? existing?.scope ?? null,
      tokenType: tokenPayload.tokenType ?? existing?.tokenType ?? null,
      expiresAt: tokenPayload.expiryDate ? new Date(tokenPayload.expiryDate) : existing?.expiresAt ?? null,
      lastError: null,
      lastImportError: null,
      lastDraftError: null,
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
      lastImportError: null,
      lastDraftError: null,
    },
  });
}

async function buildAuthorizedClient(
  userId: string,
  options?: { forceRefresh?: boolean },
) {
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

  const hasRefreshToken = Boolean(connection.refreshTokenEncrypted);
  if (!hasRefreshToken) {
    await setConnectionLastError(
      userId,
      "No refresh token available for connected Gmail account. Reconnect with consent prompt.",
    );
  }

  const expiresAtMs = connection.expiresAt ? new Date(connection.expiresAt).getTime() : 0;
  const shouldRefresh =
    options?.forceRefresh ||
    (expiresAtMs > 0 && expiresAtMs <= Date.now() + 60_000);

  if (shouldRefresh) {
    try {
      if (!hasRefreshToken) {
        throw new Error("No refresh token found for this Gmail connection.");
      }
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
      await setConnectionLastError(userId, null);
      await writeAuditLog({
        actorId: userId,
        action: "GMAIL_TOKEN_REFRESH_SUCCESS",
        entityType: "GMAIL_CONNECTION",
        entityId: userId,
      });
    } catch (error) {
      const normalized = normalizeGmailError(error);
      await setConnectionLastError(userId, normalized.message);
      await writeAuditLog({
        actorId: userId,
        action: "GMAIL_TOKEN_REFRESH_FAILURE",
        entityType: "GMAIL_CONNECTION",
        entityId: userId,
        metadata: { error: normalized.message },
      });
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
    filename?: string;
    body?: { data?: string | null };
    parts?: GmailPayloadPart[];
  };
  internalDate?: string;
  snippet?: string;
}): GmailInquiryMessageDetail {
  const headers = message.payload?.headers ?? [];
  const headerMap = headers.reduce<Record<string, string>>((acc, header) => {
    const key = header.name?.toLowerCase();
    if (key && header.value) {
      acc[key] = header.value;
    }
    return acc;
  }, {});
  const subject = headers.find((header) => header.name?.toLowerCase() === "subject")?.value ?? "(no subject)";
  const fromHeader = headers.find((header) => header.name?.toLowerCase() === "from")?.value ?? "unknown@example.com";
  const from = parseFromHeader(fromHeader);
  const extracted = extractMessageBodies(message.payload ?? {});
  const bodyText = extracted.plainTextBody || message.snippet || "";
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
    htmlBody: extracted.htmlBody,
    snippet: message.snippet ?? bodyText.slice(0, 200),
    fromEmail: from.email,
    fromName: from.name,
    receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString(),
    source: detection.source,
    sourceFilter: detection.sourceFilter,
    sourceConfidence: detection.confidence,
    isInquiry: detection.isInquiry,
    listingLink: listingLinks[0],
    headers: headerMap,
    rawPayload: message.payload,
  };
}

async function listRealGmailMessages(input: {
  userId: string;
  limit?: number;
  query?: string;
}): Promise<GmailInquiryMessage[]> {
  const limit = input.limit ?? 20;
  const auth = await buildAuthorizedClient(input.userId);
  if (!auth) {
    return [];
  }

  const gmail = google.gmail({ version: "v1", auth });
  const query = input.query ?? buildGmailQuery(30);
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults: limit,
    q: query,
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

async function getRealMessage(userId: string, messageId: string): Promise<GmailInquiryMessageDetail | null> {
  const auth = await buildAuthorizedClient(userId);
  if (!auth) {
    return null;
  }

  const gmail = google.gmail({ version: "v1", auth });
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });
  const message = response.data;
  if (!message.id || !message.threadId) {
    return null;
  }

  return messageToInquiry({
    id: message.id,
    threadId: message.threadId,
    payload: message.payload as any,
    internalDate: message.internalDate ?? undefined,
    snippet: message.snippet ?? undefined,
  });
}

async function getMockMessage(messageId: string): Promise<GmailInquiryMessageDetail | null> {
  const message = (await listMockMessages()).find((item) => item.id === messageId);
  if (!message) {
    return null;
  }
  return {
    ...message,
    headers: {
      from: message.fromName ? `${message.fromName} <${message.fromEmail}>` : message.fromEmail,
      subject: message.subject,
      date: message.receivedAt,
    },
  };
}

export async function getGmailConnectionState(userId: string): Promise<GmailConnectionState> {
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
    connection: connection
      ? {
          id: connection.id,
          userId: connection.userId,
          provider: connection.provider,
          email: connection.email,
          isActive: connection.isActive,
          expiresAt: connection.expiresAt,
          scope: connection.scope,
          tokenType: connection.tokenType,
          accessTokenExists: Boolean(connection.accessTokenEncrypted),
          refreshTokenExists: Boolean(connection.refreshTokenEncrypted),
          lastError: connection.lastError,
          lastImportError: connection.lastImportError,
          lastDraftError: connection.lastDraftError,
        }
      : null,
    message: `Connected Gmail account: ${connection.email ?? "Unknown"}`,
  };
}

export function buildGoogleOAuthUrl(state: string) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
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

  const existing = await getStoredConnection(userId);
  if (!tokens.tokens.refresh_token && !existing?.refreshTokenEncrypted) {
    const normalized = normalizeGmailError("No refresh token returned by Google OAuth callback.");
    await setConnectionLastError(userId, normalized.message);
    throw new Error(normalized.message);
  }

  await saveConnection(userId, {
    accessToken: tokens.tokens.access_token,
    refreshToken: tokens.tokens.refresh_token,
    scope: tokens.tokens.scope,
    tokenType: tokens.tokens.token_type,
    expiryDate: tokens.tokens.expiry_date,
    email,
  });
  await setConnectionLastError(userId, null);

  return { email };
}

export async function fetchGmailInquiryMessages(input: {
  userId: string;
  sourceFilter?: GmailInquirySourceFilter;
  includeNonInquiry?: boolean;
  query?: string;
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
      baseMessages = await listRealGmailMessages({
        userId: input.userId,
        query: input.query,
      });
      await setConnectionLastError(input.userId, null);
    } catch (error) {
      baseMessages = await listMockMessages();
      const normalized = normalizeGmailError(error);
      await setConnectionLastError(input.userId, normalized.message);
      connectionState = {
        ...connectionState,
        mode: "MOCK",
        message: `${normalized.message} Falling back to mock mode.`,
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
  await setConnectionOperationError(input.userId, "lastImportError", null);

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
      await writeAuditLog({
        actorId: input.actorId,
        leadId: duplicate.duplicateLead.id,
        action: "GMAIL_DUPLICATE_IMPORT_BLOCKED",
        entityType: "LEAD",
        entityId: duplicate.duplicateLead.id,
        metadata: {
          reason: duplicate.reason,
          gmailMessageId: parsed.gmailMessageId,
          gmailThreadId: parsed.gmailThreadId,
        },
      });
      outcomes.push({
        messageId: message.id,
        leadId: duplicate.duplicateLead.id,
        duplicate: true,
        duplicateReason: duplicate.reason,
      });
      continue;
    }

    const status: LeadRecord["status"] = parsed.missingFields.length > 0 ? "NEEDS_REVIEW" : "IMPORTED";
    let lead: LeadRecord;
    try {
      lead = await createLead({
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
          rawSubject: message.subject,
          plainTextBody: message.bodyText,
          htmlBody: message.htmlBody ?? null,
          snippet: message.snippet ?? null,
          sender: message.fromName ?? message.fromEmail,
          senderEmail: message.fromEmail,
          receivedAt: message.receivedAt,
          gmailMessageId: message.id,
          gmailThreadId: message.threadId,
        },
      });
    } catch (error) {
      const normalized = normalizeGmailError(error);
      if (normalized.code === "database_duplicate") {
        const existing = await findLeadByGmailIdentifiers({
          gmailMessageId: parsed.gmailMessageId,
          gmailThreadId: parsed.gmailThreadId,
        });
        if (existing) {
          await writeAuditLog({
            actorId: input.actorId,
            leadId: existing.id,
            action: "GMAIL_DUPLICATE_IMPORT_BLOCKED",
            entityType: "LEAD",
            entityId: existing.id,
            metadata: {
              reason: "gmail_message_id",
              gmailMessageId: parsed.gmailMessageId,
              gmailThreadId: parsed.gmailThreadId,
            },
          });
          outcomes.push({
            messageId: message.id,
            leadId: existing.id,
            duplicate: true,
            duplicateReason: "gmail_message_id",
          });
          continue;
        }
      }
      await setConnectionLastError(input.userId, normalized.message);
      await setConnectionOperationError(input.userId, "lastImportError", normalized.message);
      throw new Error(normalized.message);
    }

    await addInboundMessageFromImport({
      leadId: lead.id,
      subject: parsed.subject,
      bodyText: message.bodyText || parsed.body,
      senderEmail: parsed.clientEmail,
      recipientEmail: "leasing@srealty.nyc",
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

  await setConnectionOperationError(input.userId, "lastImportError", null);
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
  await setConnectionOperationError(input.userId, "lastDraftError", null);
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
    agent_name: input.agentName ?? "Sovereign Realty NYC Leasing Team",
    agent_phone: "212-555-1100",
    missing_fields: lead.missingFields?.join(", ") ?? "move-in date, occupancy, income",
    showing_times: input.showingTimes ?? "Please share preferred showing windows",
    showing_date: lead.confirmedShowingAt?.slice(0, 10) ?? "",
    showing_time: lead.confirmedShowingAt?.slice(11, 16) ?? "",
    access_instructions: lead.accessInstructions ?? listing?.showingInstructions ?? "",
    application_link: input.applicationLink ?? "https://example.com/application",
  });

  const enrichedDraft = `${draftBody}

---
AI-generated draft
Draft Created — Human Review Required
No emails are sent automatically.
AI output is advisory only.
Human reviewers must make final leasing decisions using legitimate rental criteria and documented brokerage policy.

AI assistant suggestion:
${aiReply.content}

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
      agent_name: input.agentName ?? "Sovereign Realty NYC Leasing Team",
      agent_phone: "212-555-1100",
      missing_fields: lead.missingFields?.join(", ") ?? "move-in date, occupancy, income",
      showing_times: input.showingTimes ?? "",
      showing_date: lead.confirmedShowingAt?.slice(0, 10) ?? "",
      showing_time: lead.confirmedShowingAt?.slice(11, 16) ?? "",
      access_instructions: lead.accessInstructions ?? listing?.showingInstructions ?? "",
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
      const normalized = normalizeGmailError("Connected Gmail credentials are unavailable or expired.");
      await setConnectionLastError(input.userId, normalized.message);
      await setConnectionOperationError(input.userId, "lastDraftError", normalized.message);
      throw new Error(normalized.message);
    }

    try {
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
      await setConnectionLastError(input.userId, null);
      await setConnectionOperationError(input.userId, "lastDraftError", null);
    } catch (error) {
      const normalized = normalizeGmailError(error);
      await setConnectionLastError(input.userId, normalized.message);
      await setConnectionOperationError(input.userId, "lastDraftError", normalized.message);
      throw new Error(normalized.message);
    }
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
    await setConnectionOperationError(input.userId, "lastDraftError", null);
  }

  await addOutboundMessage({
    leadId: lead.id,
    subject: request.subject,
    bodyText: request.body,
    senderEmail: "leasing@srealty.nyc",
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

export async function disconnectGmailConnection(userId: string) {
  if (!process.env.DATABASE_URL) {
    const store = getFallbackStore();
    store.gmailConnections = store.gmailConnections.filter((connection) => connection.userId !== userId);
    return;
  }

  await prisma.gmailConnection.deleteMany({
    where: {
      userId,
      provider: "GOOGLE",
    },
  });
}

export async function getGmailMessageDetail(input: {
  userId: string;
  messageId: string;
}): Promise<GmailInquiryMessageDetail | null> {
  const state = await getGmailConnectionState(input.userId);
  const detail =
    state.mode === "LIVE"
      ? await getRealMessage(input.userId, input.messageId)
      : await getMockMessage(input.messageId);
  if (!detail) {
    return null;
  }

  const [leads, listings] = await Promise.all([listLeads(), listListings()]);
  const parsed = parseInquiryMessage(detail);
  const listingMatch = matchListingForInquiry(listings, {
    listingAddress: parsed.listingAddress,
    apartmentNumber: parsed.apartmentNumber,
    listingLinks: parsed.listingLinks,
    budget: parsed.budget,
    subject: parsed.subject,
    body: parsed.body,
  });
  const duplicate = detectDuplicateLead(leads, {
    gmailMessageId: detail.id,
    gmailThreadId: detail.threadId,
    email: detail.fromEmail,
    listingId: listingMatch.listingId,
    receivedAt: detail.receivedAt,
  });
  return {
    ...detail,
    importedLeadId: duplicate?.duplicateLead.id,
    duplicateReason: duplicate?.reason,
  };
}

export async function getGmailDebugSnapshot(userId: string) {
  const state = await getGmailConnectionState(userId);
  const oauth = validateOAuthConfig();
  const oauthConfig = gmailOAuthConfig();
  const grantedScopes = state.connection?.scope?.split(/\s+/).filter(Boolean) ?? [];

  let tokenRefreshWorks: boolean | null = null;
  let tokenRefreshMessage = "Not tested";

  if (state.mode === "LIVE" && state.connection?.refreshTokenExists) {
    const refreshed = await buildAuthorizedClient(userId, { forceRefresh: true });
    tokenRefreshWorks = Boolean(refreshed);
    tokenRefreshMessage = refreshed
      ? "Refresh token exchange succeeded."
      : "Refresh token exchange failed. Reconnect Gmail.";
  } else if (state.mode === "LIVE" && !state.connection?.refreshTokenExists) {
    tokenRefreshWorks = false;
    tokenRefreshMessage = "No refresh token stored for this Gmail connection.";
  }

  return {
    mode: state.mode,
    configured: state.configured,
    connected: state.connected,
    connectedEmail: state.connection?.email ?? null,
    accessTokenExists: state.connection?.accessTokenExists ?? false,
    refreshTokenExists: state.connection?.refreshTokenExists ?? false,
    tokenRefreshWorks,
    tokenRefreshMessage,
    grantedScopes,
    environment: process.env.NODE_ENV ?? "development",
    appUrl: getAppBaseUrl(),
    currentRedirectUri: oauthConfig.redirectUri || null,
    requiredRedirectUri: oauth.requiredRedirectUri,
    requiredScopes: oauth.scopes,
    lastGmailApiError: state.connection?.lastError ?? null,
    lastImportError: state.connection?.lastImportError ?? null,
    lastDraftCreationError: state.connection?.lastDraftError ?? null,
    oauthConfigMissing: oauth.missing,
    statusMessage: state.message,
  };
}

export async function runGmailDebugAction(input: {
  userId: string;
  action:
    | "test_connection"
    | "list_recent_messages"
    | "read_first_message"
    | "run_mock_import_test"
    | "disconnect_gmail";
}) {
  if (input.action === "disconnect_gmail") {
    await disconnectGmailConnection(input.userId);
    return {
      action: input.action,
      ok: true,
      message: "Gmail connection disconnected.",
    } satisfies GmailDebugResult;
  }

  if (input.action === "run_mock_import_test") {
    const messages = await listMockMessages();
    const firstInquiry = messages.find((message) => message.isInquiry);
    if (!firstInquiry) {
      return {
        action: input.action,
        ok: false,
        message: "No mock inquiry message found.",
      } satisfies GmailDebugResult;
    }
    const [outcome] = await importSelectedGmailMessages({
      userId: input.userId,
      actorId: input.userId,
      messageIds: [firstInquiry.id],
    });
    return {
      action: input.action,
      ok: true,
      message: outcome?.duplicate
        ? "Mock import test completed; duplicate correctly blocked."
        : "Mock import test completed; lead created successfully.",
      data: outcome ?? {},
    } satisfies GmailDebugResult;
  }

  const state = await getGmailConnectionState(input.userId);
  if (input.action === "test_connection") {
    if (state.mode === "MOCK") {
      return {
        action: input.action,
        ok: true,
        message: "Mock mode active. No real Gmail connection required.",
      } satisfies GmailDebugResult;
    }

    const auth = await buildAuthorizedClient(input.userId, { forceRefresh: true });
    if (!auth) {
      return {
        action: input.action,
        ok: false,
        message: "Unable to authorize Gmail client. Reconnect account.",
      } satisfies GmailDebugResult;
    }
    const gmail = google.gmail({ version: "v1", auth });
    const profile = await gmail.users.getProfile({ userId: "me" });
    return {
      action: input.action,
      ok: true,
      message: "Gmail connection test succeeded.",
      data: {
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal ?? 0,
      },
    } satisfies GmailDebugResult;
  }

  if (input.action === "list_recent_messages") {
    const { messages } = await fetchGmailInquiryMessages({
      userId: input.userId,
      includeNonInquiry: true,
    });
    return {
      action: input.action,
      ok: true,
      message: `Retrieved ${messages.length} messages.`,
      data: {
        firstMessageId: messages[0]?.id ?? null,
        firstMessageSubject: messages[0]?.subject ?? null,
      },
    } satisfies GmailDebugResult;
  }

  const { messages } = await fetchGmailInquiryMessages({
    userId: input.userId,
    includeNonInquiry: true,
  });
  const first = messages[0];
  if (!first) {
    return {
      action: input.action,
      ok: false,
      message: "No message found to read.",
    } satisfies GmailDebugResult;
  }
  const detail = await getGmailMessageDetail({
    userId: input.userId,
    messageId: first.id,
  });
  return {
    action: input.action,
    ok: Boolean(detail),
    message: detail ? "Read first message successfully." : "Unable to read first message.",
    data: detail
      ? {
          id: detail.id,
          subject: detail.subject,
          fromEmail: detail.fromEmail,
          snippet: detail.snippet,
        }
      : {},
  } satisfies GmailDebugResult;
}

export const realGmailProvider: GmailProvider = {
  async connectUrl(state: string) {
    return buildGoogleOAuthUrl(state);
  },
  async getConnectionStatus(userId: string) {
    return getGmailConnectionState(userId);
  },
  async listRecentMessages(input: { userId: string; limit?: number; query?: string }) {
    return listRealGmailMessages(input);
  },
  async getMessage(input: { userId: string; messageId: string }) {
    return getRealMessage(input.userId, input.messageId);
  },
  async importMessageAsLead(input: { userId: string; actorId?: string; messageId: string }) {
    const [outcome] = await importSelectedGmailMessages({
      userId: input.userId,
      actorId: input.actorId,
      messageIds: [input.messageId],
    });
    if (!outcome) {
      throw new Error("No Gmail import outcome was returned.");
    }
    return outcome;
  },
  async createDraftReply(input) {
    return createGmailDraftFromLead(input);
  },
  async disconnect(userId: string) {
    await disconnectGmailConnection(userId);
  },
};

export const mockGmailProvider: GmailProvider = {
  async connectUrl() {
    return `${getAppBaseUrl()}/gmail-import?oauth_error=${encodeURIComponent("Google OAuth is not configured. Using mock mode.")}`;
  },
  async getConnectionStatus(userId: string) {
    return getGmailConnectionState(userId);
  },
  async listRecentMessages() {
    return listMockMessages();
  },
  async getMessage(input: { userId: string; messageId: string }) {
    return getMockMessage(input.messageId);
  },
  async importMessageAsLead(input: { userId: string; actorId?: string; messageId: string }) {
    const [outcome] = await importSelectedGmailMessages({
      userId: input.userId,
      actorId: input.actorId,
      messageIds: [input.messageId],
    });
    if (!outcome) {
      throw new Error("No mock import outcome was returned.");
    }
    return outcome;
  },
  async createDraftReply(input) {
    return createGmailDraftFromLead(input);
  },
  async disconnect(userId: string) {
    await disconnectGmailConnection(userId);
  },
};

export async function resolveGmailProvider(userId: string): Promise<GmailProvider> {
  if (!isGoogleEnvConfigured()) {
    return mockGmailProvider;
  }
  const state = await getGmailConnectionState(userId);
  return state.mode === "LIVE" ? realGmailProvider : mockGmailProvider;
}
