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

// shadcn UI Primitives
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// Lucide Icons
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
  LogOut,
  Plus,
  Send,
  Lock,
  UserCheck,
  RefreshCw,
  Award,
  ArrowRightLeft,
  XCircle,
  Sun,
  Wind,
  Layers,
  Search,
  Activity,
  History,
  Check,
  ExternalLink,
  Gavel,
  ChevronRight,
  Database,
  Building,
  Radio,
  Menu,
  Sparkles,
  Leaf,
  ChevronDown,
} from "lucide-react";

// Login Portals
const LOGIN_PORTALS = [
  { id: "regulator", title: "Regulatory Authority", subtitle: "RERC Commission", email: "regulator@recguardian.org", role: "REGULATOR",
    icon: ShieldCheck, color: "blue", iconBg: "bg-blue-100", iconColor: "text-blue-700", border: "border-blue-200", activeBorder: "border-blue-500" },
  { id: "admin", title: "System Administrator", subtitle: "REC Guardian Authority", email: "admin@recguardian.org", role: "ADMIN",
    icon: Lock, color: "purple", iconBg: "bg-purple-100", iconColor: "text-purple-700", border: "border-purple-200", activeBorder: "border-purple-500" },
  { id: "auditor", title: "Forensic ESG Auditor", subtitle: "Apex Forensic Audit Group", email: "auditor@recguardian.org", role: "AUDITOR",
    icon: FileSearch, color: "amber", iconBg: "bg-amber-100", iconColor: "text-amber-700", border: "border-amber-200", activeBorder: "border-amber-500" },
  { id: "solar", title: "Solar Energy Producer", subtitle: "Helios Solar LLC — 50 MW", email: "generator@solarfarm.com", role: "GENERATOR",
    icon: Sun, color: "yellow", iconBg: "bg-yellow-100", iconColor: "text-yellow-700", border: "border-yellow-200", activeBorder: "border-yellow-500" },
  { id: "wind", title: "Wind Energy Producer", subtitle: "Boreas Wind Energy — 120 MW", email: "generator2@windpower.com", role: "GENERATOR",
    icon: Wind, color: "cyan", iconBg: "bg-cyan-100", iconColor: "text-cyan-700", border: "border-cyan-200", activeBorder: "border-cyan-500" },
  { id: "trader", title: "Energy Trader", subtitle: "Global Carbon & REC Exchange", email: "trader@energytrade.com", role: "GENERATOR",
    icon: ArrowRightLeft, color: "indigo", iconBg: "bg-indigo-100", iconColor: "text-indigo-700", border: "border-indigo-200", activeBorder: "border-indigo-500" },
];

