import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, CircleSlash } from "lucide-react";

import { AlertCard } from "@/components/analysis/AlertCard";
import { ScoreGauge } from "@/components/analysis/ScoreGauge";
import { Disclaimer } from "@/components/common/Disclaimer";
import { NoAnalysis } from "@/components/common/NoAnalysis";
import { PageHeader } from "@/components/common/PageHeader";
import { RiskClassBadge, pointsTone } from "@/components/common/Severity";
import { Badge } from "@/components/ui/badge";
import { useAnalysis } from "@/lib/store/analysis-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/investment-assessment")({
  head: () => ({
    meta: [
      { title: "Investment Risk Assessment — CashTrap AI" },
      { name: "description", content: "Weighted 100-point financial risk score covering receivables, inventory, cash conversion, EBITDA divergence, cash cycle and leverage." },
      { property: "og:title", content: "Investment Risk Assessment — CashTrap AI" },
      { property: "og:description", content: "Risk score, breakdown and detected cash traps with supporting evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Assessment,
});

function Assessment() {
  const { current } = useAnalysis();
  if (!current) return <NoAnalysis />;
  const { risk, alerts } = current;

  return (
    <div>
      <PageHeader
        eyebrow={`${current.companyName}${current.isDemo ? " · synthetic demo" : ""}`}
        title="Investment Assessment"
        subtitle="Weighted screening of six financial risk indicators. Higher scores indicate higher identified financial risk."
      />

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="surface-card flex flex-col items-center gap-4 p-6 text-center">
          <div className="eyebrow">Overall risk score</div>
          <ScoreGauge score={risk.score} classification={risk.classification} />
          <RiskClassBadge value={risk.classification} />
          <div className="w-full rounded-lg bg-muted/70 p-3 text-left text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Assessment coverage</span><span className="num font-semibold">{risk.availableCount} / {risk.totalCount} indicators</span></div>
            <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Points earned</span><span className="num font-semibold">{risk.rawPoints} / {risk.availableMax}</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-primary" style={{ width: `${(risk.availableCount / risk.totalCount) * 100}%` }} />
            </div>
          </div>
          {risk.insufficientData ? (
            <p className="flex items-start gap-2 text-left text-xs text-danger"><CircleSlash className="mt-0.5 size-3.5 shrink-0" /> Insufficient Data — at least 4 indicators are required for an overall score.</p>
          ) : !risk.complete ? (
            <p className="flex items-start gap-2 text-left text-xs text-warning-foreground"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" /> Incomplete assessment — score normalised over the {risk.availableCount} available indicators.</p>
          ) : (
            <p className="flex items-start gap-2 text-left text-xs text-muted-foreground"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> Complete assessment — all six indicators available.</p>
          )}
          <div className="grid w-full grid-cols-4 gap-1 text-[10px] text-muted-foreground">
            <div><div className="mb-1 h-1.5 rounded bg-success" />0–24 Low</div>
            <div><div className="mb-1 h-1.5 rounded bg-warning" />25–49 Mod.</div>
            <div><div className="mb-1 h-1.5 rounded bg-danger" />50–74 High</div>
            <div><div className="mb-1 h-1.5 rounded bg-critical" />75+ Critical</div>
          </div>
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-1 text-base font-semibold">Risk breakdown</h2>
          <p className="mb-5 text-xs text-muted-foreground">Points earned against each indicator's weight.</p>
          <div className="space-y-5">
            {risk.indicators.map((ind) => (
              <div key={ind.key}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{ind.name}</span>
                    {ind.approximate && <Badge variant="outline" className="text-[10px]">approx.</Badge>}
                  </div>
                  <span className="num text-sm font-semibold">
                    {ind.points === null ? <span className="text-muted-foreground">Not assessed</span> : <>{ind.points}<span className="text-muted-foreground">/{ind.maxPoints}</span></>}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", pointsTone(ind.points, ind.maxPoints), ind.points === null && "bg-hatch")}
                    style={{ width: ind.points === null ? "100%" : `${Math.max(2, (ind.points / ind.maxPoints) * 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 num text-[11px] text-muted-foreground">{ind.evidence}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{ind.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Disclaimer>
          The CashTrap scoring model is an illustrative screening methodology using prototype thresholds, not universal industry standards. It is not a definitive investment decision and should be used alongside full financial, commercial and legal due diligence. Missing indicators are excluded and the score is normalised rather than scored as zero.
        </Disclaimer>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="eyebrow mb-1">Financial risk detection</div>
            <h2 className="text-xl font-semibold">Potential cash traps</h2>
            <p className="text-sm text-muted-foreground">Each finding is a potential risk requiring investigation — not proof of fraud, poor management or bad debt.</p>
          </div>
          <Badge variant="outline">{alerts.length} detected</Badge>
        </div>
        {alerts.length === 0 ? (
          <div className="surface-card p-8 text-center text-sm text-muted-foreground">No warning signs were triggered on the data supplied.</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {alerts.map((a) => <AlertCard key={a.id} alert={a} />)}
          </div>
        )}
      </section>
    </div>
  );
}
