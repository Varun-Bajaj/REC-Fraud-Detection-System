"use client";

import React from "react";
import {
  LayoutGrid,
  Zap,
  FileSearch,
  Link2,
  Award,
  Gavel,
  Database,
  CheckCircle2,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  badgeColor?: string;
}

interface StitchSidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  heldClaimsCount?: number;
  openCasesCount?: number;
}

export function StitchSidebar({
  activeTab,
  onSelectTab,
  heldClaimsCount = 0,
  openCasesCount = 0,
}: StitchSidebarProps) {
  const modules: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "fabric-dlt", label: "Fabric Network", icon: Zap },
    {
      id: "claims",
      label: "Claims Triage",
      icon: FileSearch,
      badge: heldClaimsCount > 0 ? heldClaimsCount : undefined,
      badgeColor: "bg-red-500/10 text-red-600 dark:bg-[#93000a] dark:text-[#ffdad6] border border-red-200 dark:border-transparent",
    },
    { id: "lineage", label: "Lineage Explorer", icon: Link2 },
    { id: "wallet", label: "REC Wallet", icon: Award },
    {
      id: "investigations",
      label: "Judicial Adjudication",
      icon: Gavel,
      badge: openCasesCount > 0 ? openCasesCount : undefined,
      badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-[#29513f] dark:text-[#45f1bf] border border-emerald-200 dark:border-transparent",
    },
    { id: "ledger", label: "Cryptographic Ledger", icon: Database },
  ];

  return (
    <aside className="w-full h-full flex flex-col justify-between py-2 transition-colors duration-200">
      <div className="flex flex-col gap-3">
        <div className="px-3 pb-1">
          <span className="font-code text-[10px] uppercase tracking-widest text-slate-400 dark:text-[#85948c] font-semibold">
            Operational Modules
          </span>
        </div>

        <nav className="flex flex-col gap-1 px-1">
          {modules.map((m) => {
            const Icon = m.icon;
            const isActive = activeTab === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelectTab(m.id)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white dark:bg-[#00d4a4] dark:text-[#003829] font-bold shadow-md shadow-emerald-600/20 dark:shadow-[0_0_16px_rgba(0,212,164,0.35)]"
                    : "text-slate-600 dark:text-[#bacac1] hover:bg-slate-100 dark:hover:bg-[#171f33] hover:text-slate-900 dark:hover:text-[#dae2fd]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? "text-white dark:text-[#003829]"
                        : "text-emerald-600 dark:text-[#45f1bf]"
                    }`}
                  />
                  <span>{m.label}</span>
                </div>
                {m.badge !== undefined && (
                  <span
                    className={`font-code text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      isActive
                        ? "bg-white/20 text-white dark:bg-[#003829] dark:text-[#45f1bf]"
                        : m.badgeColor || "bg-slate-200 dark:bg-[#171f33] text-slate-800 dark:text-[#dae2fd]"
                    }`}
                  >
                    {m.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* DLT Quorum Health Status Card */}
      <div className="pt-4 mt-auto border-t border-slate-200 dark:border-[#222a3d]/60">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-[#222a3d] flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] uppercase tracking-wider font-semibold">
              DLT Quorum
            </span>
            <span className="font-code text-[11px] text-emerald-700 dark:text-[#45f1bf] font-bold">
              98.4% Sync
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-[#2d3449] h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 dark:bg-[#45f1bf] h-full w-[98.4%] rounded-full shadow-[0_0_8px_rgba(5,150,105,0.4)] dark:shadow-[0_0_8px_#45f1bf]"></div>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-[#bacac1] pt-0.5">
            <span className="font-code text-[10px]">Nodes: 14/14 Active</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#45f1bf]" />
          </div>
        </div>
      </div>
    </aside>
  );
}
