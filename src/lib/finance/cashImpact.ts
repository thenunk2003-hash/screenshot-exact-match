export interface CashImpactInput {
  annualRevenue: number;
  currentDso: number;
  targetDso: number;
}

export type CashImpactResult =
  | { ok: true; release: number; dailyRevenue: number; daysImproved: number }
  | { ok: false; error: string };

/** Potential Cash Release = (Annual Revenue / 365) × (Current DSO − Target DSO). */
export function calculateCashRelease(input: CashImpactInput): CashImpactResult {
  const { annualRevenue, currentDso, targetDso } = input;
  if (![annualRevenue, currentDso, targetDso].every((v) => Number.isFinite(v)))
    return { ok: false, error: "Enter valid numbers for all fields." };
  if (annualRevenue <= 0) return { ok: false, error: "Annual revenue must be greater than zero." };
  if (currentDso < 0 || targetDso < 0) return { ok: false, error: "DSO values cannot be negative." };
  if (currentDso > 730 || targetDso > 730) return { ok: false, error: "DSO above 730 days looks implausible — check inputs." };
  if (targetDso >= currentDso)
    return { ok: false, error: "Target DSO must be lower than current DSO to release cash." };
  const dailyRevenue = annualRevenue / 365;
  const daysImproved = currentDso - targetDso;
  return { ok: true, release: dailyRevenue * daysImproved, dailyRevenue, daysImproved };
}
