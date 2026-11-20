// Core data types for the CashTrap calculation engine.
// A null value always means "not supplied / not computable" — never silently zero.

export type FieldKey =
  | "revenue"
  | "cogs"
  | "ebitda"
  | "receivables"
  | "inventory"
  | "payables"
  | "operatingCashFlow"
  | "cash"
  | "debt"
  | "creditSales"
  | "purchases";

export interface FinancialRecord {
  year: number;
  revenue: number | null;
  cogs: number | null;
  ebitda: number | null;
  receivables: number | null;
  inventory: number | null;
  payables: number | null;
  operatingCashFlow: number | null;
  cash: number | null;
  debt: number | null;
  /** Optional: used instead of revenue for DSO when supplied. */
  creditSales: number | null;
  /** Optional: used instead of COGS for DPO when supplied. */
  purchases: number | null;
}

export interface MetricValue {
  value: number | null;
  /** True when computed from year-end balances only (no opening balance available). */
  approximate: boolean;
  /** Human-readable reason when value is null or needs a caveat. */
  note?: string;
  /** Which basis was used, e.g. "Credit sales" vs "Revenue". */
  basis?: string;
}

export interface YearMetrics {
  year: number;
  dso: MetricValue;
  dio: MetricValue;
  dpo: MetricValue;
  ccc: MetricValue;
  cashConversion: MetricValue; // ratio, e.g. 0.44 = 44%
  netDebt: MetricValue;
  netDebtToEbitda: MetricValue;
}

export type IndicatorKey =
  | "receivables"
  | "inventory"
  | "cashConversion"
  | "divergence"
  | "ccc"
  | "leverage";

export interface RiskIndicator {
  key: IndicatorKey;
  name: string;
  maxPoints: number;
  /** null = indicator unavailable (missing data). Never treated as 0. */
  points: number | null;
  explanation: string;
  evidence: string;
  approximate: boolean;
}

export type RiskClass = "Low Risk" | "Moderate Risk" | "High Risk" | "Critical Risk";

export interface RiskAssessment {
  indicators: RiskIndicator[];
  availableCount: number;
  totalCount: number;
  /** Raw points earned across available indicators. */
  rawPoints: number;
  /** Max points across available indicators. */
  availableMax: number;
  /** Normalized 0–100 score, null when fewer than MIN_INDICATORS are available. */
  score: number | null;
  classification: RiskClass | null;
  insufficientData: boolean;
  complete: boolean;
}

export type Severity = "Low" | "Medium" | "High" | "Critical";

export interface RiskAlert {
  id: string;
  name: string;
  severity: Severity;
  evidence: string;
  previousLabel: string;
  previousValue: string;
  currentLabel: string;
  currentValue: string;
  whyItMatters: string;
  informationRequired: string[];
}

export interface AnalysisResult {
  companyName: string;
  isDemo: boolean;
  currency: string;
  records: FinancialRecord[];
  metrics: YearMetrics[];
  risk: RiskAssessment;
  alerts: RiskAlert[];
  warnings: string[];
  analyzedAt: string;
}
