"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
  RotateCw,
  Calendar,
  ChevronRight,
  Gavel,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Check,
  Copy,
  ExternalLink,
  X,
  Radio,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Claim, Plant } from "@/types";

interface StitchClaimsTabProps {
  claims: Claim[];
  plants: Plant[];
  onOpenSubmitModal: () => void;
  onSelectClaimForInspection: (claim: Claim) => void;
  onAdjudicateClaim: (claim: Claim) => void;
}

export function StitchClaimsTab({
  claims,
  plants,
  onOpenSubmitModal,
  onSelectClaimForInspection,
  onAdjudicateClaim,
}: StitchClaimsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(claims[0] || null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Filtered claims
  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      claim.claim_uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plants.find((p) => p.id === claim.plant_id)?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      claim.status === statusFilter ||
      (statusFilter === "HELD" && (claim.status === "HELD" || claim.status === "REJECTED"));

    const matchesRisk =
      riskFilter === "ALL" ||
      (riskFilter === "HIGH" && claim.risk_score >= 70) ||
      (riskFilter === "MED" && claim.risk_score >= 30 && claim.risk_score < 70) ||
      (riskFilter === "LOW" && claim.risk_score < 30);

    return matchesSearch && matchesStatus && matchesRisk;
  });

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 1500);
  };

  const getPlantName = (plantId: number) => {
    return plants.find((p) => p.id === plantId)?.name || `Facility #${plantId}`;
  };

  // Active claim calculation
  const activeClaim = selectedClaim || (filteredClaims.length > 0 ? filteredClaims[0] : null);
  const meteredVal = activeClaim ? activeClaim.claimed_mwh * 0.45 : 100;
  const deltaPct = activeClaim ? (((activeClaim.claimed_mwh - meteredVal) / meteredVal) * 100).toFixed(1) : "216.0";

  return (
    <div className="flex flex-col w-full gap-6">
      {/* 1. Dynamic Forensic Hero Summary Banner */}
      <section className="relative w-full rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] overflow-hidden shadow-sm p-6">
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-emerald-500/10 dark:bg-[#45f1bf]/10 blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 -bottom-24 w-80 h-80 rounded-full bg-rose-500/10 dark:bg-[#ffb4ab]/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col gap-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-[#171f33] font-code text-[10px] text-emerald-700 dark:text-[#45f1bf] uppercase tracking-wider border border-emerald-200 dark:border-[#45f1bf]/20 font-semibold">
                Protocol Guardian v2.4
              </span>
              <span className="text-slate-400 dark:text-[#85948c] text-xs">/</span>
              <span className="font-code text-xs text-slate-600 dark:text-[#bacac1] flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-[#ffb4ab] beacon-mint"></span>
                7 Anomalies Quarantined
              </span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#dae2fd] tracking-tight mt-1">
              Issuance Triage & Forensic Audit
            </h1>
            <p className="font-body text-xs sm:text-sm text-slate-600 dark:text-[#bacac1] leading-relaxed">
              Real-time discrepancy detection engine comparing smart telemetry feeds against claimed Renewable Energy Certificate (REC) issuance batches.
            </p>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/90 dark:bg-[#060e20]/80 p-2.5 rounded-xl border border-slate-200 dark:border-[#222a3d] backdrop-blur-md">
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] flex flex-col">
              <span className="font-code text-[10px] uppercase text-slate-500 dark:text-[#85948c] font-semibold">Evaluated Batch</span>
              <span className="font-headline text-base font-bold text-slate-900 dark:text-[#dae2fd]">1,482 MWh</span>
              <span className="font-code text-[10px] text-emerald-600 dark:text-[#45f1bf] flex items-center gap-0.5 font-semibold">
                ↑ 94.2% Auto-pass
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] flex flex-col">
              <span className="font-code text-[10px] uppercase text-slate-500 dark:text-[#85948c] font-semibold">Held Capital</span>
              <span className="font-headline text-base font-bold text-rose-600 dark:text-[#ffb4ab]">412.5 MWh</span>
              <span className="font-code text-[10px] text-rose-600 dark:text-[#ffb4ab] flex items-center gap-0.5 font-semibold">
                3 Outright Frauds
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] flex flex-col">
              <span className="font-code text-[10px] uppercase text-slate-500 dark:text-[#85948c] font-semibold">In Review</span>
              <span className="font-headline text-base font-bold text-blue-600 dark:text-[#c6d7ff]">189.0 MWh</span>
              <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">Telemetry sync</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] flex flex-col">
              <span className="font-code text-[10px] uppercase text-slate-500 dark:text-[#85948c] font-semibold">ZK-Proof Drift</span>
              <span className="font-headline text-base font-bold text-emerald-600 dark:text-[#45f1bf]">0.003%</span>
              <span className="font-code text-[10px] text-emerald-600 dark:text-[#45f1bf] font-medium">Within tolerance</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Top Filter & Action Bar */}
      <section className="w-full bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-slate-200 dark:border-[#222a3d] shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#85948c] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter Claim UID, Station, or Hash..."
              className="w-full bg-slate-50 dark:bg-[#171f33] text-slate-900 dark:text-[#dae2fd] placeholder:text-slate-400 dark:placeholder:text-[#85948c] font-code text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-[#222a3d] focus:outline-none focus:border-emerald-500 dark:focus:border-[#45f1bf]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-[#171f33] text-slate-900 dark:text-[#dae2fd] font-body text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-[#222a3d] focus:outline-none focus:border-emerald-500 dark:focus:border-[#45f1bf] cursor-pointer"
          >
            <option value="ALL">All Issuance Statuses</option>
            <option value="HELD">Held (Flagged Violations)</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
          </select>

          {/* Risk Tier Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-slate-50 dark:bg-[#171f33] text-slate-900 dark:text-[#dae2fd] font-body text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-[#222a3d] focus:outline-none focus:border-emerald-500 dark:focus:border-[#45f1bf] cursor-pointer"
          >
            <option value="ALL">All AI Risk Tiers</option>
            <option value="HIGH">High Risk (&gt; 70 AI Score)</option>
            <option value="MED">Medium Risk (30 - 69)</option>
            <option value="LOW">Low Risk (&lt; 30 AI Score)</option>
          </select>
        </div>

        {/* Action Button */}
        <button
          onClick={onOpenSubmitModal}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#45f1bf] dark:hover:bg-[#00d4a4] dark:text-[#003829] font-headline text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all shrink-0 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 text-white dark:text-[#003829]" />
          <span>Submit Generation Claim</span>
        </button>
      </section>

      {/* 3. Main Content Layout: Triage Table with Slide-In Forensic Evidence Drawer */}
      <div className="relative flex flex-col xl:flex-row items-start gap-6 w-full">
        {/* Table Container */}
        <div className="w-full xl:flex-1 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 dark:bg-[#171f33] border-b border-slate-200 dark:border-[#222a3d] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-headline text-sm font-bold text-slate-900 dark:text-[#dae2fd]">
                Telemetry Ingestion Queue
              </span>
              <span className="font-code text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-[#222a3d] text-slate-700 dark:text-[#bacac1] border border-slate-300 dark:border-[#3b4a43] font-medium">
                Live Cross-Verification
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#85948c] font-code text-xs">
              <span>Showing {filteredClaims.length} records</span>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-[#060e20]/70 text-slate-500 dark:text-[#85948c] uppercase font-code text-[10px] tracking-wider border-b border-slate-200 dark:border-[#222a3d]">
                  <th className="py-3 px-4">Claim UID</th>
                  <th className="py-3 px-4">Facility Name</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Claimed</th>
                  <th className="py-3 px-4 text-right">Delta</th>
                  <th className="py-3 px-4 min-w-[130px]">AI Risk Score</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#222a3d]/60 font-body text-xs">
                {filteredClaims.map((claim) => {
                  const isSelected = activeClaim?.id === claim.id;
                  const isCritical = claim.risk_score >= 70;
                  const isApproved = claim.status === "APPROVED";
                  return (
                    <tr
                      key={claim.id}
                      onClick={() => setSelectedClaim(claim)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-emerald-50/70 dark:bg-[#171f33] border-l-2 border-l-emerald-600 dark:border-l-[#45f1bf]"
                          : "hover:bg-slate-50 dark:hover:bg-[#171f33]/60 bg-white dark:bg-[#131b2e]"
                      }`}
                    >
                      <td className="py-3.5 px-4 font-code text-xs font-semibold text-emerald-700 dark:text-[#45f1bf]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCritical ? "bg-rose-500 dark:bg-[#ffb4ab] animate-pulse" : isApproved ? "bg-emerald-500 dark:bg-[#45f1bf]" : "bg-blue-500 dark:bg-[#c6d7ff]"
                            }`}
                          ></span>
                          <span>{claim.claim_uid}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-body text-xs text-slate-900 dark:text-[#dae2fd]">
                        <div className="flex flex-col">
                          <span className="font-semibold">{getPlantName(claim.plant_id)}</span>
                          <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">Node #US-GRID-{claim.plant_id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-code text-[11px] text-slate-600 dark:text-[#bacac1] whitespace-nowrap">
                        {claim.period_start ? claim.period_start.substring(0, 10) : "2026-10-23"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-code text-xs font-semibold text-slate-900 dark:text-[#dae2fd]">
                        {claim.claimed_mwh.toLocaleString()} MWh
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-code text-xs font-bold px-1.5 py-0.5 rounded ${
                            isCritical
                              ? "text-rose-700 bg-rose-100 dark:text-[#ffb4ab] dark:bg-[#93000a]/40"
                              : isApproved
                              ? "text-emerald-700 bg-emerald-100 dark:text-[#45f1bf] dark:bg-[#005641]/30"
                              : "text-blue-700 bg-blue-100 dark:text-[#c6d7ff] dark:bg-[#222a3d]"
                          }`}
                        >
                          {isCritical ? "+216.0%" : isApproved ? "-0.8%" : "+4.2%"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 dark:bg-[#2d3449] h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isCritical ? "bg-rose-500 dark:bg-[#ffb4ab]" : claim.risk_score >= 30 ? "bg-blue-500 dark:bg-[#c6d7ff]" : "bg-emerald-500 dark:bg-[#45f1bf]"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(8, claim.risk_score))}%` }}
                            ></div>
                          </div>
                          <span
                            className={`font-code text-xs font-bold ${
                              isCritical ? "text-rose-600 dark:text-[#ffb4ab]" : "text-slate-800 dark:text-[#dae2fd]"
                            }`}
                          >
                            {claim.risk_score.toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-code text-[10px] font-bold uppercase ${
                            claim.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#005641] dark:text-[#45f1bf] dark:border-[#45f1bf]/30"
                              : isCritical
                              ? "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-[#93000a] dark:text-[#ffdad6] dark:border-[#ffb4ab]/30"
                              : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#29513f] dark:text-[#a5d0b9]"
                          }`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectClaimForInspection(claim)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 border border-slate-200 dark:border-transparent dark:bg-[#222a3d] dark:text-[#45f1bf] dark:hover:bg-[#45f1bf] dark:hover:text-[#003829] font-code text-xs transition-colors"
                          >
                            Inspect
                          </button>
                          {claim.status !== "APPROVED" && (
                            <button
                              onClick={() => onAdjudicateClaim(claim)}
                              className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white dark:bg-[#93000a]/40 dark:text-[#ffb4ab] dark:hover:bg-[#93000a] dark:hover:text-white font-code text-xs transition-colors border border-rose-200 dark:border-[#93000a]/60"
                            >
                              Adjudicate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slide-In Forensic Evidence Dossier Drawer (420px on XL) */}
        {activeClaim && (
          <aside className="w-full xl:w-[420px] bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-xl shadow-lg flex flex-col overflow-hidden shrink-0">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-50 dark:bg-[#171f33] border-b border-slate-200 dark:border-[#222a3d] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-rose-600 dark:text-[#ffb4ab]" />
                <div className="flex flex-col">
                  <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] uppercase font-semibold">
                    Forensic Audit Dossier
                  </span>
                  <span className="font-headline text-sm font-bold text-slate-900 dark:text-[#dae2fd]">
                    {activeClaim.claim_uid}
                  </span>
                </div>
              </div>
              <span
                className={`font-code text-[10px] px-2 py-0.5 rounded font-bold ${
                  activeClaim.risk_score >= 70
                    ? "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-[#93000a] dark:text-[#ffdad6]"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#005641] dark:text-[#45f1bf]"
                }`}
              >
                {activeClaim.risk_score >= 70 ? "CRITICAL FLAG" : "AUDIT PASS"}
              </span>
            </div>

            {/* Drawer Content */}
            <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[800px]">
              {/* Primary Discrepancy Hero Callout */}
              <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-[#060e20] border border-rose-200 dark:border-[#222a3d] flex flex-col gap-1 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] uppercase font-semibold">
                    Discrepancy Delta
                  </span>
                  <span className="font-code text-[10px] text-rose-700 bg-rose-100 dark:text-[#ffb4ab] dark:bg-[#93000a]/40 px-1.5 py-0.5 rounded font-bold border border-rose-200 dark:border-[#93000a]">
                    Severe Mismatch
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline text-2xl sm:text-3xl font-bold text-rose-600 dark:text-[#ffb4ab] leading-none">
                    +{deltaPct}%
                  </span>
                  <span className="font-body text-xs text-slate-600 dark:text-[#bacac1]">over verified meter ground truth</span>
                </div>
                <p className="font-body text-xs text-slate-600 dark:text-[#bacac1] pt-1 leading-relaxed">
                  Claimant reported generation volume of <strong className="text-slate-900 dark:text-[#dae2fd]">{activeClaim.claimed_mwh} MWh</strong>, while hardware telemetry confirms physically metered injection capped at <strong className="text-slate-900 dark:text-[#dae2fd]">{meteredVal.toFixed(2)} MWh</strong>.
                </p>
              </div>

              {/* Triggered Consensus Rules */}
              <div className="flex flex-col gap-1.5">
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] uppercase tracking-wider font-semibold">
                  Triggered Consensus Rules
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-100 border border-rose-300 text-rose-800 dark:bg-[#93000a]/40 dark:border-[#93000a] dark:text-[#ffb4ab] font-code text-[10px] font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    RULE-011: Phantom Generation
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-100 border border-rose-300 text-rose-800 dark:bg-[#93000a]/40 dark:border-[#93000a] dark:text-[#ffb4ab] font-code text-[10px] font-bold">
                    <Radio className="w-3 h-3" />
                    RULE-004: Inverter Incongruence
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 dark:bg-[#222a3d] dark:text-[#c6d7ff] font-code text-[10px] dark:border-[#3b4a43]">
                    IR-Solar Lux Anomaly
                  </span>
                </div>
              </div>

              {/* Telemetry vs Invoiced Comparison Graph */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171f33] border border-slate-200 dark:border-[#222a3d] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] uppercase font-semibold">
                    Telemetry vs Invoiced Feed (MWh)
                  </span>
                  <div className="flex items-center gap-2 font-code text-[10px]">
                    <span className="flex items-center gap-1 text-rose-600 dark:text-[#ffb4ab] font-medium">
                      <span className="w-2 h-1 bg-rose-600 dark:bg-[#ffb4ab] rounded"></span> Claimed
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-[#45f1bf] font-medium">
                      <span className="w-2 h-1 bg-emerald-600 dark:bg-[#45f1bf] rounded"></span> Metered
                    </span>
                  </div>
                </div>

                {/* Inline Comparison Chart */}
                <div className="relative w-full h-28 pt-2">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 380 120">
                    <defs>
                      <linearGradient id="claimGlow" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#e11d48" stopOpacity="0.25"></stop>
                        <stop offset="100%" stopColor="#e11d48" stopOpacity="0"></stop>
                      </linearGradient>
                      <linearGradient id="meterGlow" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity="0.3"></stop>
                        <stop offset="100%" stopColor="#059669" stopOpacity="0"></stop>
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 95 Q 80 80, 140 20 T 260 15 Q 320 30, 380 90 L 380 115 L 0 115 Z"
                      fill="url(#claimGlow)"
                    />
                    <path
                      d="M 0 95 Q 80 80, 140 20 T 260 15 Q 320 30, 380 90"
                      fill="none"
                      stroke="#e11d48"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 0 105 Q 90 100, 160 85 T 280 82 Q 330 92, 380 108 L 380 115 L 0 115 Z"
                      fill="url(#meterGlow)"
                    />
                    <path
                      d="M 0 105 Q 90 100, 160 85 T 280 82 Q 330 92, 380 108"
                      fill="none"
                      stroke="#059669"
                      strokeWidth="2.5"
                    />
                    <circle cx="210" cy="18" fill="#e11d48" r="4" className="animate-ping" />
                    <circle cx="210" cy="18" fill="#e11d48" r="4" />
                    <circle cx="210" cy="83" fill="#059669" r="4" />
                    <line stroke="#e11d48" strokeDasharray="2 2" strokeWidth="1.5" x1="210" x2="210" y1="18" y2="83" />
                  </svg>
                </div>
                <div className="flex justify-between font-code text-[10px] text-slate-500 dark:text-[#85948c] pt-1">
                  <span>11:00 UTC</span>
                  <span>12:00</span>
                  <span className="text-rose-600 dark:text-[#ffb4ab] font-bold">13:00 (Apex Anomaly)</span>
                  <span>14:00</span>
                  <span>15:00</span>
                </div>
              </div>

              {/* Cryptographic Document Fingerprint */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#171f33] border border-slate-200 dark:border-[#222a3d] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] uppercase font-semibold">
                    ZK-Payload Digest
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#005641] dark:text-[#45f1bf] font-code text-[10px] font-semibold flex items-center gap-1 dark:border-[#45f1bf]/30">
                    <Check className="w-3 h-3" />
                    Verified On Chain
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white dark:bg-[#060e20] p-2.5 rounded-lg border border-slate-200 dark:border-[#222a3d] font-code text-[11px] text-slate-900 dark:text-[#dae2fd]">
                  <span className="truncate pr-2 select-all">
                    sha256:0x4f8a29e917d092bb450cf318182937ad92c81726a...c712
                  </span>
                  <button
                    onClick={() => handleCopyHash("0x4f8a29e917d092bb450cf318182937ad92c81726ac712")}
                    className="p-1 rounded text-slate-500 hover:text-emerald-600 dark:text-[#85948c] dark:hover:text-[#45f1bf] transition-colors shrink-0"
                    title="Copy SHA-256 Digest"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-[#bacac1] font-code text-[10px] pt-0.5">
                  <span>Smart Meter: NV-SOLAR-MTR-904</span>
                  <span className="text-emerald-700 dark:text-[#45f1bf] font-semibold">Chain Block #1,492,084</span>
                </div>
              </div>

              {/* Generator Asset Visual Inspection Snapshot */}
              <div className="relative rounded-xl overflow-hidden h-28 bg-slate-900 border border-slate-200 dark:border-[#222a3d] flex items-end p-2.5">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNd263-Ir-0qy_vQlJ2rpC4srAvQUiqOhD9MTBL0V32NDNoOzjgNRzdejAUwOrYFCsueHcyUKk5r6rwYseAOx2vjeLn_EQe72FV5LId6eTmYTIiaByfQclNDGMMz89snEgepJCabEMW3ErRPwuDknVIexv-3jKuI6ynQ5vL94opqvcZmS5YZjLKUea9C_VvMDaey4sSMToN1ZGobEpjFa3ERlDkme36ukkxHkdCGDd3bnriJgXz7hG"
                  alt="Satellite thermal telemetry overview"
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                />
                <div className="relative z-10 flex items-center justify-between w-full bg-slate-900/90 dark:bg-[#060e20]/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 dark:border-[#222a3d]">
                  <span className="font-code text-[10px] text-slate-100 dark:text-[#dae2fd]">
                    Sentinel-2 Irradiance: 0.28 kW/m²
                  </span>
                  <span className="font-code text-[10px] text-rose-300 dark:text-[#ffb4ab] font-bold">Cloud Cover Confirmed</span>
                </div>
              </div>

              {/* Action Control Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => onAdjudicateClaim(activeClaim)}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white dark:bg-[#ffb4ab] dark:text-[#690005] dark:hover:bg-[#ffdad6] py-2.5 rounded-lg font-headline text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Gavel className="w-4 h-4" />
                  <span>Refer to Judicial Adjudication</span>
                </button>
                <button
                  onClick={() => onSelectClaimForInspection(activeClaim)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-[#222a3d] dark:hover:bg-[#2d3449] dark:text-[#dae2fd] py-2 rounded-lg font-body text-xs transition-colors flex items-center justify-center gap-2 dark:border-[#3b4a43]"
                >
                  <FileSearch className="w-3.5 h-3.5 text-emerald-600 dark:text-[#45f1bf]" />
                  <span>Open Full Forensic Modal</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
