import { fmtDays, fmtMoney, fmtMultiple, fmtRatioPct, fmtSigned } from "@/lib/finance/format";
import { isNum } from "@/lib/finance/math";
import type { AnalysisResult, MetricValue, YearMetrics } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type Def = {
  key: keyof Omit<YearMetrics, "year">;
  name: string;
  formula: string;
  format: (v: number | null) => string;
  deltaUnit: string;
  /** true = an increase is unfavourable */
  higherIsWorse: boolean;
  explanation: string;
  deltaScale?: number;
};

const DEFS: Def[] = [
  { key: "dso", name: "Days Sales Outstanding", formula: "Avg receivables ÷ revenue × 365", format: fmtDays, deltaUnit: " days", higherIsWorse: true, explanation: "Average number of days taken to collect cash from customers." },
  { key: "dio", name: "Days Inventory Outstanding", formula: "Avg inventory ÷ COGS × 365", format: fmtDays, deltaUnit: " days", higherIsWorse: true, explanation: "Average number of days inventory is held before being sold." },
  { key: "dpo", name: "Days Payables Outstanding", formula: "Avg payables ÷ COGS × 365", format: fmtDays, deltaUnit: " days", higherIsWorse: false, explanation: "Average number of days taken to pay suppliers. Longer DPO retains cash." },
  { key: "ccc", name: "Cash Conversion Cycle", formula: "DSO + DIO − DPO", format: fmtDays, deltaUnit: " days", higherIsWorse: true, explanation: "Days between paying for inputs and collecting cash from customers." },
  { key: "cashConversion", name: "Cash Conversion Ratio", formula: "Operating cash flow ÷ EBITDA", format: (v) => fmtRatioPct(v), deltaUnit: " pp", higherIsWorse: false, deltaScale: 100, explanation: "Share of EBITDA realised as operating cash. Low values question earnings quality." },
  { key: "netDebt", name: "Net Debt", formula: "Total debt − cash", format: (v) => fmtMoney(v), deltaUnit: "", higherIsWorse: true, explanation: "Debt not covered by cash on hand." },
  { key: "netDebtToEbitda", name: "Net Debt / EBITDA", formula: "Net debt ÷ EBITDA", format: fmtMultiple, deltaUnit: "x", higherIsWorse: true, explanation: "Years of EBITDA needed to repay net debt; a core leverage measure." },
];

function Delta({ def, cur, prev }: { def: Def; cur: MetricValue; prev?: MetricValue }) {
  if (!prev || !isNum(cur.value) || !isNum(prev.value)) return null;
  const raw = cur.value - prev.value;
  if (def.key === "netDebt") {
    const bad = raw > 0;
    return <span className={cn("text-xs font-medium", bad ? "text-danger" : "text-success")}>{raw > 0 ? "+" : ""}{fmtMoney(raw)} YoY</span>;
  }
  const d = raw * (def.deltaScale ?? 1);
  const bad = def.higherIsWorse ? d > 0.05 : d < -0.05;
  const good = def.higherIsWorse ? d < -0.05 : d > 0.05;
  return (
    <span className={cn("text-xs font-medium", bad ? "text-danger" : good ? "text-success" : "text-muted-foreground")}>
      {fmtSigned(d, def.deltaUnit, def.key === "netDebtToEbitda" ? 2 : 1)} YoY
    </span>
  );
}

export function MetricCards({ analysis }: { analysis: AnalysisResult }) {
  const mCur = analysis.metrics.at(-1);
  const mPrev = analysis.metrics.length > 1 ? analysis.metrics.at(-2) : undefined;
  if (!mCur) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {DEFS.map((def) => {
        const cur = mCur[def.key];
        const prev = mPrev?.[def.key];
        return (
          <div key={def.key} className="surface-card flex flex-col gap-2 p-5 animate-rise">
            <div className="eyebrow">{def.name}</div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="num text-xl font-semibold">{def.format(cur.value)}</span>
              <Delta def={def} cur={cur} prev={prev} />
            </div>
            <div className="num text-[11px] text-muted-foreground">{def.formula}{cur.basis && cur.basis !== "Revenue" && cur.basis !== "COGS" ? ` (using ${cur.basis.toLowerCase()})` : ""}</div>
            <p className="text-xs leading-relaxed text-muted-foreground">{def.explanation}</p>
            {mPrev && <div className="text-[11px] text-muted-foreground">{mPrev.year}: <span className="num">{def.format(prev?.value ?? null)}</span></div>}
            {cur.note && <div className={cn("rounded-md px-2 py-1 text-[11px]", cur.value === null ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning-foreground")}>{cur.note}</div>}
          </div>
        );
      })}
    </div>
  );
}

export function MetricsByYearTable({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/60 text-left">
            <th className="px-4 py-2.5 font-semibold">Metric</th>
            {analysis.metrics.map((m) => <th key={m.year} className="px-4 py-2.5 text-right font-semibold">{m.year}</th>)}
          </tr>
        </thead>
        <tbody>
          {DEFS.map((def) => (
            <tr key={def.key} className="border-b last:border-0">
              <td className="px-4 py-2.5 text-muted-foreground">{def.name}</td>
              {analysis.metrics.map((m) => {
                const v = m[def.key];
                return (
                  <td key={m.year} className="num px-4 py-2.5 text-right" title={v.note}>
                    {def.format(v.value)}{v.approximate ? <sup className="ml-0.5 text-warning">≈</sup> : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {analysis.metrics.some((m) => m.dso.approximate || m.dio.approximate || m.dpo.approximate) && (
        <p className="border-t px-4 py-2 text-[11px] text-muted-foreground"><span className="text-warning">≈</span> Approximation: year-end balance only (no opening balance available).</p>
      )}
    </div>
  );
}
