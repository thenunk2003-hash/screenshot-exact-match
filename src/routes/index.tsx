import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Banknote, Building2, Gauge, Landmark, TrendingUp, Wallet } from "lucide-react";

import { TrendCharts } from "@/components/charts/TrendCharts";
import { NoAnalysis } from "@/components/common/NoAnalysis";
import { PageHeader } from "@/components/common/PageHeader";
import { CLASS_TONE, RiskClassBadge, SeverityBadge } from "@/components/common/Severity";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { fmtDays, fmtMoney, fmtMultiple, fmtRatioPct, fmtSigned } from "@/lib/finance/format";
import { growthPct } from "@/lib/finance/math";
import { useAnalysis } from "@/lib/store/analysis-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Investment Intelligence Dashboard — CashTrap AI" },
      { name: "description", content: "Revenue, EBITDA, cash flow, net debt and an overall investment risk score for the target company at a glance." },
      { property: "og:title", content: "Investment Intelligence Dashboard — CashTrap AI" },
      { property: "og:description", content: "Identify hidden financial risks before committing capital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { current } = useAnalysis();
  if (!current) return <NoAnalysis />;
  const a = current;
  const cur = a.records.at(-1);
  const prev = a.records.length > 1 ? a.records.at(-2) : undefined;
  const mCur = a.metrics.at(-1);
  const c = a.currency;
  const revG = prev && cur ? growthPct(prev.revenue, cur.revenue) : null;
  const ebG = prev && cur ? growthPct(prev.ebitda, cur.ebitda) : null;
  const ocfG = prev && cur ? growthPct(prev.operatingCashFlow, cur.operatingCashFlow) : null;
  const tone = a.risk.classification ? CLASS_TONE[a.risk.classification] : null;
  const toneFor = (g: number | null) => (g === null ? "default" : g >= 0 ? "positive" : "negative") as "default" | "positive" | "negative";

  return (
    <div>
      <PageHeader
        eyebrow={a.isDemo ? "Demo company · synthetic data" : "Uploaded company"}
        title="Investment Intelligence Dashboard"
        subtitle="Identify hidden financial risks before committing capital."
        actions={
          <Button asChild variant="outline">
            <Link to="/company-analysis">Upload financials</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Company" icon={Building2} value={<span className="block whitespace-normal font-display text-base leading-snug">{a.companyName}</span>} sub={cur ? `Latest FY ${cur.year} · ${a.records.length} years` : undefined} className="xl:col-span-1" />
        <StatCard label="Revenue" icon={TrendingUp} value={fmtMoney(cur?.revenue, c)} sub={revG !== null ? `${fmtSigned(revG, "%")} YoY` : undefined} tone={toneFor(revG)} />
        <StatCard label="EBITDA" icon={Banknote} value={fmtMoney(cur?.ebitda, c)} sub={ebG !== null ? `${fmtSigned(ebG, "%")} YoY` : undefined} tone={toneFor(ebG)} />
        <StatCard label="Operating Cash Flow" icon={Wallet} value={fmtMoney(cur?.operatingCashFlow, c)} sub={ocfG !== null ? `${fmtSigned(ocfG, "%")} YoY` : undefined} tone={toneFor(ocfG)} />
        <StatCard label="Net Debt" icon={Landmark} value={fmtMoney(mCur?.netDebt.value, c)} sub={`${fmtMultiple(mCur?.netDebtToEbitda.value)} EBITDA`} />
        <Link to="/investment-assessment" className="group">
          <div className={cn("surface-card flex h-full flex-col gap-2 p-5 transition-shadow group-hover:shadow-[var(--shadow-elevated)] animate-rise", tone?.bg)}>
            <div className="flex items-center justify-between">
              <span className="eyebrow">Investment Risk Score</span>
              <Gauge className="size-4 text-muted-foreground" />
            </div>
            <div className={cn("num text-[28px] font-semibold leading-tight", tone?.text ?? "text-foreground")}>
              {a.risk.score ?? "—"}
              {a.risk.score !== null && <span className="text-sm text-muted-foreground">/100</span>}
            </div>
            <RiskClassBadge value={a.risk.classification} />
            {!a.risk.complete && !a.risk.insufficientData && (
              <span className="text-[11px] text-muted-foreground">Partial: {a.risk.availableCount}/6 indicators</span>
            )}
          </div>
        </Link>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "DSO", v: fmtDays(mCur?.dso.value), approx: mCur?.dso.approximate },
          { label: "DIO", v: fmtDays(mCur?.dio.value), approx: mCur?.dio.approximate },
          { label: "Cash Conversion Cycle", v: fmtDays(mCur?.ccc.value), approx: mCur?.ccc.approximate },
          { label: "Cash Conversion (OCF/EBITDA)", v: fmtRatioPct(mCur?.cashConversion.value), approx: false },
        ].map((m) => (
          <div key={m.label} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
            <span className="text-xs font-medium text-muted-foreground">{m.label}{m.approx ? " (approx.)" : ""}</span>
            <span className="num text-sm font-semibold">{m.v}</span>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <TrendCharts analysis={a} />
      </section>

      <section className="mt-8 surface-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Potential cash traps detected</h2>
            <p className="text-xs text-muted-foreground">Indicators requiring investigation — not proof of wrongdoing.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/investment-assessment">View all <ArrowRight /></Link>
          </Button>
        </div>
        {a.alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No warning signs triggered by the screening rules.</p>
        ) : (
          <ul className="divide-y">
            {a.alerts.slice(0, 4).map((al) => (
              <li key={al.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="text-sm font-medium">{al.name}</div>
                  <div className="text-xs text-muted-foreground">{al.evidence}</div>
                </div>
                <SeverityBadge severity={al.severity} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {a.isDemo && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          GulfTech Manufacturing LLC is a fictional company. All figures shown are synthetic and illustrative.
        </p>
      )}
    </div>
  );
}
