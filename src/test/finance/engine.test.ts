import { describe, expect, it } from "vitest";

import { analyzeFinancials } from "@/lib/finance/analyze";
import { calculateCashRelease } from "@/lib/finance/cashImpact";
import { DEMO_COMPANY, DEMO_RECORDS } from "@/lib/finance/demo";
import { computeAllMetrics } from "@/lib/finance/metrics";
import { parseRows } from "@/lib/finance/parse";
import {
  cashConversionPoints,
  cccPoints,
  classify,
  divergencePoints,
  inventoryPoints,
  leveragePoints,
  receivablesPoints,
} from "@/lib/finance/risk";
import type { FinancialRecord } from "@/lib/finance/types";

const demo = () => analyzeFinancials({ companyName: DEMO_COMPANY, isDemo: true, records: DEMO_RECORDS });

describe("working-capital metrics", () => {
  it("DSO uses average receivables over revenue × 365", () => {
    const m = computeAllMetrics(DEMO_RECORDS);
    // 2024: avg AR (25m+33m)/2 = 29m; 29/137 × 365
    expect(m[2]?.dso.value).toBeCloseTo((29 / 137) * 365, 5);
    expect(m[2]?.dso.approximate).toBe(false);
  });

  it("first year without an opening balance is flagged as an approximation", () => {
    const m = computeAllMetrics(DEMO_RECORDS);
    expect(m[0]?.dso.approximate).toBe(true);
    expect(m[0]?.dso.value).toBeCloseTo((19 / 120) * 365, 5);
  });

  it("CCC = DSO + DIO − DPO", () => {
    const y = computeAllMetrics(DEMO_RECORDS)[2];
    expect(y?.ccc.value).toBeCloseTo((y?.dso.value ?? 0) + (y?.dio.value ?? 0) - (y?.dpo.value ?? 0), 6);
  });

  it("net debt = debt − cash and net debt/EBITDA", () => {
    const y = computeAllMetrics(DEMO_RECORDS)[2];
    expect(y?.netDebt.value).toBe(59_000_000);
    expect(y?.netDebtToEbitda.value).toBeCloseTo(59 / 23.4, 6);
  });

  it("uses credit sales instead of revenue for DSO when supplied", () => {
    const recs: FinancialRecord[] = DEMO_RECORDS.map((r) => ({ ...r, creditSales: 100_000_000 }));
    expect(computeAllMetrics(recs)[2]?.dso.value).toBeCloseTo((29 / 100) * 365, 5);
  });

  it("returns null (not zero or Infinity) for zero revenue and negative EBITDA", () => {
    const base = DEMO_RECORDS[2] as FinancialRecord;
    const rec: FinancialRecord = { ...base, revenue: 0, ebitda: -1_000_000 };
    const y = computeAllMetrics([rec])[0];
    expect(y?.dso.value).toBeNull();
    expect(y?.cashConversion.value).toBeNull();
    expect(y?.netDebtToEbitda.value).toBeNull();
  });
});

describe("risk scoring thresholds", () => {
  it("receivables: 0 / 5 / 10 / 20", () => {
    expect([receivablesPoints(-3), receivablesPoints(8), receivablesPoints(15), receivablesPoints(25)]).toEqual([0, 5, 10, 20]);
  });
  it("inventory: 0 / 5 / 10 / 15", () => {
    expect([inventoryPoints(0), inventoryPoints(10), inventoryPoints(11), inventoryPoints(21)]).toEqual([0, 5, 10, 15]);
  });
  it("cash conversion: ≥80% 0, 50–79% 10, 20–49% 20, <20% 25", () => {
    expect([cashConversionPoints(0.85), cashConversionPoints(0.6), cashConversionPoints(0.3), cashConversionPoints(-0.1)]).toEqual([0, 10, 20, 25]);
  });
  it("divergence: both up 0, one down 10, EBITDA >+10% & OCF <−10% 20", () => {
    expect(divergencePoints(1, 1, 5, 5)).toBe(0);
    expect(divergencePoints(1, -1, 5, -5)).toBe(10);
    expect(divergencePoints(1, -1, 12, -15)).toBe(20);
  });
  it("CCC: 0 / 3 / 6 / 10", () => {
    expect([cccPoints(0), cccPoints(5), cccPoints(15), cccPoints(30)]).toEqual([0, 3, 6, 10]);
  });
  it("leverage: <2x 0, 2–3x 3, >3–4x 7, >4x 10", () => {
    expect([leveragePoints(1.5), leveragePoints(2.5), leveragePoints(3.5), leveragePoints(4.5)]).toEqual([0, 3, 7, 10]);
  });
  it("classification bands", () => {
    expect([classify(24), classify(25), classify(50), classify(75)]).toEqual(["Low Risk", "Moderate Risk", "High Risk", "Critical Risk"]);
  });
});

