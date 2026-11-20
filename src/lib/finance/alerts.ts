import { growthPct, isNum } from "./math";
import { fmtDays, fmtMoney, fmtMultiple, fmtPct, fmtSigned } from "./format";
import type { FinancialRecord, RiskAlert, Severity, YearMetrics } from "./types";

export function gapSeverity(gapPctPoints: number): Severity {
  if (gapPctPoints < 5) return "Low";
  if (gapPctPoints < 15) return "Medium";
  if (gapPctPoints < 30) return "High";
  return "Critical";
}

export function daysSeverity(days: number): Severity {
  if (days <= 5) return "Low";
  if (days <= 10) return "Medium";
  if (days <= 20) return "High";
  return "Critical";
}

export function leverageSeverity(multiple: number): Severity {
  if (multiple <= 3) return "Medium";
  if (multiple <= 4) return "High";
  return "Critical";
}

const SEVERITY_RANK: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export function detectAlerts(records: FinancialRecord[], metrics: YearMetrics[]): RiskAlert[] {
  const r = [...records].sort((a, b) => a.year - b.year);
  const m = [...metrics].sort((a, b) => a.year - b.year);
  const cur = r.at(-1);
  const prev = r.length > 1 ? r.at(-2) : undefined;
  const mCur = m.at(-1);
  const mPrev = m.length > 1 ? m.at(-2) : undefined;
  const alerts: RiskAlert[] = [];
  if (!cur) return alerts;

  if (prev) {
    const revG = growthPct(prev.revenue, cur.revenue);

    // 1. Receivables growing faster than revenue
    const arG = growthPct(prev.receivables, cur.receivables);
    if (revG !== null && arG !== null && arG > revG) {
      alerts.push({
        id: "ar-vs-revenue",
        name: "Receivables growing faster than revenue",
        severity: gapSeverity(arG - revG),
        evidence: `Receivables grew ${fmtPct(arG)} while revenue grew ${fmtPct(revG)} (gap of ${(arG - revG).toFixed(1)} percentage points).`,
        previousLabel: `${prev.year} receivables / revenue`,
        previousValue: `${fmtMoney(prev.receivables)} / ${fmtMoney(prev.revenue)}`,
        currentLabel: `${cur.year} receivables / revenue`,
        currentValue: `${fmtMoney(cur.receivables)} / ${fmtMoney(cur.revenue)}`,
        whyItMatters:
          "When receivables outpace sales, more of reported revenue is uncollected cash. This may reflect extended credit terms, customer concentration, slow collections or aggressive revenue recognition — each requiring investigation.",
        informationRequired: [
          "Aged receivables ledger by customer",
          "Credit terms and any changes in the period",
          "Bad-debt provisioning policy and write-offs",
          "Post-period cash collections",
        ],
      });
    }

    // 2. Inventory growing faster than revenue
    const invG = growthPct(prev.inventory, cur.inventory);
    if (revG !== null && invG !== null && invG > revG) {
      alerts.push({
        id: "inv-vs-revenue",
        name: "Inventory growing faster than revenue",
        severity: gapSeverity(invG - revG),
        evidence: `Inventory grew ${fmtPct(invG)} while revenue grew ${fmtPct(revG)} (gap of ${(invG - revG).toFixed(1)} percentage points).`,
        previousLabel: `${prev.year} inventory / revenue`,
        previousValue: `${fmtMoney(prev.inventory)} / ${fmtMoney(prev.revenue)}`,
        currentLabel: `${cur.year} inventory / revenue`,
        currentValue: `${fmtMoney(cur.inventory)} / ${fmtMoney(cur.revenue)}`,
        whyItMatters:
          "Inventory building ahead of sales ties up cash and can indicate slowing demand, over-production or slow-moving and obsolete stock that may require write-downs.",
        informationRequired: [
          "Inventory ageing and slow-moving stock report",
          "Obsolescence provision methodology",
          "Production and purchasing plans vs order book",
          "Stock-count reconciliation",
        ],
      });
    }

    // 3. EBITDA increasing while operating cash flow declines
    if (
      isNum(prev.ebitda) && isNum(cur.ebitda) && isNum(prev.operatingCashFlow) && isNum(cur.operatingCashFlow) &&
      cur.ebitda > prev.ebitda && cur.operatingCashFlow < prev.operatingCashFlow
    ) {
      const eG = growthPct(prev.ebitda, cur.ebitda);
      const oG = growthPct(prev.operatingCashFlow, cur.operatingCashFlow);
      let severity: Severity = "Medium";
      if (oG !== null && oG < -25) severity = "Critical";
      else if (eG !== null && oG !== null && eG > 10 && oG < -10) severity = "High";
      alerts.push({
        id: "ebitda-ocf-divergence",
        name: "EBITDA increasing while operating cash flow declines",
        severity,
        evidence: `EBITDA ${eG !== null ? fmtSigned(eG, "%") : "increased"} while operating cash flow ${oG !== null ? fmtSigned(oG, "%") : "decreased"}.`,
        previousLabel: `${prev.year} EBITDA / OCF`,
        previousValue: `${fmtMoney(prev.ebitda)} / ${fmtMoney(prev.operatingCashFlow)}`,
        currentLabel: `${cur.year} EBITDA / OCF`,
        currentValue: `${fmtMoney(cur.ebitda)} / ${fmtMoney(cur.operatingCashFlow)}`,
        whyItMatters:
          "Reported profitability is rising but is not translating into cash. This gap is a key quality-of-earnings question — it may be explained by working-capital build, timing or accounting judgements.",
        informationRequired: [
          "Bridge from EBITDA to operating cash flow",
          "Non-recurring and non-cash items in EBITDA",
          "Revenue recognition policies and cut-off testing",
          "Monthly working-capital movements",
        ],
      });
    }
  }

  if (mCur && mPrev) {
    // 4. Increasing DSO
    if (isNum(mCur.dso.value) && isNum(mPrev.dso.value) && Math.round(mCur.dso.value - mPrev.dso.value) >= 1) {
      const d = mCur.dso.value - mPrev.dso.value;
      alerts.push({
        id: "dso-up",
        name: "Increasing Days Sales Outstanding",
        severity: daysSeverity(d),
        evidence: `DSO increased by ${d.toFixed(1)} days.${mCur.dso.approximate || mPrev.dso.approximate ? " (approximation: year-end balances)" : ""}`,
        previousLabel: `${mPrev.year} DSO`,
        previousValue: fmtDays(mPrev.dso.value),
        currentLabel: `${mCur.year} DSO`,
        currentValue: fmtDays(mCur.dso.value),
        whyItMatters: "Each additional day of DSO is roughly one day of sales held as uncollected cash rather than available to the business.",
        informationRequired: ["Customer payment history", "Top-10 customer receivable balances", "Disputed or overdue invoices"],
      });
    }

    // 5. Increasing DIO
    if (isNum(mCur.dio.value) && isNum(mPrev.dio.value) && Math.round(mCur.dio.value - mPrev.dio.value) >= 1) {
      const d = mCur.dio.value - mPrev.dio.value;
      alerts.push({
        id: "dio-up",
        name: "Increasing Days Inventory Outstanding",
        severity: daysSeverity(d),
        evidence: `DIO increased by ${d.toFixed(1)} days.${mCur.dio.approximate || mPrev.dio.approximate ? " (approximation: year-end balances)" : ""}`,
        previousLabel: `${mPrev.year} DIO`,
        previousValue: fmtDays(mPrev.dio.value),
        currentLabel: `${mCur.year} DIO`,
        currentValue: fmtDays(mCur.dio.value),
        whyItMatters: "Longer inventory holding periods absorb cash and increase exposure to obsolescence and write-downs.",
        informationRequired: ["Inventory by SKU and age", "Sales forecast vs stock levels", "Supplier minimum-order commitments"],
      });
    }

    // 6. Increasing CCC
    if (isNum(mCur.ccc.value) && isNum(mPrev.ccc.value) && Math.round(mCur.ccc.value - mPrev.ccc.value) >= 1) {
      const d = mCur.ccc.value - mPrev.ccc.value;
      alerts.push({
        id: "ccc-up",
        name: "Increasing Cash Conversion Cycle",
        severity: daysSeverity(d),
        evidence: `Cash conversion cycle lengthened by ${d.toFixed(1)} days.`,
        previousLabel: `${mPrev.year} CCC`,
        previousValue: fmtDays(mPrev.ccc.value),
        currentLabel: `${mCur.year} CCC`,
        currentValue: fmtDays(mCur.ccc.value),
        whyItMatters: "A longer cycle means the business must fund operations for longer before receiving cash, increasing reliance on debt or equity.",
        informationRequired: ["Normalised working-capital peg analysis", "Seasonality of working capital", "Changes to supplier payment terms"],
      });
    }
  }

  // 7. High net debt relative to EBITDA
  if (mCur) {
    const nde = mCur.netDebtToEbitda.value;
    if (isNum(nde) && nde >= 2) {
      const prevNde = mPrev?.netDebtToEbitda.value;
      alerts.push({
        id: "leverage-high",
        name: "High net debt relative to EBITDA",
        severity: leverageSeverity(nde),
        evidence: `Net debt / EBITDA of ${fmtMultiple(nde)} (net debt ${fmtMoney(mCur.netDebt.value)}).`,
        previousLabel: `${mPrev?.year ?? "Prior year"} net debt / EBITDA`,
        previousValue: fmtMultiple(prevNde),
        currentLabel: `${mCur.year} net debt / EBITDA`,
        currentValue: fmtMultiple(nde),
        whyItMatters: "Elevated leverage reduces capacity for acquisition financing and increases sensitivity to any earnings shortfall.",
        informationRequired: ["Debt schedule, maturities and covenants", "Off-balance-sheet liabilities and leases", "Covenant headroom calculations"],
      });
    } else if (cur && isNum(cur.ebitda) && cur.ebitda <= 0 && isNum(mCur.netDebt.value) && mCur.netDebt.value > 0) {
      alerts.push({
        id: "leverage-negative-ebitda",
        name: "Net debt with zero or negative EBITDA",
        severity: "Critical",
        evidence: `Net debt of ${fmtMoney(mCur.netDebt.value)} with EBITDA of ${fmtMoney(cur.ebitda)}; the leverage multiple is not meaningful.`,
        previousLabel: `${mPrev?.year ?? "Prior year"} net debt / EBITDA`,
        previousValue: fmtMultiple(mPrev?.netDebtToEbitda.value),
        currentLabel: `${mCur.year} net debt`,
        currentValue: fmtMoney(mCur.netDebt.value),
        whyItMatters: "Debt cannot be serviced from current operating earnings.",
        informationRequired: ["Debt schedule and covenants", "Liquidity forecast", "Turnaround plan"],
      });
    }
  }

  return alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
