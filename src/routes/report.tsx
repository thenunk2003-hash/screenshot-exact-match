import { createFileRoute } from "@tanstack/react-router";
import { Bot, FileText, Loader2, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { NoAnalysis } from "@/components/common/NoAnalysis";
import { PageHeader } from "@/components/common/PageHeader";
import { RiskClassBadge, SeverityBadge } from "@/components/common/Severity";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { investigateReport } from "@/lib/ai/report.functions";
import { buildDeterministicReport } from "@/lib/report/deterministic";
import { buildReportFacts } from "@/lib/report/facts";
import { analysisKey, useAnalysis } from "@/lib/store/analysis-context";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "AI Due Diligence Report — CashTrap AI" },
      { name: "description", content: "AI-written investment due diligence report built strictly from calculated metrics and detected risk alerts." },
      { property: "og:title", content: "AI Due Diligence Report — CashTrap AI" },
      { property: "og:description", content: "Decision-support report for private equity investment teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid border-t py-6 first:border-t-0 print:py-4">
      <h2 className="mb-3 flex items-baseline gap-3 text-base font-semibold">
        <span className="num text-xs text-muted-foreground">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-muted-foreground">None identified.</p>;
  return <ul className="list-disc space-y-1 pl-5">{items.map((i, idx) => <li key={idx}>{i}</li>)}</ul>;
}

