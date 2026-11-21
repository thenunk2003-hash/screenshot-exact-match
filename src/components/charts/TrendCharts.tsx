import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList,
} from "recharts";
import type { ReactNode } from "react";

import type { AnalysisResult } from "@/lib/finance/types";

const toM = (v: number | null) => (v === null ? null : Math.round((v / 1e6) * 10) / 10);
const axisTick = { fill: "var(--color-muted-foreground)", fontSize: 12 };
const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "var(--shadow-card)",
};
const fmt = (v: unknown) => (typeof v === "number" ? `${v.toFixed(1)}m` : "n/a");

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="surface-card p-5 animate-rise">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}

export function TrendCharts({ analysis }: { analysis: AnalysisResult }) {
  const c = analysis.currency;
  const data = analysis.records.map((r) => ({
    year: String(r.year),
    Revenue: toM(r.revenue),
    EBITDA: toM(r.ebitda),
    "Operating Cash Flow": toM(r.operatingCashFlow),
    Receivables: toM(r.receivables),
    Inventory: toM(r.inventory),
  }));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard title="Revenue" subtitle={`${c} millions`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={fmt} cursor={{ fill: "var(--color-muted)" }} />
            <Bar dataKey="Revenue" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} maxBarSize={56}>
              <LabelList dataKey="Revenue" position="top" formatter={fmt} style={{ fill: "var(--color-foreground)", fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="EBITDA vs Operating Cash Flow" subtitle={`${c} millions — divergence signals a profit-to-cash gap`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={fmt} cursor={{ fill: "var(--color-muted)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="EBITDA" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} maxBarSize={40}>
              <LabelList dataKey="EBITDA" position="top" formatter={fmt} style={{ fill: "var(--color-foreground)", fontSize: 11 }} />
            </Bar>
            <Bar dataKey="Operating Cash Flow" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} maxBarSize={40}>
              <LabelList dataKey="Operating Cash Flow" position="top" formatter={fmt} style={{ fill: "var(--color-foreground)", fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Receivables & Inventory" subtitle={`${c} millions, year-end balances`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 24, right: 28, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Receivables" stroke="var(--color-chart-3)" strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive={false} connectNulls={false}>
              <LabelList dataKey="Receivables" position="top" formatter={fmt} style={{ fill: "var(--color-foreground)", fontSize: 11 }} />
            </Line>
            <Line type="monotone" dataKey="Inventory" stroke="var(--color-chart-4)" strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive={false} connectNulls={false}>
              <LabelList dataKey="Inventory" position="bottom" formatter={fmt} style={{ fill: "var(--color-foreground)", fontSize: 11 }} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Operating Cash Flow" subtitle={`${c} millions`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 24, right: 28, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={fmt} />
            <Line type="monotone" dataKey="Operating Cash Flow" stroke="var(--color-chart-2)" strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive={false}>
              <LabelList dataKey="Operating Cash Flow" position="top" formatter={fmt} style={{ fill: "var(--color-foreground)", fontSize: 11 }} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
