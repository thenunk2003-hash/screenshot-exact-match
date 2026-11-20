import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FIELD_LABELS } from "@/lib/finance/parse";
import type { FieldKey, FinancialRecord } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

const COLS: FieldKey[] = ["revenue", "cogs", "ebitda", "receivables", "inventory", "payables", "operatingCashFlow", "cash", "debt"];

export function RecordsTable({ records }: { records: FinancialRecord[] }) {
  const extra = (["creditSales", "purchases"] as const).filter((k) => records.some((r) => r[k] !== null));
  const cols = [...COLS, ...extra];
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60">
            <TableHead className="font-semibold">Year</TableHead>
            {cols.map((c) => (
              <TableHead key={c} className="text-right font-semibold whitespace-nowrap">{FIELD_LABELS[c]}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.year}>
              <TableCell className="num font-semibold">{r.year}</TableCell>
              {cols.map((c) => {
                const v = r[c];
                return (
                  <TableCell key={c} className={cn("num text-right whitespace-nowrap", v === null && "bg-warning-soft text-warning-foreground")}>
                    {v === null ? "missing" : v.toLocaleString("en-US")}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
