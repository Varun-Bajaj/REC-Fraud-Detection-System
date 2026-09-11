"use client";

import React, { useState, useEffect } from "react";
import { ApiService } from "@/services/api";
import {
  User,
  DashboardStats,
  Claim,
  InvestigationCase,
  LedgerBlock,
  LedgerVerifyResult,
  Plant,
} from "@/types";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  RotateCw,
  Scale,
  Link2,
  FileCheck2,
  Factory,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
} from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [ledgerAudit, setLedgerAudit] = useState<LedgerVerifyResult | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);

  const initData = async () => {
    try {
      setLoading(true);
      await ApiService.login("regulator@recguardian.org", "password123");
      const me = await ApiService.getMe();
      setUser(me);

      const [s, c, inv, audit, pl] = await Promise.all([
        ApiService.getDashboardStats(),
        ApiService.getClaims(),
        ApiService.getInvestigations(),
        ApiService.verifyLedgerIntegrity(),
        ApiService.getPlants(),
      ]);

      setStats(s);
      setClaims(c);
      setCases(inv);
      setLedgerAudit(audit);
      setPlants(pl);
    } catch (err) {
      console.error("Initialization error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white">REC Guardian</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  Next.js App
                </span>
              </div>
              <p className="text-xs text-slate-400">Forensic Intelligence & Fraud Radar</p>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-white">{user.full_name}</div>
                <div className="text-[10px] text-emerald-400 font-mono">{user.role}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400">
                {user.full_name[0]}
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 flex gap-2 border-t border-slate-800 text-xs">
          {[
            { id: "dashboard", label: "Intelligence Dashboard" },
            { id: "claims", label: "Claims & Fraud Radar" },
            { id: "investigations", label: "Forensic Cases" },
            { id: "ledger", label: "SHA-256 Ledger Audit" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-3 px-4 font-medium border-b-2 transition ${
                activeTab === t.id
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {loading ? (
          <div className="text-center py-20 text-slate-400">
            <RotateCw className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
            Connecting to REC Guardian Backend...
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Verified Green Energy</span>
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-white mt-2">
                    {stats.total_mwh_issued.toLocaleString()} <span className="text-xs font-sans text-slate-400">MWh</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{stats.total_certificates_issued} Issued RECs</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Fraud Alerts Triggered</span>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
                    {stats.claims_held + stats.claims_under_review}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{stats.claims_held} Held • {stats.claims_under_review} Needs Review</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Active Regulatory Cases</span>
                    <Scale className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
                    {stats.open_investigation_cases}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Pending Human Review</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Cryptographic Ledger</span>
                    <Link2 className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                    {ledgerAudit?.is_valid ? "100% Valid" : "Tampered"}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{ledgerAudit?.total_blocks} SHA-256 Blocks</div>
                </div>
              </div>
            )}

            {/* Claims Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-emerald-400" />
                  <span>Recent Generation Claims & AI Risk Scores</span>
                </h3>
                <span className="text-xs text-slate-400">Click row to open forensic explanation</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 pb-2">
                    <tr>
                      <th className="py-2">Claim UID</th>
                      <th className="py-2">Claimed MWh</th>
                      <th className="py-2">Risk Score</th>
                      <th className="py-2">Recommendation</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {claims.map((c) => {
                      const isHigh = c.risk_score >= 65;
                      const isMed = c.risk_score >= 25 && c.risk_score < 65;
                      const badge = isHigh
                        ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
                        : isMed
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                        : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";

                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedClaim(c)}
                          className="hover:bg-slate-800/40 cursor-pointer transition"
                        >
                          <td className="py-3 font-mono font-medium text-white">{c.claim_uid}</td>
                          <td className="py-3 font-mono text-slate-300">{c.claimed_mwh.toLocaleString()} MWh</td>
                          <td className="py-3">
                            <span className={`px-2.5 py-0.5 rounded-full border font-mono font-bold ${badge}`}>
                              {c.risk_score.toFixed(1)} / 100
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-slate-200">
                            {c.risk_breakdown?.recommendation || (isHigh ? "HOLD" : isMed ? "REVIEW" : "APPROVE")}
                          </td>
                          <td className="py-3">
                            <span className="text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded text-[11px]">
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Forensic Risk Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                  AI Forensic Breakdown
                </span>
                <h3 className="text-lg font-bold text-white">{selectedClaim.claim_uid}</h3>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-300">
                  Recommendation: {selectedClaim.risk_breakdown?.recommendation || "HOLD"}
                </div>
                <div className="text-xs text-slate-400 mt-1 max-w-sm">
                  {selectedClaim.risk_breakdown?.summary_explanation || "Forensic evaluation triggered."}
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-3xl font-black text-white">{selectedClaim.risk_score.toFixed(1)}</div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Score / 100</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">Triggered Rules & Forensic Evidence:</div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedClaim.risk_breakdown?.factors?.map((f, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-xs ${
                      f.flagged
                        ? "bg-rose-950/20 border-rose-800/60 text-rose-200"
                        : "bg-slate-950/40 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="flex justify-between font-bold">
                      <span>[{f.rule_id}] {f.name}</span>
                      <span>{f.severity}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
