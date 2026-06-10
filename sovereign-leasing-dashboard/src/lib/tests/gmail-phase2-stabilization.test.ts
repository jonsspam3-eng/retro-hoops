import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGmailQuery,
  buildMimeMessage,
  decodeBase64Url,
  extractMessageBodies,
  getGmailMessageDetail,
  importSelectedGmailMessages,
  mockGmailProvider,
  resolveGmailProvider,
  validateOAuthConfig,
} from "@/lib/gmail";
import { getLeadById } from "@/lib/repository";

function resetFallbackStore() {
  (globalThis as { __sovereignStore?: unknown }).__sovereignStore = undefined;
}

function withEnvReset(keys: string[], fn: () => Promise<void> | void) {
  const previous = new Map<string, string | undefined>();
  for (const key of keys) {
    previous.set(key, process.env[key]);
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of keys) {
        const value = previous.get(key);
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

test("validates required OAuth env variables", async () => {
  await withEnvReset(
    [
      "GOOGLE_GMAIL_CLIENT_ID",
      "GOOGLE_GMAIL_CLIENT_SECRET",
      "GOOGLE_GMAIL_REDIRECT_URI",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_REDIRECT_URI",
      "DATABASE_URL",
      "NEXTAUTH_URL",
      "APP_URL",
      "ENCRYPTION_KEY",
      "GMAIL_TOKEN_ENCRYPTION_KEY",
    ],
    () => {
      delete process.env.GOOGLE_GMAIL_CLIENT_ID;
      delete process.env.GOOGLE_GMAIL_CLIENT_SECRET;
      delete process.env.GOOGLE_GMAIL_REDIRECT_URI;
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_REDIRECT_URI;
      delete process.env.DATABASE_URL;
      delete process.env.NEXTAUTH_URL;
      delete process.env.APP_URL;
      delete process.env.ENCRYPTION_KEY;
      delete process.env.GMAIL_TOKEN_ENCRYPTION_KEY;

      const config = validateOAuthConfig();
      assert.equal(config.configured, false);
      assert.ok(config.missing.includes("GOOGLE_GMAIL_CLIENT_ID"));
      assert.ok(config.missing.includes("GOOGLE_GMAIL_CLIENT_SECRET"));
      assert.ok(config.missing.includes("GOOGLE_GMAIL_REDIRECT_URI"));
      assert.ok(config.missing.includes("DATABASE_URL"));
      assert.ok(config.missing.includes("NEXTAUTH_URL or APP_URL"));
      assert.ok(config.missing.includes("ENCRYPTION_KEY"));
    },
  );
});

test("builds Gmail query with inquiry-focused filters", () => {
  const query = buildGmailQuery(30);
  assert.ok(query.includes("newer_than:30d"));
  assert.ok(query.includes("StreetEasy"));
  assert.ok(query.includes("subject:(inquiry)"));
  assert.ok(query.includes("\"Is this still available\""));
});

test("decodes base64url payloads", () => {
  const encoded = Buffer.from("hello gmail").toString("base64url");
  assert.equal(decodeBase64Url(encoded), "hello gmail");
});

test("extracts plain and html bodies from multipart payload", () => {
  const payload = {
    mimeType: "multipart/mixed",
    parts: [
      {
        mimeType: "multipart/alternative",
        parts: [
          {
            mimeType: "text/plain",
            body: { data: Buffer.from("Plain inquiry body").toString("base64url") },
          },
          {
            mimeType: "text/html",
            body: { data: Buffer.from("<p>HTML inquiry <strong>body</strong></p>").toString("base64url") },
          },
        ],
      },
    ],
  };

  const extracted = extractMessageBodies(payload);
  assert.equal(extracted.plainTextBody, "Plain inquiry body");
  assert.equal(extracted.htmlBody, "<p>HTML inquiry <strong>body</strong></p>");
});

test("stores raw email metadata when importing Gmail message", async () => {
  resetFallbackStore();
  const [outcome] = await importSelectedGmailMessages({
    userId: "user_admin",
    actorId: "user_admin",
    messageIds: ["gmail_mock_004"],
  });
  assert.ok(outcome);
  assert.equal(outcome?.duplicate, false);
  const lead = await getLeadById(outcome!.leadId);
  assert.ok(lead);
  assert.equal(lead?.gmailMessageId, "gmail_mock_004");
  assert.equal(lead?.inquirySubject, "Website Contact Form: Interested in 245 E 87th St 11F");
  assert.equal(lead?.parsedFields?.snippet, "Website contact form inquiry for 245 E 87th St 11F.");
});

test("returns mock provider when Google env vars are missing", async () => {
  await withEnvReset(
    ["GOOGLE_GMAIL_CLIENT_ID", "GOOGLE_GMAIL_CLIENT_SECRET", "GOOGLE_GMAIL_REDIRECT_URI"],
    async () => {
      delete process.env.GOOGLE_GMAIL_CLIENT_ID;
      delete process.env.GOOGLE_GMAIL_CLIENT_SECRET;
      delete process.env.GOOGLE_GMAIL_REDIRECT_URI;
      const provider = await resolveGmailProvider("user_admin");
      assert.equal(provider, mockGmailProvider);
    },
  );
});

test("reads detailed mock message payload for debugging", async () => {
  resetFallbackStore();
  const detail = await getGmailMessageDetail({
    userId: "user_admin",
    messageId: "gmail_mock_001",
  });
  assert.ok(detail);
  assert.equal(detail?.id, "gmail_mock_001");
  assert.equal(detail?.headers.subject, "StreetEasy inquiry for 101 Warren St 2A");
});

test("buildMimeMessage generates base64url MIME payload", () => {
  const raw = buildMimeMessage({
    to: "client@example.com",
    subject: "Hello",
    body: "Draft body",
    threadId: "thread_1",
  });
  const decoded = Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  assert.ok(decoded.includes("To: client@example.com"));
  assert.ok(decoded.includes("Subject: Hello"));
  assert.ok(decoded.includes("Draft body"));
});
