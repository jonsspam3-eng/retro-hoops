import type { LeadRecord, ListingRecord } from "@/lib/types";

type AiContext = {
  lead: LeadRecord;
  listing?: ListingRecord | null;
};

type AiOutput = {
  content: string;
  rationale: string;
  model: string;
};

interface AiProvider {
  summarizeLead(context: AiContext): Promise<AiOutput>;
  draftReply(context: AiContext): Promise<AiOutput>;
  findMissingInfo(context: AiContext): Promise<AiOutput>;
}

class MockProvider implements AiProvider {
  async summarizeLead({ lead, listing }: AiContext): Promise<AiOutput> {
    const summary = [
      `${lead.clientName} inquired from ${lead.source}.`,
      listing ? `Target listing is ${listing.address} ${listing.apartmentNumber} at $${listing.rent}.` : "Listing needs confirmation.",
      lead.annualIncome ? `Reported income: $${lead.annualIncome.toLocaleString()}.` : "Income not provided.",
      lead.desiredMoveInDate ? `Move-in target: ${new Date(lead.desiredMoveInDate).toLocaleDateString()}.` : "Move-in date missing.",
      lead.pets ? `Pets noted: ${lead.pets}.` : "Pet details missing.",
    ].join(" ");

    return {
      content: summary,
      rationale: "Generated from structured lead fields and inquiry text.",
      model: "mock-rule-based-v1",
    };
  }

  async draftReply({ lead, listing }: AiContext): Promise<AiOutput> {
    const lines = [
      `Hi ${lead.clientName},`,
      "",
      listing
        ? `Thank you for your interest in ${listing.address} ${listing.apartmentNumber}.`
        : "Thank you for your inquiry with Sovereign Realty NYC.",
      "To move your request forward quickly, please share:",
      "• Your ideal move-in date",
      "• Number of occupants",
      "• Any pets",
      "• Annual household income",
      "• Guarantor needs",
      "• Preferred showing windows this week",
      "",
      "Once received, we will confirm next steps.",
      "",
      "Best,",
      "Sovereign Leasing Team",
    ];

    return {
      content: lines.join("
"),
      rationale: "Template + lead context hybrid response.",
      model: "mock-rule-based-v1",
    };
  }

  async findMissingInfo({ lead }: AiContext): Promise<AiOutput> {
    const missing: string[] = [];
    if (!lead.desiredMoveInDate) missing.push("ideal move-in date");
    if (!lead.occupants) missing.push("number of occupants");
    if (!lead.pets) missing.push("pet information");
    if (!lead.annualIncome) missing.push("annual household income");
    if (lead.needsGuarantor === null || lead.needsGuarantor === undefined) missing.push("guarantor requirement");
    if (!lead.employmentDetails) missing.push("employment/student status");

    return {
      content: missing.length ? `Missing: ${missing.join(", ")}.` : "No critical qualification fields are missing.",
      rationale: "Compared required qualification checklist against available lead data.",
      model: "mock-rule-based-v1",
    };
  }
}

async function callOpenAi(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return json.choices?.[0]?.message?.content?.trim() ?? "No output returned.";
}

class OpenAiProvider implements AiProvider {
  async summarizeLead(context: AiContext): Promise<AiOutput> {
    const content = await callOpenAi(
      "You are a leasing assistant summarizing NYC rental leads for internal staff.",
      `Summarize this lead in 4 concise bullet points with no fair-housing violations: ${JSON.stringify(context)}`,
    );

    return { content, rationale: "AI summary using OpenAI chat completion.", model: "openai:gpt-4.1-mini" };
  }

  async draftReply(context: AiContext): Promise<AiOutput> {
    const content = await callOpenAi(
      "You draft professional leasing emails. Ask only legitimate rental qualification questions.",
      `Draft a reply for this lead while keeping the original thread tone: ${JSON.stringify(context)}`,
    );

    return { content, rationale: "AI draft reply using OpenAI.", model: "openai:gpt-4.1-mini" };
  }

  async findMissingInfo(context: AiContext): Promise<AiOutput> {
    const content = await callOpenAi(
      "You identify missing leasing qualification fields without making final approval decisions.",
      `Identify missing qualification information for this lead: ${JSON.stringify(context)}`,
    );

    return { content, rationale: "AI missing-info detection using OpenAI.", model: "openai:gpt-4.1-mini" };
  }
}

function getProvider(): AiProvider {
  if (process.env.AI_PROVIDER?.toLowerCase() === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAiProvider();
  }

  return new MockProvider();
}

export async function generateAiSummary(context: AiContext): Promise<AiOutput> {
  return getProvider().summarizeLead(context);
}

export async function generateAiReplyDraft(context: AiContext): Promise<AiOutput> {
  return getProvider().draftReply(context);
}

export async function generateMissingInfoAnalysis(context: AiContext): Promise<AiOutput> {
  return getProvider().findMissingInfo(context);
}