describe("overall assessment", () => {
  it("scores the GulfTech demo at 73/100 High Risk with full coverage", () => {
    const a = demo();
    expect(a.risk.availableCount).toBe(6);
    expect(a.risk.score).toBe(73);
    expect(a.risk.classification).toBe("High Risk");
  });

  it("normalises over available indicators instead of scoring missing ones as zero", () => {
    const recs = DEMO_RECORDS.map((r) => ({ ...r, debt: null, cash: null }));
    const a = analyzeFinancials({ companyName: "X", isDemo: false, records: recs });
    expect(a.risk.availableCount).toBe(5);
    // 70 points of 90 available → 78
    expect(a.risk.score).toBe(Math.round((70 / 90) * 100));
    expect(a.risk.complete).toBe(false);
  });

  it("shows Insufficient Data with fewer than four indicators", () => {
    const a = analyzeFinancials({ companyName: "X", isDemo: false, records: [DEMO_RECORDS[2] as FinancialRecord] });
    expect(a.risk.score).toBeNull();
    expect(a.risk.insufficientData).toBe(true);
  });

  it("detects the deliberate demo cash-trap patterns", () => {
    const ids = demo().alerts.map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(["ar-vs-revenue", "inv-vs-revenue", "ebitda-ocf-divergence", "dso-up", "dio-up", "ccc-up", "leverage-high"]));
  });
});

describe("cash impact calculator", () => {
  it("release = revenue/365 × (current − target)", () => {
    const r = calculateCashRelease({ annualRevenue: 365_000_000, currentDso: 80, targetDso: 60 });
    expect(r.ok && r.release).toBe(20_000_000);
  });
  it("rejects a target DSO not below current", () => {
    expect(calculateCashRelease({ annualRevenue: 1_000, currentDso: 50, targetDso: 60 }).ok).toBe(false);
  });
});

describe("upload parsing", () => {
  it("parses template columns, commas and bracket negatives", () => {
    const res = parseRows([
      { Year: 2023, Revenue: "1,000", COGS: 600, EBITDA: "(50)", Receivables: 100, Inventory: 80, Payables: 60, Operating_Cash_Flow: 40, Cash: 10, Debt: 200 },
    ]);
    expect(res.errors).toEqual([]);
    expect(res.records[0]?.revenue).toBe(1000);
    expect(res.records[0]?.ebitda).toBe(-50);
  });
  it("keeps missing cells as null and warns", () => {
    const res = parseRows([{ Year: 2023, Revenue: 1000, COGS: "", EBITDA: 50, Receivables: 1, Inventory: 1, Payables: 1, Operating_Cash_Flow: 1, Cash: 1, Debt: 1 }]);
    expect(res.records[0]?.cogs).toBeNull();
    expect(res.warnings.some((w) => w.includes("COGS"))).toBe(true);
  });
  it("errors on a missing Year column and invalid numbers", () => {
    expect(parseRows([{ Revenue: 1 }]).errors[0]).toMatch(/Year/);
    expect(parseRows([{ Year: 2023, Revenue: "abc" }]).errors[0]).toMatch(/not a valid number/);
  });
});
