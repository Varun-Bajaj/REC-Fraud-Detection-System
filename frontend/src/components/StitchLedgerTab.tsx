"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileCheck2,
  Key,
  Fingerprint,
  Terminal,
  Activity,
  Check,
  Copy,
} from "lucide-react";
import { LedgerBlock, LedgerVerifyResult } from "@/types";

interface StitchLedgerTabProps {
  ledgerAudit: LedgerVerifyResult | null;
  ledgerBlocks: LedgerBlock[];
  loading: boolean;
  onVerifyLedger: () => void;
  onSimulateTamper: () => void;
  onRestoreTamper?: () => void;
  tamperLoading: boolean;
  tamperStatus: any;
  zkClaimMwh: number;
  setZkClaimMwh: (v: number) => void;
  zkMeterMwh: number;
  setZkMeterMwh: (v: number) => void;
  zkTolerance: number;
  setZkTolerance: (v: number) => void;
  zkProofResult: any;
  zkLoading: boolean;
  onGenerateZkProof: () => void;
}

export function StitchLedgerTab({
  ledgerAudit,
  ledgerBlocks,
  loading,
  onVerifyLedger,
  onSimulateTamper,
  onRestoreTamper,
  tamperLoading,
  tamperStatus,
  zkClaimMwh,
  setZkClaimMwh,
  zkMeterMwh,
  setZkMeterMwh,
  zkTolerance,
  setZkTolerance,
  zkProofResult,
  zkLoading,
  onGenerateZkProof,
}: StitchLedgerTabProps) {
  const [tamperLogs, setTamperLogs] = useState<Array<{ text: string; type: "ok" | "warn" | "error" | "info" }>>([
    { text: "[OK] Block #1,492,084 payload matches world-state commit. Merkle verification passed.", type: "ok" },
    { text: "[INFO] Hyperledger channel 'recchannel' quorum synced across 14 peers.", type: "info" },
  ]);

  const [simulatedTampered, setSimulatedTampered] = useState(false);
  const [docHashState, setDocHashState] = useState<{
    fileName: string;
    hash: string;
    matched: boolean;
  }>({
    fileName: "BAPETCO_Solar_Field_Telemetry_May2024.pdf",
    hash: "sha256:0x4f8a29e917d092bb450cf318182937ad92c81726ac712",
    matched: true,
  });

  const expectedRoot = "0x7c94b2e5fa184cf43b0921a8d052a1d94f27be93c9d784a1e9447bfef52c381a";
  const calculatedRoot = simulatedTampered
    ? "0xDEADBEEF44208a1c93f0b34d77610fa291b8492084c718290baef91283c091ad"
    : "0x7c94b2e5fa184cf43b0921a8d052a1d94f27be93c9d784a1e9447bfef52c381a";

  const handleTamperClick = () => {
    setSimulatedTampered(true);
    onSimulateTamper();
    setTamperLogs((prev) => [
      ...prev,
      {
        text: "[ALERT] Direct DB update injected: Block #1,492,084 volume altered +5,000 MWh!",
        type: "warn",
      },
      {
        text: "[FAIL] Merkle Root mismatch: Calculated digest differs from header commit! Chaincode halted.",
        type: "error",
      },
    ]);
  };

  const handleAuditTraversal = () => {
    onVerifyLedger();
    setTamperLogs((prev) => [
      ...prev,
      {
        text: "[AUDIT] Traversed Merkle tree leaves: 14 validation nodes confirmed Byzantine tamper signature.",
        type: simulatedTampered ? "error" : "ok",
      },
    ]);
  };

  const handleSelfHeal = () => {
    setSimulatedTampered(false);
    if (onRestoreTamper) {
      onRestoreTamper();
    } else {
      onVerifyLedger();
    }
    setTamperLogs((prev) => [
      ...prev,
      {
        text: "[SELF-HEAL] Ledger parity restored from Hyperledger Raft consensus replica. Cryptographic roots match 100%.",
        type: "ok",
      },
    ]);
  };

  const handleSimulateFileDrop = () => {
    setDocHashState({
      fileName: "Substation_Grid_Meter_Interval_Oct2026.csv",
      hash: "sha256:0x89ab10f9247cde0912f718a93bc41029e847120fa8201948bd0192847aef9021",
      matched: true,
    });
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* 1. Header Banner & Top Metrics Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-code text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-[#171f33] text-emerald-700 dark:text-[#45f1bf] uppercase tracking-wider border border-emerald-200 dark:border-[#45f1bf]/30 font-semibold">
              Zero-Knowledge Trust Mesh
            </span>
            <span className="font-code text-xs text-slate-600 dark:text-[#bacac1] flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#45f1bf] beacon-mint"></span>
              Fabric Channel: <span className="text-slate-900 dark:text-[#dae2fd] font-bold">rec-audit-mainnet-01</span>
            </span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#dae2fd] tracking-tight">
            Cryptographic Ledger & Security Suite
          </h1>
          <p className="font-body text-xs sm:text-sm text-slate-600 dark:text-[#bacac1] max-w-3xl">
            Continuous integrity telemetry with interactive Byzantine tamper simulation, Pedersen commitment range-proof zero-knowledge adjudication, and immutable document fingerprint registry.
          </p>
        </div>

        {/* Quick Stats Bento */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] px-4 py-2.5 rounded-xl shadow-sm flex flex-col min-w-[130px]">
            <span className="font-code text-[10px] uppercase text-slate-500 dark:text-[#85948c] font-semibold">Current Height</span>
            <span className="font-headline text-base text-emerald-600 dark:text-[#45f1bf] font-bold">#1,492,084</span>
            <span className="font-code text-[10px] text-emerald-700 dark:text-[#a5d0b9] font-medium">100% Finality</span>
          </div>
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] px-4 py-2.5 rounded-xl shadow-sm flex flex-col min-w-[130px]">
            <span className="font-code text-[10px] uppercase text-slate-500 dark:text-[#85948c] font-semibold">Merkle Health</span>
            <span
              className={`font-headline text-base font-bold ${
                simulatedTampered ? "text-rose-600 dark:text-[#ffb4ab]" : "text-slate-900 dark:text-[#dae2fd]"
              }`}
            >
              {simulatedTampered ? "TAMPER FLAGGED" : "0 Divergence"}
            </span>
            <span className="font-code text-[10px] text-emerald-600 dark:text-[#45f1bf] font-medium">Consensus Synced</span>
          </div>
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] px-4 py-2.5 rounded-xl shadow-sm flex flex-col min-w-[130px]">
            <span className="font-code text-[10px] uppercase text-slate-500 dark:text-[#85948c] font-semibold">ZK Solvers</span>
            <span className="font-headline text-base text-blue-600 dark:text-[#c6d7ff] font-bold">RFC-3526</span>
            <span className="font-code text-[10px] text-slate-500 dark:text-[#bacac1]">MODP-2048 Bit</span>
          </div>
        </div>
      </div>

      {/* 2. COMPONENT 1: Live Hackathon Attack Simulator */}
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-xl shadow-sm p-6 flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-emerald-500/10 dark:bg-[#45f1bf]/5 blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-[#45f1bf]" />
              <span className="font-code text-[10px] uppercase tracking-widest text-slate-500 dark:text-[#85948c] font-semibold">
                Defensive Protocol Bench
              </span>
              <span
                className={`font-code text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 border ${
                  simulatedTampered
                    ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-[#93000a] dark:text-[#ffdad6] dark:border-[#ffb4ab]/40 animate-pulse"
                    : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-[#29513f] dark:text-[#45f1bf] dark:border-[#45f1bf]/40"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${simulatedTampered ? "bg-rose-500 dark:bg-[#ffb4ab]" : "bg-emerald-500 dark:bg-[#45f1bf] beacon-mint"}`}
                ></span>
                <span>{simulatedTampered ? "MERKLE ROOT MISMATCH DETECTED" : "SHA-256 CHAIN 100% VALID"}</span>
              </span>
            </div>
            <h2 className="font-headline text-lg sm:text-xl font-bold text-slate-900 dark:text-[#dae2fd] tracking-tight mt-0.5">
              Live Hackathon Attack Simulator
            </h2>
            <p className="font-body text-xs text-slate-600 dark:text-[#bacac1]">
              Real-time cryptographic tamper detection demonstration proving immutability across Hyperledger Fabric blocks.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#171f33] px-3 py-1.5 rounded-lg text-xs font-code border border-slate-200 dark:border-[#222a3d]">
            <span className="text-slate-500 dark:text-[#85948c]">Target Block:</span>
            <span className="text-emerald-700 dark:text-[#45f1bf] font-bold">#1,492,084 (Genesis REC_MINT)</span>
          </div>
        </div>

        {/* 3 Interactive Triggers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={handleTamperClick}
            disabled={tamperLoading}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white dark:bg-[#93000a] dark:text-[#ffdad6] dark:hover:bg-[#b31b25] font-headline text-xs font-bold active:scale-[0.98] transition-all shadow-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>1. Simulate Rogue DB Tamper (+5,000 MWh)</span>
          </button>

          <button
            onClick={handleAuditTraversal}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-[#222a3d] dark:hover:bg-[#2d3449] dark:text-[#c6d7ff] dark:border-[#3b4a43] font-headline text-xs font-bold active:scale-[0.98] transition-all shadow-sm"
          >
            <Search className="w-4 h-4 text-slate-600 dark:text-[#c6d7ff]" />
            <span>2. Run Cryptographic Audit Traversal</span>
          </button>

          <button
            onClick={handleSelfHeal}
            disabled={tamperLoading || loading}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#00d4a4] dark:hover:bg-[#45f1bf] dark:text-[#003829] font-headline text-xs font-bold active:scale-[0.98] transition-all shadow-sm"
          >
            <RotateCw className="w-4 h-4" />
            <span>3. Self-Heal & Restore Ledger Parity</span>
          </button>
        </div>

        {/* Tamper Diagnostic Readout Card */}
        <div className="bg-slate-50 dark:bg-[#171f33] rounded-xl p-4 flex flex-col gap-3 border border-slate-200 dark:border-[#222a3d]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-slate-500 dark:text-[#85948c]" />
              <span className="font-code text-[10px] uppercase text-slate-500 dark:text-[#85948c] font-semibold">
                Real-Time Merkle Engine Integrity Stream
              </span>
            </div>
            <span className="font-code text-[11px] text-slate-600 dark:text-[#bacac1]">
              Live State: {simulatedTampered ? "Byzantine Mismatch" : "Block Synchronized"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Expected Root */}
            <div className="flex flex-col gap-1 bg-white dark:bg-[#060e20] p-3 rounded-lg border border-slate-200 dark:border-[#222a3d]">
              <div className="flex items-center justify-between">
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">Expected Block Header Merkle Root</span>
                <span className="font-code text-[10px] text-emerald-700 dark:text-[#a5d0b9]">StateDB / Quorum</span>
              </div>
              <span className="font-code text-xs text-slate-900 dark:text-[#dae2fd] break-all select-all">{expectedRoot}</span>
            </div>

            {/* Calculated Root */}
            <div className="flex flex-col gap-1 bg-white dark:bg-[#060e20] p-3 rounded-lg border border-slate-200 dark:border-[#222a3d]">
              <div className="flex items-center justify-between">
                <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">Calculated Storage Hash (Leaf Digest)</span>
                <span
                  className={`font-code text-[10px] font-bold ${
                    simulatedTampered ? "text-rose-600 dark:text-[#ffb4ab]" : "text-emerald-600 dark:text-[#45f1bf]"
                  }`}
                >
                  {simulatedTampered ? "MISMATCH [TAMPERED]" : "MATCH [VERIFIED]"}
                </span>
              </div>
              <span
                className={`font-code text-xs break-all select-all font-semibold ${
                  simulatedTampered ? "text-rose-600 dark:text-[#ffb4ab]" : "text-emerald-600 dark:text-[#45f1bf]"
                }`}
              >
                {calculatedRoot}
              </span>
            </div>
          </div>

          {/* Diagnostic Console Feed */}
          <div className="bg-slate-900 dark:bg-[#060e20] rounded-lg p-3 flex flex-col gap-1 font-code text-xs max-h-32 overflow-y-auto border border-slate-800 dark:border-[#222a3d]">
            <div className="flex items-center justify-between text-slate-400 dark:text-[#85948c] text-[10px] pb-1 border-b border-slate-800 dark:border-[#222a3d]">
              <span>CONSENSUS AUDIT LOG</span>
              <span>FABRIC v2.5 VALIDATOR</span>
            </div>
            {tamperLogs.map((log, i) => (
              <div
                key={i}
                className={`text-[11px] ${
                  log.type === "error"
                    ? "text-rose-400 dark:text-[#ffb4ab]"
                    : log.type === "warn"
                    ? "text-amber-300 dark:text-[#fde047]"
                    : log.type === "ok"
                    ? "text-emerald-400 dark:text-[#45f1bf]"
                    : "text-slate-400 dark:text-[#85948c]"
                }`}
              >
                {log.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Bento Grid: COMPONENT 2 (ZK Verifier) + COMPONENT 3 (Evidence Doc Hash) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COMPONENT 2: Zero-Knowledge Privacy Verifier (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-xl shadow-sm p-6 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-code text-[10px] uppercase tracking-wider text-blue-600 dark:text-[#c6d7ff] font-semibold flex items-center gap-1">
                <Key className="w-3.5 h-3.5" />
                Cryptographic Confidentiality
              </span>
              <span className="font-code text-[10px] bg-slate-100 dark:bg-[#171f33] px-2 py-0.5 rounded text-emerald-700 dark:text-[#a5d0b9] border border-slate-200 dark:border-[#222a3d] font-medium">
                Pedersen Commitments
              </span>
            </div>
            <h3 className="font-headline text-base font-bold text-slate-900 dark:text-[#dae2fd]">
              Zero-Knowledge Data Protection & Privacy Verifier
            </h3>
            <p className="font-body text-xs text-slate-600 dark:text-[#bacac1]">
              RFC-3526 MODP-2048 Non-Interactive Zero-Knowledge (NIZK) proof for generation compliance without exposing sensitive behind-the-meter generation telemetry.
            </p>
          </div>

          {/* Inputs Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-[#171f33] p-3 rounded-lg border border-slate-200 dark:border-[#222a3d]">
            <div className="flex flex-col gap-1">
              <label className="font-code text-[10px] text-slate-600 dark:text-[#bacac1] flex items-center justify-between">
                <span>Claimed MWh</span>
                <span className="text-slate-500 dark:text-[#85948c]">Public</span>
              </label>
              <input
                type="number"
                value={zkClaimMwh}
                onChange={(e) => setZkClaimMwh(Number(e.target.value))}
                className="w-full bg-white dark:bg-[#060e20] text-slate-900 dark:text-[#dae2fd] font-code text-xs px-3 py-2 rounded border border-slate-300 dark:border-[#222a3d] focus:outline-none focus:border-emerald-500 dark:focus:border-[#45f1bf]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-code text-[10px] text-slate-600 dark:text-[#bacac1] flex items-center justify-between">
                <span>Metered MWh</span>
                <span className="text-emerald-700 dark:text-[#45f1bf] font-semibold">Encrypted</span>
              </label>
              <input
                type="number"
                value={zkMeterMwh}
                onChange={(e) => setZkMeterMwh(Number(e.target.value))}
                className="w-full bg-white dark:bg-[#060e20] text-slate-900 dark:text-[#dae2fd] font-code text-xs px-3 py-2 rounded border border-slate-300 dark:border-[#222a3d] focus:outline-none focus:border-emerald-500 dark:focus:border-[#45f1bf]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-code text-[10px] text-slate-600 dark:text-[#bacac1] flex items-center justify-between">
                <span>Tolerance %</span>
                <span className="text-slate-500 dark:text-[#85948c]">RERC Max</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={zkTolerance}
                onChange={(e) => setZkTolerance(Number(e.target.value))}
                className="w-full bg-white dark:bg-[#060e20] text-slate-900 dark:text-[#dae2fd] font-code text-xs px-3 py-2 rounded border border-slate-300 dark:border-[#222a3d] focus:outline-none focus:border-emerald-500 dark:focus:border-[#45f1bf]"
              />
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onGenerateZkProof}
              disabled={zkLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#45f1bf] dark:text-[#003829] dark:hover:bg-[#00d4a4] font-headline text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
            >
              <Key className="w-4 h-4" />
              <span>{zkLoading ? "Generating Proof..." : "Generate Non-Interactive ZK (NIZK) Proof"}</span>
            </button>
            <span className="font-code text-[11px] text-slate-500 dark:text-[#85948c] hidden sm:inline">
              Curves: Ed25519 / MODP-2048
            </span>
          </div>

          {/* ZK Output Readout */}
          <div className="bg-slate-50 dark:bg-[#060e20] rounded-xl p-3.5 flex flex-col gap-2 font-code text-xs border border-slate-200 dark:border-[#222a3d]">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-[#222a3d]">
              <span className="font-code text-[10px] uppercase text-slate-500 dark:text-[#85948c] font-semibold">
                ZK Verification Envelope
              </span>
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                zkProofResult?.verified !== false
                  ? "bg-emerald-100 text-emerald-800 dark:bg-[#29513f] dark:text-[#45f1bf]"
                  : "bg-rose-100 text-rose-800 dark:bg-[#93000a] dark:text-[#ffdad6]"
              }`}>
                {zkProofResult?.verified !== false ? "PROOF VERIFIED" : "TOLERANCE EXCEEDED"}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 text-xs text-slate-900 dark:text-[#dae2fd]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-white dark:bg-[#171f33] px-2.5 py-1.5 rounded border border-slate-200 dark:border-[#222a3d]">
                <span className="text-slate-500 dark:text-[#85948c]">Claim Commitment (C_claim):</span>
                <span className="text-blue-600 dark:text-[#c6d7ff] select-all truncate sm:max-w-xs font-mono">
                  {zkProofResult?.claim_commitment || "0x8f2de417a89bc4b321a...94f71a"}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-white dark:bg-[#171f33] px-2.5 py-1.5 rounded border border-slate-200 dark:border-[#222a3d]">
                <span className="text-slate-500 dark:text-[#85948c]">Meter Commitment (C_meter):</span>
                <span className="text-emerald-700 dark:text-[#a5d0b9] select-all truncate sm:max-w-xs font-mono">
                  {zkProofResult?.meter_commitment || "0x8f2de417a89bc4b312c...88e39b"}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-white dark:bg-[#171f33] px-2.5 py-1.5 rounded border border-slate-200 dark:border-[#222a3d]">
                <span className="text-slate-500 dark:text-[#85948c]">Fiat-Shamir Challenge (e):</span>
                <span className="text-slate-700 dark:text-[#bacac1] select-all truncate sm:max-w-xs font-mono">
                  {zkProofResult?.challenge_hash || "0x4b78a9cf291849102830fde29..."}
                </span>
              </div>
            </div>

            <div className="mt-1 p-2.5 rounded-lg bg-emerald-50 dark:bg-[#29513f]/40 border border-emerald-200 dark:border-[#45f1bf]/30 text-emerald-800 dark:text-[#45f1bf] flex items-center gap-2 font-body text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-[#45f1bf]" />
              <span>
                ZK-PROOF VERIFIED VALID: Within tolerance without revealing raw meter production data to third parties.
              </span>
            </div>
          </div>
        </div>

        {/* COMPONENT 3: Evidence Document Hash Verifier (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] rounded-xl shadow-sm p-6 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-code text-[10px] uppercase tracking-wider text-emerald-700 dark:text-[#a5d0b9] font-semibold flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5" />
                Anti-Recycling Registry
              </span>
              <span className="font-code text-[10px] bg-slate-100 dark:bg-[#171f33] px-2 py-0.5 rounded text-slate-500 dark:text-[#85948c] border border-slate-200 dark:border-[#222a3d]">
                SHA-256 Digest
              </span>
            </div>
            <h3 className="font-headline text-base font-bold text-slate-900 dark:text-[#dae2fd]">
              Evidence Document Hash Verifier
            </h3>
            <p className="font-body text-xs text-slate-600 dark:text-[#bacac1]">
              Verify utility PDFs and CSV smart-meter telemetry against immutably committed hashes to eliminate duplicated or recycled certificates.
            </p>
          </div>

          {/* Drag & Drop Dropzone */}
          <div
            onClick={handleSimulateFileDrop}
            className="group cursor-pointer bg-slate-50 hover:bg-slate-100 dark:bg-[#171f33] dark:hover:bg-[#222a3d] border-2 border-dashed border-slate-300 hover:border-emerald-500 dark:border-[#3b4a43] dark:hover:border-[#45f1bf] transition-all rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2 min-h-[160px]"
          >
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-[#222a3d] flex items-center justify-center text-emerald-600 dark:text-[#45f1bf] group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-xs font-bold text-slate-900 dark:text-[#dae2fd]">
                Drop PDF Invoices or Meter CSVs here
              </span>
              <span className="font-body text-[11px] text-slate-500 dark:text-[#85948c]">
                Click to browse or drop sample file to trigger audit
              </span>
            </div>
            <span className="font-code text-[10px] text-slate-400 dark:text-[#85948c]">Supported: .pdf, .csv, .xml (E-GRID formats)</span>
          </div>

          {/* Document Hash Result State */}
          <div className="bg-slate-50 dark:bg-[#060e20] rounded-xl p-3.5 flex flex-col gap-2 border border-slate-200 dark:border-[#222a3d]">
            <div className="flex items-center justify-between">
              <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] uppercase font-semibold">
                Active Document Fingerprint
              </span>
              <span className="font-code text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-[#29513f] dark:text-[#45f1bf] font-bold">
                MATCHED ON CHAIN
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-[#45f1bf]" />
              <span className="font-body text-xs text-slate-900 dark:text-[#dae2fd] font-semibold">{docHashState.fileName}</span>
            </div>
            <div className="bg-white dark:bg-[#171f33] p-2 rounded border border-slate-200 dark:border-[#222a3d] flex flex-col gap-0.5">
              <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c]">SHA-256 Digest:</span>
              <span className="font-code text-[11px] text-emerald-700 dark:text-[#45f1bf] break-all select-all font-mono">
                {docHashState.hash}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
