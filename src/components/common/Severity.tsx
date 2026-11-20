import { Badge } from "@/components/ui/badge";
import type { RiskClass, Severity } from "@/lib/finance/types";

const SEV_VARIANT = { Low: "low", Medium: "medium", High: "high", Critical: "critical" } as const;

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge variant={SEV_VARIANT[severity]}>{severity}</Badge>;
}

export const CLASS_TONE: Record<RiskClass, { text: string; bg: string; bar: string; stroke: string; variant: "success" | "medium" | "high" | "critical" }> = {
  "Low Risk": { text: "text-success", bg: "bg-success-soft", bar: "bg-success", stroke: "stroke-success", variant: "success" },
  "Moderate Risk": { text: "text-warning", bg: "bg-warning-soft", bar: "bg-warning", stroke: "stroke-warning", variant: "medium" },
  "High Risk": { text: "text-danger", bg: "bg-danger-soft", bar: "bg-danger", stroke: "stroke-danger", variant: "high" },
  "Critical Risk": { text: "text-critical", bg: "bg-critical-soft", bar: "bg-critical", stroke: "stroke-critical", variant: "critical" },
};

export function RiskClassBadge({ value }: { value: RiskClass | null }) {
  if (!value) return <Badge variant="outline">Insufficient Data</Badge>;
  return <Badge variant={CLASS_TONE[value].variant}>{value}</Badge>;
}

/** Bar colour for an indicator by share of its maximum points. */
export function pointsTone(points: number | null, max: number): string {
  if (points === null) return "bg-muted";
  const r = points / max;
  if (r === 0) return "bg-success";
  if (r <= 0.34) return "bg-warning";
  if (r <= 0.67) return "bg-danger";
  return "bg-critical";
}
