import { createFileRoute } from "@tanstack/react-router";

import { LogoMark } from "@/components/brand/Logo";
import { Disclaimer } from "@/components/common/Disclaimer";
import { PageHeader } from "@/components/common/PageHeader";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About CashTrap AI — Methodology" },
      { name: "description", content: "How CashTrap AI calculates working-capital metrics, scores investment risk and generates due diligence reports." },
      { property: "og:title", content: "About CashTrap AI — Methodology" },
      { property: "og:description", content: "Formulas, scoring thresholds and AI rules behind CashTrap AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const FORMULAS = [
  ["Days Sales Outstanding", "Average receivables ÷ Revenue × 365 (credit sales used if supplied)"],
  ["Days Inventory Outstanding", "Average inventory ÷ COGS × 365"],
  ["Days Payables Outstanding", "Average payables ÷ COGS × 365 (purchases used if supplied)"],
  ["Cash Conversion Cycle", "DSO + DIO − DPO"],
  ["Cash Conversion Ratio", "Operating cash flow ÷ EBITDA"],
  ["Net Debt", "Total debt − Cash"],
  ["Net Debt / EBITDA", "Net debt ÷ EBITDA"],
];

const WEIGHTS = [
  ["Receivables Risk", 20, "DSO change: stable 0 · +1–10 days 5 · +11–20 days 10 · >20 days 20"],
  ["Inventory Risk", 15, "DIO change: stable 0 · +1–10 days 5 · +11–20 days 10 · >20 days 15"],
  ["Profit-to-Cash Conversion", 25, "≥80% 0 · 50–79% 10 · 20–49% 20 · <20% or negative 25"],
  ["EBITDA vs OCF Divergence", 20, "Both improve 0 · one deteriorates 10 · EBITDA >+10% with OCF <−10% 20"],
  ["Cash Conversion Cycle", 10, "Stable 0 · +1–10 days 3 · +11–20 days 6 · >20 days 10"],
  ["Leverage", 10, "<2x 0 · 2–3x 3 · >3–4x 7 · >4x 10"],
] as const;

function About() {
  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="About" title="About CashTrap" subtitle="Find the cash traps before you invest." />

      <div className="bg-navy-gradient mb-8 flex items-center gap-5 rounded-2xl p-7">
        <LogoMark className="size-14" />
        <p className="text-sm leading-relaxed opacity-90">
          CashTrap AI helps private equity investors identify hidden financial risks in a target company before an acquisition decision — working-capital inefficiencies, gaps between reported profit and cash generation, and potential cash-release opportunities.
        </p>
      </div>

      <section className="surface-card mb-6 p-6">
        <h2 className="mb-4 text-base font-semibold">Calculation engine</h2>
        <dl className="divide-y text-sm">
          {FORMULAS.map(([k, v]) => (
            <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[220px_1fr]">
              <dt className="font-medium">{k}</dt>
              <dd className="num text-xs text-muted-foreground sm:text-sm">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Average opening and closing balances are used wherever available. Years with only a year-end balance are labelled as approximations. Zero or negative denominators and missing inputs produce "n/a" — never infinite values or silent zeros.
        </p>
      </section>

      <section className="surface-card mb-6 p-6">
        <h2 className="mb-4 text-base font-semibold">Risk scoring model (max 100)</h2>
        <div className="divide-y text-sm">
          {WEIGHTS.map(([k, w, rule]) => (
            <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[220px_60px_1fr]">
              <span className="font-medium">{k}</span>
              <span className="num">{w} pts</span>
              <span className="text-xs text-muted-foreground sm:text-sm">{rule}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Classification: 0–24 Low · 25–49 Moderate · 50–74 High · 75–100 Critical. Day changes are rounded to the nearest whole day before banding. Missing indicators are excluded and the score is normalised over available indicators; at least four are required, otherwise the result is "Insufficient Data".
        </p>
      </section>

      <section className="surface-card mb-6 p-6">
        <h2 className="mb-3 text-base font-semibold">AI report rules</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Uses only figures produced by the calculation engine; never invents or recalculates data.</li>
          <li>Separates verified financial evidence from possible explanations.</li>
          <li>Highlights missing information and data limitations.</li>
          <li>Never recommends investing in or rejecting a company — it is decision support for the investment team.</li>
          <li>If AI is unavailable, a clearly labelled deterministic report is shown instead.</li>
        </ul>
      </section>

      <Disclaimer>
        CashTrap AI is a screening prototype. Thresholds are illustrative, not universal industry standards. GulfTech Manufacturing LLC is fictional and its figures are synthetic. Nothing in this application constitutes investment advice.
      </Disclaimer>
    </div>
  );
}
