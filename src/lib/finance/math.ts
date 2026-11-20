// Safe arithmetic helpers: every operation propagates null instead of producing
// NaN, Infinity or a silent zero.

export type Num = number | null | undefined;

export function isNum(v: Num): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function safeDivide(n: Num, d: Num): number | null {
  if (!isNum(n) || !isNum(d) || d === 0) return null;
  const r = n / d;
  return Number.isFinite(r) ? r : null;
}

export function average(a: Num, b: Num): number | null {
  if (!isNum(a) || !isNum(b)) return null;
  return (a + b) / 2;
}

/** Percentage growth from prev to curr. Null when prev is missing, zero or negative. */
export function growthPct(prev: Num, curr: Num): number | null {
  if (!isNum(prev) || !isNum(curr) || prev <= 0) return null;
  return ((curr - prev) / prev) * 100;
}

export function diff(prev: Num, curr: Num): number | null {
  if (!isNum(prev) || !isNum(curr)) return null;
  return curr - prev;
}
