import { isNum, type Num } from "./math";

export function fmtMoney(v: Num, currency = "AED", compact = true): string {
  if (!isNum(v)) return "n/a";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (compact) {
    if (abs >= 1e9) return `${sign}${currency} ${(abs / 1e9).toFixed(2)}bn`;
    if (abs >= 1e6) return `${sign}${currency} ${(abs / 1e6).toFixed(1)}m`;
    if (abs >= 1e3) return `${sign}${currency} ${(abs / 1e3).toFixed(0)}k`;
  }
  return `${sign}${currency} ${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function fmtDays(v: Num): string {
  return isNum(v) ? `${v.toFixed(1)} days` : "n/a";
}

export function fmtPct(v: Num, digits = 1): string {
  return isNum(v) ? `${v.toFixed(digits)}%` : "n/a";
}

/** Formats a ratio (0.44) as a percent (44.0%). */
export function fmtRatioPct(v: Num, digits = 1): string {
  return isNum(v) ? `${(v * 100).toFixed(digits)}%` : "n/a";
}

export function fmtMultiple(v: Num): string {
  return isNum(v) ? `${v.toFixed(2)}x` : "n/a";
}

export function fmtSigned(v: Num, unit = "", digits = 1): string {
  if (!isNum(v)) return "n/a";
  const s = v > 0 ? "+" : "";
  return `${s}${v.toFixed(digits)}${unit}`;
}
