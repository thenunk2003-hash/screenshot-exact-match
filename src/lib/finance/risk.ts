import { growthPct, isNum } from "./math";
import { fmtDays, fmtMultiple, fmtRatioPct, fmtSigned, fmtMoney } from "./format";
import type {
  FinancialRecord,
  RiskAssessment,
  RiskClass,
  RiskIndicator,
  YearMetrics,
} from "./types";

export const MIN_INDICATORS = 4;

// Prototype screening thresholds (not universal industry standards).
export function receivablesPoints(dsoChangeDays: number): number {
  const d = Math.round(dsoChangeDays);
  if (d <= 0) return 0;
  if (d <= 10) return 5;
  if (d <= 20) return 10;
  return 20;
}

export function inventoryPoints(dioChangeDays: number): number {
  const d = Math.round(dioChangeDays);
  if (d <= 0) return 0;
  if (d <= 10) return 5;
  if (d <= 20) return 10;
  return 15;
}

/** ratio = OCF / EBITDA (0.8 = 80%). */
export function cashConversionPoints(ratio: number): number {
  const pct = Math.round(ratio * 100);
  if (pct >= 80) return 0;
  if (pct >= 50) return 10;
  if (pct >= 20) return 20;
  return 25;
}

export function divergencePoints(ebitdaChange: number, ocfChange: number, ebitdaPct: number | null, ocfPct: number | null): number {
  if (ebitdaPct !== null && ocfPct !== null && ebitdaPct > 10 && ocfPct < -10) return 20;
  if (ebitdaChange >= 0 && ocfChange >= 0) return 0;
  return 10;
}

export function cccPoints(cccChangeDays: number): number {
  const d = Math.round(cccChangeDays);
  if (d <= 0) return 0;
  if (d <= 10) return 3;
  if (d <= 20) return 6;
  return 10;
}

export function leveragePoints(multiple: number): number {
  if (multiple < 2) return 0;
  if (multiple <= 3) return 3;
  if (multiple <= 4) return 7;
  return 10;
}

export function classify(score: number): RiskClass {
  if (score < 25) return "Low Risk";
  if (score < 50) return "Moderate Risk";
  if (score < 75) return "High Risk";
  return "Critical Risk";
}

function unavailable(key: RiskIndicator["key"], name: string, maxPoints: number, why: string): RiskIndicator {
  return { key, name, maxPoints, points: null, explanation: why, evidence: "Not assessed", approximate: false };
}

