"use client";

import React from "react";
import { Certificate } from "@/types";
import { Award, ArrowRightLeft, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StitchWalletTabProps {
  certificates: Certificate[];
  onOpenTransferModal: (cert: Certificate) => void;
  onRedeem: (certId: number) => void;
}

export function StitchWalletTab({
  certificates,
  onOpenTransferModal,
  onRedeem,
}: StitchWalletTabProps) {
  const activeHoldings = certificates.filter((c) => c.status === "ISSUED");
  const totalMwh = certificates.reduce((acc, c) => acc + (c.status === "ISSUED" ? c.mwh : 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-widest text-emerald-700 dark:text-primary uppercase font-bold">
              Digital Asset Vault
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold font-headline text-slate-900 dark:text-slate-100 tracking-tight">
            Digital REC Token Wallet
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Manage validated Renewable Energy Certificates, execute P2P transfer hops, or permanently retire for Scope 2 ESG compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-primary/10 border border-emerald-200 dark:border-primary/20 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600 dark:text-primary" />
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
              Active Holdings: <strong className="text-emerald-700 dark:text-primary">{activeHoldings.length} RECs</strong>
            </span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-surface-container-high/60 border border-slate-200 dark:border-outline-variant/20 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
              Clean Volume: <strong className="text-slate-900 dark:text-slate-100">{totalMwh.toLocaleString()} MWh</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Holdings Grid */}
      {certificates.length === 0 ? (
        <div className="bg-white dark:bg-surface-container/60 border border-slate-200 dark:border-outline-variant/20 rounded-2xl p-12 text-center shadow-sm backdrop-blur-md">
          <Award className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Certificates In Wallet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Once submitted energy claims pass automated cross-validation and forensic consensus, verified tokens are minted directly here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white dark:bg-surface-container/70 border border-slate-200 dark:border-outline-variant/20 rounded-2xl p-5 shadow-sm backdrop-blur-md hover:border-emerald-500/40 dark:hover:border-primary/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    cert.status === "ISSUED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                      : cert.status === "REDEEMED"
                      ? "bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30"
                      : "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
                  }`}>
                    {cert.status}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Vintage {cert.vintage_year}-{String(cert.vintage_month).padStart(2, "0")}
                  </span>
                </div>

                <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-primary transition-colors">
                  {cert.certificate_uid}
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-surface-container-low/60 rounded-xl p-3 border border-slate-200 dark:border-outline-variant/15 mb-4">
                  <div className="flex justify-between items-center">
                    <span>Verified Energy:</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-primary text-sm">
                      {cert.mwh.toLocaleString()} MWh
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Generation Source:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{cert.fuel_type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Current Holder:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">User #{cert.current_owner_id}</span>
                  </div>
                </div>
              </div>

              <div>
                {cert.status === "ISSUED" ? (
                  <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-outline-variant/20">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-9 border-slate-200 dark:border-outline-variant/30 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-container-highest hover:text-slate-900 dark:hover:text-white rounded-xl"
                      onClick={() => onOpenTransferModal(cert)}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 text-slate-500 dark:text-slate-400" /> Transfer
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-surface font-bold rounded-xl shadow-sm"
                      onClick={() => onRedeem(cert.id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Retire / Redeem
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs font-mono text-slate-500 border-t border-slate-200 dark:border-outline-variant/20 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Permanently Retired for ESG Scope 2</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
