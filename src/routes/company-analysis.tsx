import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Download, FileUp, FlaskConical, Loader2, Play, Trash2, XCircle } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";

import { MetricCards, MetricsByYearTable } from "@/components/analysis/MetricCards";
import { RecordsTable } from "@/components/analysis/RecordsTable";
import { PageHeader } from "@/components/common/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demoCsv, TEMPLATE_COLUMNS } from "@/lib/finance/demo";
import { parseFile } from "@/lib/finance/parse";
import { useAnalysis } from "@/lib/store/analysis-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company-analysis")({
  head: () => ({
    meta: [
      { title: "Company Analysis — Upload Financials | CashTrap AI" },
      { name: "description", content: "Upload Excel or CSV financial statements, review the records and calculate DSO, DIO, DPO, cash conversion and leverage." },
      { property: "og:title", content: "Company Analysis — CashTrap AI" },
      { property: "og:description", content: "Upload financial statements and calculate working-capital and leverage metrics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompanyAnalysis,
});

type View = "demo" | "upload";

function CompanyAnalysis() {
  const { active, demo, upload, current, hydrated, selectCompany, setUploadDraft, renameUpload, analyzeUpload, clearUpload } = useAnalysis();
  const [view, setView] = useState<View>("demo");
  const [reading, setReading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    setView(active === "upload" || (upload && !upload.analysis) ? "upload" : "demo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, active]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    try {
      const parse = await parseFile(file);
      const name = file.name.replace(/\.(csv|xlsx|xls)$/i, "").replace(/[_-]+/g, " ").trim();
      setUploadDraft({ companyName: name || "Uploaded company", fileName: file.name, parse });
      setView("upload");
      if (parse.errors.length) toast.error("The file has errors. Review them below.");
      else toast.success(`${parse.records.length} year(s) read from ${file.name}`);
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    void handleFile(e.dataTransfer.files[0]);
  }

  function loadDemo() {
    selectCompany("demo");
    setView("demo");
    toast.success("Illustrative GulfTech demo data loaded");
  }

  function downloadTemplate() {
    const blob = new Blob([demoCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cashtrap-template-gulftech-demo.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function analyze() {
    setAnalyzing(true);
    window.setTimeout(() => {
      if (view === "upload") {
        const result = analyzeUpload();
        if (!result) toast.error("Fix the file errors before analysing.");
        else toast.success(`Analysis complete for ${result.companyName}`);
      } else {
        selectCompany("demo");
        toast.success("Analysis complete for the GulfTech demo");
      }
      setAnalyzing(false);
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }, 650);
  }

  const reviewing = view === "upload" ? upload : null;
  const records = view === "upload" ? (upload?.parse.records ?? []) : demo.records;
  const canAnalyze = view === "demo" || Boolean(upload && upload.parse.records.length > 0 && upload.parse.errors.length === 0);
  const shownAnalysis =
    view === "demo" && active === "demo" ? demo : view === "upload" && active === "upload" && upload?.analysis ? upload.analysis : null;
  const stale = view === "upload" && upload?.analysis && current !== upload.analysis;

  return (
    <div>
      <PageHeader
        eyebrow="Step 1 · Data"
        title="Company Analysis"
        subtitle="Upload a target company's financial statements, review the records, then run the calculation engine."
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn("surface-card flex flex-col items-center justify-center gap-3 border-2 border-dashed p-8 text-center transition-colors", dragOver && "border-primary bg-primary-soft")}
        >
          <div className="rounded-full bg-primary-soft p-3 text-primary">
            {reading ? <Loader2 className="size-6 animate-spin" /> : <FileUp className="size-6" />}
          </div>
          <div>
            <h2 className="text-base font-semibold">Upload financial statements</h2>
            <p className="mt-1 text-sm text-muted-foreground">Excel (.xlsx) or CSV, one row per year. Max 5 MB.</p>
          </div>
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => void handleFile(e.target.files?.[0])} aria-label="Upload financial file" />
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => inputRef.current?.click()} disabled={reading}>
              <FileUp /> {reading ? "Reading file…" : "Upload file"}
            </Button>
            <Button variant="outline" onClick={loadDemo}>
              <FlaskConical /> Load illustrative demo data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">or drag and drop a file here</p>
        </div>

        <div className="surface-card p-6">
          <h3 className="text-sm font-semibold">Expected columns</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {TEMPLATE_COLUMNS.map((c) => <code key={c} className="num rounded-md bg-muted px-2 py-0.5 text-xs">{c}</code>)}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Optional: <code className="num">Credit_Sales</code> (used for DSO) and <code className="num">Purchases</code> (used for DPO). Amounts in AED. Negative values in brackets are accepted. Missing cells stay blank — they are never treated as zero.
          </p>
          <Button variant="ghost" size="sm" className="mt-3 -ml-2" onClick={downloadTemplate}>
            <Download /> Download CSV template
          </Button>
        </div>
      </div>

      {/* Review */}
      <section className="mt-8 surface-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Review records</h2>
            {view === "demo" ? <Badge variant="demo">Synthetic demo · {demo.companyName}</Badge> : reviewing ? <Badge variant="outline">{reviewing.fileName}</Badge> : null}
          </div>
          {view === "upload" && upload && (
            <Button variant="ghost" size="sm" onClick={() => { clearUpload(); setView("demo"); }}>
              <Trash2 /> Remove upload
            </Button>
          )}
        </div>

        {view === "upload" && !upload && (
          <p className="text-sm text-muted-foreground">No file uploaded yet.</p>
        )}

        {view === "upload" && upload && (
          <div className="mb-4 space-y-3">
            <div className="max-w-sm space-y-1.5">
              <Label htmlFor="company-name">Company name</Label>
              <Input id="company-name" value={upload.companyName} maxLength={120} onChange={(e) => renameUpload(e.target.value)} />
            </div>
            {upload.parse.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="size-4" />
                <AlertTitle>File validation failed</AlertTitle>
                <AlertDescription>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">{upload.parse.errors.slice(0, 12).map((e) => <li key={e}>{e}</li>)}</ul>
                  {upload.parse.errors.length > 12 && <p className="mt-1">…and {upload.parse.errors.length - 12} more.</p>}
                </AlertDescription>
              </Alert>
            )}
            {upload.parse.warnings.length > 0 && (
              <div className="rounded-lg border border-warning/40 bg-warning-soft p-4 text-sm text-warning-foreground">
                <div className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" /> Missing-data warnings</div>
                <ul className="list-disc space-y-0.5 pl-5 text-xs">{upload.parse.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            )}
            {upload.parse.errors.length === 0 && upload.parse.warnings.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" /> File validated — all required fields present.</div>
            )}
          </div>
        )}

        {records.length > 0 && <RecordsTable records={records} />}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={analyze} disabled={!canAnalyze || analyzing}>
            {analyzing ? <Loader2 className="animate-spin" /> : <Play />} {analyzing ? "Analysing…" : "Analyze Financials"}
          </Button>
          {stale && <span className="text-xs text-muted-foreground">Select this company in the header to view its results.</span>}
        </div>
      </section>

      {/* Results */}
      <section ref={resultsRef} className="mt-10 scroll-mt-20">
        <div className="mb-4">
          <div className="eyebrow mb-1">Step 2 · Calculated metrics</div>
          <h2 className="text-xl font-semibold">{shownAnalysis ? shownAnalysis.companyName : "Financial metrics"}</h2>
          {shownAnalysis && <p className="text-sm text-muted-foreground">Latest year {shownAnalysis.records.at(-1)?.year}, compared with the prior year. Working-capital days use average opening and closing balances where available.</p>}
        </div>
        {shownAnalysis ? (
          <div className="space-y-6">
            <MetricCards analysis={shownAnalysis} />
            <MetricsByYearTable analysis={shownAnalysis} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Click <span className="font-medium text-foreground">Analyze Financials</span> to calculate metrics for the records above.
          </div>
        )}
      </section>
    </div>
  );
}
