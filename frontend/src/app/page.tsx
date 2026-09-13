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
  Certificate,
} from "@/types";

// Stitch Components
import { StitchShieldLogo } from "@/components/StitchShieldLogo";
import { StitchHeader } from "@/components/StitchHeader";
import { StitchSidebar } from "@/components/StitchSidebar";
import { StitchDashboardTab } from "@/components/StitchDashboardTab";
import { StitchClaimsTab } from "@/components/StitchClaimsTab";
import { StitchLedgerTab } from "@/components/StitchLedgerTab";
import { StitchLineageTab } from "@/components/StitchLineageTab";
import { StitchWalletTab } from "@/components/StitchWalletTab";
import { StitchInvestigationsTab } from "@/components/StitchInvestigationsTab";
import { FabricLedgerDashboard } from "@/components/FabricLedgerDashboard";

// UI Primitives
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  ShieldCheck,
  Zap,
  RotateCw,
  Lock,
  Sun,
  Moon,
  Wind,
  ArrowRightLeft,
  FileSearch,
  Database,
  Activity,
  Bot,
  Sparkles,
  RefreshCw,
  Scale,
  Award,
  Link2,
} from "lucide-react";

// Login Portals Configuration
const LOGIN_PORTALS = [
  {
    id: "regulator",
    title: "Regulatory Authority",
    subtitle: "RERC Energy Commission",
    email: "regulator@recguardian.org",
    role: "REGULATOR",
    icon: ShieldCheck,
    color: "blue",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    id: "admin",
    title: "System Administrator",
    subtitle: "Consortium Root Authority",
    email: "admin@recguardian.org",
    role: "ADMIN",
    icon: Lock,
    color: "purple",
    badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    id: "auditor",
    title: "Forensic ESG Auditor",
    subtitle: "Apex Forensic Audit Group",
    email: "auditor@recguardian.org",
    role: "AUDITOR",
    icon: FileSearch,
    color: "amber",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  {
    id: "solar",
    title: "Solar Energy Producer",
    subtitle: "Helios Solar LLC — 50 MW",
    email: "generator@solarfarm.com",
    role: "GENERATOR",
    icon: Sun,
    color: "yellow",
    badgeClass: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  },
  {
    id: "wind",
    title: "Wind Energy Producer",
    subtitle: "Boreas Wind Energy — 120 MW",
    email: "generator2@windpower.com",
    role: "GENERATOR",
    icon: Wind,
    color: "cyan",
    badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
  {
    id: "trader",
    title: "Energy Trader & Broker",
    subtitle: "Global Carbon & REC Exchange",
    email: "trader@energytrade.com",
    role: "GENERATOR",
    icon: ArrowRightLeft,
    color: "emerald",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
];

function AuthScreen({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  authError,
  loading,
  onQuickLogin,
  theme,
  onToggleTheme,
}: {
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  authError: string | null;
  loading: boolean;
  onQuickLogin: (email: string, password?: string) => Promise<void>;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const [selectedPortal, setSelectedPortal] = React.useState<(typeof LOGIN_PORTALS)[0] | null>(null);
  const [authMode, setAuthMode] = React.useState<"portal" | "manual">("portal");

  const handlePortalSelect = (portal: (typeof LOGIN_PORTALS)[0]) => {
    setSelectedPortal(portal);
    setLoginEmail(portal.email);
    setLoginPassword("password123");
  };

  const handlePortalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onQuickLogin(loginEmail, loginPassword);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f18] text-slate-900 dark:text-slate-100 flex flex-col font-sans relative overflow-hidden transition-colors duration-200">
      {/* Background ambient mesh glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(5,150,105,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(69,241,191,0.12),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* Brand Header Bar */}
      <div className="relative z-10 border-b border-slate-200 dark:border-outline-variant/20 bg-white/80 dark:bg-surface-container/60 backdrop-blur-xl py-3.5 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-surface-container-high/80 flex items-center justify-center border border-emerald-200 dark:border-primary/30 shadow-lg shadow-emerald-500/10">
              <StitchShieldLogo className="w-6 h-6 text-emerald-600 dark:text-primary" />
            </div>
            <div>
              <div className="text-emerald-700 dark:text-primary text-[10px] font-mono font-bold tracking-widest uppercase">
                TEAM: KHATRON KE KHILADI
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold font-headline tracking-tight leading-none">
                REC GUARDIAN
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center px-4 py-1.5 rounded-full border border-emerald-200 dark:border-primary/30 bg-emerald-50 dark:bg-primary/10 shadow-sm">
            <span className="text-emerald-700 dark:text-primary text-xs font-mono font-bold tracking-wider uppercase">
              DETECT · EXPLAIN · INVESTIGATE · PRESERVE EVIDENCE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-primary animate-pulse" />
              <span className="hidden sm:inline">Hyperledger Fabric DLT + AI Forensics</span>
            </div>
            <button
              onClick={onToggleTheme}
              aria-label="Toggle theme mode"
              className="p-2 rounded-xl border border-slate-200 dark:border-[#222a3d] bg-slate-100 dark:bg-[#131b2e] text-slate-700 dark:text-[#a5d0b9] hover:bg-slate-200 dark:hover:bg-[#1b2438] transition-all flex items-center justify-center"
              title={`Switch to ${theme === "dark" ? "Light Clean-Tech" : "Dark DLT"} mode`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-[#45f1bf]" /> : <Moon className="w-4 h-4 text-emerald-700" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Authentication Center */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-4xl space-y-6">
          {/* Hero Welcome */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-primary/10 border border-emerald-200 dark:border-primary/20 text-emerald-700 dark:text-primary text-xs font-mono font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Renewable Energy Certificate Forensic Mesh</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-headline text-slate-900 dark:text-slate-100 tracking-tight">
              REC Guardian Command Center
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
              Select your persona portal to access forensic surveillance, cryptographic consensus audits, and automated AI adjudication.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setAuthMode("portal");
                setSelectedPortal(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                authMode === "portal"
                  ? "bg-emerald-600 text-white dark:bg-primary dark:text-surface shadow-md shadow-emerald-500/20"
                  : "bg-white dark:bg-surface-container-high/60 border border-slate-200 dark:border-outline-variant/20 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Zap className="h-3.5 w-3.5" /> 1-Click Role Portals
            </button>
            <button
              onClick={() => {
                setAuthMode("manual");
                setSelectedPortal(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                authMode === "manual"
                  ? "bg-emerald-600 text-white dark:bg-primary dark:text-surface shadow-md shadow-emerald-500/20"
                  : "bg-white dark:bg-surface-container-high/60 border border-slate-200 dark:border-outline-variant/20 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Lock className="h-3.5 w-3.5" /> Custom Credentials
            </button>
          </div>

          {/* Role Portals Grid */}
          {authMode === "portal" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {LOGIN_PORTALS.map((portal) => {
                  const IconComp = portal.icon;
                  const isSelected = selectedPortal?.id === portal.id;
                  return (
                    <button
                      key={portal.id}
                      onClick={() => handlePortalSelect(portal)}
                      className={`rounded-2xl border p-4 text-left transition-all backdrop-blur-md relative group ${
                        isSelected
                          ? "border-emerald-500 dark:border-primary bg-emerald-50/50 dark:bg-surface-container-high shadow-lg shadow-emerald-500/10 -translate-y-0.5"
                          : "border-slate-200 dark:border-outline-variant/20 bg-white/90 dark:bg-surface-container/60 hover:border-emerald-400 dark:hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-surface-container-high/60 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/30 flex items-center justify-center text-emerald-600 dark:text-primary group-hover:border-emerald-400 dark:group-hover:border-primary/50 transition-colors">
                          <IconComp className="h-5 w-5" />
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${portal.badgeClass}`}>
                          {portal.role}
                        </span>
                      </div>
                      <div className="font-bold font-headline text-slate-900 dark:text-slate-100 text-sm leading-tight mb-1 group-hover:text-emerald-700 dark:group-hover:text-primary transition-colors">
                        {portal.title}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs truncate">
                        {portal.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedPortal && (
                <div className="bg-white/95 dark:bg-surface-container/90 border border-emerald-300 dark:border-primary/40 rounded-2xl p-6 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-primary/5 animate-in fade-in-90 zoom-in-95">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-primary/10 border border-emerald-200 dark:border-primary/30 flex items-center justify-center text-emerald-700 dark:text-primary">
                      <selectedPortal.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-bold font-headline text-slate-900 dark:text-slate-100 text-base">
                        {selectedPortal.title}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs font-mono">
                        {selectedPortal.email} · {selectedPortal.subtitle}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handlePortalLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1.5">
                        Consortium Identity Email
                      </label>
                      <Input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="h-11 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1.5">
                        Cryptographic Key / Password
                      </label>
                      <Input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-11 font-mono"
                        required
                      />
                    </div>

                    {authError && (
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-error/10 border border-red-200 dark:border-error/30 text-red-700 dark:text-error text-xs">
                        {authError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-surface font-bold font-headline rounded-xl shadow-md text-sm"
                    >
                      {loading ? "Verifying Consortium Key..." : `Launch ${selectedPortal.title} Command Console`}
                    </Button>
                  </form>
                </div>
              )}

              {!selectedPortal && (
                <p className="text-center text-slate-500 text-xs font-mono">
                  Select a portal above · Demo passkeys: <span className="font-bold text-slate-700 dark:text-slate-300">password123</span>
                </p>
              )}
            </div>
          )}

          {/* Manual Login */}
          {authMode === "manual" && (
            <div className="bg-white/95 dark:bg-surface-container/80 border border-slate-200 dark:border-outline-variant/30 rounded-2xl p-6 max-w-md mx-auto backdrop-blur-xl shadow-xl">
              <form onSubmit={handlePortalLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1.5">
                    User Email
                  </label>
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="h-11 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-slate-300 mb-1.5">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-11 font-mono"
                    required
                  />
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-error/10 border border-red-200 dark:border-error/30 text-red-700 dark:text-error text-xs">
                    {authError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-surface font-bold rounded-xl"
                >
                  {loading ? "Authenticating..." : "Sign In With Identity"}
                </Button>
              </form>
            </div>
          )}

          {/* Security Features Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <div className="p-4 rounded-xl bg-white/80 dark:bg-surface-container/50 border border-slate-200 dark:border-outline-variant/20 backdrop-blur-sm text-center shadow-sm">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-primary mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-900 dark:text-slate-200">Isolation Forest AI</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Multi-source cross validation</div>
            </div>
            <div className="p-4 rounded-xl bg-white/80 dark:bg-surface-container/50 border border-slate-200 dark:border-outline-variant/20 backdrop-blur-sm text-center shadow-sm">
              <Database className="w-5 h-5 text-emerald-600 dark:text-primary mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-900 dark:text-slate-200">SHA-256 Ledger</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Tamper-evident audit chain</div>
            </div>
            <div className="p-4 rounded-xl bg-white/80 dark:bg-surface-container/50 border border-slate-200 dark:border-outline-variant/20 backdrop-blur-sm text-center shadow-sm">
              <Scale className="w-5 h-5 text-emerald-600 dark:text-primary mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-900 dark:text-slate-200">Graph Surveillance</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">NetworkX wash trade detection</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [loginEmail, setLoginEmail] = useState("regulator@recguardian.org");
  const [loginPassword, setLoginPassword] = useState("password123");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  // Sync theme with localStorage and document element
  useEffect(() => {
    const saved = localStorage.getItem("rec_guardian_theme") as "light" | "dark" | null;
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
    } else if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    localStorage.setItem("rec_guardian_theme", theme);
  }, [theme]);

  // App data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [ledgerAudit, setLedgerAudit] = useState<LedgerVerifyResult | null>(null);
  const [ledgerBlocks, setLedgerBlocks] = useState<LedgerBlock[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");

  // Lineage Explorer State
  const [lineageSearchInput, setLineageSearchInput] = useState("CLM-2026-FRAUD-MTR");
  const [lineageData, setLineageData] = useState<any>(null);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [lineageError, setLineageError] = useState<string | null>(null);

  // Mobile menu drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals
  const [, setSelectedClaim] = useState<Claim | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isAdjudicateModalOpen, setIsAdjudicateModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);
  const [adjudicateAction, setAdjudicateAction] = useState<"CONFIRM_FRAUD_HOLD" | "CLEAR_AND_ISSUE">("CONFIRM_FRAUD_HOLD");
  const [adjudicateFindings, setAdjudicateFindings] = useState("");

  // AI Agent inside Adjudication
  const [aiAgentLoading, setAiAgentLoading] = useState(false);
  const [aiAgentResult, setAiAgentResult] = useState<any>(null);

  const handleRunAiInvestigation = async (caseId: number) => {
    setAiAgentLoading(true);
    setAiAgentResult(null);
    try {
      const res = await ApiService.aiInvestigateCase(caseId);
      setAiAgentResult(res);
      if (res.agent_verdict) {
        setAdjudicateAction(res.agent_verdict as any);
      }
      if (res.agent_reasoning) {
        setAdjudicateFindings(res.agent_reasoning);
      }
    } catch (err: any) {
      alert("AI Agent investigation failed: " + err.message);
    } finally {
      setAiAgentLoading(false);
    }
  };

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [transferTargetUser, setTransferTargetUser] = useState<number>(3);
  const [transferNotes, setTransferNotes] = useState("");

  // New Claim Form State
  const [newClaimPlantId, setNewClaimPlantId] = useState<number>(1);
  const [newClaimStart, setNewClaimStart] = useState("2026-03-01T00:00:00Z");
  const [newClaimEnd, setNewClaimEnd] = useState("2026-03-31T23:59:59Z");
  const [newClaimMwh, setNewClaimMwh] = useState<number>(1200);
  const [claimSubmitError, setClaimSubmitError] = useState<string | null>(null);

  // Hackathon Tamper Simulator & ZK Privacy State
  const [tamperLoading, setTamperLoading] = useState(false);
  const [tamperStatus, setTamperStatus] = useState<any>(null);
  const [zkClaimMwh, setZkClaimMwh] = useState<number>(1000);
  const [zkMeterMwh, setZkMeterMwh] = useState<number>(1015);
  const [zkTolerance, setZkTolerance] = useState<number>(2.0);
  const [zkProofResult, setZkProofResult] = useState<any>(null);
  const [zkLoading, setZkLoading] = useState(false);

  const handleSimulateTamper = async () => {
    setTamperLoading(true);
    try {
      const res = await ApiService.simulateLedgerTamper();
      setTamperStatus(res);
      const audit = await ApiService.verifyLedgerIntegrity();
      setLedgerAudit(audit);
      const blocks = await ApiService.getLedgerBlocks(20);
      setLedgerBlocks(blocks);
    } catch (err: any) {
      alert("Tamper simulation failed: " + err.message);
    } finally {
      setTamperLoading(false);
    }
  };

  const handleRestoreTamper = async () => {
    setTamperLoading(true);
    try {
      await ApiService.restoreLedgerTamper();
      setTamperStatus(null);
      const audit = await ApiService.verifyLedgerIntegrity();
      setLedgerAudit(audit);
      const blocks = await ApiService.getLedgerBlocks(20);
      setLedgerBlocks(blocks);
    } catch (err: any) {
      alert("Restore failed: " + err.message);
    } finally {
      setTamperLoading(false);
    }
  };

  const handleRefreshLedgerAudit = async () => {
    setTamperLoading(true);
    try {
      const audit = await ApiService.verifyLedgerIntegrity();
      setLedgerAudit(audit);
      const blocks = await ApiService.getLedgerBlocks(20);
      setLedgerBlocks(blocks);
    } catch (err: any) {
      alert("Verification failed: " + err.message);
    } finally {
      setTamperLoading(false);
    }
  };

  const handleGenerateZkProof = async () => {
    setZkLoading(true);
    try {
      const res = await ApiService.generateNIZKBoundsProof({
        claimed_mwh: zkClaimMwh,
        metered_mwh: zkMeterMwh,
        tolerance_percentage: zkTolerance,
      });
      setZkProofResult(res);
    } catch (err: any) {
      alert("ZK proof generation failed: " + err.message);
    } finally {
      setZkLoading(false);
    }
  };

  // Document Verification State
  const [verifyingDoc, setVerifyingDoc] = useState(false);
  const [docVerifyResult, setDocVerifyResult] = useState<any>(null);

  const handleDocumentVerify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVerifyingDoc(true);
    try {
      const res = await ApiService.verifyDocument(file);
      setDocVerifyResult(res);
    } catch (err: any) {
      alert(`Document verification failed: ${err.message}`);
    } finally {
      setVerifyingDoc(false);
    }
  };

  // Boot authentication check
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = ApiService.getToken();
        if (!token) {
          setUser(null);
          setIsBooting(false);
          return;
        }
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Auth check timeout")), 2500)
        );
        const me = (await Promise.race([ApiService.getMe(), timeoutPromise])) as User;
        setUser(me);
        await loadDashboardData();
      } catch {
        setUser(null);
        setAuthError(null);
      } finally {
        setIsBooting(false);
      }
    };

    initAuth();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [s, c, certs, cs, audit, blocks, pl] = await Promise.all([
        ApiService.getDashboardStats().catch(() => null),
        ApiService.getClaims().catch(() => []),
        ApiService.getCertificates().catch(() => []),
        ApiService.getInvestigations().catch(() => []),
        ApiService.verifyLedgerIntegrity().catch(() => null),
        ApiService.getLedgerBlocks(25).catch(() => []),
        ApiService.getPlants().catch(() => []),
      ]);
      if (s) setStats(s);
      setClaims(c);
      setCertificates(certs);
      setCases(cs);
      setLedgerAudit(audit);
      setLedgerBlocks(blocks);
      setPlants(pl);
    } catch (err) {
      console.error("Error loading dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (email: string, pass = "password123") => {
    setAuthError(null);
    setLoading(true);
    try {
      const res = await ApiService.loginJson(email, pass);
      setUser(res.user);
      setLoginEmail(res.user.email);
      await loadDashboardData();
    } catch (err: any) {
      setAuthError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    setUser(null);
    setAuthError(null);
    setStats(null);
    setClaims([]);
    setCertificates([]);
    setCases([]);
    setLedgerAudit(null);
    setLedgerBlocks([]);
    setPlants([]);
  };

  const handleExecuteLineageSearch = async (query: string) => {
    if (!query) return;
    setLineageLoading(true);
    setLineageError(null);
    try {
      const res = await ApiService.getCertificateLineage(query.trim());
      setLineageData(res);
    } catch (err: any) {
      setLineageError(err.message || "Failed to load lineage history");
      setLineageData(null);
    } finally {
      setLineageLoading(false);
    }
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimSubmitError(null);
    setActionLoading(true);
    try {
      await ApiService.submitClaim({
        plant_id: Number(newClaimPlantId),
        period_start: newClaimStart,
        period_end: newClaimEnd,
        claimed_mwh: Number(newClaimMwh),
      });
      setIsSubmitModalOpen(false);
      await loadDashboardData();
    } catch (err: any) {
      setClaimSubmitError(err.message || "Failed to submit claim");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjudicate = async () => {
    if (!selectedCase) return;
    setActionLoading(true);
    try {
      await ApiService.adjudicateCase(selectedCase.id, adjudicateAction, adjudicateFindings || "Adjudicated by authority");
      setIsAdjudicateModalOpen(false);
      setSelectedCase(null);
      await loadDashboardData();
    } catch (err: any) {
      alert(`Adjudication failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedCert) return;
    setActionLoading(true);
    try {
      await ApiService.transferCertificate(selectedCert.id, Number(transferTargetUser), transferNotes);
      setIsTransferModalOpen(false);
      setSelectedCert(null);
      await loadDashboardData();
    } catch (err: any) {
      alert(`Transfer failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRedeem = async (certId: number) => {
    if (!confirm("Are you sure you want to permanently retire this REC token for Scope 2 ESG compliance?")) return;
    setActionLoading(true);
    try {
      await ApiService.redeemCertificate(certId);
      await loadDashboardData();
    } catch (err: any) {
      alert(`Redemption failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHeaderSearchSubmit = () => {
    if (!headerSearchQuery.trim()) return;
    const q = headerSearchQuery.trim().toUpperCase();
    if (q.startsWith("CLM")) {
      setActiveTab("claims");
    } else if (q.startsWith("REC")) {
      setActiveTab("lineage");
      setLineageSearchInput(headerSearchQuery.trim());
    } else if (q.startsWith("CASE")) {
      setActiveTab("investigations");
    } else if (q.startsWith("0X") || q.length === 64) {
      setActiveTab("ledger");
    } else {
      setActiveTab("claims");
    }
  };

  const totalMwhClaimed = stats?.total_mwh_claimed || claims.reduce((acc, c) => acc + c.claimed_mwh, 0);
  const totalMwhIssued = stats?.total_mwh_issued || certificates.reduce((acc, c) => acc + c.mwh, 0);
  const heldCount = claims.filter((c) => c.status === "HELD" || c.status === "REJECTED").length;

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0a0f18] text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-outline-variant/30 bg-white dark:bg-surface-container px-6 py-4 shadow-xl backdrop-blur-xl">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-600 dark:text-primary" />
          <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
            Initialising REC Guardian Consortium Node...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        authError={authError}
        loading={loading}
        onQuickLogin={handleQuickLogin}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f18] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-[#45f1bf] transition-colors duration-200">
      {/* Stitch Top Header with Navigation Tabs, Search, Role, and Profile */}
      <StitchHeader
        user={user}
        onLogout={handleLogout}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        searchQuery={headerSearchQuery}
        onSearchChange={setHeaderSearchQuery}
        onSearchSubmit={handleHeaderSearchSubmit}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        heldClaimsCount={heldCount}
        openCasesCount={cases.filter((c) => c.status === "OPEN").length}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      {/* Main Body with Left Rail Sidebar & Content Viewport */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Desktop Sidebar Rail */}
        <div className="hidden lg:block w-64 shrink-0 border-r border-slate-200 dark:border-[#222a3d] bg-white/70 dark:bg-[#0b1326]/40 p-4 sticky top-28 h-[calc(100vh-7rem)] overflow-y-auto">
          <StitchSidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            heldClaimsCount={heldCount}
            openCasesCount={cases.filter((c) => c.status === "OPEN").length}
          />
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/60 dark:bg-black/60 backdrop-blur-md flex">
            <div className="w-72 bg-white dark:bg-surface-container p-5 border-r border-slate-200 dark:border-outline-variant/30 h-full overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-mono font-bold text-emerald-700 dark:text-primary">NAVIGATION MODULES</div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-mono text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  ✕ Close
                </button>
              </div>
              <StitchSidebar
                activeTab={activeTab}
                onSelectTab={(tab) => {
                  setActiveTab(tab);
                  setMobileMenuOpen(false);
                }}
                heldClaimsCount={heldCount}
                openCasesCount={cases.filter((c) => c.status === "OPEN").length}
              />
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* TAB 1: DASHBOARD RADAR */}
          {activeTab === "dashboard" && (
            <StitchDashboardTab
              ledgerAudit={ledgerAudit}
              loading={loading}
              onRefresh={loadDashboardData}
              totalMwhClaimed={totalMwhClaimed}
              totalMwhIssued={totalMwhIssued}
              plants={plants}
              claims={claims}
              heldCount={heldCount}
              cases={cases}
              onNavigateTab={setActiveTab}
              onSelectClaim={(claim: Claim) => {
                setSelectedClaim(claim);
                setActiveTab("claims");
              }}
              onRunBatchTriage={loadDashboardData}
              batchTriageLoading={loading}
            />
          )}

          {/* TAB 2: HYPERLEDGER FABRIC DLT */}
          {activeTab === "fabric-dlt" && (
            <div className="bg-white dark:bg-surface-container/60 border border-slate-200 dark:border-outline-variant/20 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-sm">
              <FabricLedgerDashboard />
            </div>
          )}

          {/* TAB 3: CLAIMS TRIAGE & FORENSIC DOSSIER */}
          {activeTab === "claims" && (
            <StitchClaimsTab
              claims={claims}
              plants={plants}
              onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
              onSelectClaimForInspection={(claim: Claim) => setSelectedClaim(claim)}
              onAdjudicateClaim={(claim: Claim) => {
                setSelectedClaim(claim);
                const matchingCase = cases.find((c) => c.claim_id === claim.id);
                if (matchingCase) {
                  setSelectedCase(matchingCase);
                  setIsAdjudicateModalOpen(true);
                } else {
                  setActiveTab("investigations");
                }
              }}
            />
          )}

          {/* TAB 4: CERTIFICATE LINEAGE */}
          {activeTab === "lineage" && (
            <StitchLineageTab
              lineageSearchInput={lineageSearchInput}
              setLineageSearchInput={setLineageSearchInput}
              lineageLoading={lineageLoading}
              lineageError={lineageError}
              lineageData={lineageData}
              onSearch={handleExecuteLineageSearch}
            />
          )}

          {/* TAB 5: DIGITAL REC WALLET */}
          {activeTab === "wallet" && (
            <StitchWalletTab
              certificates={certificates}
              onOpenTransferModal={(cert) => {
                setSelectedCert(cert);
                setIsTransferModalOpen(true);
              }}
              onRedeem={handleRedeem}
            />
          )}

          {/* TAB 6: REGULATORY ADJUDICATION */}
          {activeTab === "investigations" && (
            <StitchInvestigationsTab
              cases={cases}
              onSelectCase={(cs) => {
                setSelectedCase(cs);
                setIsAdjudicateModalOpen(true);
              }}
            />
          )}

          {/* TAB 7: CRYPTOGRAPHIC LEDGER & TAMPER SIMULATOR */}
          {activeTab === "ledger" && (
            <StitchLedgerTab
              ledgerAudit={ledgerAudit}
              ledgerBlocks={ledgerBlocks}
              loading={loading}
              tamperStatus={tamperStatus}
              tamperLoading={tamperLoading}
              onSimulateTamper={handleSimulateTamper}
              onRestoreTamper={handleRestoreTamper}
              onVerifyLedger={handleRefreshLedgerAudit}
              zkClaimMwh={zkClaimMwh}
              setZkClaimMwh={setZkClaimMwh}
              zkMeterMwh={zkMeterMwh}
              setZkMeterMwh={setZkMeterMwh}
              zkTolerance={zkTolerance}
              setZkTolerance={setZkTolerance}
              onGenerateZkProof={handleGenerateZkProof}
              zkProofResult={zkProofResult}
              zkLoading={zkLoading}
            />
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SUBMIT NEW GENERATION CLAIM                                      */}
      {/* ========================================================================= */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent onClose={() => setIsSubmitModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Submit Generation Claim for REC Minting</DialogTitle>
            <DialogDescription>
              Claims are automatically cross-checked against smart meter telemetry and satellite weather consensus.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClaim} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-700 dark:text-slate-300 font-mono">Select Clean Power Asset</Label>
              <Select
                value={newClaimPlantId}
                onChange={(e) => setNewClaimPlantId(Number(e.target.value))}
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-surface-container text-slate-900 dark:text-slate-100">
                    {p.name} ({p.nameplate_capacity_mw} MW {p.fuel_type})
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700 dark:text-slate-300 font-mono">Period Start (UTC)</Label>
                <Input
                  value={newClaimStart}
                  onChange={(e) => setNewClaimStart(e.target.value)}
                  placeholder="YYYY-MM-DDTHH:MM:SSZ"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 dark:text-slate-300 font-mono">Period End (UTC)</Label>
                <Input
                  value={newClaimEnd}
                  onChange={(e) => setNewClaimEnd(e.target.value)}
                  placeholder="YYYY-MM-DDTHH:MM:SSZ"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 dark:text-slate-300 font-mono">Claimed Energy Generation (MWh)</Label>
              <Input
                type="number"
                value={newClaimMwh}
                onChange={(e) => setNewClaimMwh(Number(e.target.value))}
                min={1}
                className="font-mono"
                required
              />
            </div>

            {claimSubmitError && (
              <Alert variant="destructive">
                <AlertDescription>{claimSubmitError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubmitModalOpen(false)}
                className="border-slate-300 dark:border-outline-variant/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-container-highest"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-surface font-bold font-headline"
              >
                {actionLoading ? "Evaluating In Engine..." : "Submit to Fraud Engine"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: REGULATORY ADJUDICATION & AUTONOMOUS AI AGENT                     */}
      {/* ========================================================================= */}
      <Dialog open={isAdjudicateModalOpen} onOpenChange={setIsAdjudicateModalOpen}>
        <DialogContent onClose={() => setIsAdjudicateModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Regulatory Judicial Determination</DialogTitle>
            <DialogDescription>
              Docket Case: <span className="font-mono font-bold text-emerald-700 dark:text-primary">{selectedCase?.case_number}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Autonomous LangGraph AI Forensic Agent Trigger */}
            {selectedCase && (
              <div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-purple-900 dark:text-purple-300 text-xs flex items-center gap-1.5 font-headline">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>LangGraph Multi-Agent Forensic Investigation</span>
                    </div>
                    <p className="text-[10px] text-purple-700/80 dark:text-purple-300/70 mt-0.5 font-mono">
                      Autonomous cross-check: Clean energy registry + Satellite weather irradiance
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleRunAiInvestigation(selectedCase.id)}
                    disabled={aiAgentLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white h-7 text-xs gap-1.5 rounded-lg"
                  >
                    {aiAgentLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                    <span>{aiAgentLoading ? "Investigating..." : "Run AI Agent"}</span>
                  </Button>
                </div>

                {aiAgentResult && (
                  <div className="mt-2 p-2.5 bg-white dark:bg-surface-container-low rounded-lg border border-purple-200 dark:border-purple-500/30 space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Agent Verdict:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        aiAgentResult.agent_verdict === 'CONFIRM_FRAUD_HOLD' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {aiAgentResult.agent_verdict} (Risk: {aiAgentResult.agent_risk_score})
                      </span>
                    </div>
                    {aiAgentResult.weather_evidence && (
                      <div className="text-[10px] text-slate-700 dark:text-slate-300 flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Atmospheric Irradiance:</span>
                        <span>{aiAgentResult.weather_evidence.avg_solar_radiation_w_m2} W/m² ({aiAgentResult.weather_evidence.irradiance_quality})</span>
                      </div>
                    )}
                    {aiAgentResult.registry_evidence && (
                      <div className="text-[10px] text-slate-700 dark:text-slate-300 flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Registry Accredited:</span>
                        <span>{aiAgentResult.registry_evidence.accredited_id} ({aiAgentResult.registry_evidence.accredited_capacity_mw} MW)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-slate-700 dark:text-slate-300 font-mono">Judicial Ruling Determination</Label>
              <Select
                value={adjudicateAction}
                onChange={(e) => setAdjudicateAction(e.target.value as any)}
              >
                <option value="CONFIRM_FRAUD_HOLD" className="bg-white dark:bg-surface-container text-slate-900 dark:text-slate-100">
                  CONFIRM_FRAUD_HOLD (Reject & Impose Penal Sanctions)
                </option>
                <option value="CLEAR_AND_ISSUE" className="bg-white dark:bg-surface-container text-slate-900 dark:text-slate-100">
                  CLEAR_AND_ISSUE (Authorize & Mint Valid REC)
                </option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 dark:text-slate-300 font-mono">Legal Findings & Docket Audit Notes</Label>
              <Input
                value={adjudicateFindings}
                onChange={(e) => setAdjudicateFindings(e.target.value)}
                placeholder="Physical meter tamper confirmed / Passed forensic cross-audit..."
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAdjudicateModalOpen(false)}
              className="border-slate-300 dark:border-outline-variant/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-container-highest"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjudicate}
              disabled={actionLoading}
              className={`font-bold font-headline ${
                adjudicateAction === "CONFIRM_FRAUD_HOLD"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-surface"
              }`}
            >
              {actionLoading ? "Signing Judicial Order..." : "Sign & Anchor Judicial Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: P2P REC TOKEN TRANSFER                                           */}
      {/* ========================================================================= */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent onClose={() => setIsTransferModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Transfer REC Certificate</DialogTitle>
            <DialogDescription>
              Certificate: <span className="font-mono font-bold text-emerald-700 dark:text-primary">{selectedCert?.certificate_uid}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-700 dark:text-slate-300 font-mono">Target Recipient Consortium ID</Label>
              <Input
                type="number"
                value={transferTargetUser}
                onChange={(e) => setTransferTargetUser(Number(e.target.value))}
                min={1}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 dark:text-slate-300 font-mono">Bilateral Transfer Audit Notes</Label>
              <Input
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Bilateral OTC trade transaction reference..."
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTransferModalOpen(false)}
              className="border-slate-300 dark:border-outline-variant/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-container-highest"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-surface font-bold font-headline"
            >
              {actionLoading ? "Anchoring Transfer..." : "Confirm Bilateral Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
