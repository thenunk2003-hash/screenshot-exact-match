import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Disclaimer } from "@/components/common/Disclaimer";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { calculateCashRelease } from "@/lib/finance/cashImpact";
import { isNum } from "@/lib/finance/math";
import { useAnalysis } from "@/lib/store/analysis-context";

export const Route = createFileRoute("/cash-impact")({
  head: () => ({
    meta: [
      { title: "Cash Impact Calculator — DSO Improvement | CashTrap AI" },
      { name: "description", content: "Estimate the potential cash released by reducing Days Sales Outstanding, in AED." },
      { property: "og:title", content: "Cash Impact Calculator — CashTrap AI" },
      { property: "og:description", content: "Test working-capital improvement scenarios and estimate potential cash release." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CashImpact,
});

const aed = (v: number) => `AED ${Math.round(v).toLocaleString("en-US")}`;

function defaultsFrom(revenue: number | null | undefined, dso: number | null | undefined, prevDso: number | null | undefined) {
  const cur = isNum(dso) ? Math.round(dso * 10) / 10 : 75;
  const target = isNum(prevDso) && prevDso < cur ? Math.round(prevDso * 10) / 10 : Math.max(0, Math.round(cur - 10));
  return { revenue: isNum(revenue) && revenue > 0 ? String(Math.round(revenue)) : "100000000", current: String(cur), target: String(target) };
}

function CashImpact() {
  const { current } = useAnalysis();
  const companyDefaults = useMemo(() => {
    const r = current?.records.at(-1);
    const m = current?.metrics;
    return defaultsFrom(r?.revenue, m?.at(-1)?.dso.value, m && m.length > 1 ? m.at(-2)?.dso.value : null);
  }, [current]);

  const [revenue, setRevenue] = useState(companyDefaults.revenue);
  const [currentDso, setCurrentDso] = useState(companyDefaults.current);
  const [targetDso, setTargetDso] = useState(companyDefaults.target);

  useEffect(() => {
    setRevenue(companyDefaults.revenue);
    setCurrentDso(companyDefaults.current);
    setTargetDso(companyDefaults.target);
  }, [companyDefaults]);

  const n = (s: string) => (s.trim() === "" ? Number.NaN : Number(s.replace(/,/g, "")));
  const rev = n(revenue), cur = n(currentDso), tgt = n(targetDso);
  const result = calculateCashRelease({ annualRevenue: rev, currentDso: cur, targetDso: tgt });
  const sliderMax = Number.isFinite(cur) && cur > 0 ? cur : 120;

  const sensitivity = [5, 10, 15, 20, 30]
    .map((d) => ({ d, r: calculateCashRelease({ annualRevenue: rev, currentDso: cur, targetDso: cur - d }) }))
    .filter((x) => x.r.ok);

  return (
    <div>
      <PageHeader
        eyebrow="Working-capital scenario"
        title="Cash Impact Calculator"
        subtitle="Estimate how much cash could be released by collecting from customers faster."
        actions={current && (
          <Button variant="outline" onClick={() => { setRevenue(companyDefaults.revenue); setCurrentDso(companyDefaults.current); setTargetDso(companyDefaults.target); }}>
            <RotateCcw /> Reset to {current.companyName.split(" ")[0]} values
          </Button>
        )}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="surface-card space-y-6 p-6">
          <h2 className="text-base font-semibold">DSO improvement inputs</h2>
          <div className="space-y-1.5">
            <Label htmlFor="rev">Annual revenue (AED)</Label>
            <Input id="rev" inputMode="decimal" className="num" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
            {Number.isFinite(rev) && rev > 0 && <p className="text-[11px] text-muted-foreground">{aed(rev)}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cur">Current DSO (days)</Label>
              <Input id="cur" inputMode="decimal" className="num" value={currentDso} onChange={(e) => setCurrentDso(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tgt">Target DSO (days)</Label>
              <Input id="tgt" inputMode="decimal" className="num" value={targetDso} onChange={(e) => setTargetDso(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Adjust target DSO</span><span className="num">{Number.isFinite(tgt) ? tgt.toFixed(1) : "—"} days</span></div>
            <Slider
              min={0}
              max={sliderMax}
              step={0.5}
              value={[Number.isFinite(tgt) ? Math.min(Math.max(tgt, 0), sliderMax) : 0]}
              onValueChange={(v) => setTargetDso(String(v[0] ?? 0))}
              aria-label="Target DSO"
            />
          </div>
          <div className="num rounded-lg bg-muted/70 p-3 text-xs text-muted-foreground">
            Potential cash release = (Annual revenue ÷ 365) × (Current DSO − Target DSO)
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="bg-navy-gradient rounded-2xl p-8 shadow-[var(--shadow-elevated)]">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Estimated potential cash release</div>
            {result.ok ? (
              <>
                <div className="num mt-3 text-4xl font-semibold md:text-5xl">{aed(result.release)}</div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div><div className="text-xs opacity-70">Revenue per day</div><div className="num font-medium">{aed(result.dailyRevenue)}</div></div>
                  <div><div className="text-xs opacity-70">DSO reduction</div><div className="num font-medium">{result.daysImproved.toFixed(1)} days</div></div>
                </div>
              </>
            ) : (
              <div className="mt-3 text-sm opacity-90">{result.error}</div>
            )}
          </div>

          {sensitivity.length > 0 && (
            <div className="surface-card p-6">
              <h3 className="mb-3 text-sm font-semibold">Sensitivity — reduce current DSO by</h3>
              <div className="divide-y">
                {sensitivity.map(({ d, r }) => (
                  <button key={d} type="button" onClick={() => setTargetDso(String(Math.round((cur - d) * 10) / 10))} className="flex w-full items-center justify-between py-2 text-left text-sm hover:bg-muted/50">
                    <span className="text-muted-foreground">{d} days</span>
                    <span className="num font-medium">{r.ok ? aed(r.release) : "—"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Disclaimer>
            This is an illustrative working-capital improvement estimate, not guaranteed cash recovery or additional profit.
          </Disclaimer>
        </div>
      </div>
    </div>
  );
}
