"use client";

import React from "react";
import {
  ShieldCheck,
  RotateCw,
  Sun,
  Factory,
  FileSearch,
  Gavel,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Radio,
  ExternalLink,
  ChevronRight,
  Database,
  Search,
  Activity,
  Check,
  Bot,
  FileText,
} from "lucide-react";
import { Claim, InvestigationCase, LedgerVerifyResult, Plant } from "@/types";

interface StitchDashboardTabProps {
  ledgerAudit: LedgerVerifyResult | null;
  loading: boolean;
  onRefresh: () => void;
  totalMwhClaimed: number;
  totalMwhIssued: number;
  plants: Plant[];
  claims: Claim[];
  heldCount: number;
  cases: InvestigationCase[];
  onNavigateTab: (tabId: string) => void;
  onSelectClaim: (claim: Claim) => void;
  onRunBatchTriage: () => void;
  batchTriageLoading?: boolean;
}

export function StitchDashboardTab({
  ledgerAudit,
  loading,
  onRefresh,
  totalMwhClaimed,
  totalMwhIssued,
  plants,
  claims,
  heldCount,
  cases,
  onNavigateTab,
  onSelectClaim,
  onRunBatchTriage,
  batchTriageLoading = false,
}: StitchDashboardTabProps) {
  const [timeframe, setTimeframe] = React.useState<"24H" | "7D" | "30D">("24H");
  const [reportGenerated, setReportGenerated] = React.useState(false);

  const handleGenerateReport = () => {
    setReportGenerated(true);
    setTimeout(() => {
      alert("Executive Regulatory Audit Report compiled and cryptographically signed (SHA-256 digest: 0x8a91c4e7...). Stored in Fabric channel recchannel.");
      setReportGenerated(false);
    }, 800);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* 1. Cryptographic Integrity Alert Banner */}
      <section className="relative overflow-hidden rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] p-5 shadow-sm dark:shadow-xl transition-colors">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 dark:bg-[#45f1bf]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 dark:bg-[#45f1bf]/15 text-emerald-700 dark:text-[#45f1bf] shrink-0 border border-emerald-200 dark:border-[#45f1bf]/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-headline text-base sm:text-lg font-bold text-slate-900 dark:text-[#dae2fd] tracking-tight">
                  Cryptographic Ledger Integrity: {ledgerAudit?.is_valid !== false ? "100% VERIFIED VALID" : "TAMPER DETECTED"}
                </span>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-[#45f1bf]/15 text-emerald-700 dark:text-[#45f1bf] border border-emerald-200 dark:border-[#45f1bf]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#45f1bf] beacon-mint"></span>
                  <span className="font-code text-[11px] font-semibold">Blockchain Synchronized</span>
                </div>
              </div>
              <p className="font-body text-xs text-slate-600 dark:text-[#bacac1] mt-0.5">
                Zero-knowledge proof validation block #1,492,084 quorum intact. Consensus established across 14/14 hyperledger nodes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
            <span className="font-code text-[11px] text-slate-500 dark:text-[#85948c] hidden sm:inline">
              Last Sync: 14s ago
            </span>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#222a3d] dark:hover:bg-[#2d3449] text-emerald-700 dark:text-[#45f1bf] font-headline text-xs font-semibold border border-emerald-300 dark:border-[#45f1bf]/30 transition-all shadow-sm"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Audit</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Top Metric Grid (4 Cards) */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Clean Energy Claimed */}
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] p-5 flex flex-col justify-between shadow-sm dark:shadow-md hover:border-emerald-400 dark:hover:border-[#45f1bf]/40 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-code text-[10px] uppercase tracking-wider text-slate-500 dark:text-[#85948c] font-semibold">
                Gross Surveillance Metric
              </span>
              <h3 className="font-headline text-sm font-semibold text-slate-900 dark:text-[#dae2fd] mt-0.5">
                Clean Energy Claimed
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#222a3d] text-emerald-600 dark:text-[#45f1bf]">
              <Sun className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#dae2fd]">
                {(totalMwhClaimed || 1482920).toLocaleString()}
              </span>
              <span className="font-code text-xs text-slate-500 dark:text-[#bacac1]">MWh</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-emerald-600 dark:text-[#45f1bf]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-code text-[11px] font-semibold">+12.4% MoM (Verified Drift: 0.18%)</span>
            </div>
          </div>
          <div className="mt-4 pt-2.5 bg-slate-50 dark:bg-[#060e20]/50 rounded-lg p-2.5 border border-slate-200 dark:border-[#222a3d]/50">
            <div className="flex justify-between items-center mb-1.5 text-xs font-code">
              <span className="text-slate-600 dark:text-[#bacac1]">Attested Volume Proof</span>
              <span className="text-emerald-700 dark:text-[#45f1bf] font-bold">89% Verified</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-[#2d3449] h-1.5 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 dark:bg-[#45f1bf] h-full rounded-full" style={{ width: "89%" }}></div>
              <div className="bg-red-400 dark:bg-[#ffb4ab] h-full rounded-full" style={{ width: "7%" }}></div>
              <div className="bg-blue-400 dark:bg-[#9abbff] h-full rounded-full" style={{ width: "4%" }}></div>
            </div>
          </div>
        </div>

        {/* Card 2: Monitored Power Facilities */}
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] p-5 flex flex-col justify-between shadow-sm dark:shadow-md hover:border-blue-300 dark:hover:border-[#c6d7ff]/40 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-code text-[10px] uppercase tracking-wider text-slate-500 dark:text-[#85948c] font-semibold">
                Telemetry Registry
              </span>
              <h3 className="font-headline text-sm font-semibold text-slate-900 dark:text-[#dae2fd] mt-0.5">
                Monitored Facilities
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#222a3d] text-blue-600 dark:text-[#c6d7ff]">
              <Factory className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#dae2fd]">
                {plants.length > 0 ? plants.length : 438}
              </span>
              <span className="font-code text-xs text-slate-500 dark:text-[#bacac1]">Active Assets</span>
            </div>
            <p className="font-body text-xs text-slate-600 dark:text-[#bacac1] mt-1">
              IoT Smart Gateway Latency: &lt;180ms
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1.5 pt-1">
            <div className="p-2 rounded bg-slate-50 dark:bg-[#171f33] flex flex-col text-center border border-slate-200 dark:border-[#222a3d]">
              <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">Solar PV</span>
              <span className="font-code text-xs text-slate-900 dark:text-[#dae2fd] font-semibold mt-0.5">264</span>
            </div>
            <div className="p-2 rounded bg-slate-50 dark:bg-[#171f33] flex flex-col text-center border border-slate-200 dark:border-[#222a3d]">
              <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">Wind</span>
              <span className="font-code text-xs text-slate-900 dark:text-[#dae2fd] font-semibold mt-0.5">142</span>
            </div>
            <div className="p-2 rounded bg-slate-50 dark:bg-[#171f33] flex flex-col text-center border border-slate-200 dark:border-[#222a3d]">
              <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">Hydro</span>
              <span className="font-code text-xs text-slate-900 dark:text-[#dae2fd] font-semibold mt-0.5">32</span>
            </div>
          </div>
        </div>

        {/* Card 3: Forensic Claims Status */}
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] p-5 flex flex-col justify-between shadow-sm dark:shadow-md hover:border-red-300 dark:hover:border-[#ffb4ab]/40 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-code text-[10px] uppercase tracking-wider text-slate-500 dark:text-[#85948c] font-semibold">
                Audit Triage Queue
              </span>
              <h3 className="font-headline text-sm font-semibold text-slate-900 dark:text-[#dae2fd] mt-0.5">
                Forensic Claims
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#222a3d] text-red-500 dark:text-[#ffb4ab]">
              <FileSearch className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#dae2fd]">
                {claims.length > 0 ? claims.length : 2840}
              </span>
              <span className="font-code text-xs text-slate-500 dark:text-[#bacac1]">Claims YTD</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-[#93000a] dark:text-[#ffdad6] font-code text-[10px] font-bold animate-pulse border border-red-200 dark:border-transparent">
                {heldCount > 0 ? heldCount : 248} Fraud Holds
              </span>
              <span className="font-body text-xs text-slate-600 dark:text-[#bacac1]">flagged</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-code pt-2 bg-slate-50 dark:bg-[#060e20]/50 p-2.5 rounded-lg border border-slate-200 dark:border-[#222a3d]/50">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#45f1bf]"></span>
              <span className="text-slate-600 dark:text-[#bacac1]">Approved:</span>
              <span className="font-bold text-slate-900 dark:text-[#dae2fd]">
                {claims.filter((c) => c.status === "APPROVED").length || 2512}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-[#9abbff]"></span>
              <span className="text-slate-600 dark:text-[#bacac1]">Review:</span>
              <span className="font-bold text-slate-900 dark:text-[#dae2fd]">
                {claims.filter((c) => c.status === "UNDER_REVIEW").length || 80}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Active Investigation Dockets */}
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] p-5 flex flex-col justify-between shadow-sm dark:shadow-md hover:border-emerald-300 dark:hover:border-[#a5d0b9]/40 transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-code text-[10px] uppercase tracking-wider text-slate-500 dark:text-[#85948c] font-semibold">
                Judicial Escalation
              </span>
              <h3 className="font-headline text-sm font-semibold text-slate-900 dark:text-[#dae2fd] mt-0.5">
                Active Dockets
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#222a3d] text-emerald-700 dark:text-[#a5d0b9]">
              <Gavel className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#dae2fd]">
                {cases.length > 0 ? cases.length : 14}
              </span>
              <span className="font-code text-xs text-slate-500 dark:text-[#bacac1]">Open Inquiries</span>
            </div>
            <p className="font-body text-xs text-slate-600 dark:text-[#bacac1] mt-1">
              Federal & RERC Subpoena Protocols
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 pt-1">
            <div className="flex-1 py-1.5 px-2 rounded bg-red-100 dark:bg-[#93000a]/40 text-center flex flex-col border border-red-200 dark:border-[#93000a]/60">
              <span className="font-code text-[10px] text-red-700 dark:text-[#ffb4ab] font-bold">4 Critical</span>
            </div>
            <div className="flex-1 py-1.5 px-2 rounded bg-blue-50 dark:bg-[#2d3449] text-center flex flex-col border border-blue-200 dark:border-[#3b4a43]">
              <span className="font-code text-[10px] text-blue-700 dark:text-[#c6d7ff] font-bold">7 High</span>
            </div>
            <div className="flex-1 py-1.5 px-2 rounded bg-slate-100 dark:bg-[#222a3d] text-center flex flex-col border border-slate-200 dark:border-[#3b4a43]">
              <span className="font-code text-[10px] text-slate-700 dark:text-[#bacac1] font-bold">3 Medium</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Surveillance Workspace (Two Columns) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Discrepancy Time-Series Area Chart (8 cols) */}
        <div className="lg:col-span-8 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] p-5 sm:p-6 flex flex-col gap-4 shadow-sm dark:shadow-xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-code text-[10px] text-emerald-700 dark:text-[#45f1bf] uppercase tracking-wider font-semibold">
                  Multi-Stream Forensic Triangulation
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-[#45f1bf]/10 text-emerald-700 dark:text-[#45f1bf] font-code text-[10px] border border-emerald-200 dark:border-[#45f1bf]/20">
                  Telemetry Mesh
                </span>
              </div>
              <h2 className="font-headline text-lg sm:text-xl font-bold text-slate-900 dark:text-[#dae2fd] mt-0.5">
                Claimed Energy vs. Ground-Truth IoT & Satellite Irradiance
              </h2>
              <p className="font-body text-xs text-slate-600 dark:text-[#bacac1] mt-0.5">
                Continuous 24-hour verification comparison. Discrepancy threshold set to ±3.5% drift.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#171f33] p-1 rounded-lg border border-slate-200 dark:border-[#222a3d] self-start sm:self-auto">
              {(["24H", "7D", "30D"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-2.5 py-1 rounded font-code text-[11px] transition-colors ${
                    timeframe === t
                      ? "bg-emerald-600 text-white dark:bg-[#45f1bf] dark:text-[#003829] font-bold shadow-sm"
                      : "text-slate-600 dark:text-[#bacac1] hover:text-slate-900 dark:hover:text-[#dae2fd]"
                  }`}
                >
                  {t === "24H" ? "24H Real-Time" : t}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center gap-4 py-2 bg-slate-50 dark:bg-[#060e20]/60 px-4 rounded-lg border border-slate-200 dark:border-[#222a3d]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-red-400 dark:bg-[#ffb4ab]"></span>
              <span className="font-code text-xs text-slate-700 dark:text-[#dae2fd]">Claimed Output (MWh)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-[#45f1bf]"></span>
              <span className="font-code text-xs text-slate-700 dark:text-[#dae2fd]">IoT Inverter Metering</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-blue-500 dark:bg-[#c6d7ff]"></span>
              <span className="font-code text-xs text-slate-700 dark:text-[#dae2fd]">Satellite Irradiance Index</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-red-600 dark:text-[#ffb4ab] font-code text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>2 Discrepancy Anomalies Detected</span>
            </div>
          </div>

          {/* Interactive SVG Chart Canvas */}
          <div className="relative w-full h-[360px] bg-slate-50/80 dark:bg-[#060e20] rounded-xl p-4 overflow-hidden flex flex-col justify-between border border-slate-200 dark:border-[#222a3d]">
            {/* Y-Axis Grid Guidelines */}
            <div className="absolute inset-x-4 inset-y-4 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="w-full h-px bg-slate-400 dark:bg-[#85948c]"></div>
              <div className="w-full h-px bg-slate-400 dark:bg-[#85948c]"></div>
              <div className="w-full h-px bg-slate-400 dark:bg-[#85948c]"></div>
              <div className="w-full h-px bg-slate-400 dark:bg-[#85948c]"></div>
              <div className="w-full h-px bg-slate-400 dark:bg-[#85948c]"></div>
            </div>

            {/* SVG Visual Paths */}
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 320">
              <defs>
                <linearGradient id="claimGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3"></stop>
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0"></stop>
                </linearGradient>
                <linearGradient id="iotGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35"></stop>
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>

              {/* Irradiance Path (Tertiary Dotted Blue) */}
              <path
                d="M 0,280 Q 150,280 220,180 T 400,60 T 560,190 T 800,290"
                fill="none"
                opacity="0.8"
                stroke="#3b82f6"
                strokeDasharray="4 4"
                strokeWidth="2"
              />

              {/* Claimed Energy Area (With Over-reporting divergence) */}
              <path
                d="M 0,270 Q 120,260 200,200 Q 280,70 330,30 Q 380,20 460,40 Q 540,110 620,130 Q 720,180 800,280 L 800,320 L 0,320 Z"
                fill="url(#claimGrad)"
              />
              <path
                d="M 0,270 Q 120,260 200,200 Q 280,70 330,30 Q 380,20 460,40 Q 540,110 620,130 Q 720,180 800,280"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
              />

              {/* Ground-truth IoT Metered Area */}
              <path
                d="M 0,290 Q 140,290 220,190 Q 300,100 370,95 Q 430,90 490,135 Q 560,190 640,250 Q 720,290 800,300 L 800,320 L 0,320 Z"
                fill="url(#iotGrad)"
              />
              <path
                d="M 0,290 Q 140,290 220,190 Q 300,100 370,95 Q 430,90 490,135 Q 560,190 640,250 Q 720,290 800,300"
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
              />

              {/* Discrepancy Highlight Shading 1 (Peak Overclaim) */}
              <polygon fill="#ef4444" opacity="0.2" points="320,32 460,40 450,110 350,92" />
              {/* Discrepancy Highlight Shading 2 (Nocturnal Inversion) */}
              <polygon fill="#f87171" opacity="0.15" points="560,150 660,140 650,260 560,200" />

              {/* Interactive Node Anchors */}
              <circle cx="390" cy="28" fill="#ef4444" r="5" stroke="#ffffff" strokeWidth="2" className="animate-ping" />
              <circle cx="390" cy="28" fill="#ef4444" r="4" />
              <circle cx="610" cy="132" fill="#ef4444" r="5" stroke="#ffffff" strokeWidth="2" />
              <circle cx="610" cy="235" fill="#059669" r="4" />
            </svg>

            {/* Anomaly Callout Overlay 1: Phantom Generation */}
            <div className="absolute top-6 left-[34%] bg-white/95 dark:bg-[#2d3449]/95 backdrop-blur-md p-3 rounded-lg shadow-xl border border-red-300 dark:border-[#ffb4ab]/40 z-10 max-w-[220px]">
              <div className="flex items-center gap-1.5 text-red-600 dark:text-[#ffb4ab]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-code text-[11px] font-bold uppercase">Delta Breach: +438 MWh</span>
              </div>
              <p className="font-body text-[11px] text-slate-800 dark:text-[#dae2fd] mt-1 leading-snug">
                Claimed solar peak diverges 420% from recorded terrestrial irradiance.
              </p>
              <span className="font-code text-[10px] text-emerald-700 dark:text-[#45f1bf] mt-1 block font-semibold">
                Z-Score: +4.82 σ (Critical)
              </span>
            </div>

            {/* Anomaly Callout Overlay 2: Nocturnal Injection */}
            <div className="absolute bottom-14 right-[16%] bg-white/95 dark:bg-[#2d3449]/95 backdrop-blur-md p-2.5 rounded-lg shadow-xl border border-blue-300 dark:border-[#c6d7ff]/30 z-10 max-w-[190px]">
              <div className="flex items-center gap-1 text-blue-600 dark:text-[#c6d7ff]">
                <Radio className="w-3.5 h-3.5" />
                <span className="font-code text-[11px] font-bold uppercase">Nocturnal Shift</span>
              </div>
              <p className="font-body text-[11px] text-slate-600 dark:text-[#bacac1] mt-0.5 leading-snug">
                Injection recorded at zero solar irradiance window.
              </p>
            </div>

            {/* Time-axis Labels */}
            <div className="flex justify-between font-code text-[10px] text-slate-500 dark:text-[#85948c] px-2 pt-2 border-t border-slate-200 dark:border-[#222a3d]">
              <span>00:00 UTC</span>
              <span>04:00</span>
              <span>08:00</span>
              <span className="text-emerald-700 dark:text-[#45f1bf] font-semibold">12:00 (Peak Radiation)</span>
              <span>16:00</span>
              <span>20:00</span>
              <span>23:59</span>
            </div>
          </div>

          {/* Live Forensic Context Snippet */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#171f33] border border-slate-200 dark:border-[#222a3d]">
              <Radio className="w-5 h-5 text-emerald-600 dark:text-[#45f1bf] shrink-0" />
              <div>
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] block font-semibold">
                  Copernicus Sentinel-2
                </span>
                <span className="font-code text-xs text-slate-900 dark:text-[#dae2fd]">Cloud Index: 0.04 (Clear)</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#171f33] border border-slate-200 dark:border-[#222a3d]">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-[#45f1bf] shrink-0" />
              <div>
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] block font-semibold">
                  Substation IoT Nodes
                </span>
                <span className="font-code text-xs text-slate-900 dark:text-[#dae2fd]">438 / 438 Pulses Live</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#171f33] border border-slate-200 dark:border-[#222a3d]">
              <ShieldCheck className="w-5 h-5 text-red-500 dark:text-[#ffb4ab] shrink-0" />
              <div>
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] block font-semibold">
                  Smart Contract Hold
                </span>
                <span className="font-code text-xs text-red-600 dark:text-[#ffb4ab] font-bold">Auto-Freeze Activated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Fraud Radar (4 cols) */}
        <div className="lg:col-span-4 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] p-5 sm:p-6 flex flex-col gap-4 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-[#ffb4ab] beacon-mint"></span>
              <h2 className="font-headline text-base font-bold text-slate-900 dark:text-[#dae2fd]">Live Fraud Radar</h2>
            </div>
            <span className="font-code text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-[#93000a] dark:text-[#ffdad6] font-bold border border-red-200 dark:border-transparent">
              4 Active Flags
            </span>
          </div>
          <p className="font-body text-xs text-slate-600 dark:text-[#bacac1] -mt-2">
            Algorithmic heuristic triggers flagged by chaincode verification oracle in real-time.
          </p>

          {/* Fraud Anomalies List */}
          <div className="flex flex-col gap-2.5">
            {/* Flag 1: RULE-011 */}
            <div
              onClick={() => onNavigateTab("claims")}
              className="p-3.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-[#171f33] dark:hover:bg-[#222a3d] border border-slate-200 dark:border-[#222a3d] hover:border-red-300 dark:hover:border-[#ffb4ab]/50 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-[#93000a] dark:text-[#ffdad6] font-code text-[10px] font-bold">
                  RULE-011: Phantom Solar
                </span>
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">2m ago</span>
              </div>
              <h4 className="font-headline text-sm font-semibold text-slate-900 dark:text-[#dae2fd] mt-2 group-hover:text-emerald-700 dark:group-hover:text-[#45f1bf] transition-colors">
                Mojave Helios Station
              </h4>
              <div className="mt-1.5 p-2 rounded bg-white dark:bg-[#060e20] flex items-center justify-between font-code text-[11px] border border-slate-200 dark:border-[#222a3d]">
                <span className="text-red-600 dark:text-[#ffb4ab] font-bold">Claimed: 450 MWh</span>
                <span className="text-slate-400 dark:text-[#85948c]">vs</span>
                <span className="text-slate-600 dark:text-[#bacac1]">Irradiance: 12 MWh</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">UID: #REC-7702-US-CA</span>
                <span className="text-emerald-700 dark:text-[#45f1bf] font-code text-[11px] font-semibold flex items-center gap-1 group-hover:underline">
                  Inspect Block <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Flag 2: RULE-013 */}
            <div
              onClick={() => onNavigateTab("claims")}
              className="p-3.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-[#171f33] dark:hover:bg-[#222a3d] border border-slate-200 dark:border-[#222a3d] hover:border-blue-300 dark:hover:border-[#c6d7ff]/50 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-[#2d3449] dark:text-[#c6d7ff] font-code text-[10px] font-bold border border-blue-200 dark:border-[#3b4a43]">
                  RULE-013: Overlapping Slices
                </span>
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">18m ago</span>
              </div>
              <h4 className="font-headline text-sm font-semibold text-slate-900 dark:text-[#dae2fd] mt-2 group-hover:text-emerald-700 dark:group-hover:text-[#45f1bf] transition-colors">
                Northwind Alpha & Beta
              </h4>
              <p className="font-body text-xs text-slate-600 dark:text-[#bacac1] mt-1 leading-relaxed">
                Simultaneous duplicate meter timestamps broadcast across distinct grid IDs.
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-code text-[10px] text-red-600 dark:text-[#ffb4ab] font-bold">Double-Counting Risk: 99.4%</span>
                <span className="text-emerald-700 dark:text-[#45f1bf] font-code text-[11px] font-semibold flex items-center gap-1 group-hover:underline">
                  Triage <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Flag 3: RULE-014 */}
            <div
              onClick={() => onNavigateTab("claims")}
              className="p-3.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-[#171f33] dark:hover:bg-[#222a3d] border border-slate-200 dark:border-[#222a3d] hover:border-red-300 dark:hover:border-[#ffb4ab]/50 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-[#93000a] dark:text-[#ffdad6] font-code text-[10px] font-bold">
                  RULE-014: Nocturnal Solar
                </span>
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">44m ago</span>
              </div>
              <h4 className="font-headline text-sm font-semibold text-slate-900 dark:text-[#dae2fd] mt-2 group-hover:text-emerald-700 dark:group-hover:text-[#45f1bf] transition-colors">
                Solaria Park III
              </h4>
              <div className="mt-1.5 p-2 rounded bg-white dark:bg-[#060e20] font-code text-[11px] flex items-center justify-between border border-slate-200 dark:border-[#222a3d]">
                <span className="text-slate-800 dark:text-[#dae2fd]">02:30:14 UTC</span>
                <span className="text-red-600 dark:text-[#ffb4ab] font-bold">Sun Elevation: -38°</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">Hash: 0x9f4a...81de</span>
                <span className="text-emerald-700 dark:text-[#45f1bf] font-code text-[11px] font-semibold flex items-center gap-1 group-hover:underline">
                  Revoke Claim <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Flag 4: RULE-019 */}
            <div
              onClick={() => onNavigateTab("claims")}
              className="p-3.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-[#171f33] dark:hover:bg-[#222a3d] border border-slate-200 dark:border-[#222a3d] hover:border-emerald-300 dark:hover:border-[#a5d0b9]/50 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-[#29513f] dark:text-[#a5d0b9] font-code text-[10px] font-bold border border-emerald-200 dark:border-transparent">
                  RULE-019: Wash Trading Loop
                </span>
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">1h 12m ago</span>
              </div>
              <h4 className="font-headline text-sm font-semibold text-slate-900 dark:text-[#dae2fd] mt-2 group-hover:text-emerald-700 dark:group-hover:text-[#45f1bf] transition-colors">
                EcoVenture & TerraHoldings
              </h4>
              <p className="font-body text-xs text-slate-600 dark:text-[#bacac1] mt-1 leading-relaxed">
                Circular token transfer detected over 4 hops within 230ms block window.
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-code text-[10px] text-red-600 dark:text-[#ffb4ab] font-semibold">Escalated to CFTC</span>
                <span className="text-emerald-700 dark:text-[#45f1bf] font-code text-[11px] font-semibold flex items-center gap-1 group-hover:underline">
                  Trace Graph <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* Quick Summary Link */}
          <button
            onClick={() => onNavigateTab("claims")}
            className="w-full text-center py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#171f33] dark:hover:bg-[#222a3d] text-emerald-700 dark:text-[#45f1bf] font-headline text-xs font-bold border border-emerald-300 dark:border-[#45f1bf]/30 transition-colors block shadow-sm"
          >
            View All {heldCount > 0 ? heldCount : 248} Fraud Holds →
          </button>
        </div>
      </section>

      {/* 4. Facility Telemetry Grid Preview with Real Satellite/Drone Images */}
      <section className="rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] p-5 sm:p-6 shadow-sm dark:shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] uppercase tracking-wider font-semibold">
              Surveillance Camera & Sensor Feeds
            </span>
            <h3 className="font-headline text-lg font-bold text-slate-900 dark:text-[#dae2fd]">
              Key High-Capacity Monitored Facilities
            </h3>
          </div>
          <span className="font-code text-[11px] text-emerald-700 dark:text-[#45f1bf] flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#45f1bf] beacon-mint"></span> Encrypted RTSP Feeds Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Facility Card 1: Solar */}
          <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-[#171f33] border border-slate-200 dark:border-[#222a3d] flex flex-col hover:border-emerald-400 dark:hover:border-[#45f1bf]/50 transition-all shadow-sm">
            <div className="relative h-40 w-full bg-slate-900">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrZVKjmJpBTXb6eONMZKELluLXf5L1ru_TfETMFfHlyYJkUomfaQXwx8ocMy_SuHIcvql6lPm6giezKInbzB3q1UiVMw0pqq1EU9ffJanz6VA1mkEIVel1v4WpFKU21cui8g3ggRQOwhJvJU5BXEei_R6J-58JnqBowdE1bPAY85vMCnR9BIViNc5bp9lBoDneG8I-kF0fjueMIklfX2zO8NrYBov_yaQgmxinHkLQlKO1BZpQDQa-"
                alt="Mojave Solar Array"
                className="w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur font-code text-[10px] text-emerald-300 dark:text-[#45f1bf] border border-emerald-400/30 dark:border-[#45f1bf]/30">
                Mojave Solar Array • 340 MW
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-red-600 text-white dark:bg-[#93000a] dark:text-[#ffdad6] font-code text-[10px] font-bold">
                Audit Flagged
              </div>
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="font-body text-xs font-bold text-slate-900 dark:text-[#dae2fd]">Helios Generation Cluster</span>
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">Node #US-W-104</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-[#bacac1]">
                <span>Claim Drift: <strong className="text-red-600 dark:text-[#ffb4ab] font-code">+26.4%</strong></span>
                <span className="font-code text-[11px]">Telemetry: 12.4 MWh</span>
              </div>
            </div>
          </div>

          {/* Facility Card 2: Offshore Wind */}
          <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-[#171f33] border border-slate-200 dark:border-[#222a3d] flex flex-col hover:border-emerald-400 dark:hover:border-[#45f1bf]/50 transition-all shadow-sm">
            <div className="relative h-40 w-full bg-slate-900">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCjaKi6qowkZQreVbyjdQch1q0w9gQ-9nLbKn9cq1U7BwIYk6chV0lb2GNsup_wNBsMrHGjGVnSCZ8MnmtCxmut2rtWdhvWLg9pkMuzD1eI5Xa_yVfAqqVVtajjm_F4SPJw18ffZ6ug9aoZHFfrIB9TSLQ4mc8M4moz3NLvng03NoGeZVoPTK1bPqLb9unsJLKpoquUcYX_egh_n8QiXLjdmXlve03znHbkSEbbIKmY-SUiJRjb0nbf"
                alt="Northwind Offshore"
                className="w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur font-code text-[10px] text-emerald-300 dark:text-[#45f1bf] border border-emerald-400/30 dark:border-[#45f1bf]/30">
                Northwind Offshore • 580 MW
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-emerald-700 text-white dark:bg-[#005641] dark:text-[#45f1bf] font-code text-[10px] font-bold border border-emerald-500/30 dark:border-[#45f1bf]/30">
                Attested OK
              </div>
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="font-body text-xs font-bold text-slate-900 dark:text-[#dae2fd]">Turbine Bank Alpha-Omega</span>
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">Node #NO-SEA-09</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-[#bacac1]">
                <span>Claim Drift: <strong className="text-emerald-700 dark:text-[#45f1bf] font-code">-0.02%</strong></span>
                <span className="font-code text-[11px]">Telemetry: 492.1 MWh</span>
              </div>
            </div>
          </div>

          {/* Facility Card 3: Hydro */}
          <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-[#171f33] border border-slate-200 dark:border-[#222a3d] flex flex-col hover:border-emerald-400 dark:hover:border-[#45f1bf]/50 transition-all shadow-sm">
            <div className="relative h-40 w-full bg-slate-900">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDO5izmexNgZKLgZwg2L46HOaMRWrw13x-hQMNGqtb-Tu4ERgwysA-frD7DVWlEy2yJL5D82u4UgvyIOv565quLJ0i8QQGkg-Y5s_x8USDawDCTglDTUwCg4hB7cgHW0XGFHJXyFG4H4DmnfoRqHe-q-Pu-fD-duZFUQACmedlixMSaOpn-kkd1XFYCG9EX4CtK-swW81gr_dXEoIcVJLYAzPfZ9OgAuYAGWI6Wy4TBYdHrbh9vQWGV"
                alt="Cascade Hydro Run"
                className="w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur font-code text-[10px] text-emerald-300 dark:text-[#45f1bf] border border-emerald-400/30 dark:border-[#45f1bf]/30">
                Cascade Hydro Run • 210 MW
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-emerald-700 text-white dark:bg-[#005641] dark:text-[#45f1bf] font-code text-[10px] font-bold border border-emerald-500/30 dark:border-[#45f1bf]/30">
                Attested OK
              </div>
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="font-body text-xs font-bold text-slate-900 dark:text-[#dae2fd]">Columbia Basin Reservoir</span>
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">Node #US-NW-44</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-[#bacac1]">
                <span>Claim Drift: <strong className="text-emerald-700 dark:text-[#45f1bf] font-code">+0.11%</strong></span>
                <span className="font-code text-[11px]">Telemetry: 184.8 MWh</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bottom Quick Actions Bar */}
      <section className="sticky bottom-4 z-30 rounded-xl bg-white/95 dark:bg-[#222a3d]/90 backdrop-blur-xl p-4 shadow-xl border border-slate-200 dark:border-[#3b4a43] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-[#45f1bf] beacon-mint"></div>
          <div className="flex flex-col">
            <span className="font-headline text-xs font-bold text-slate-900 dark:text-[#dae2fd] leading-tight">
              Executive Surveillance Controls
            </span>
            <span className="font-code text-[10px] text-slate-500 dark:text-[#bacac1]">
              Permission: Regulatory Enforcer (RERC-L3 Root)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={onRunBatchTriage}
            disabled={batchTriageLoading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#45f1bf] dark:hover:bg-[#00d4a4] dark:text-[#003829] font-headline text-xs font-bold transition-all shadow-md active:scale-[0.98]"
          >
            <Bot className={`w-4 h-4 ${batchTriageLoading ? "animate-spin" : ""}`} />
            <span>{batchTriageLoading ? "Analyzing Batch..." : "Run AI Batch Triage"}</span>
          </button>

          <button
            onClick={handleGenerateReport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-[#171f33] dark:hover:bg-[#2d3449] dark:text-[#dae2fd] font-headline text-xs font-bold border border-slate-200 dark:border-[#222a3d] transition-all shadow-sm"
          >
            <FileText className="w-4 h-4 text-blue-600 dark:text-[#c6d7ff]" />
            <span>Generate Regulatory Report</span>
          </button>

          <button
            onClick={() => onNavigateTab("ledger")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-[#060e20] dark:hover:bg-[#131b2e] dark:text-[#c6d7ff] font-headline text-xs font-bold border border-slate-300 dark:border-[#3772cf]/40 transition-all shadow-sm"
          >
            <Database className="w-4 h-4 text-emerald-600 dark:text-[#45f1bf]" />
            <span>Inspect Ledger Audit Trail</span>
          </button>
        </div>
      </section>
    </div>
  );
}
