import { fmtDays, fmtMoney, fmtMultiple, fmtRatioPct } from "../finance/format";
import { growthPct, isNum } from "../finance/math";
import type { AnalysisResult } from "../finance/types";
import { cashScenarios } from "./facts";
import type { DueDiligenceReport, ReportFinding } from "./types";

const POSSIBLE: Record<string, string> = {
  "ar-vs-revenue": "Possible explanations include extended customer credit terms, a shift toward slower-paying customers, disputed invoices, year-end billing timing or revenue recognised ahead of cash collection.",
  "inv-vs-revenue": "Possible explanations include stock build ahead of expected orders, slowing demand, supply-chain safety stock, or slow-moving and obsolete inventory.",
  "ebitda-ocf-divergence": "Possible explanations include working-capital build, non-cash income within EBITDA, capitalised costs, or timing of collections and payments.",
  "dso-up": "Possible explanations include changes to credit policy, customer mix, or collection effectiveness.",
  "dio-up": "Possible explanations include over-production, purchasing commitments, or weakening sell-through.",
  "ccc-up": "Possible explanations include the combined effect of slower collections and inventory build, partially offset by supplier terms.",
  "leverage-high": "Possible explanations include debt-funded working capital, capital expenditure or prior acquisitions.",
  "leverage-negative-ebitda": "Possible explanations include an operating downturn or one-off costs.",
};

/**
 * Deterministic fallback report, generated without AI from engine output only.
 * Clearly labelled in the UI as a demo/deterministic report.
 */
