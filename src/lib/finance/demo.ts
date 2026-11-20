import type { FinancialRecord } from "./types";

// SYNTHETIC, ILLUSTRATIVE DATA — GulfTech Manufacturing LLC is fictional.
// Patterns are deliberately constructed: receivables outpace revenue, inventory
// builds as growth slows, EBITDA rises while operating cash flow falls.
export const DEMO_COMPANY = "GulfTech Manufacturing LLC";

export const DEMO_RECORDS: FinancialRecord[] = [
  { year: 2022, revenue: 120_000_000, cogs: 78_000_000, ebitda: 18_000_000, receivables: 19_000_000, inventory: 14_000_000, payables: 11_000_000, operatingCashFlow: 15_500_000, cash: 9_000_000, debt: 45_000_000, creditSales: null, purchases: null },
  { year: 2023, revenue: 132_000_000, cogs: 85_800_000, ebitda: 20_500_000, receivables: 25_000_000, inventory: 17_500_000, payables: 11_500_000, operatingCashFlow: 13_200_000, cash: 7_000_000, debt: 52_000_000, creditSales: null, purchases: null },
  { year: 2024, revenue: 137_000_000, cogs: 88_500_000, ebitda: 23_400_000, receivables: 33_000_000, inventory: 23_000_000, payables: 11_800_000, operatingCashFlow: 10_400_000, cash: 5_000_000, debt: 64_000_000, creditSales: null, purchases: null },
];

export const TEMPLATE_COLUMNS = [
  "Year", "Revenue", "COGS", "EBITDA", "Receivables", "Inventory", "Payables", "Operating_Cash_Flow", "Cash", "Debt",
] as const;

export function demoCsv(): string {
  const rows = DEMO_RECORDS.map((r) =>
    [r.year, r.revenue, r.cogs, r.ebitda, r.receivables, r.inventory, r.payables, r.operatingCashFlow, r.cash, r.debt].join(","),
  );
  return [TEMPLATE_COLUMNS.join(","), ...rows].join("\n");
}
