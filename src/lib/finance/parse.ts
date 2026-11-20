import type { FieldKey, FinancialRecord } from "./types";

export interface ParseResult {
  records: FinancialRecord[];
  errors: string[];
  warnings: string[];
}

const ALIASES: Record<string, FieldKey | "year"> = {
  year: "year", fy: "year", fiscalyear: "year", period: "year",
  revenue: "revenue", sales: "revenue", totalrevenue: "revenue", netsales: "revenue",
  cogs: "cogs", costofgoodssold: "cogs", costofsales: "cogs",
  ebitda: "ebitda",
  receivables: "receivables", accountsreceivable: "receivables", tradereceivables: "receivables", ar: "receivables",
  inventory: "inventory", inventories: "inventory", stock: "inventory",
  payables: "payables", accountspayable: "payables", tradepayables: "payables", ap: "payables",
  operatingcashflow: "operatingCashFlow", ocf: "operatingCashFlow", cashfromoperations: "operatingCashFlow", cfo: "operatingCashFlow",
  cash: "cash", cashandcashequivalents: "cash", cashequivalents: "cash",
  debt: "debt", totaldebt: "debt", borrowings: "debt",
  creditsales: "creditSales",
  purchases: "purchases",
};

export const REQUIRED_FIELDS: FieldKey[] = [
  "revenue", "cogs", "ebitda", "receivables", "inventory", "payables", "operatingCashFlow", "cash", "debt",
];

export const FIELD_LABELS: Record<FieldKey, string> = {
  revenue: "Revenue", cogs: "COGS", ebitda: "EBITDA", receivables: "Receivables", inventory: "Inventory",
  payables: "Payables", operatingCashFlow: "Operating_Cash_Flow", cash: "Cash", debt: "Debt",
  creditSales: "Credit_Sales", purchases: "Purchases",
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Parses "1,234", "(500)", "AED 1.2m"-free numerics. Returns undefined for blank, NaN for invalid. */
export function parseNumber(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : Number.NaN;
  const s = String(raw).trim();
  if (s === "" || s === "-" || /^n\/?a$/i.test(s)) return undefined;
  let t = s.replace(/[,\s]/g, "").replace(/^(aed|usd|eur|gbp|\$|€|£)/i, "");
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  const n = Number(t);
  if (!Number.isFinite(n)) return Number.NaN;
  return neg ? -n : n;
}

export function parseRows(rows: Record<string, unknown>[]): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (rows.length === 0) return { records: [], errors: ["The file contains no data rows."], warnings };

  // Map headers
  const headerMap = new Map<string, FieldKey | "year">();
  const firstRow = rows[0] ?? {};
  for (const h of Object.keys(firstRow)) {
    const key = ALIASES[normalizeHeader(h)];
    if (key) headerMap.set(h, key);
  }
  const mapped = new Set(headerMap.values());
  if (!mapped.has("year")) {
    return { records: [], errors: ["Missing required column: Year."], warnings };
  }
  const missingCols = REQUIRED_FIELDS.filter((f) => !mapped.has(f));
  if (missingCols.length === REQUIRED_FIELDS.length) {
    return { records: [], errors: ["No recognised financial columns found. Check the header row matches the template."], warnings };
  }
  if (missingCols.length) {
    warnings.push(`Missing columns: ${missingCols.map((f) => FIELD_LABELS[f]).join(", ")}. Related metrics will be marked unavailable.`);
  }
  const unknown = Object.keys(firstRow).filter((h) => !headerMap.has(h) && h.trim() !== "" && !h.startsWith("__EMPTY"));
  if (unknown.length) warnings.push(`Ignored unrecognised columns: ${unknown.join(", ")}.`);

  const records: FinancialRecord[] = [];
  const seenYears = new Set<number>();

  rows.forEach((row, idx) => {
    const line = idx + 2; // header is row 1
    const rec: FinancialRecord = {
      year: Number.NaN, revenue: null, cogs: null, ebitda: null, receivables: null, inventory: null,
      payables: null, operatingCashFlow: null, cash: null, debt: null, creditSales: null, purchases: null,
    };
    let allBlank = true;
    for (const [header, key] of headerMap) {
      const v = parseNumber(row[header]);
      if (v !== undefined) allBlank = false;
      if (key === "year") {
        if (v === undefined || Number.isNaN(v)) { rec.year = Number.NaN; continue; }
        rec.year = v;
        continue;
      }
      if (v === undefined) continue;
      if (Number.isNaN(v)) {
        errors.push(`Row ${line}: "${String(row[header])}" in ${FIELD_LABELS[key]} is not a valid number.`);
        continue;
      }
      rec[key] = v;
    }
    if (allBlank) return;
    if (!Number.isInteger(rec.year) || rec.year < 1900 || rec.year > 2100) {
      errors.push(`Row ${line}: Year must be a 4-digit year.`);
      return;
    }
    if (seenYears.has(rec.year)) {
      errors.push(`Row ${line}: Duplicate year ${rec.year}.`);
      return;
    }
    seenYears.add(rec.year);
    for (const f of ["revenue", "cogs", "receivables", "inventory", "payables", "cash", "debt"] as const) {
      const val = rec[f];
      if (val !== null && val < 0) warnings.push(`${rec.year}: ${FIELD_LABELS[f]} is negative — related metrics will not be calculated.`);
    }
    const missing = REQUIRED_FIELDS.filter((f) => mapped.has(f) && rec[f] === null);
    if (missing.length) warnings.push(`${rec.year}: missing ${missing.map((f) => FIELD_LABELS[f]).join(", ")}.`);
    records.push(rec);
  });

  records.sort((a, b) => a.year - b.year);
  if (records.length === 1) warnings.push("Only one year supplied — trend-based risk indicators require at least two years.");
  if (records.length > 0) {
    const first = records[0];
    if (first) warnings.push(`${first.year} working-capital days use year-end balances only (no opening balance) and are approximations.`);
  }
  if (records.length === 0 && errors.length === 0) errors.push("No valid data rows found.");
  return { records, errors, warnings };
}

export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (!/\.(csv|xlsx|xls)$/.test(name)) {
    return { records: [], errors: ["Unsupported file type. Upload a .csv or .xlsx file."], warnings: [] };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { records: [], errors: ["File is larger than 5 MB."], warnings: [] };
  }
  try {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = name.endsWith(".csv")
      ? XLSX.read(new TextDecoder().decode(buf), { type: "string" })
      : XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
    if (!sheet) return { records: [], errors: ["The workbook has no sheets."], warnings: [] };
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
    return parseRows(rows);
  } catch {
    return { records: [], errors: ["The file could not be read. Make sure it is a valid CSV or Excel workbook."], warnings: [] };
  }
}
