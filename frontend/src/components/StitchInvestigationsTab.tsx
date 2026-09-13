"use client";

import React from "react";
import { InvestigationCase } from "@/types";
import { Gavel, Scale, AlertTriangle, ShieldAlert, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StitchInvestigationsTabProps {
  cases: InvestigationCase[];
  onSelectCase: (c: InvestigationCase) => void;
}

export function StitchInvestigationsTab({
  cases,
  onSelectCase,
}: StitchInvestigationsTabProps) {
  const openCases = cases.filter((c) => c.status === "OPEN");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-widest text-emerald-700 dark:text-primary uppercase font-bold">
              Judicial Review Terminal
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold font-headline text-slate-900 dark:text-slate-100 tracking-tight">
            Regulatory Adjudication & Judicial Orders
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Human-in-the-loop regulatory hearing docket for flagged fraudulent claims, wash-trading rings, and multi-agent AI evidence briefs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
              Active Dockets: <strong className="text-amber-600 dark:text-amber-400">{openCases.length} Pending</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Cases Docket Table */}
      <div className="bg-white dark:bg-surface-container/70 border border-slate-200 dark:border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-surface-container-high/60 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-outline-variant/20">
              <tr>
                <th className="px-5 py-3.5">Docket Number</th>
                <th className="px-5 py-3.5">Subject Claim</th>
                <th className="px-5 py-3.5">Priority Level</th>
                <th className="px-5 py-3.5">Docket Status</th>
                <th className="px-5 py-3.5">Ruling Decision</th>
                <th className="px-5 py-3.5 text-right">Judicial Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-outline-variant/15 text-slate-700 dark:text-slate-300">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Scale className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800 dark:text-slate-300">No Investigation Dockets Currently Open</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">
                      Flagged claims from the anomaly detection engine will automatically populate here for judicial determination.
                    </p>
                  </td>
                </tr>
              ) : (
                cases.map((cs) => (
                  <tr key={cs.id} className="hover:bg-slate-50 dark:hover:bg-surface-container-high/40 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span>{cs.case_number}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-800 dark:text-slate-300">
                      Claim #{cs.claim_id}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        cs.priority === "CRITICAL"
                          ? "bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30"
                          : cs.priority === "HIGH"
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-slate-500/20 text-slate-500 dark:text-slate-400 border border-slate-500/30"
                      }`}>
                        {cs.priority}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                        cs.status === "OPEN" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cs.status === "OPEN" ? "bg-amber-500 dark:bg-amber-400 animate-pulse" : "bg-emerald-500 dark:bg-emerald-400"}`} />
                        {cs.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-500 dark:text-slate-400">
                      {cs.decision_action || "PENDING ADJUDICATION"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => onSelectCase(cs)}
                        className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-surface font-bold rounded-xl gap-1.5 shadow-sm"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        <span>Issue Order</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