function ReportPage() {
  const { current, report, saveReport } = useAnalysis();
  const [loading, setLoading] = useState(false);
  if (!current) return <NoAnalysis />;
  const a = current;

  async function generate() {
    setLoading(true);
    const key = analysisKey(a);
    try {
      const res = await investigateReport({ data: { facts: JSON.stringify(buildReportFacts(a)) } });
      if (res.ok) {
        saveReport({ analysisKey: key, mode: "ai", report: res.report, generatedAt: new Date().toISOString() });
        toast.success("AI due diligence report generated");
      } else {
        saveReport({ analysisKey: key, mode: "deterministic", report: buildDeterministicReport(a), generatedAt: new Date().toISOString(), aiUnavailableReason: res.message });
        toast.warning("AI unavailable — showing deterministic demo report");
      }
    } catch {
      saveReport({ analysisKey: key, mode: "deterministic", report: buildDeterministicReport(a), generatedAt: new Date().toISOString(), aiUnavailableReason: "The AI service could not be reached." });
      toast.warning("AI unavailable — showing deterministic demo report");
    } finally {
      setLoading(false);
    }
  }

  function deterministic() {
    saveReport({ analysisKey: analysisKey(a), mode: "deterministic", report: buildDeterministicReport(a), generatedAt: new Date().toISOString() });
  }

  const r = report?.report;
  const cur = a.records.at(-1);

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Step 4 · Reporting"
          title="AI Due Diligence Report"
          subtitle="Narrative generated only from the calculation engine's figures and detected alerts."
          actions={
            r && (
              <>
                <Button variant="outline" onClick={generate} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Regenerate with AI
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer /> Download Report (PDF)
                </Button>
              </>
            )
          }
        />
      </div>

      {!r && (
        <div className="surface-card mx-auto max-w-2xl p-10 text-center print:hidden">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            {loading ? <Loader2 className="size-6 animate-spin" /> : <Bot className="size-6" />}
          </div>
          <h2 className="text-lg font-semibold">{loading ? "Writing the due diligence report…" : `Generate a report for ${a.companyName}`}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {loading
              ? "The AI is reviewing the calculated metrics and alerts. This usually takes 30–60 seconds."
              : "The AI explains the engine's findings in analyst language. It uses only calculated figures and never recommends investing or rejecting."}
          </p>
          {!loading && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button size="lg" onClick={generate}><Bot /> Generate AI report</Button>
              <Button size="lg" variant="outline" onClick={deterministic}><FileText /> Deterministic demo report</Button>
            </div>
          )}
        </div>
      )}

      {r && report && (
        <>
          {report.mode === "deterministic" && (
            <Alert className="mb-5 border-warning/40 bg-warning-soft print:mb-3">
              <FileText className="size-4" />
              <AlertTitle>Deterministic demo report — no AI analysis was performed</AlertTitle>
              <AlertDescription>
                {report.aiUnavailableReason ? `AI unavailable: ${report.aiUnavailableReason} ` : ""}
                This report is assembled from fixed templates and the calculation engine's output.
              </AlertDescription>
            </Alert>
          )}

          <article className="surface-card px-6 py-8 md:px-10 print:border-0 print:shadow-none print:p-0">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b pb-6">
              <div>
                <div className="eyebrow mb-1">CashTrap AI · Investment Due Diligence Report</div>
                <h1 className="text-2xl font-semibold">{a.companyName}</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Financial years {a.records[0]?.year}–{cur?.year} · Generated {new Date(report.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {a.isDemo && <Badge variant="demo">Synthetic demo data</Badge>}
                {report.mode === "ai" ? <Badge variant="ai"><Bot className="mr-1 size-3" />AI-generated narrative</Badge> : <Badge variant="outline">Deterministic template</Badge>}
              </div>
            </header>

            <Section n={1} title="Executive Investment Risk Summary"><p>{r.executiveSummary}</p></Section>

            <Section n={2} title="Overall Risk Score and Classification">
              <div className="flex flex-wrap items-center gap-4 rounded-xl bg-muted/70 p-4">
                <div className="num text-3xl font-semibold">{a.risk.score ?? "—"}<span className="text-sm text-muted-foreground">/100</span></div>
                <RiskClassBadge value={a.risk.classification} />
                <span className="text-xs text-muted-foreground">Coverage: {a.risk.availableCount}/{a.risk.totalCount} indicators</span>
              </div>
              <table className="mt-3 w-full text-xs">
                <tbody>
                  {a.risk.indicators.map((i) => (
                    <tr key={i.key} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">{i.name}</td>
                      <td className="num py-1.5 pr-3 text-right">{i.points === null ? "n/a" : `${i.points}/${i.maxPoints}`}</td>
                      <td className="num py-1.5 text-muted-foreground">{i.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>{r.riskScoreCommentary}</p>
            </Section>

            <Section n={3} title="Key Financial Findings">
              {r.keyFindings.length === 0 ? <p className="text-muted-foreground">No findings.</p> : (
                <div className="space-y-3">
                  {r.keyFindings.map((f, i) => (
                    <div key={i} className="break-inside-avoid rounded-xl border p-4">
                      <div className="font-medium">{f.finding}</div>
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-success"><ShieldCheck className="size-3" /> Verified evidence</div>
                          <p className="text-xs">{f.evidence}</p>
                        </div>
                        <div>
                          <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-warning">Possible explanations</div>
                          <p className="text-xs text-muted-foreground">{f.possibleExplanations}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {a.alerts.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {a.alerts.map((al) => <span key={al.id} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><SeverityBadge severity={al.severity} />{al.name}</span>)}
                </div>
              )}
            </Section>

            <Section n={4} title="Receivables and Inventory Analysis"><p>{r.receivablesInventory}</p></Section>
            <Section n={5} title="Profitability versus Cash Flow Analysis"><p>{r.profitabilityVsCash}</p></Section>
            <Section n={6} title="Leverage Analysis"><p>{r.leverage}</p></Section>
            <Section n={7} title="Potential Cash Release Opportunities">
              <p>{r.cashRelease}</p>
              <p className="text-xs text-muted-foreground">Illustrative working-capital improvement estimate, not guaranteed cash recovery or additional profit.</p>
            </Section>
            <Section n={8} title="Potential Investment Implications"><List items={r.investmentImplications} /></Section>
            <Section n={9} title="Missing Information and Data Limitations"><List items={r.dataLimitations} /></Section>
            <Section n={10} title="Questions to Ask Company Management">
              <ol className="list-decimal space-y-1 pl-5">{r.managementQuestions.map((q, i) => <li key={i}>{q}</li>)}</ol>
            </Section>
            <Section n={11} title="Due Diligence Recommendation">
              <p>{r.recommendation}</p>
              <p className="rounded-lg bg-muted/70 p-3 text-xs text-muted-foreground">
                Decision support only. CashTrap AI does not recommend investing in or rejecting a company. Findings are potential risks requiring investigation and do not establish fraud, poor management or bad debt.
              </p>
            </Section>
          </article>
        </>
      )}
    </div>
  );
}
