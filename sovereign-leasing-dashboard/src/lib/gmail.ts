export type GmailDraftRequest = {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
};

export type GmailSendRequest = GmailDraftRequest;

export async function fetchGmailInquiriesPlaceholder() {
  return {
    provider: "GMAIL_PLACEHOLDER",
    status: "NOT_CONFIGURED",
    message:
      "Gmail OAuth is planned for Phase 2. This placeholder preserves integration contracts for future thread sync.",
  };
}

export async function createGmailDraftPlaceholder(payload: GmailDraftRequest) {
  return {
    provider: "GMAIL_PLACEHOLDER",
    mode: "DRAFT",
    message: "Draft created in placeholder mode.",
    payload,
  };
}

export async function sendGmailReplyPlaceholder(payload: GmailSendRequest) {
  return {
    provider: "GMAIL_PLACEHOLDER",
    mode: "SEND",
    message: "Message marked as sent in placeholder mode.",
    payload,
  };
}
