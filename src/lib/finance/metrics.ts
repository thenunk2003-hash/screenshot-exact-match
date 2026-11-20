import { average, isNum, safeDivide, type Num } from "./math";
import type { FinancialRecord, MetricValue, YearMetrics } from "./types";

const DAYS = 365;

/** Balance used for working-capital ratios: average of opening & closing when possible. */
function balance(prev: Num, curr: Num): { value: number | null; approximate: boolean } {
  const avg = average(prev, curr);
  if (avg !== null) return { value: avg, approximate: false };
  return { value: isNum(curr) ? curr : null, approximate: true };
}

function daysMetric(
  bal: { value: number | null; approximate: boolean },
  flow: Num,
  flowLabel: string,
  balanceLabel: string,
): MetricValue {
  if (!isNum(bal.value)) return { value: null, approximate: false, note: `${balanceLabel} missing` };
  if (!isNum(flow)) return { value: null, approximate: false, note: `${flowLabel} missing` };
  if (flow <= 0)
    return { value: null, approximate: false, note: `${flowLabel} is zero or negative — not meaningful` };
  if (bal.value < 0)
    return { value: null, approximate: false, note: `${balanceLabel} is negative — check data` };
  return {
    value: (bal.value / flow) * DAYS,
    approximate: bal.approximate,
    basis: flowLabel,
    ...(bal.approximate ? { note: "Year-end balance only (approximation)" } : {}),
  };
}

export function computeYearMetrics(curr: FinancialRecord, prev?: FinancialRecord): YearMetrics {
  const ar = balance(prev?.receivables, curr.receivables);
  const inv = balance(prev?.inventory, curr.inventory);
  const ap = balance(prev?.payables, curr.payables);

  const salesBase = isNum(curr.creditSales) ? curr.creditSales : curr.revenue;
  const salesLabel = isNum(curr.creditSales) ? "Credit sales" : "Revenue";
  const purchBase = isNum(curr.purchases) ? curr.purchases : curr.cogs;
  const purchLabel = isNum(curr.purchases) ? "Purchases" : "COGS";

  const dso = daysMetric(ar, salesBase, salesLabel, "Receivables");
  const dio = daysMetric(inv, curr.cogs, "COGS", "Inventory");
  const dpo = daysMetric(ap, purchBase, purchLabel, "Payables");

  let ccc: MetricValue;
  if (isNum(dso.value) && isNum(dio.value) && isNum(dpo.value)) {
    const approximate = dso.approximate || dio.approximate || dpo.approximate;
    ccc = {
      value: dso.value + dio.value - dpo.value,
      approximate,
      ...(approximate ? { note: "Based on approximate working-capital days" } : {}),
    };
  } else {
    ccc = { value: null, approximate: false, note: "Requires DSO, DIO and DPO" };
  }

  let cashConversion: MetricValue;
  if (!isNum(curr.operatingCashFlow) || !isNum(curr.ebitda)) {
    cashConversion = { value: null, approximate: false, note: "Operating cash flow or EBITDA missing" };
  } else if (curr.ebitda <= 0) {
    cashConversion = {
      value: null,
      approximate: false,
      note: "EBITDA is zero or negative — ratio not meaningful",
    };
  } else {
    cashConversion = { value: safeDivide(curr.operatingCashFlow, curr.ebitda), approximate: false };
  }

  const netDebtValue =
    isNum(curr.debt) && isNum(curr.cash) ? curr.debt - curr.cash : null;
  const netDebt: MetricValue =
    netDebtValue === null
      ? { value: null, approximate: false, note: "Debt or cash missing" }
      : { value: netDebtValue, approximate: false };

  let netDebtToEbitda: MetricValue;
  if (netDebtValue === null) {
    netDebtToEbitda = { value: null, approximate: false, note: "Net debt unavailable" };
  } else if (!isNum(curr.ebitda)) {
    netDebtToEbitda = { value: null, approximate: false, note: "EBITDA missing" };
  } else if (curr.ebitda <= 0) {
    netDebtToEbitda = {
      value: null,
      approximate: false,
      note: "EBITDA is zero or negative — multiple not meaningful",
    };
  } else {
    netDebtToEbitda = { value: safeDivide(netDebtValue, curr.ebitda), approximate: false };
  }

  return { year: curr.year, dso, dio, dpo, ccc, cashConversion, netDebt, netDebtToEbitda };
}

export function computeAllMetrics(records: FinancialRecord[]): YearMetrics[] {
  const sorted = [...records].sort((a, b) => a.year - b.year);
  return sorted.map((r, i) => {
    const prev = i > 0 ? sorted[i - 1] : undefined;
    // Only use the prior row as an opening balance if it is the immediately preceding year.
    const opening = prev && prev.year === r.year - 1 ? prev : undefined;
    return computeYearMetrics(r, opening);
  });
}
