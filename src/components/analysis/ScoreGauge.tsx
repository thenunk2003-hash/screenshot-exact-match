import { CLASS_TONE } from "@/components/common/Severity";
import type { RiskClass } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

/** Semi-circular score gauge; colour follows the risk classification. */
export function ScoreGauge({ score, classification }: { score: number | null; classification: RiskClass | null }) {
  const r = 80;
  const circ = Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const tone = classification ? CLASS_TONE[classification] : null;
  return (
    <div className="relative mx-auto w-[220px]">
      <svg viewBox="0 0 200 115" className="w-full">
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" strokeWidth="16" strokeLinecap="round" className="stroke-muted" />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
          className={cn("transition-[stroke-dasharray] duration-700", tone ? tone.stroke : "stroke-muted-foreground")}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <div className={cn("num text-5xl font-semibold leading-none", tone?.text ?? "text-muted-foreground")}>
          {score === null ? "—" : score}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{score === null ? "Insufficient Data" : "out of 100"}</div>
      </div>
    </div>
  );
}
