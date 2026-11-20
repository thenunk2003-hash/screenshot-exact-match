import { detectAlerts } from "./alerts";
import { computeAllMetrics } from "./metrics";
import { assessRisk } from "./risk";
import type { AnalysisResult, FinancialRecord } from "./types";

/**
 * Frontend implementation of the future `POST /analyze` endpoint.
 * Keep the input/output shape stable so it can be swapped for a backend call.
 */
export function analyzeFinancials(input: {
  companyName: string;
  isDemo: boolean;
  records: FinancialRecord[];
  warnings?: string[];
  currency?: string;
}): AnalysisResult {
  const records = [...input.records].sort((a, b) => a.year - b.year);
  const metrics = computeAllMetrics(records);
  const risk = assessRisk(records, metrics);
  const alerts = detectAlerts(records, metrics);
  return {
    companyName: input.companyName,
    isDemo: input.isDemo,
    currency: input.currency ?? "AED",
    records,
    metrics,
    risk,
    alerts,
    warnings: input.warnings ?? [],
    analyzedAt: new Date().toISOString(),
  };
}