export function buildDeterministicReport(a: AnalysisResult): DueDiligenceReport {
  const cur = a.records.at(-1);
  const prev = a.records.length > 1 ? a.records.at(-2) : undefined;
  const mCur = a.metrics.at(-1);
  const mPrev = a.metrics.length > 1 ? a.metrics.at(-2) : undefined;
  const c = a.currency;
  const scoreText = a.risk.score === null ? "Insufficient Data" : `${a.risk.score}/100 (${a.risk.classification})`;
  const highAlerts = a.alerts.filter((x) => x.severity === "High" || x.severity === "Critical");

  const executiveSummary = [
    `${a.companyName}${a.isDemo ? " (synthetic demo data)" : ""} was screened across ${a.records.length} financial year(s)${cur ? ` ending ${cur.year}` : ""}.`,
    `The illustrative screening model produced an overall risk score of ${scoreText}, based on ${a.risk.availableCount} of ${a.risk.totalCount} indicators.`,
    a.alerts.length
      ? `${a.alerts.length} potential cash-trap indicator(s) were identified, ${highAlerts.length} rated High or Critical. The most significant is: ${a.alerts[0]?.name.toLowerCase()}.`
      : "No warning signs were triggered by the screening rules.",
    "These findings indicate areas requiring further investigation; they do not establish wrongdoing or a definitive view on value.",
  ].join(" ");

  const riskScoreCommentary = a.risk.insufficientData
    ? `Only ${a.risk.availableCount} indicators could be assessed; at least 4 are required for an overall score.`
    : `Points earned: ${a.risk.rawPoints} of ${a.risk.availableMax} available, normalised to ${a.risk.score}/100.${a.risk.complete ? "" : " The assessment is incomplete because some indicators lacked data."} Largest contributors: ${[...a.risk.indicators]
        .filter((i) => (i.points ?? 0) > 0)
        .sort((x, y) => (y.points ?? 0) - (x.points ?? 0))
        .slice(0, 3)
        .map((i) => `${i.name} (${i.points}/${i.maxPoints})`)
        .join(", ") || "none"}.`;

  const keyFindings: ReportFinding[] = a.alerts.map((al) => ({
    finding: `${al.name} — ${al.severity}`,
    evidence: `${al.evidence} ${al.previousLabel}: ${al.previousValue}; ${al.currentLabel}: ${al.currentValue}.`,
    possibleExplanations: POSSIBLE[al.id] ?? "Further information is required to explain this movement.",
  }));

  const revG = prev && cur ? growthPct(prev.revenue, cur.revenue) : null;
  const arG = prev && cur ? growthPct(prev.receivables, cur.receivables) : null;
  const invG = prev && cur ? growthPct(prev.inventory, cur.inventory) : null;
  const receivablesInventory =
    mCur && mPrev
      ? `DSO moved from ${fmtDays(mPrev.dso.value)} to ${fmtDays(mCur.dso.value)} and DIO from ${fmtDays(mPrev.dio.value)} to ${fmtDays(mCur.dio.value)} (${mPrev.year} → ${mCur.year}). Receivables grew ${isNum(arG) ? arG.toFixed(1) + "%" : "n/a"} and inventory ${isNum(invG) ? invG.toFixed(1) + "%" : "n/a"} against revenue growth of ${isNum(revG) ? revG.toFixed(1) + "%" : "n/a"}. The cash conversion cycle moved from ${fmtDays(mPrev.ccc.value)} to ${fmtDays(mCur.ccc.value)}.`
      : "At least two years of data are required for trend analysis of receivables and inventory.";

  const profitabilityVsCash =
    cur && mCur
      ? `In ${cur.year}, EBITDA was ${fmtMoney(cur.ebitda, c)} and operating cash flow ${fmtMoney(cur.operatingCashFlow, c)}, a cash conversion of ${fmtRatioPct(mCur.cashConversion.value)}.${prev ? ` In ${prev.year} the figures were ${fmtMoney(prev.ebitda, c)} and ${fmtMoney(prev.operatingCashFlow, c)} respectively.` : ""}${mCur.cashConversion.note ? ` Note: ${mCur.cashConversion.note}.` : ""}`
      : "Insufficient data.";

  const leverage =
    mCur
      ? `Net debt in ${mCur.year} was ${fmtMoney(mCur.netDebt.value, c)}, equal to ${fmtMultiple(mCur.netDebtToEbitda.value)} EBITDA${mPrev ? ` (${fmtMultiple(mPrev.netDebtToEbitda.value)} in ${mPrev.year})` : ""}.${mCur.netDebtToEbitda.note ? ` ${mCur.netDebtToEbitda.note}.` : ""}`
      : "Insufficient data.";

  const scenarios = cashScenarios(a);
  const cashRelease = scenarios.length
    ? scenarios.map((s) => `${s.label}: DSO ${fmtDays(s.currentDso)} → ${fmtDays(s.targetDso)} implies potential cash release of ${fmtMoney(s.release, c)}.`).join(" ") +
      " These are illustrative working-capital improvement estimates, not guaranteed cash recovery or additional profit."
    : "Revenue and DSO are required to estimate cash-release opportunities.";

  const investmentImplications = [
    highAlerts.length
      ? "Working-capital normalisation should be reflected in the net working-capital peg and the purchase-price mechanism."
      : "Working-capital trends appear broadly stable on the data supplied.",
    "Quality-of-earnings work should reconcile EBITDA to operating cash flow before relying on reported EBITDA for valuation.",
    isNum(mCur?.netDebtToEbitda.value) && (mCur?.netDebtToEbitda.value ?? 0) >= 2
      ? "Existing leverage may constrain acquisition financing capacity and should be considered in structuring."
      : "Existing leverage does not appear to be a primary constraint on the data supplied.",
  ];

  const dataLimitations = [
    ...(a.isDemo ? ["All figures are synthetic and illustrative; they do not represent a real company."] : []),
    "Analysis uses annual figures only; monthly or quarterly data may reveal seasonality and year-end effects.",
    ...a.warnings,
    ...a.risk.indicators.filter((i) => i.points === null).map((i) => `${i.name} not assessed: ${i.explanation}`),
    ...(a.metrics.some((m) => m.dso.approximate) ? ["Earliest-year working-capital days use year-end balances only and are approximations."] : []),
  ];

  const managementQuestions = Array.from(
    new Set([
      ...a.alerts.flatMap((al) => al.informationRequired.map((q) => `Please provide: ${q.toLowerCase()}.`)),
      "What drove the movement in working capital in the most recent year, and is it expected to reverse?",
      "Are there any customer, supplier or financing arrangements that affect the timing of cash flows?",
    ]),
  ).slice(0, 12);

  const recommendation =
    a.risk.score === null
      ? "The data supplied is insufficient for an overall screening score. The investment team should obtain complete financial statements before forming a view."
      : `Based on a screening score of ${scoreText}, the investment team may wish to prioritise ${highAlerts.length ? "targeted due diligence on the High/Critical findings above" : "standard confirmatory due diligence"}. This report is decision support only and does not constitute a recommendation to invest or not invest.`;

  return {
    executiveSummary,
    riskScoreCommentary,
    keyFindings,
    receivablesInventory,
    profitabilityVsCash,
    leverage,
    cashRelease,
    investmentImplications,
    dataLimitations,
    managementQuestions,
    recommendation,
  };
}
