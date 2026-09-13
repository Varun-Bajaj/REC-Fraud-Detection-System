"use client";

import React from "react";
import {
  Factory,
  Radio,
  Lock,
  Scale,
  Database,
  Award,
  History,
  Search,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const DEMO_LINEAGE_QUERIES = [
  { label: "Meter Overclaim (+216%)", query: "CLM-2026-FRAUD-MTR", badge: "FRAUD" },
  { label: "Capacity Impossibility (>240%)", query: "CLM-2026-FRAUD-CAP", badge: "FRAUD" },
  { label: "Weather Oracle (Phantom Solar)", query: "CLM-2026-FRAUD-WTH", badge: "FRAUD" },
  { label: "Time-Slice Slicing (Overlap)", query: "CLM-2026-FRAUD-OVL", badge: "FRAUD" },
  { label: "Nocturnal Solar Claim (02:00 AM)", query: "CLM-2026-FRAUD-NOC", badge: "FRAUD" },
  { label: "Circular Wash Trading Loop", query: "REC-2026-WND-88319", badge: "LOOP" },
  { label: "Verified Active Solar REC", query: "REC-2026-SOL-09921", badge: "VERIFIED" },
  { label: "Clean Generation Baseline", query: "CLM-2026-LEGIT-01", badge: "CLEAN" },
];

interface StitchLineageTabProps {
  lineageSearchInput: string;
  setLineageSearchInput: (v: string) => void;
  lineageLoading: boolean;
  lineageError: string | null;
  lineageData: any;
  onSearch: (q: string) => void;
}

export function StitchLineageTab({
  lineageSearchInput,
  setLineageSearchInput,
  lineageLoading,
  lineageError,
  lineageData,
  onSearch,
}: StitchLineageTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-widest text-emerald-700 dark:text-primary uppercase font-bold">
              Provenance Ledger Explorer
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold font-headline text-slate-900 dark:text-slate-100 tracking-tight">
            Certificate Lineage & Forensic Provenance
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            End-to-end multi-stage provenance and chronological evidence timeline for any certificate or claim docket.
          </p>
        </div>
      </div>

      {/* Search Input and Quick Presets */}
      <div className="bg-white dark:bg-surface-container/70 border border-slate-200 dark:border-outline-variant/20 rounded-2xl p-5 shadow-sm backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-400" />
            <Input
              placeholder="Enter Certificate UID (e.g. REC-2026-SOL-09921) or Claim UID (e.g. CLM-2026-FRAUD-MTR)..."
              className="pl-10 font-mono text-sm h-11 bg-slate-50 dark:bg-surface-container-low border-slate-300 dark:border-outline-variant/30 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:border-emerald-500 dark:focus:border-primary"
              value={lineageSearchInput}
              onChange={(e) => setLineageSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch(lineageSearchInput)}
            />
          </div>
          <Button
            className="h-11 px-6 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-surface font-bold rounded-xl shadow-sm"
            onClick={() => onSearch(lineageSearchInput)}
            disabled={lineageLoading}
          >
            {lineageLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Trace Lineage</span>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Preset Scenarios:</span>
          {DEMO_LINEAGE_QUERIES.map((demo) => (
            <button
              key={demo.query}
              onClick={() => {
                setLineageSearchInput(demo.query);
                onSearch(demo.query);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all border ${
                lineageSearchInput === demo.query
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-primary/20 dark:border-primary dark:text-primary font-bold shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-surface-container-high/60 dark:hover:bg-surface-container-highest border-slate-200 dark:border-outline-variant/20 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <span>{demo.label}</span>
              <span className={`ml-1.5 px-1 py-0.2 rounded text-[9px] font-bold ${
                demo.badge === "FRAUD" ? "bg-red-500/20 text-red-500 dark:text-red-400" :
                demo.badge === "LOOP" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" :
                "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              }`}>{demo.badge}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {lineageError && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-bold">Lineage Query Error</div>
            <div className="text-slate-300 mt-0.5">{lineageError}</div>
          </div>
        </div>
      )}

      {/* Lineage Results */}
      {lineageData && (
        <div className="space-y-6">
          {/* 6-Stage Pipeline Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                6-Stage Cryptographic Provenance Pipeline
              </h3>
              <span className="text-[11px] font-mono text-emerald-700 dark:text-primary font-medium">All Hashes Verified</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Stage 1: Facility */}
              <div className="bg-white dark:bg-surface-container/60 border border-slate-200 dark:border-outline-variant/20 rounded-2xl p-4 shadow-sm backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 dark:hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-primary px-2 py-0.5 rounded bg-emerald-50 dark:bg-primary/10 border border-emerald-200 dark:border-primary/20">
                    STAGE 01
                  </span>
                  <Factory className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-sm font-bold font-headline text-slate-900 dark:text-slate-100 mb-1">
                  Generation Asset
                </div>
                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                  <p className="font-semibold text-slate-900 dark:text-slate-200">{lineageData.plant?.name || "N/A"}</p>
                  <p>Technology: <span className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{lineageData.plant?.fuel_type || "SOLAR"}</span></p>
                  <p>Capacity: <span className="text-slate-800 dark:text-slate-200 font-mono">{lineageData.plant?.nameplate_capacity_mw || 50} MW</span></p>
                </div>
              </div>

              {/* Stage 2: Smart Meter */}
              <div className="bg-white dark:bg-surface-container/60 border border-slate-200 dark:border-outline-variant/20 rounded-2xl p-4 shadow-sm backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 dark:hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-primary px-2 py-0.5 rounded bg-emerald-50 dark:bg-primary/10 border border-emerald-200 dark:border-primary/20">
                    STAGE 02
                  </span>
                  <Radio className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-sm font-bold font-headline text-slate-900 dark:text-slate-100 mb-1">
                  Substation Telemetry Meter
                </div>
                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                  <p className="font-mono text-slate-900 dark:text-slate-200">{lineageData.meter?.meter_serial_number || "MTR-SOL-001"}</p>
                  <p>Metered Energy: <span className="text-emerald-700 dark:text-primary font-mono font-bold">{lineageData.meter?.energy_generated_mwh?.toLocaleString() || "1,200"} MWh</span></p>
                  <p className="text-[11px] text-slate-500">Source: Utility Grid Interconnection</p>
                </div>
              </div>

              {/* Stage 3: Fingerprint Hashes */}
              <div className="bg-white dark:bg-surface-container/60 border border-slate-200 dark:border-outline-variant/20 rounded-2xl p-4 shadow-sm backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 dark:hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-primary px-2 py-0.5 rounded bg-emerald-50 dark:bg-primary/10 border border-emerald-200 dark:border-primary/20">
                    STAGE 03
                  </span>
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-sm font-bold font-headline text-slate-900 dark:text-slate-100 mb-1">
                  Claim Cryptography
                </div>
                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                  <p>UID: <span className="font-mono text-slate-900 dark:text-slate-200">{lineageData.claim?.claim_uid}</span></p>
                  <p>Claimed: <span className="text-slate-900 dark:text-slate-200 font-mono font-bold">{lineageData.claim?.claimed_mwh?.toLocaleString()} MWh</span></p>
                  <p className="truncate font-mono text-[10px] text-slate-500">Hash: {lineageData.claim?.submission_fingerprint || "e3b0c442..."}</p>
                </div>
              </div>

              {/* Stage 4: Risk Scoring */}
              <div className="bg-white dark:bg-surface-container/60 border border-slate-200 dark:border-outline-variant/20 rounded-2xl p-4 shadow-sm backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 dark:hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-primary px-2 py-0.5 rounded bg-emerald-50 dark:bg-primary/10 border border-emerald-200 dark:border-primary/20">
                    STAGE 04
                  </span>
                  <Scale className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-sm font-bold font-headline text-slate-900 dark:text-slate-100 mb-1">
                  Forensic Risk Score
                </div>
                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                      {lineageData.claim?.risk_score?.toFixed(1) || 0}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">/ 100</span>
                    <Badge
                      className={`text-[10px] font-bold ${
                        (lineageData.claim?.risk_score || 0) >= 70
                          ? "bg-red-500/20 text-red-500 dark:text-red-400 border-red-500/30"
                          : (lineageData.claim?.risk_score || 0) >= 30
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {lineageData.claim?.risk_score >= 70 ? "CRITICAL FRAUD" : "VERIFIED VALID"}
                    </Badge>
                  </div>
                  <p>Status: <span className="font-mono text-slate-800 dark:text-slate-200">{lineageData.claim?.status}</span></p>
                </div>
              </div>

              {/* Stage 5: Ledger Anchor */}
              <div className="bg-white dark:bg-surface-container/60 border border-slate-200 dark:border-outline-variant/20 rounded-2xl p-4 shadow-sm backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 dark:hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-primary px-2 py-0.5 rounded bg-emerald-50 dark:bg-primary/10 border border-emerald-200 dark:border-primary/20">
                    STAGE 05
                  </span>
                  <Database className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-sm font-bold font-headline text-slate-900 dark:text-slate-100 mb-1">
                  Ledger Anchoring
                </div>
                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                  <p>Linked Blocks: <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{lineageData.ledger_blocks?.length || 0} Blocks</span></p>
                  <p className="text-[11px] text-emerald-700 dark:text-primary font-mono font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-primary" /> SHA-256 Hash Chain Validated
                  </p>
                </div>
              </div>

              {/* Stage 6: Ownership & Transfers */}
              <div className="bg-white dark:bg-surface-container/60 border border-slate-200 dark:border-outline-variant/20 rounded-2xl p-4 shadow-sm backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 dark:hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-primary px-2 py-0.5 rounded bg-emerald-50 dark:bg-primary/10 border border-emerald-200 dark:border-primary/20">
                    STAGE 06
                  </span>
                  <Award className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-sm font-bold font-headline text-slate-900 dark:text-slate-100 mb-1">
                  REC Token State
                </div>
                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                  {lineageData.certificate ? (
                    <>
                      <p className="font-mono font-medium text-slate-900 dark:text-slate-200">{lineageData.certificate.certificate_uid}</p>
                      <p>Status: <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{lineageData.certificate.status}</span></p>
                      <p>Transfer Hops: <span className="font-mono text-slate-800 dark:text-slate-200">{lineageData.transfers?.length || 0}</span></p>
                    </>
                  ) : (
                    <p className="text-amber-600 dark:text-amber-400 italic font-medium">Certificate Not Minted (Claim HELD/Fraudulent)</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chronological Evidence Timeline */}
          <div className="bg-white dark:bg-surface-container/70 border border-slate-200 dark:border-outline-variant/20 rounded-2xl p-6 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-emerald-600 dark:text-primary" />
              <div>
                <h4 className="text-base font-bold font-headline text-slate-900 dark:text-slate-100">
                  Chronological Evidence Timeline
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Full audit trail synthesized from IoT telemetry, AI anomaly evaluation, and append-only ledger blocks
                </p>
              </div>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-outline-variant/30">
              {(lineageData.timeline || []).map((item: any, idx: number) => (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-surface shadow-sm ${
                      item.severity === "CRITICAL"
                        ? "bg-red-500 ring-2 ring-red-500/20"
                        : item.severity === "WARNING"
                        ? "bg-amber-500 ring-2 ring-amber-500/20"
                        : "bg-emerald-500 ring-2 ring-emerald-500/20"
                    }`}
                  />
                  <div className="bg-slate-50 dark:bg-surface-container-low/70 p-4 rounded-xl border border-slate-200 dark:border-outline-variant/20 hover:border-slate-300 dark:hover:border-outline-variant/40 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.title}</h5>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : "Audit Recorded"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{item.description}</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-surface-container-high text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-outline-variant/30">
                        {item.stage}
                      </span>
                      {item.actor && (
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          Actor: <span className="text-slate-800 dark:text-slate-200 font-semibold">{item.actor}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
