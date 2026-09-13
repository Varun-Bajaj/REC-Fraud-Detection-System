"use client";

import React from "react";
import { StitchShieldLogo } from "./StitchShieldLogo";
import {
  Search,
  LogOut,
  Menu,
  Bell,
  ShieldCheck,
  Sun,
  Moon,
  LayoutGrid,
  Zap,
  FileSearch,
  Link2,
  Award,
  Gavel,
  Database,
  X,
} from "lucide-react";
import { User } from "@/types";

export interface NavTabItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: any;
  badge?: number;
  badgeColor?: string;
}

interface StitchHeaderProps {
  user: User | null;
  onLogout: () => void;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit?: () => void;
  activeTab?: string;
  onSelectTab?: (tabId: string) => void;
  heldClaimsCount?: number;
  openCasesCount?: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function StitchHeader({
  user,
  onLogout,
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  activeTab = "dashboard",
  onSelectTab,
  heldClaimsCount = 0,
  openCasesCount = 0,
  theme,
  onToggleTheme,
}: StitchHeaderProps) {
  const navTabs: NavTabItem[] = [
    { id: "dashboard", label: "Overview Dashboard", shortLabel: "Dashboard", icon: LayoutGrid },
    { id: "fabric-dlt", label: "Hyperledger Fabric DLT", shortLabel: "Fabric Network", icon: Zap },
    {
      id: "claims",
      label: "Claims Forensic Triage",
      shortLabel: "Claims",
      icon: FileSearch,
      badge: heldClaimsCount > 0 ? heldClaimsCount : undefined,
      badgeColor: "bg-red-500/15 text-red-700 dark:bg-rose-950/80 dark:text-rose-300 border border-red-300 dark:border-rose-700/50",
    },
    { id: "lineage", label: "Lineage Graph Explorer", shortLabel: "Lineage", icon: Link2 },
    { id: "wallet", label: "Institutional REC Wallet", shortLabel: "REC Wallet", icon: Award },
    {
      id: "investigations",
      label: "Consortium Adjudication",
      shortLabel: "Adjudication",
      icon: Gavel,
      badge: openCasesCount > 0 ? openCasesCount : undefined,
      badgeColor: "bg-amber-500/15 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50",
    },
    { id: "ledger", label: "Cryptographic Ledger & ZK", shortLabel: "Ledger & ZK", icon: Database },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0b1326]/95 backdrop-blur-xl border-b border-slate-200 dark:border-[#222a3d] shadow-[0_2px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-colors duration-200">
      {/* Tier 1: Main Brand, Search, Status & Profile Toolbar */}
      <div className="w-full px-4 lg:px-6 h-16 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-[#171f33]">
        {/* Left: Brand Identity & Mobile Menu */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-[#bacac1] hover:text-slate-900 dark:hover:text-[#dae2fd] hover:bg-slate-100 dark:hover:bg-[#171f33] transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectTab && onSelectTab("dashboard")}>
            <StitchShieldLogo size={32} className="shrink-0 drop-shadow-[0_0_12px_rgba(5,150,105,0.2)] dark:drop-shadow-[0_0_12px_rgba(69,241,191,0.25)]" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-headline font-bold text-base tracking-tight text-slate-900 dark:text-[#dae2fd]">
                  REC GUARDIAN
                </span>
                <span className="font-code text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-[#171f33] text-emerald-700 dark:text-[#45f1bf] border border-emerald-200 dark:border-[#45f1bf]/30 font-bold">
                  v2.4-DLT
                </span>
              </div>
              <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] hidden sm:inline tracking-wider">
                Zero-Knowledge Anti-Fraud Mesh
              </span>
            </div>
          </div>
        </div>

        {/* Center: Universal Interactive Search Bar */}
        <div className="flex-1 max-w-lg hidden sm:block mx-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (onSearchSubmit) onSearchSubmit();
            }}
            className="relative flex items-center w-full"
          >
            <Search className="w-4 h-4 absolute left-3 text-slate-400 dark:text-[#85948c] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search Claim UID (CLM-...), REC Cert, or Tx Hash..."
              className="w-full bg-slate-50 dark:bg-[#131b2e] text-slate-900 dark:text-[#dae2fd] placeholder:text-slate-400 dark:placeholder:text-[#85948c] font-code text-xs pl-9 pr-16 py-2 rounded-xl border border-slate-200 dark:border-[#222a3d] focus:outline-none focus:border-emerald-500 dark:focus:border-[#45f1bf] focus:ring-1 focus:ring-emerald-500 dark:focus:ring-[#45f1bf] transition-all shadow-inner"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
            <button
              type="submit"
              className="absolute right-1.5 px-2 py-1 rounded-lg text-[10px] font-code font-bold bg-slate-200/70 dark:bg-[#222a3d] text-slate-600 dark:text-[#bacac1] hover:bg-emerald-600 hover:text-white dark:hover:bg-[#45f1bf] dark:hover:text-[#003829] transition-colors"
              title="Execute Search (Enter)"
            >
              ↵
            </button>
          </form>
        </div>

        {/* Right: Chaincode Pill, Theme Switcher, Role, User Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 justify-end shrink-0">
          {/* Live Consensus Quorum Pill */}
          <div className="hidden xl:flex items-center gap-2 bg-slate-100 dark:bg-[#131b2e] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#222a3d]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#45f1bf] beacon-mint"></span>
            <span className="font-code text-[11px] text-emerald-700 dark:text-[#a5d0b9] font-semibold">
              Quorum Active
            </span>
            <span className="text-slate-300 dark:text-[#3b4a43]">|</span>
            <span className="font-code text-[11px] text-slate-600 dark:text-[#bacac1]">
              #1.49M Blocks
            </span>
          </div>

          {/* Clean-Tech Light / Dark Theme Switcher */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#222a3d] bg-slate-100 dark:bg-[#131b2e] text-slate-700 dark:text-[#bacac1] hover:text-emerald-700 dark:hover:text-[#45f1bf] hover:border-emerald-300 dark:hover:border-[#45f1bf]/40 transition-all flex items-center gap-1.5 shadow-sm"
            title={`Switch to ${theme === "dark" ? "Light Mode (Clean-Tech Crisp Mint)" : "Dark Mode (Consortium DLT)"}`}
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="font-code text-[10px] font-bold tracking-wider hidden sm:inline">
              {theme === "dark" ? "LIGHT" : "DARK"}
            </span>
          </button>

          {/* Role Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-[#29513f]/50 border border-emerald-200 dark:border-[#45f1bf]/30 text-emerald-800 dark:text-[#a5d0b9] font-body text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-[#45f1bf]" />
            <span className="font-semibold">
              {user?.role === "REGULATOR"
                ? "Regulator / RERC"
                : user?.role === "ADMIN"
                ? "Consortium Admin"
                : user?.role === "AUDITOR"
                ? "Forensic Auditor"
                : user?.role
                ? `${user.role}`
                : "Regulator / RERC"}
            </span>
          </div>

          {/* Alerts Bell */}
          <button
            type="button"
            className="relative p-2 rounded-lg text-slate-600 dark:text-[#bacac1] hover:bg-slate-100 dark:hover:bg-[#171f33] hover:text-slate-900 dark:hover:text-[#dae2fd] transition-colors"
            title="Consensus Audit Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#45f1bf] ring-2 ring-white dark:ring-[#0b1326]"></span>
          </button>

          {/* User Avatar & Logout */}
          <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-[#222a3d]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 p-0.5 shrink-0 shadow-sm">
              <div className="w-full h-full rounded-full bg-white dark:bg-[#0b1326] flex items-center justify-center text-emerald-700 dark:text-[#45f1bf] font-bold text-xs font-code">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "R"}
              </div>
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="font-body text-xs font-semibold text-slate-900 dark:text-[#dae2fd] leading-tight truncate max-w-[130px]">
                {user?.full_name || "Dr. Elena Vance"}
              </span>
              <span className="font-code text-[10px] text-slate-500 dark:text-[#85948c] leading-none truncate max-w-[130px]">
                {user?.organization_name || "Regulatory Commission"}
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-600 dark:text-[#bacac1] hover:text-red-600 dark:hover:text-[#ffb4ab] hover:bg-red-50 dark:hover:bg-[#93000a]/20 transition-colors ml-1"
              title="Sign Out of Consortium Node"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tier 2: Primary Navigation Tabs Strip */}
      <div className="w-full px-2 sm:px-4 lg:px-6 bg-slate-50/80 dark:bg-[#0e1629]/90 backdrop-blur-md overflow-x-auto no-scrollbar flex items-center gap-1 sm:gap-1.5 py-1.5 border-t border-slate-100 dark:border-[#1a2338]">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab && onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0 ${
                isActive
                  ? "bg-emerald-600 text-white dark:bg-[#00d4a4] dark:text-[#003829] font-bold shadow-sm shadow-emerald-600/25 dark:shadow-[0_0_12px_rgba(0,212,164,0.3)]"
                  : "text-slate-600 dark:text-[#bacac1] hover:text-slate-900 dark:hover:text-[#dae2fd] hover:bg-white dark:hover:bg-[#171f33] border border-transparent hover:border-slate-200 dark:hover:border-[#222a3d]"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  isActive
                    ? "text-white dark:text-[#003829]"
                    : "text-emerald-600 dark:text-[#45f1bf]"
                }`}
              />
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.shortLabel || tab.label}</span>

              {tab.badge !== undefined && (
                <span
                  className={`font-code text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                    isActive
                      ? "bg-white/25 text-white dark:bg-[#003829]/30 dark:text-[#003829]"
                      : tab.badgeColor || "bg-slate-200 dark:bg-[#222a3d] text-slate-700 dark:text-[#bacac1]"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
