import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, jsonSchema, streamText } from "ai";

import type { DueDiligenceReport } from "../report/types";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const str = { type: "string" } as const;
const strArr = { type: "array", items: str } as const;

const REPORT_SCHEMA = jsonSchema<DueDiligenceReport>({
  type: "object",
  additionalProperties: false,
  required: [
    "executiveSummary", "riskScoreCommentary", "keyFindings", "receivablesInventory", "profitabilityVsCash",
    "leverage", "cashRelease", "investmentImplications", "dataLimitations", "managementQuestions", "recommendation",
  ],
  properties: {
    executiveSummary: str,
    riskScoreCommentary: str,
    keyFindings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["finding", "evidence", "possibleExplanations"],
        properties: { finding: str, evidence: str, possibleExplanations: str },
      },
    },
    receivablesInventory: str,
    profitabilityVsCash: str,
    leverage: str,
    cashRelease: str,
    investmentImplications: strArr,
    dataLimitations: strArr,
    managementQuestions: strArr,
    recommendation: str,
  },
});

const INSTRUCTIONS = `You are a senior financial due diligence analyst writing for a private equity investment committee.
You receive a fact sheet produced by the CashTrap calculation engine. Write a professional due diligence report.

Strict rules:
- Use ONLY figures that appear in the fact sheet, quoted exactly as given. Never invent, estimate, or recalculate any number.
- In keyFindings, "evidence" contains only verified figures from the fact sheet; "possibleExplanations" contains hypotheses, clearly worded as possibilities ("may", "could").
- Never state or imply that an indicator proves fraud, poor management or bad debt. Present findings as potential risks requiring investigation.
- Highlight missing information and data limitations explicitly (including approximations and unassessed indicators).
- Never recommend investing or not investing. The recommendation must frame next due-diligence steps as decision support for the investment team.
- If the data is synthetic demo data, say so in the executive summary and data limitations.
- Write concise, clear British English. Executive summary: 3–5 sentences. Each narrative section: 2–4 sentences. 3–8 key findings, 3–5 implications, 3–8 limitations, 6–10 management questions.`;

export type ReportGenerationResult =
  | { ok: true; report: DueDiligenceReport }
  | { ok: false; status: number; message: string };

export async function generateReport(factsJson: string, signal?: AbortSignal): Promise<ReportGenerationResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, status: 401, message: "AI integration is not configured." };

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions: INSTRUCTIONS,
      messages: [{ role: "user", content: `CashTrap engine fact sheet:\n${factsJson}` }],
      output: Output.object({ schema: REPORT_SCHEMA }),
      ...(signal ? { abortSignal: signal } : {}),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const report = await result.output;
    return { ok: true, report };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return { ok: false, status: 502, message: "The AI response could not be read as a report." };
    }
    if (APICallError.isInstance(error)) {
      const status = error.statusCode ?? 500;
      let message = "The AI service returned an error.";
      if (status === 402) message = "AI credits are exhausted. Add credits to your workspace to generate AI reports.";
      else if (status === 429) message = "The AI service is busy. Please try again in a moment.";
      else if (status === 403) message = "AI access is not available for this workspace.";
      else if (status === 401) message = "AI integration is not configured.";
      try {
        const body = JSON.parse(error.responseBody ?? "{}") as { message?: string; error?: { message?: string } };
        const m = body.message ?? body.error?.message;
        if (m && status !== 401) message = m;
      } catch {
        /* keep default */
      }
      return { ok: false, status, message };
    }
    console.error("AI report generation failed", error);
    return { ok: false, status: 500, message: "AI report generation failed." };
  }
}