export function assessRisk(records: FinancialRecord[], metrics: YearMetrics[]): RiskAssessment {
  const sortedR = [...records].sort((a, b) => a.year - b.year);
  const sortedM = [...metrics].sort((a, b) => a.year - b.year);
  const cur = sortedR.at(-1);
  const prev = sortedR.length > 1 ? sortedR.at(-2) : undefined;
  const mCur = sortedM.at(-1);
  const mPrev = sortedM.length > 1 ? sortedM.at(-2) : undefined;
  const indicators: RiskIndicator[] = [];

  // 1. Receivables risk (DSO change)
  if (mCur && mPrev && isNum(mCur.dso.value) && isNum(mPrev.dso.value)) {
    const change = mCur.dso.value - mPrev.dso.value;
    const pts = receivablesPoints(change);
    indicators.push({
      key: "receivables",
      name: "Receivables Risk",
      maxPoints: 20,
      points: pts,
      approximate: mCur.dso.approximate || mPrev.dso.approximate,
      evidence: `DSO ${fmtDays(mPrev.dso.value)} (${mPrev.year}) → ${fmtDays(mCur.dso.value)} (${mCur.year}), ${fmtSigned(change, " days")}`,
      explanation:
        pts === 0
          ? "Collection period is stable or improving."
          : "Customers are taking longer to pay. More cash is tied up in receivables, which may indicate looser credit terms, collection issues or revenue-recognition timing that needs review.",
    });
  } else {
    indicators.push(unavailable("receivables", "Receivables Risk", 20, "DSO is required for the last two years."));
  }

  // 2. Inventory risk (DIO change)
  if (mCur && mPrev && isNum(mCur.dio.value) && isNum(mPrev.dio.value)) {
    const change = mCur.dio.value - mPrev.dio.value;
    const pts = inventoryPoints(change);
    indicators.push({
      key: "inventory",
      name: "Inventory Risk",
      maxPoints: 15,
      points: pts,
      approximate: mCur.dio.approximate || mPrev.dio.approximate,
      evidence: `DIO ${fmtDays(mPrev.dio.value)} (${mPrev.year}) → ${fmtDays(mCur.dio.value)} (${mCur.year}), ${fmtSigned(change, " days")}`,
      explanation:
        pts === 0
          ? "Inventory holding period is stable or improving."
          : "Inventory is sitting longer before being sold. This can point to slowing demand, over-production or potentially obsolete stock.",
    });
  } else {
    indicators.push(unavailable("inventory", "Inventory Risk", 15, "DIO is required for the last two years."));
  }

  // 3. Profit-to-cash conversion (latest year)
  if (mCur && isNum(mCur.cashConversion.value)) {
    const r = mCur.cashConversion.value;
    const pts = cashConversionPoints(r);
    indicators.push({
      key: "cashConversion",
      name: "Profit-to-Cash Conversion Risk",
      maxPoints: 25,
      points: pts,
      approximate: false,
      evidence: `Operating cash flow / EBITDA = ${fmtRatioPct(r)} in ${mCur.year}`,
      explanation:
        pts === 0
          ? "Reported EBITDA is largely converting into operating cash."
          : "A meaningful share of reported EBITDA is not turning into operating cash. The quality of earnings should be tested.",
    });
  } else {
    indicators.push(
      unavailable(
        "cashConversion",
        "Profit-to-Cash Conversion Risk",
        25,
        mCur?.cashConversion.note ?? "Operating cash flow and EBITDA are required.",
      ),
    );
  }

  // 4. EBITDA vs OCF divergence
  if (cur && prev && isNum(cur.ebitda) && isNum(prev.ebitda) && isNum(cur.operatingCashFlow) && isNum(prev.operatingCashFlow)) {
    const eChg = cur.ebitda - prev.ebitda;
    const oChg = cur.operatingCashFlow - prev.operatingCashFlow;
    const ePct = growthPct(prev.ebitda, cur.ebitda);
    const oPct = prev.operatingCashFlow > 0 ? growthPct(prev.operatingCashFlow, cur.operatingCashFlow) : null;
    const pts = divergencePoints(eChg, oChg, ePct, oPct);
    indicators.push({
      key: "divergence",
      name: "EBITDA vs Operating Cash Flow Divergence",
      maxPoints: 20,
      points: pts,
      approximate: false,
      evidence: `EBITDA ${ePct !== null ? fmtSigned(ePct, "%") : fmtMoney(eChg)} vs operating cash flow ${oPct !== null ? fmtSigned(oPct, "%") : fmtMoney(oChg)} (${prev.year} → ${cur.year})`,
      explanation:
        pts === 0
          ? "EBITDA and operating cash flow are moving in the same, positive direction."
          : pts === 20
            ? "EBITDA is growing strongly while operating cash flow is falling sharply — a classic profit-versus-cash gap that warrants a quality-of-earnings review."
            : "At least one of EBITDA or operating cash flow deteriorated year on year.",
    });
  } else {
    indicators.push(
      unavailable("divergence", "EBITDA vs Operating Cash Flow Divergence", 20, "EBITDA and operating cash flow are required for the last two years."),
    );
  }

  // 5. CCC change
  if (mCur && mPrev && isNum(mCur.ccc.value) && isNum(mPrev.ccc.value)) {
    const change = mCur.ccc.value - mPrev.ccc.value;
    const pts = cccPoints(change);
    indicators.push({
      key: "ccc",
      name: "Cash Conversion Cycle Risk",
      maxPoints: 10,
      points: pts,
      approximate: mCur.ccc.approximate || mPrev.ccc.approximate,
      evidence: `CCC ${fmtDays(mPrev.ccc.value)} (${mPrev.year}) → ${fmtDays(mCur.ccc.value)} (${mCur.year}), ${fmtSigned(change, " days")}`,
      explanation:
        pts === 0
          ? "The time taken to turn operations into cash is stable or shorter."
          : "The business needs more days to convert its operating cycle into cash, increasing working-capital funding needs.",
    });
  } else {
    indicators.push(unavailable("ccc", "Cash Conversion Cycle Risk", 10, "DSO, DIO and DPO are required for the last two years."));
  }

  // 6. Leverage (latest year)
  if (mCur && isNum(mCur.netDebt.value) && mCur.netDebt.value <= 0) {
    indicators.push({
      key: "leverage",
      name: "Leverage Risk",
      maxPoints: 10,
      points: 0,
      approximate: false,
      evidence: `Net cash position of ${fmtMoney(-mCur.netDebt.value)} in ${mCur.year}`,
      explanation: "Cash exceeds total debt; no net leverage.",
    });
  } else if (mCur && isNum(mCur.netDebtToEbitda.value)) {
    const m = mCur.netDebtToEbitda.value;
    const pts = leveragePoints(m);
    indicators.push({
      key: "leverage",
      name: "Leverage Risk",
      maxPoints: 10,
      points: pts,
      approximate: false,
      evidence: `Net debt / EBITDA = ${fmtMultiple(m)} in ${mCur.year}`,
      explanation:
        pts === 0
          ? "Leverage is moderate relative to earnings."
          : "Net debt is elevated relative to EBITDA, which limits headroom for additional acquisition financing.",
    });
  } else {
    indicators.push(
      unavailable("leverage", "Leverage Risk", 10, mCur?.netDebtToEbitda.note ?? "Debt, cash and EBITDA are required."),
    );
  }

  const available = indicators.filter((i) => i.points !== null);
  const rawPoints = available.reduce((s, i) => s + (i.points ?? 0), 0);
  const availableMax = available.reduce((s, i) => s + i.maxPoints, 0);
  const insufficientData = available.length < MIN_INDICATORS;
  const score = insufficientData || availableMax === 0 ? null : Math.round((rawPoints / availableMax) * 100);

  return {
    indicators,
    availableCount: available.length,
    totalCount: indicators.length,
    rawPoints,
    availableMax,
    score,
    classification: score === null ? null : classify(score),
    insufficientData,
    complete: available.length === indicators.length,
  };
}