function TwinLeafLogo({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 25C11 15 20 8 20 8C20 8 21 17 17 21C14.5 23.5 12.5 24.8 11 25Z" fill="#84cc16"/>
      <path d="M25 25C25 15 16 8 16 8C16 8 15 17 19 21C21.5 23.5 23.5 24.8 25 25Z" fill="#15803d"/>
      <path d="M18 28V20" stroke="#86efac" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function AuthScreen({
  loginEmail, setLoginEmail, loginPassword, setLoginPassword,
  authError, loading, onQuickLogin,
}: {
  loginEmail: string; setLoginEmail: (v: string) => void;
  loginPassword: string; setLoginPassword: (v: string) => void;
  authError: string | null; loading: boolean;
  onQuickLogin: (email: string, password?: string) => Promise<void>;
}) {
  const [selectedPortal, setSelectedPortal] = React.useState<(typeof LOGIN_PORTALS)[0] | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"portal" | "manual">("portal");
  const [regName, setRegName] = React.useState("");
  const [regEmail, setRegEmail] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regOrg, setRegOrg] = React.useState("");

  const handlePortalSelect = (portal: (typeof LOGIN_PORTALS)[0]) => {
    setSelectedPortal(portal);
    setLoginEmail(portal.email);
    setLoginPassword("password123");
  };

  const handlePortalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onQuickLogin(loginEmail, loginPassword);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // register then login
    try {
      await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, password: regPassword, full_name: regName, organization_name: regOrg, role: "GENERATOR" }),
      });
      await onQuickLogin(regEmail, regPassword);
    } catch {
      // error handled by parent
    }
  };

  return (
    <div className="min-h-screen bg-[#f0fdf4] flex flex-col" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2315803d' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
      {/* Brand bar */}
      <div className="bg-[#143d2b] py-4 px-6 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
              <TwinLeafLogo size={28} />
            </div>
            <div>
              <div className="text-[#84cc16] text-[10px] font-bold tracking-widest uppercase">TEAM: KHATRON KE KHILADI</div>
              <div className="text-white text-lg font-bold tracking-tight leading-none">REC GUARDIAN</div>
            </div>
          </div>
          <div className="hidden md:flex items-center px-4 py-1.5 rounded-full border-2 border-[#84cc16]/60 bg-[#0c2419]/50">
            <span className="text-[#bef264] text-xs font-bold tracking-widest uppercase">DETECT · EXPLAIN · INVESTIGATE · PRESERVE</span>
          </div>
          <div className="hidden sm:block text-white/40 text-xs">AI Forensics + SHA-256 Ledger</div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#dcfce7] border border-[#bbf7d0] text-[#15803d] text-xs font-semibold mb-4">
              <ShieldCheck className="h-3.5 w-3.5" /> Renewable Energy Certificate Fraud Detection Platform
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#143d2b] mb-2">Welcome to REC Guardian</h1>
            <p className="text-[#6b9e7d] text-sm max-w-xl mx-auto">
              Select your role portal to access forensic surveillance. Each portal provides role-specific capabilities.
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[
              { id: "portal" as const, label: "Quick Login", icon: Zap },
              { id: "manual" as const, label: "Manual Login", icon: Lock },
            ].map(tab => (
              <button key={tab.id} onClick={() => { setAuthMode(tab.id); setSelectedPortal(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  authMode === tab.id ? "bg-[#15803d] text-white shadow-sm" : "bg-white border border-[#c8ded0] text-[#143d2b] hover:bg-[#f0f7f2]"
                }`}>
                <tab.icon className="h-3.5 w-3.5" /> {tab.label}
              </button>
            ))}
          </div>

          {/* Portal Grid */}
          {authMode === "portal" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {LOGIN_PORTALS.map(portal => {
                  const IconComp = portal.icon;
                  return (
                    <button key={portal.id} onClick={() => handlePortalSelect(portal)}
                      className={`rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 ${
                        selectedPortal?.id === portal.id
                          ? `${portal.activeBorder} bg-[#f0fdf4]`
                          : `${portal.border} bg-white hover:border-[#15803d]`
                      }`} style={{ boxShadow: "0 2px 12px rgba(20,61,43,0.07)" }}>
                      <div className={`w-10 h-10 rounded-xl ${portal.iconBg} ${portal.iconColor} flex items-center justify-center mb-3`}>
                        <IconComp className="h-5 w-5" />
                      </div>
                      <div className="font-bold text-[#143d2b] text-sm leading-tight mb-0.5">{portal.title}</div>
                      <div className="text-[#6b9e7d] text-xs mb-2">{portal.subtitle}</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        portal.role === "REGULATOR" ? "bg-blue-100 text-blue-800"
                        : portal.role === "ADMIN" ? "bg-[#143d2b] text-white"
                        : portal.role === "AUDITOR" ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                      }`}>{portal.role}</span>
                    </button>
                  );
                })}
              </div>

              {selectedPortal && (
                <div className="bg-white rounded-2xl border border-[#c8ded0] p-6" style={{ boxShadow: "0 4px 24px rgba(20,61,43,0.10)" }}>
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-12 h-12 rounded-xl ${selectedPortal.iconBg} ${selectedPortal.iconColor} flex items-center justify-center`}>
                      <selectedPortal.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-bold text-[#143d2b]">{selectedPortal.title}</div>
                      <div className="text-[#6b9e7d] text-xs">{selectedPortal.subtitle}</div>
                    </div>
                  </div>
                  <form onSubmit={handlePortalLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#143d2b] mb-1.5">Email Address</label>
                      <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="h-10 bg-[#f8faf7]" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#143d2b] mb-1.5">Password</label>
                      <Input type={showPassword ? "text" : "password"} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="h-10 bg-[#f8faf7]" required />
                    </div>
                    {authError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{authError}</div>}
                    <Button type="submit" disabled={loading} className="w-full h-11 bg-[#15803d] hover:bg-[#166534] text-white font-bold rounded-xl">
                      {loading ? "Authenticating..." : `Access ${selectedPortal.title} Portal`}
                    </Button>
                  </form>
                </div>
              )}

              {!selectedPortal && (
                <p className="text-center text-[#6b9e7d] text-xs">
                  Select a portal above · All demo accounts use password: <span className="font-mono font-bold text-[#143d2b]">password123</span>
                </p>
              )}
            </div>
          )}

          {/* Manual Login */}
          {authMode === "manual" && (
            <div className="bg-white rounded-2xl border border-[#c8ded0] p-8 max-w-md mx-auto" style={{ boxShadow: "0 4px 24px rgba(20,61,43,0.10)" }}>
              <form onSubmit={handlePortalLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#143d2b] mb-1.5">Email Address</label>
                  <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="user@example.com" className="h-10" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#143d2b] mb-1.5">Password</label>
                  <Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="h-10" required />
                </div>
                {authError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{authError}</div>}
                <Button type="submit" disabled={loading} className="w-full h-11 bg-[#15803d] hover:bg-[#166534] text-white font-bold rounded-xl">
                  {loading ? "Signing in..." : "Sign In Securely"}
                </Button>
              </form>
            </div>
          )}

          {/* Feature pills */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { icon: ShieldAlert, label: "AI Fraud Detection", sub: "Isolation Forest + Rule Engine" },
              { icon: Database, label: "SHA-256 Ledger", sub: "Tamper-evident audit chain" },
              { icon: Activity, label: "Graph Surveillance", sub: "NetworkX wash-trading detection" },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#c8ded0] p-4" style={{ boxShadow: "0 2px 12px rgba(20,61,43,0.07)" }}>
                <f.icon className="h-5 w-5 text-[#15803d] mx-auto mb-2" />
                <div className="text-xs font-bold text-[#143d2b]">{f.label}</div>
                <div className="text-[11px] text-[#6b9e7d] mt-0.5">{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Preset queries for the Lineage Explorer
const DEMO_LINEAGE_QUERIES = [
  { label: "Meter Overclaim (+216%)", query: "CLM-2026-FRAUD-MTR", badge: "FRAUD" },
  { label: "Capacity Impossibility (>240%)", query: "CLM-2026-FRAUD-CAP", badge: "FRAUD" },
  { label: "Circular Wash Trading Loop", query: "REC-2026-WND-88319", badge: "LOOP" },
  { label: "Verified Active Solar REC", query: "REC-2026-SOL-09921", badge: "VERIFIED" },
  { label: "Clean Generation Baseline", query: "CLM-2026-LEGIT-01", badge: "CLEAN" },
];


export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authPortal, setAuthPortal] = useState<"USER" | "REGULATOR">("REGULATOR");
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [loginEmail, setLoginEmail] = useState("regulator@recguardian.org");
  const [loginPassword, setLoginPassword] = useState("password123");
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regOrg, setRegOrg] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);

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

  // Lineage Explorer State
  const [lineageSearchInput, setLineageSearchInput] = useState("CLM-2026-FRAUD-MTR");
  const [lineageData, setLineageData] = useState<any>(null);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [lineageError, setLineageError] = useState<string | null>(null);

  // Mobile menu drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isAdjudicateModalOpen, setIsAdjudicateModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);
  const [adjudicateAction, setAdjudicateAction] = useState<"CONFIRM_FRAUD_HOLD" | "CLEAR_AND_ISSUE">("CONFIRM_FRAUD_HOLD");
  const [adjudicateFindings, setAdjudicateFindings] = useState("");
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

  // Document Verification State
  const [verifyingDoc, setVerifyingDoc] = useState(false);
  const [docVerifyResult, setDocVerifyResult] = useState<any>(null);

  // Search & Filter in Claims Table
  const [claimsFilterStatus, setClaimsFilterStatus] = useState<string>("ALL");
  const [claimsSearchQuery, setClaimsSearchQuery] = useState<string>("");

  // Secure boot flow: only hydrate the dashboard after a valid token is confirmed.
  useEffect(() => {
    const initAuth = async () => {
      try {
        const me = await ApiService.getMe();
        setUser(me);
        await loadDashboardData();
      } catch (err) {
        setUser(null);
        setAuthError(null);
      } finally {
        setIsBooting(false);
      }
    };

    initAuth();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const res = await ApiService.loginJson(loginEmail, loginPassword);
      setUser(res.user);
      setLoginEmail(res.user.email);
      await loadDashboardData();
    } catch (err: any) {
      setAuthError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      await ApiService.register({
        email: regEmail,
        password: regPassword,
        full_name: regFullName,
        organization_name: regOrg,
        role: authPortal === "REGULATOR" ? "REGULATOR" : "GENERATOR",
      });
      await handleQuickLogin(regEmail, regPassword);
    } catch (err: any) {
      setAuthError(err.message || "Registration failed");
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
    if (!confirm("Are you sure you want to permanently redeem/retire this REC for Scope 2 ESG compliance?")) return;
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

  // Filtered Claims
  const filteredClaims = claims.filter((c) => {
    const matchesStatus = claimsFilterStatus === "ALL" || c.status === claimsFilterStatus;
    const matchesQuery =
      !claimsSearchQuery ||
      c.claim_uid.toLowerCase().includes(claimsSearchQuery.toLowerCase()) ||
      c.status.toLowerCase().includes(claimsSearchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  // Calculate quick totals
  const totalMwhClaimed = stats?.total_mwh_claimed || claims.reduce((acc, c) => acc + c.claimed_mwh, 0);
  const totalMwhIssued = stats?.total_mwh_issued || certificates.reduce((acc, c) => acc + c.mwh, 0);
  const pendingCount = claims.filter((c) => c.status === "PENDING" || c.status === "UNDER_REVIEW").length;
  const heldCount = claims.filter((c) => c.status === "HELD" || c.status === "REJECTED").length;

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0fdf4]">
        <div className="flex items-center gap-3 rounded-full border border-[#c8ded0] bg-white px-5 py-3 shadow-md">
          <RefreshCw className="h-4 w-4 animate-spin text-[#15803d]" />
          <span className="text-sm font-medium text-[#143d2b]">Verifying session...</span>
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
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf7] text-forest-900 flex flex-col font-sans selection:bg-leaf-100 selection:text-leaf-800">
      {/* Presentation Deck Style Hero Banner */}
      <header className="relative bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 text-white shadow-md border-b border-forest-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3.5">
              {/* Twin-Leaf Logo from Presentation Slide */}
              <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 shadow-inner">
                <svg viewBox="0 0 36 36" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Light Lime Leaf */}
                  <path
                    d="M11 25C11 15 20 8 20 8C20 8 21 17 17 21C14.5 23.5 12.5 24.8 11 25Z"
                    fill="#84cc16"
                  />
                  {/* Deep Green / White Leaf */}
                  <path
                    d="M25 25C25 15 16 8 16 8C16 8 15 17 19 21C21.5 23.5 23.5 24.8 25 25Z"
                    fill="#ffffff"
                  />
                  {/* Central Stem */}
                  <path d="M18 28V20" stroke="#dcfce7" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold tracking-[0.24em] text-emerald-200 uppercase">
                    Renewable compliance intelligence
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  REC GUARDIAN
                  <span className="hidden sm:inline-block text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    Forensic governance platform
                  </span>
                </h1>
              </div>
            </div>

            {/* Slide Subtitle Pill: "DETECT. EXPLAIN. INVESTIGATE. PRESERVE EVIDENCE." */}
            <div className="hidden lg:flex items-center">
              <div className="px-4 py-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 shadow-sm">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-emerald-200 uppercase">
                  Detect. Explain. Investigate. Preserve evidence.
                </span>
              </div>
            </div>

            {/* Persona Quick Switcher & User Profile */}
            <div className="flex items-center justify-between sm:justify-end gap-3">
              {user ? (
                <div className="flex items-center gap-2.5">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-semibold text-white leading-tight">{user.full_name}</p>
                    <p className="text-[11px] text-sprout-300 font-mono">{user.role} • {user.organization_name || "Registry"}</p>
                  </div>
                  <Badge variant="lime" className="text-[11px]">
                    {user.role}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:mr-1" />
                    <span className="hidden sm:inline text-xs">Exit</span>
                  </Button>
                </div>
              ) : (
                <Badge variant="secondary" className="bg-white/10 text-white border-white/10 text-xs">
                  Public Guest Mode
                </Badge>
              )}

              {/* Mobile menu hamburger button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden text-white hover:bg-white/10"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs Bar (Desktop) */}
        <div className="hidden lg:block mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border border-sage-200 p-1.5 shadow-sm rounded-xl w-full justify-start gap-1">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-leaf-700 data-[state=active]:text-white gap-2">
                <Activity className="w-4 h-4" /> Overview & KPI Radar
              </TabsTrigger>
              <TabsTrigger value="claims" className="data-[state=active]:bg-leaf-700 data-[state=active]:text-white gap-2">
                <FileSearch className="w-4 h-4" /> Claims Triage
                {heldCount > 0 && <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">{heldCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="lineage" className="data-[state=active]:bg-leaf-700 data-[state=active]:text-white gap-2">
                <Link2 className="w-4 h-4" /> Certificate Lineage Explorer
              </TabsTrigger>
              <TabsTrigger value="wallet" className="data-[state=active]:bg-leaf-700 data-[state=active]:text-white gap-2">
                <Award className="w-4 h-4" /> Digital REC Wallet
              </TabsTrigger>
              <TabsTrigger value="investigations" className="data-[state=active]:bg-leaf-700 data-[state=active]:text-white gap-2">
                <Gavel className="w-4 h-4" /> Regulatory Adjudication
                {cases.filter((c) => c.status === "OPEN").length > 0 && (
                  <Badge variant="warning" className="ml-1 px-1.5 py-0 text-[10px]">
                    {cases.filter((c) => c.status === "OPEN").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ledger" className="data-[state=active]:bg-leaf-700 data-[state=active]:text-white gap-2">
                <Database className="w-4 h-4" /> Cryptographic Ledger
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Mobile Navigation Drawer Sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-leaf-700 text-white flex items-center justify-center font-bold">
                <Leaf className="w-4 h-4 text-sprout-400" />
              </div>
              <SheetTitle>REC Guardian</SheetTitle>
            </div>
            <p className="text-xs text-sage-600">Select audit module</p>
          </SheetHeader>
          <div className="flex flex-col gap-1.5 mt-4">
            {[
              { id: "dashboard", label: "Overview & KPI Radar", icon: Activity },
              { id: "claims", label: "Claims Triage", icon: FileSearch, badge: heldCount },
              { id: "lineage", label: "Certificate Lineage", icon: Link2 },
              { id: "wallet", label: "Digital REC Wallet", icon: Award },
              { id: "investigations", label: "Regulatory Adjudication", icon: Gavel },
              { id: "ledger", label: "Cryptographic Ledger", icon: Database },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? "bg-leaf-700 text-white font-semibold"
                      : "text-forest-900 hover:bg-sage-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <Badge variant={activeTab === item.id ? "secondary" : "destructive"}>{item.badge}</Badge>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Sheet>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & DASHBOARD RADAR                                         */}
        {/* ========================================================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Top Alert / Verification Banner */}
            <div className="p-4 rounded-xl bg-white border border-sage-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-forest-900">
                    Cryptographic Ledger Integrity: {ledgerAudit?.is_valid ? "VERIFIED VALID" : "CHECK IN PROGRESS"}
                  </h3>
                  <p className="text-xs text-sage-600">
                    Append-only SHA-256 hash chain anchored across {ledgerAudit?.total_blocks || ledgerBlocks.length} lifecycle blocks. Zero tampering detected.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Blockchain Synchronized
                </Badge>
                <Button size="sm" variant="outline" onClick={loadDashboardData} disabled={loading}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </div>
            </div>

            {/* 4 Metric Cards in Leaves Green & White Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Card 1: Total Generation Volume */}
              <Card className="border-sage-200 shadow-sm hover:border-leaf-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-sage-600">
                    Total Clean Energy Claimed
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-leaf-50 border border-leaf-200 flex items-center justify-center text-leaf-700">
                    <Sun className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-forest-900">
                    {totalMwhClaimed.toLocaleString()} <span className="text-sm font-normal text-sage-600">MWh</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-sage-600">
                    <span>Verified MWh Issued:</span>
                    <span className="font-semibold text-leaf-700">{totalMwhIssued.toLocaleString()} MWh</span>
                  </div>
                  <Progress value={(totalMwhIssued / (totalMwhClaimed || 1)) * 100} className="mt-2 h-1.5 bg-sage-100" />
                </CardContent>
              </Card>

              {/* Card 2: Registered Clean Facilities */}
              <Card className="border-sage-200 shadow-sm hover:border-leaf-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-sage-600">
                    Generation Facilities
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                    <Factory className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-forest-900">
                    {plants.length || stats?.total_plants || 2} <span className="text-sm font-normal text-sage-600">Assets</span>
                  </div>
                  <p className="text-xs text-sage-600 mt-2">
                    Solar PV & Wind utility assets linked to IoT telemetry meters.
                  </p>
                </CardContent>
              </Card>

              {/* Card 3: Claims Under Surveillance */}
              <Card className="border-sage-200 shadow-sm hover:border-leaf-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-sage-600">
                    Forensic Claims Status
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <FileSearch className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-forest-900">
                    {claims.length} <span className="text-sm font-normal text-sage-600">Total</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="destructive" className="text-[10px]">
                      {heldCount} Held
                    </Badge>
                    <Badge variant="success" className="text-[10px]">
                      {claims.filter((c) => c.status === "APPROVED").length} Approved
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Open Regulatory Investigations */}
              <Card className="border-sage-200 shadow-sm hover:border-leaf-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-sage-600">
                    Active Dockets
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-700">
                    <Gavel className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-forest-900">
                    {cases.length} <span className="text-sm font-normal text-sage-600">Cases</span>
                  </div>
                  <p className="text-xs text-sage-600 mt-2">
                    {cases.filter((c) => c.status === "OPEN").length} awaiting regulatory judicial order.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Middle Section: Recent Claims + Live Quick Lineage Search */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Claims Preview (Left 2 cols) */}
              <Card className="lg:col-span-2 border-sage-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Generation Claims</CardTitle>
                    <CardDescription>Multi-engine fraud detection scoring & telemetry cross-checks</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("claims")}>
                    View All Claims <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Claim UID</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {claims.slice(0, 5).map((claim) => (
                        <TableRow key={claim.id}>
                          <TableCell className="font-mono font-medium text-xs">
                            {claim.claim_uid}
                          </TableCell>
                          <TableCell>{claim.claimed_mwh.toLocaleString()} MWh</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                claim.risk_score >= 70
                                  ? "bg-red-100 text-red-800"
                                  : claim.risk_score >= 30
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {claim.risk_score.toFixed(1)} / 100
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                claim.status === "APPROVED"
                                  ? "success"
                                  : claim.status === "HELD" || claim.status === "REJECTED"
                                  ? "destructive"
                                  : "warning"
                              }
                            >
                              {claim.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedClaim(claim)}
                              className="text-leaf-700 hover:text-leaf-900"
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Quick Lineage Explorer Launcher (Right 1 col) */}
              <Card className="border-sage-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-leaf-700" />
                    Forensic Lineage
                  </CardTitle>
                  <CardDescription>
                    Explore 6-stage telemetry provenance and chronological evidence timeline
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. CLM-2026-FRAUD-MTR"
                      value={lineageSearchInput}
                      onChange={(e) => setLineageSearchInput(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        handleExecuteLineageSearch(lineageSearchInput);
                        setActiveTab("lineage");
                      }}
                    >
                      Inspect
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-sage-600">Quick Test Scenarios:</p>
                    <div className="flex flex-col gap-1.5">
                      {DEMO_LINEAGE_QUERIES.map((demo) => (
                        <button
                          key={demo.query}
                          onClick={() => {
                            setLineageSearchInput(demo.query);
                            handleExecuteLineageSearch(demo.query);
                            setActiveTab("lineage");
                          }}
                          className="text-left text-xs p-2 rounded-lg bg-sage-50 hover:bg-sage-100 border border-sage-200/60 flex items-center justify-between transition-colors"
                        >
                          <span className="font-medium text-forest-900">{demo.label}</span>
                          <span className="font-mono text-[10px] text-sage-600">{demo.query}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CLAIMS TRIAGE                                                      */}
        {/* ========================================================================= */}
        {activeTab === "claims" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-forest-900">Generation Claims Triage</h2>
                <p className="text-xs sm:text-sm text-sage-600">
                  Real-time fraud surveillance matching generation claims against substation meters and physical laws.
                </p>
              </div>
              <Button onClick={() => setIsSubmitModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Submit Generation Claim
              </Button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-sage-500" />
                <Input
                  placeholder="Search by Claim UID, status, or plant..."
                  className="pl-9"
                  value={claimsSearchQuery}
                  onChange={(e) => setClaimsSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
                {["ALL", "APPROVED", "HELD", "UNDER_REVIEW"].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={claimsFilterStatus === status ? "default" : "outline"}
                    onClick={() => setClaimsFilterStatus(status)}
                    className="text-xs whitespace-nowrap"
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>

            {/* Claims Table */}
            <Card className="border-sage-200">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim UID</TableHead>
                      <TableHead>Facility</TableHead>
                      <TableHead>Claimed MWh</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Multi-Engine Risk</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClaims.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sage-600">
                          No generation claims matched your filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClaims.map((claim) => (
                        <TableRow key={claim.id}>
                          <TableCell className="font-mono text-xs font-semibold">
                            {claim.claim_uid}
                          </TableCell>
                          <TableCell className="text-xs">
                            {plants.find((p) => p.id === claim.plant_id)?.name || `Plant #${claim.plant_id}`}
                          </TableCell>
                          <TableCell className="font-medium">
                            {claim.claimed_mwh.toLocaleString()} MWh
                          </TableCell>
                          <TableCell className="text-xs text-sage-600">
                            {claim.period_start?.substring(0, 10)} to {claim.period_end?.substring(0, 10)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                                  claim.risk_score >= 70
                                    ? "bg-red-100 text-red-800"
                                    : claim.risk_score >= 30
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {claim.risk_score.toFixed(1)}
                              </span>
                              <span className="text-[11px] text-sage-600">
                                {claim.risk_score >= 70 ? "CRITICAL" : claim.risk_score >= 30 ? "MEDIUM" : "LOW"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                claim.status === "APPROVED"
                                  ? "success"
                                  : claim.status === "HELD" || claim.status === "REJECTED"
                                  ? "destructive"
                                  : "warning"
                              }
                            >
                              {claim.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedClaim(claim)}
                              className="text-xs h-8"
                            >
                              Inspect
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setLineageSearchInput(claim.claim_uid);
                                handleExecuteLineageSearch(claim.claim_uid);
                                setActiveTab("lineage");
                              }}
                              className="text-xs h-8 text-leaf-700"
                            >
                              Lineage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: 6-STAGE LINEAGE PROVENANCE EXPLORER                                */}
        {/* ========================================================================= */}
        {activeTab === "lineage" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-forest-900">Certificate Lineage Explorer</h2>
                <p className="text-xs sm:text-sm text-sage-600">
                  End-to-end multi-stage provenance and chronological evidence timeline for any certificate or claim.
                </p>
              </div>
            </div>

            {/* Search Input and Quick Presets */}
            <Card className="border-sage-200">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3.5 text-sage-500" />
                    <Input
                      placeholder="Enter Certificate UID (e.g. REC-2026-SOL-09921) or Claim UID (e.g. CLM-2026-FRAUD-MTR)..."
                      className="pl-9 font-mono text-sm h-11"
                      value={lineageSearchInput}
                      onChange={(e) => setLineageSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleExecuteLineageSearch(lineageSearchInput)}
                    />
                  </div>
                  <Button
                    className="h-11 px-6 gap-2"
                    onClick={() => handleExecuteLineageSearch(lineageSearchInput)}
                    disabled={lineageLoading}
                  >
                    {lineageLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Trace Lineage
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-sage-600">Preset Scenarios:</span>
                  {DEMO_LINEAGE_QUERIES.map((demo) => (
                    <button
                      key={demo.query}
                      onClick={() => {
                        setLineageSearchInput(demo.query);
                        handleExecuteLineageSearch(demo.query);
                      }}
                      className="px-2.5 py-1 rounded-full bg-sage-100 hover:bg-sage-200 text-forest-900 font-medium transition-colors border border-sage-200"
                    >
                      {demo.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {lineageError && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Lineage Query Error</AlertTitle>
                <AlertDescription>{lineageError}</AlertDescription>
              </Alert>
            )}

            {lineageData && (
              <div className="space-y-6">
                {/* 6-Stage Lineage Cards */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-sage-600 mb-3">
                    6-Stage Provenance Pipeline
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Stage 1: Facility */}
                    <Card className="border-sage-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sprout-600 uppercase tracking-wider">Stage 1</span>
                          <Factory className="w-4 h-4 text-sage-500" />
                        </div>
                        <CardTitle className="text-base">Generation Asset</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1.5 text-sage-600">
                        <p className="font-semibold text-forest-900 text-sm">{lineageData.plant?.name || "N/A"}</p>
                        <p>Technology: <span className="font-medium text-forest-900">{lineageData.plant?.fuel_type || "SOLAR"}</span></p>
                        <p>Nameplate Capacity: <span className="font-medium text-forest-900">{lineageData.plant?.nameplate_capacity_mw || 50} MW</span></p>
                      </CardContent>
                    </Card>

                    {/* Stage 2: Smart Meter */}
                    <Card className="border-sage-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sprout-600 uppercase tracking-wider">Stage 2</span>
                          <Radio className="w-4 h-4 text-sage-500" />
                        </div>
                        <CardTitle className="text-base">Substation Meter</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1.5 text-sage-600">
                        <p className="font-mono text-forest-900">{lineageData.meter?.meter_serial_number || "MTR-SOL-001"}</p>
                        <p>Metered Energy: <span className="font-semibold text-forest-900">{lineageData.meter?.energy_generated_mwh?.toLocaleString() || "1,200"} MWh</span></p>
                        <p>Source: <span className="font-medium text-forest-900">Utility Grid Interconnection</span></p>
                      </CardContent>
                    </Card>

                    {/* Stage 3: Fingerprint Hashes */}
                    <Card className="border-sage-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sprout-600 uppercase tracking-wider">Stage 3</span>
                          <Lock className="w-4 h-4 text-sage-500" />
                        </div>
                        <CardTitle className="text-base">Claim Cryptography</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1.5 text-sage-600">
                        <p>Claim UID: <span className="font-mono font-medium text-forest-900">{lineageData.claim?.claim_uid}</span></p>
                        <p>Claimed Energy: <span className="font-semibold text-forest-900">{lineageData.claim?.claimed_mwh?.toLocaleString()} MWh</span></p>
                        <p className="truncate font-mono text-[10px] text-sage-500">Hash: {lineageData.claim?.submission_fingerprint || "e3b0c442..."}</p>
                      </CardContent>
                    </Card>

                    {/* Stage 4: Risk Scoring */}
                    <Card className="border-sage-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sprout-600 uppercase tracking-wider">Stage 4</span>
                          <Scale className="w-4 h-4 text-sage-500" />
                        </div>
                        <CardTitle className="text-base">Forensic Risk Score</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1.5 text-sage-600">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-forest-900">
                            {lineageData.claim?.risk_score?.toFixed(1) || 0} / 100
                          </span>
                          <Badge
                            variant={
                              (lineageData.claim?.risk_score || 0) >= 70
                                ? "destructive"
                                : (lineageData.claim?.risk_score || 0) >= 30
                                ? "warning"
                                : "success"
                            }
                          >
                            {lineageData.claim?.risk_score >= 70 ? "CRITICAL FRAUD" : "VERIFIED"}
                          </Badge>
                        </div>
                        <p>Status: <span className="font-semibold">{lineageData.claim?.status}</span></p>
                      </CardContent>
                    </Card>

                    {/* Stage 5: Ledger Anchor */}
                    <Card className="border-sage-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sprout-600 uppercase tracking-wider">Stage 5</span>
                          <Database className="w-4 h-4 text-sage-500" />
                        </div>
                        <CardTitle className="text-base">Ledger Anchoring</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1.5 text-sage-600">
                        <p>Linked Blocks: <span className="font-semibold text-forest-900">{lineageData.ledger_blocks?.length || 0} Blocks</span></p>
                        <p className="text-[11px] text-emerald-700 font-medium">SHA-256 Hash Chain Validated</p>
                      </CardContent>
                    </Card>

                    {/* Stage 6: Ownership & Transfers */}
                    <Card className="border-sage-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sprout-600 uppercase tracking-wider">Stage 6</span>
                          <Award className="w-4 h-4 text-sage-500" />
                        </div>
                        <CardTitle className="text-base">REC Token State</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1.5 text-sage-600">
                        {lineageData.certificate ? (
                          <>
                            <p className="font-mono font-medium text-forest-900">{lineageData.certificate.certificate_uid}</p>
                            <p>Status: <Badge variant="success">{lineageData.certificate.status}</Badge></p>
                            <p>Transfer Hops: {lineageData.transfers?.length || 0}</p>
                          </>
                        ) : (
                          <p className="text-amber-700 italic">Certificate Not Minted (Claim HELD/Fraudulent)</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Vertical Chronological Evidence Timeline */}
                <Card className="border-sage-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5 text-leaf-700" />
                      Chronological Evidence Timeline
                    </CardTitle>
                    <CardDescription>
                      Full audit trail synthesized from IoT meter logs, risk engine evaluations, and ledger blocks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-sage-200">
                      {(lineageData.timeline || []).map((item: any, idx: number) => (
                        <div key={idx} className="relative">
                          {/* Dot */}
                          <div
                            className={`absolute -left-[27px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                              item.severity === "CRITICAL"
                                ? "bg-red-600"
                                : item.severity === "WARNING"
                                ? "bg-amber-500"
                                : "bg-leaf-600"
                            }`}
                          />
                          <div className="bg-sage-50 p-4 rounded-xl border border-sage-200/80">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                              <h4 className="text-sm font-bold text-forest-900">{item.title}</h4>
                              <span className="text-[11px] font-mono text-sage-500">
                                {item.timestamp ? new Date(item.timestamp).toLocaleString() : "Audit Recorded"}
                              </span>
                            </div>
                            <p className="text-xs text-sage-600">{item.description}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {item.stage}
                              </Badge>
                              {item.actor && (
                                <span className="text-[10px] text-sage-500 font-medium">Actor: {item.actor}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DIGITAL REC WALLET                                                 */}
        {/* ========================================================================= */}
        {activeTab === "wallet" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-forest-900">Digital REC Wallet</h2>
                <p className="text-xs sm:text-sm text-sage-600">
                  Manage minted Renewable Energy Certificates, execute P2P transfers, or redeem for Scope 2 compliance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="lime" className="text-xs px-3 py-1">
                  Active Holdings: {certificates.filter((c) => c.status === "ISSUED").length} RECs
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {certificates.map((cert) => (
                <Card key={cert.id} className="border-sage-200 shadow-sm hover:border-leaf-500 transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          cert.status === "ISSUED"
                            ? "success"
                            : cert.status === "REDEEMED"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {cert.status}
                      </Badge>
                      <span className="text-xs font-mono text-sage-500">Vintage: {cert.vintage_year}-{cert.vintage_month}</span>
                    </div>
                    <CardTitle className="font-mono text-sm mt-2 text-forest-900">
                      {cert.certificate_uid}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-sage-600">
                    <div className="flex justify-between">
                      <span>Volume:</span>
                      <span className="font-bold text-forest-900 text-sm">{cert.mwh.toLocaleString()} MWh</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Technology:</span>
                      <span className="font-medium text-forest-900">{cert.fuel_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Owner User ID:</span>
                      <span className="font-mono">User #{cert.current_owner_id}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    {cert.status === "ISSUED" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={() => {
                            setSelectedCert(cert);
                            setIsTransferModalOpen(true);
                          }}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Transfer
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 text-xs bg-leaf-700 hover:bg-leaf-800 text-white"
                          onClick={() => handleRedeem(cert.id)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Redeem
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-sage-500 italic py-1">Certificate Retired</span>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: REGULATORY ADJUDICATION                                            */}
        {/* ========================================================================= */}
        {activeTab === "investigations" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-forest-900">Regulatory Adjudication Terminal</h2>
                <p className="text-xs sm:text-sm text-sage-600">
                  Human-in-the-loop judicial case review for flagged fraud claims and wash-trading rings.
                </p>
              </div>
            </div>

            <Card className="border-sage-200">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case Number</TableHead>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Decision Action</TableHead>
                      <TableHead className="text-right">Adjudicate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-sage-600">
                          No investigation dockets currently open.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cases.map((cs) => (
                        <TableRow key={cs.id}>
                          <TableCell className="font-mono text-xs font-bold text-forest-900">
                            {cs.case_number}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            Claim #{cs.claim_id}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                cs.priority === "CRITICAL"
                                  ? "destructive"
                                  : cs.priority === "HIGH"
                                  ? "warning"
                                  : "outline"
                              }
                            >
                              {cs.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-semibold">{cs.status}</span>
                          </TableCell>
                          <TableCell className="text-xs text-sage-600">
                            {cs.decision_action || "PENDING"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCase(cs);
                                setIsAdjudicateModalOpen(true);
                              }}
                              className="text-xs h-8"
                            >
                              <Gavel className="w-3.5 h-3.5 mr-1" /> Order Action
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: CRYPTOGRAPHIC LEDGER                                               */}
        {/* ========================================================================= */}
        {activeTab === "ledger" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-forest-900">Cryptographic Ledger Inspector</h2>
                <p className="text-xs sm:text-sm text-sage-600">
                  Append-only SHA-256 block chain securing all certificate issuance, transfers, and investigations.
                </p>
              </div>
              <Button onClick={loadDashboardData} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" /> Re-audit Chain
              </Button>
            </div>

            {/* Document Hash Verification Tool */}
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-leaf-700" />
                  Evidence Document Hash Verifier
                </CardTitle>
                <CardDescription>
                  Upload any utility single-line diagram or meter CSV report to check cryptographic integrity and prevent document reuse.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-sage-300 rounded-xl p-6 text-center bg-sage-50/50 hover:bg-sage-50 transition-colors">
                  <input
                    type="file"
                    id="doc-file-input"
                    className="hidden"
                    onChange={handleDocumentVerify}
                    disabled={verifyingDoc}
                  />
                  <label htmlFor="doc-file-input" className="cursor-pointer flex flex-col items-center">
                    <FileSearch className="w-8 h-8 text-leaf-700 mb-2" />
                    <span className="text-sm font-semibold text-forest-900">
                      {verifyingDoc ? "Computing SHA-256 Hash..." : "Click to select evidence document"}
                    </span>
                    <span className="text-xs text-sage-500 mt-1">PDF, CSV, or PNG telemetry files</span>
                  </label>
                </div>

                {docVerifyResult && (
                  <Alert variant={docVerifyResult.is_registered ? "forest" : "warning"}>
                    <CheckCircle2 className="w-4 h-4" />
                    <AlertTitle>Verification Result: {docVerifyResult.verification_status}</AlertTitle>
                    <AlertDescription className="font-mono text-xs mt-1">
                      File: {docVerifyResult.file_name} <br />
                      Computed Hash: {docVerifyResult.computed_sha256} <br />
                      First Registered Claim: {docVerifyResult.first_seen_claim_uid || "None (New Unregistered Hash)"}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Block Explorer Table */}
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="text-base">Ledger Hash Chain Blocks</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Height</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Block Hash</TableHead>
                      <TableHead>Parent Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerBlocks.map((blk) => (
                      <TableRow key={blk.id}>
                        <TableCell className="font-mono font-bold text-xs">#{blk.index}</TableCell>
                        <TableCell className="text-xs text-sage-600">{new Date(blk.timestamp).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {blk.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{blk.entity_id}</TableCell>
                        <TableCell className="font-mono text-[10px] truncate max-w-[140px] text-leaf-700">
                          {blk.current_hash}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] truncate max-w-[140px] text-sage-500">
                          {blk.previous_hash}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODALS AND DIALOGS                                                        */}
      {/* ========================================================================= */}

      {/* Claim Forensics Inspection Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={(open) => !open && setSelectedClaim(null)}>
        <DialogContent onClose={() => setSelectedClaim(null)}>
          <DialogHeader>
            <DialogTitle>Forensic Risk Breakdown</DialogTitle>
            <DialogDescription>
              Claim UID: <span className="font-mono font-bold text-forest-900">{selectedClaim?.claim_uid}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-sage-50 border border-sage-200 flex items-center justify-between">
                <div>
                  <p className="text-sage-600 font-semibold">Composite Risk Score</p>
                  <p className="text-2xl font-bold text-forest-900">{selectedClaim.risk_score.toFixed(1)} / 100</p>
                </div>
                <Badge
                  variant={
                    selectedClaim.risk_score >= 70
                      ? "destructive"
                      : selectedClaim.risk_score >= 30
                      ? "warning"
                      : "success"
                  }
                  className="text-sm px-3 py-1"
                >
                  {selectedClaim.risk_score >= 70 ? "CRITICAL FRAUD" : selectedClaim.risk_score >= 30 ? "NEEDS REVIEW" : "SAFE"}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-white border border-sage-200">
                  <p className="text-[10px] text-sage-500 font-semibold uppercase">Rule Engine</p>
                  <p className="text-sm font-bold text-forest-900">
                    {selectedClaim.risk_breakdown?.rule_engine_score?.toFixed(1) || 0}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-sage-200">
                  <p className="text-[10px] text-sage-500 font-semibold uppercase">ML Anomaly</p>
                  <p className="text-sm font-bold text-forest-900">
                    {selectedClaim.risk_breakdown?.ml_anomaly_score?.toFixed(1) || 0}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-sage-200">
                  <p className="text-[10px] text-sage-500 font-semibold uppercase">Graph Risk</p>
                  <p className="text-sm font-bold text-forest-900">
                    {selectedClaim.risk_breakdown?.graph_risk_score?.toFixed(1) || 0}
                  </p>
                </div>
              </div>

              {selectedClaim.risk_breakdown?.summary_explanation && (
                <div className="p-3 rounded-lg bg-white border border-sage-200">
                  <p className="font-semibold text-forest-900 mb-1">Forensic Findings:</p>
                  <p className="text-sage-600">{selectedClaim.risk_breakdown.summary_explanation}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedClaim(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Claim Submission Modal */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent onClose={() => setIsSubmitModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Submit Clean Generation Claim</DialogTitle>
            <DialogDescription>
              Submit metered generation to trigger instant hybrid fraud scoring and cryptographic certificate minting.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClaim} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select Clean Power Asset</Label>
              <Select
                value={newClaimPlantId}
                onChange={(e) => setNewClaimPlantId(Number(e.target.value))}
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.nameplate_capacity_mw} MW {p.fuel_type})
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Period Start</Label>
                <Input
                  value={newClaimStart}
                  onChange={(e) => setNewClaimStart(e.target.value)}
                  placeholder="YYYY-MM-DDTHH:MM:SSZ"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Period End</Label>
                <Input
                  value={newClaimEnd}
                  onChange={(e) => setNewClaimEnd(e.target.value)}
                  placeholder="YYYY-MM-DDTHH:MM:SSZ"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Claimed Energy (MWh)</Label>
              <Input
                type="number"
                value={newClaimMwh}
                onChange={(e) => setNewClaimMwh(Number(e.target.value))}
                min={1}
                required
              />
            </div>

            {claimSubmitError && (
              <Alert variant="destructive">
                <AlertDescription>{claimSubmitError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSubmitModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? "Submitting..." : "Submit to Fraud Engine"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjudication Modal */}
      <Dialog open={isAdjudicateModalOpen} onOpenChange={setIsAdjudicateModalOpen}>
        <DialogContent onClose={() => setIsAdjudicateModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Regulatory Judicial Order</DialogTitle>
            <DialogDescription>
              Case: <span className="font-mono font-bold text-forest-900">{selectedCase?.case_number}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label>Regulatory Ruling</Label>
              <Select
                value={adjudicateAction}
                onChange={(e) => setAdjudicateAction(e.target.value as any)}
              >
                <option value="CONFIRM_FRAUD_HOLD">CONFIRM_FRAUD_HOLD (Reject & Sanction)</option>
                <option value="CLEAR_AND_ISSUE">CLEAR_AND_ISSUE (Approve & Mint REC)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Investigative Findings & Legal Notes</Label>
              <Input
                value={adjudicateFindings}
                onChange={(e) => setAdjudicateFindings(e.target.value)}
                placeholder="Document verification check passed / Failed meter audit..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjudicateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={adjudicateAction === "CONFIRM_FRAUD_HOLD" ? "destructive" : "default"}
              onClick={handleAdjudicate}
              disabled={actionLoading}
            >
              {actionLoading ? "Submitting Order..." : "Sign & Commit Judicial Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* P2P Transfer Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent onClose={() => setIsTransferModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Transfer REC Certificate</DialogTitle>
            <DialogDescription>
              Certificate: <span className="font-mono font-bold text-forest-900">{selectedCert?.certificate_uid}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label>Target Recipient User ID</Label>
              <Input
                type="number"
                value={transferTargetUser}
                onChange={(e) => setTransferTargetUser(Number(e.target.value))}
                min={1}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Transfer Audit Notes</Label>
              <Input
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Bilateral OTC trade reference..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={actionLoading}>
              {actionLoading ? "Transferring..." : "Confirm P2P Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
