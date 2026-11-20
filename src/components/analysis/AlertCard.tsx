import { Search } from "lucide-react";

import { SeverityBadge } from "@/components/common/Severity";
import type { RiskAlert } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

const EDGE = { Low: "border-l-low", Medium: "border-l-warning", High: "border-l-danger", Critical: "border-l-critical" } as const;

export function AlertCard({ alert }: { alert: RiskAlert }) {
  return (
    <article className={cn("surface-card border-l-4 p-5 animate-rise", EDGE[alert.severity])}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{alert.name}</h3>
        <SeverityBadge severity={alert.severity} />
      </header>
      <p className="mt-2 text-sm">{alert.evidence}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-muted/70 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">{alert.previousLabel}</div>
          <div className="num text-sm font-medium">{alert.previousValue}</div>
        </div>
        <div className="rounded-lg bg-muted/70 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">{alert.currentLabel}</div>
          <div className="num text-sm font-medium">{alert.currentValue}</div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">Why it matters: </span>{alert.whyItMatters}</p>
      <div className="mt-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold"><Search className="size-3.5" /> Information required to investigate</div>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
          {alert.informationRequired.map((i) => <li key={i}>{i}</li>)}
        </ul>
      </div>
    </article>
  );
}
