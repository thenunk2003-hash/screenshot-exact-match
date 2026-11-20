import { calculateCashRelease } from "../finance/cashImpact";
import { fmtDays, fmtMoney, fmtMultiple, fmtRatioPct } from "../finance/format";
import { isNum } from "../finance/math";
import type { AnalysisResult } from "../finance/types";

export interface CashScenario {
  label: string;
  currentDso: number;
  targetDso: number;
  release: number;
}

/** Cash-release scenarios computed by the engine (the AI never calculates these). */
export function cashScenarios(a: AnalysisResult): CashScenario[] {
  const cur = a.records.at(-1);
  const m = a.metrics;
  const mCur = m.at(-1);
  if (!cur || !mCur || !isNum(cur.revenue) || !isNum(mCur.dso.value)) return [];
  const out: CashScenario[] = [];
  const currentDso = mCur.dso.value;
  const prevDso = m.length > 1 ? m.at(-2)?.dso.value : null;
  if (isNum(prevDso) && prevDso < currentDso) {
    const r = calculateCashRelease({ annualRevenue: cur.revenue, currentDso, targetDso: prevDso });
    if (r.ok) out.push({ label: `Return DSO to ${m.at(-2)?.year} level`, currentDso, targetDso: prevDso, release: r.release });
  }
  if (currentDso > 10) {
    const r = calculateCashRelease({ annualRevenue: cur.revenue, currentDso, targetDso: currentDso - 10 });
    if (r.ok) out.push({ label: "Reduce DSO by 10 days", currentDso, targetDso: currentDso - 10, release: r.release });
  }
  return out;
}

/** Compact, pre-formatted fact sheet passed to the AI. Contains only engine output. */
export function buildReportFacts(a: AnalysisResult) {
  return {
    company: a.companyName,
    dataType: a.isDemo ? "SYNTHETIC ILLUSTRATIVE DEMO DATA" : "User-uploaded financial statements",
    currency: a.currency,
    years: a.records.map((r) => r.year),
    financials: a.records.map((r) => ({
      year: r.year,
      revenue: fmtMoney(r.revenue, a.currency),
      cogs: fmtMoney(r.cogs, a.currency),
      ebitda: fmtMoney(r.ebitda, a.currency),
      receivables: fmtMoney(r.receivables, a.currency),
      inventory: fmtMoney(r.inventory, a.currency),
      payables: fmtMoney(r.payables, a.currency),
      operatingCashFlow: fmtMoney(r.operatingCashFlow, a.currency),
      cash: fmtMoney(r.cash, a.currency),
      debt: fmtMoney(r.debt, a.currency),
    })),
    metrics: a.metrics.map((m) => ({
      year: m.year,
      dso: fmtDays(m.dso.value) + (m.dso.approximate ? " (approx.)" : ""),
      dio: fmtDays(m.dio.value) + (m.dio.approximate ? " (approx.)" : ""),
      dpo: fmtDays(m.dpo.value) + (m.dpo.approximate ? " (approx.)" : ""),
      ccc: fmtDays(m.ccc.value) + (m.ccc.approximate ? " (approx.)" : ""),
      cashConversion: fmtRatioPct(m.cashConversion.value),
      netDebt: fmtMoney(m.netDebt.value, a.currency),
      netDebtToEbitda: fmtMultiple(m.netDebtToEbitda.value),
      notes: [m.dso, m.dio, m.dpo, m.ccc, m.cashConversion, m.netDebtToEbitda]
        .map((x) => x.note)
        .filter((n): n is string => Boolean(n)),
    })),
    riskScore: a.risk.score === null ? "Insufficient Data" : `${a.risk.score}/100`,
    classification: a.risk.classification ?? "Insufficient Data",
    coverage: `${a.risk.availableCount} of ${a.risk.totalCount} indicators assessed`,
    indicators: a.risk.indicators.map((i) => ({
      name: i.name,
      points: i.points === null ? "Not assessed" : `${i.points}/${i.maxPoints}`,
      evidence: i.evidence,
      explanation: i.explanation,
      approximate: i.approximate,
    })),
    alerts: a.alerts.map((al) => ({
      name: al.name,
      severity: al.severity,
      evidence: al.evidence,
      previous: `${al.previousLabel}: ${al.previousValue}`,
      current: `${al.currentLabel}: ${al.currentValue}`,
    })),
    cashReleaseScenarios: cashScenarios(a).map((s) => ({
      scenario: s.label,
      currentDso: fmtDays(s.currentDso),
      targetDso: fmtDays(s.targetDso),
      potentialCashRelease: fmtMoney(s.release, a.currency),
    })),
    dataWarnings: a.warnings,
  };
}

export type ReportFacts = ReturnType<typeof buildReportFacts>;
