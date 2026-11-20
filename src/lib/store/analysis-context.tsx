import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { analyzeFinancials } from "../finance/analyze";
import { DEMO_COMPANY, DEMO_RECORDS } from "../finance/demo";
import type { ParseResult } from "../finance/parse";
import type { AnalysisResult } from "../finance/types";
import type { DueDiligenceReport, ReportMode } from "../report/types";

export type CompanyKey = "demo" | "upload";

export interface UploadState {
  companyName: string;
  fileName: string;
  parse: ParseResult;
  analysis: AnalysisResult | null;
}

export interface StoredReport {
  analysisKey: string;
  mode: ReportMode;
  report: DueDiligenceReport;
  generatedAt: string;
  aiUnavailableReason?: string;
}

interface AnalysisContextValue {
  active: CompanyKey;
  current: AnalysisResult | null;
  demo: AnalysisResult;
  upload: UploadState | null;
  report: StoredReport | null;
  hydrated: boolean;
  selectCompany: (key: CompanyKey) => void;
  setUploadDraft: (draft: { companyName: string; fileName: string; parse: ParseResult }) => void;
  renameUpload: (name: string) => void;
  analyzeUpload: () => AnalysisResult | null;
  clearUpload: () => void;
  saveReport: (r: StoredReport) => void;
}

const STORAGE_KEY = "cashtrap.state.v1";
const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function analysisKey(a: AnalysisResult): string {
  return `${a.isDemo ? "demo" : "upload"}:${a.companyName}:${a.analyzedAt}`;
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const demo = useMemo(
    () => analyzeFinancials({ companyName: DEMO_COMPANY, isDemo: true, records: DEMO_RECORDS, warnings: ["All GulfTech figures are synthetic and illustrative."] }),
    [],
  );
  const [active, setActive] = useState<CompanyKey>("demo");
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [reports, setReports] = useState<Record<string, StoredReport>>({});
  const [hydrated, setHydrated] = useState(false);

  // Restore after hydration (browser storage must not be read during render).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { active?: CompanyKey; upload?: UploadState | null; reports?: Record<string, StoredReport> };
        if (saved.upload) setUpload(saved.upload);
        if (saved.active === "upload" && saved.upload?.analysis) setActive("upload");
        if (saved.reports) setReports(saved.reports);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      // Demo reports are keyed by analysis time and regenerate per session; persist upload ones only.
      const keep = Object.fromEntries(Object.entries(reports).filter(([k]) => k.startsWith("upload:")));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ active, upload, reports: keep }));
    } catch {
      /* storage full or unavailable */
    }
  }, [active, upload, reports, hydrated]);

  const current = active === "upload" ? (upload?.analysis ?? null) : demo;
  const report = current ? (reports[analysisKey(current)] ?? null) : null;

  const selectCompany = useCallback((key: CompanyKey) => setActive(key), []);
  const setUploadDraft = useCallback((draft: { companyName: string; fileName: string; parse: ParseResult }) => {
    setUpload({ ...draft, analysis: null });
  }, []);
  const renameUpload = useCallback((name: string) => {
    setUpload((u) => (u ? { ...u, companyName: name } : u));
  }, []);
  const analyzeUpload = useCallback(() => {
    if (!upload || upload.parse.records.length === 0 || upload.parse.errors.length > 0) return null;
    const analysis = analyzeFinancials({
      companyName: upload.companyName.trim() || "Uploaded company",
      isDemo: false,
      records: upload.parse.records,
      warnings: upload.parse.warnings,
    });
    setUpload({ ...upload, analysis });
    setActive("upload");
    return analysis;
  }, [upload]);
  const clearUpload = useCallback(() => {
    setUpload(null);
    setActive("demo");
  }, []);
  const saveReport = useCallback((r: StoredReport) => {
    setReports((prev) => ({ ...prev, [r.analysisKey]: r }));
  }, []);

  const value: AnalysisContextValue = {
    active, current, demo, upload, report, hydrated,
    selectCompany, setUploadDraft, renameUpload, analyzeUpload, clearUpload, saveReport,
  };
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used inside AnalysisProvider");
  return ctx;
}
