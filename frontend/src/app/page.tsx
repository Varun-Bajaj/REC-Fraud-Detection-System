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
} from "lucide-react";

// Demo login profiles for testing
const DEMO_PORTALS = {
  USER: [
    { label: "Solar Generator (Helios LLC)", email: "generator@solarfarm.com", role: "GENERATOR", org: "Helios Solar Generation LLC" },
    { label: "Wind Generator (Boreas Ltd)", email: "generator2@windpower.com", role: "GENERATOR", org: "Boreas Wind Energy Ltd" },
    { label: "Energy Trader (Global Carbon)", email: "trader@energytrade.com", role: "GENERATOR", org: "Global Carbon & REC Exchange" },
  ],
  REGULATOR: [
    { label: "Regulatory Officer (RERC)", email: "regulator@recguardian.org", role: "REGULATOR", org: "Renewable Energy Regulatory Commission" },
    { label: "Senior Forensic Auditor", email: "auditor@recguardian.org", role: "AUDITOR", org: "Apex Forensic ESG Audit Group" },
    { label: "System Administrator", email: "admin@recguardian.org", role: "ADMIN", org: "REC Guardian Authority" },
  ],
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authPortal, setAuthPortal] = useState<"USER" | "REGULATOR">("USER");
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [loginEmail, setLoginEmail] = useState("generator@solarfarm.com");
  const [loginPassword, setLoginPassword] = useState("password123");
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regOrg, setRegOrg] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

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

  // Modals & selections
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [transferringCert, setTransferringCert] = useState<Certificate | null>(null);
  const [transferToUserId, setTransferToUserId] = useState("3");
  const [adjudicateAction, setAdjudicateAction] = useState<"CONFIRM_FRAUD_HOLD" | "CLEAR_AND_ISSUE">("CONFIRM_FRAUD_HOLD");
  const [adjudicateNotes, setAdjudicateNotes] = useState("");

  // New Claim Form
  const [newClaimPlantId, setNewClaimPlantId] = useState<number>(1);
  const [newClaimMwh, setNewClaimMwh] = useState<number>(4500);
  const [newClaimStart, setNewClaimStart] = useState("2026-03-01T00:00:00");
  const [newClaimEnd, setNewClaimEnd] = useState("2026-03-31T23:59:59");
  const [newClaimMeterId, setNewClaimMeterId] = useState<number>(1);

  // Check existing token on mount
  useEffect(() => {
    const token = ApiService.getToken();
    if (token) {
      loadUserData();
    }
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const me = await ApiService.getMe();
      setUser(me);
      await loadDashboardData(me);
    } catch (err: any) {
      console.error("Session expired or invalid:", err);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (currentUser: User) => {
    try {
      const isReg = currentUser.role === "REGULATOR" || currentUser.role === "AUDITOR" || currentUser.role === "ADMIN";
      
      const [s, c, pl] = await Promise.all([
        ApiService.getDashboardStats(),
        ApiService.getClaims(),
        ApiService.getPlants(),
      ]);

      setStats(s);
      setClaims(c);
      setPlants(pl);

      if (isReg) {
        const [inv, audit, blocks] = await Promise.all([
          ApiService.getInvestigations(),
          ApiService.verifyLedgerIntegrity(),
          ApiService.getLedgerBlocks(20),
        ]);
        setCases(inv);
        setLedgerAudit(audit);
        setLedgerBlocks(blocks);
      } else {
        const certs = await ApiService.getCertificates();
        setCertificates(certs);
      }
    } catch (err: any) {
      console.error("Data load error:", err);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setActionLoading(true);
    try {
      const res = await ApiService.loginJson(loginEmail, loginPassword);
      setUser(res.user);
      await loadDashboardData(res.user);
    } catch (err: any) {
      setAuthError(err.message || "Invalid email or password");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemoLogin = async (email: string) => {
    setLoginEmail(email);
    setLoginPassword("password123");
    setAuthError(null);
    setActionLoading(true);
    try {
      const res = await ApiService.loginJson(email, "password123");
      setUser(res.user);
      await loadDashboardData(res.user);
    } catch (err: any) {
      setAuthError(err.message || "Demo login failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setActionLoading(true);
    try {
      await ApiService.register({
        email: regEmail,
        password: regPassword,
        full_name: regFullName,
        organization_name: regOrg,
        role: "GENERATOR",
      });
      // Auto-login after registration
      const loginRes = await ApiService.loginJson(regEmail, regPassword);
      setUser(loginRes.user);
      await loadDashboardData(loginRes.user);
    } catch (err: any) {
      setAuthError(err.message || "Registration failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    setUser(null);
    setStats(null);
    setClaims([]);
    setCertificates([]);
    setCases([]);
    setLedgerAudit(null);
    setActiveTab("dashboard");
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await ApiService.submitClaim({
        plant_id: Number(newClaimPlantId),
        period_start: newClaimStart,
        period_end: newClaimEnd,
        claimed_mwh: Number(newClaimMwh),
        meter_reading_id: Number(newClaimMeterId),
      });
      setShowClaimModal(false);
      if (user) await loadDashboardData(user);
    } catch (err: any) {
      alert("Submission failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringCert) return;
    setActionLoading(true);
    try {
      await ApiService.transferCertificate(transferringCert.id, Number(transferToUserId), "Market trade transfer");
      setTransferringCert(null);
      if (user) await loadDashboardData(user);
    } catch (err: any) {
      alert("Transfer failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRedeemCert = async (certId: number) => {
    if (!confirm("Redeem and retire this REC certificate permanently for Scope 2 compliance?")) return;
    setActionLoading(true);
    try {
      await ApiService.redeemCertificate(certId);
      if (user) await loadDashboardData(user);
    } catch (err: any) {
      alert("Redemption failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjudicateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setActionLoading(true);
    try {
      await ApiService.adjudicateCase(selectedCase.id, adjudicateAction, adjudicateNotes || "Regulatory decision finalized.");
      setSelectedCase(null);
      if (user) await loadDashboardData(user);
    } catch (err: any) {
      alert("Adjudication failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // Unauthenticated State: Auth Gateway (User vs Regulator)
  // ----------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-xl z-10 space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-xl shadow-emerald-500/20 mb-2">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">REC Guardian</h1>
            <p className="text-sm text-slate-400">
              National Renewable Energy Certificate Fraud Detection & Verification Engine
            </p>
          </div>

          {/* Portal Switcher */}
          <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl grid grid-cols-2 gap-1 text-xs font-semibold backdrop-blur">
            <button
              onClick={() => {
                setAuthPortal("USER");
                setLoginEmail("generator@solarfarm.com");
                setAuthError(null);
              }}
              className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
                authPortal === "USER"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Energy Generator & Trader</span>
            </button>
            <button
              onClick={() => {
                setAuthPortal("REGULATOR");
                setLoginEmail("regulator@recguardian.org");
                setAuthError(null);
              }}
              className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
                authPortal === "REGULATOR"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Regulatory Authority</span>
            </button>
          </div>

          {/* Portal Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur">
            <div className="mb-5 flex justify-between items-center border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {authPortal === "USER" ? "Generator & Trader Access" : "Forensic Regulatory Portal"}
                </h2>
                <p className="text-xs text-slate-400">
                  {authPortal === "USER"
                    ? "Manage clean energy facilities, submit claims, and transfer verified RECs"
                    : "Macro forensic radar, rule engines, cycle analysis, and judicial holding"}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                authPortal === "USER" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
              }`}>
                {authPortal === "USER" ? "RBAC: Generator" : "RBAC: Regulator"}
              </span>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* 1-Click Demo Profiles */}
            <div className="mb-5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Quick 1-Click Demo Accounts
              </label>
              <div className="grid grid-cols-1 gap-2">
                {DEMO_PORTALS[authPortal].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDemoLogin(p.email)}
                    disabled={actionLoading}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-800 hover:border-slate-700 transition text-left text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{p.label}</div>
                      <div className="text-[11px] text-slate-400">{p.email}</div>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono">
                      Log In →
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-[11px] text-slate-500 uppercase tracking-widest font-bold">Or Email & Password</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {authMode === "LOGIN" ? (
              <form onSubmit={handleLogin} className="space-y-4 mt-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 ${
                    authPortal === "USER"
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30"
                      : "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30"
                  }`}
                >
                  {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Sign In with Bearer JWT</span>
                </button>

                {authPortal === "USER" && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode("REGISTER")}
                      className="text-xs text-emerald-400 hover:underline"
                    >
                      New Clean Energy Generator? Register Organization
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3 mt-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Organization / Generator Name</label>
                  <input
                    type="text"
                    required
                    value={regOrg}
                    onChange={(e) => setRegOrg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Evergreen Wind Energy Ltd"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="john@evergreen.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                >
                  {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>Register Energy Producer Account</span>
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode("LOGIN")}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Already registered? Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Authenticated State: Role-Separated Dashboard
  // ----------------------------------------------------
  const isRegulator = user.role === "REGULATOR" || user.role === "AUDITOR" || user.role === "ADMIN";

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
              isRegulator ? "bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-500/20" : "bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/20"
            }`}>
              {isRegulator ? <Scale className="w-5 h-5 text-white" /> : <ShieldCheck className="w-5 h-5 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">REC Guardian</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                  isRegulator
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}>
                  {isRegulator ? "Regulatory Intelligence Portal" : "Generator Workspace"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">{user.organization_name || user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white">{user.full_name}</div>
              <div className={`text-[10px] font-mono font-bold ${isRegulator ? "text-blue-400" : "text-emerald-400"}`}>
                ROLE: {user.role}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
              title="Logout session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Tab Bar - Separated by Role */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 border-t border-slate-800 text-xs overflow-x-auto">
          {isRegulator ? (
            <>
              {[
                { id: "dashboard", label: "Fraud Radar (Macro)" },
                { id: "cases", label: `Investigation Cases (${cases.filter(c => c.status === "OPEN").length})` },
                { id: "claims", label: "All Claims & AI Audit" },
                { id: "ledger", label: "Cryptographic Ledger" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`py-3 px-4 font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === t.id
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </>
          ) : (
            <>
              {[
                { id: "dashboard", label: "Generation Overview" },
                { id: "claims", label: `My Claims (${claims.length})` },
                { id: "certificates", label: `REC Wallet (${certificates.length})` },
                { id: "plants", label: `Power Facilities (${plants.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`py-3 px-4 font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === t.id
                      ? "border-emerald-500 text-emerald-400"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {loading ? (
          <div className="text-center py-24 text-slate-400">
            <RotateCw className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-3" />
            <p className="text-xs">Synchronizing with Forensic Backend & Cryptographic Ledger...</p>
          </div>
        ) : (
          <>
            {/* Top Stat Banner */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>{isRegulator ? "Market Verified Generation" : "Total MWh Issued"}</span>
                    <Zap className={`w-4 h-4 ${isRegulator ? "text-blue-400" : "text-emerald-400"}`} />
                  </div>
                  <div className="text-2xl font-bold font-mono text-white mt-2">
                    {stats.total_mwh_issued.toLocaleString()} <span className="text-xs font-sans text-slate-400">MWh</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {stats.total_certificates_issued} Verified RECs Minted
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>{isRegulator ? "Macro Fraud Alerts" : "Claims Requiring Review"}</span>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
                    {stats.claims_held + stats.claims_under_review}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {stats.claims_held} Held • {stats.claims_under_review} Under Review
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>{isRegulator ? "Open Forensic Cases" : "Claim Acceptance Rate"}</span>
                    <Scale className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
                    {isRegulator ? stats.open_investigation_cases : `${stats.total_claims > 0 ? Math.round((stats.claims_approved / stats.total_claims) * 100) : 100}%`}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isRegulator ? "Pending Regulatory Adjudication" : `${stats.claims_approved} approved out of ${stats.total_claims}`}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>{isRegulator ? "Cryptographic Ledger" : "Active Power Facilities"}</span>
                    <Link2 className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                    {isRegulator ? (ledgerAudit?.is_valid ? "100% Valid" : "Tamper Detected") : plants.length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isRegulator ? `${ledgerAudit?.total_blocks || 0} SHA-256 Immutability Blocks` : "Registered clean assets"}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: GENERATOR / TRADER - CLAIMS */}
            {!isRegulator && activeTab === "claims" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-white">My Submitted Energy Generation Claims</h3>
                    <p className="text-xs text-slate-400">Track claim verification status and AI risk breakdown</p>
                  </div>
                  <button
                    onClick={() => setShowClaimModal(true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Submit New Claim</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-400 pb-2">
                      <tr>
                        <th className="py-3">Claim UID</th>
                        <th className="py-3">Claimed MWh</th>
                        <th className="py-3">Period</th>
                        <th className="py-3">Risk Assessment</th>
                        <th className="py-3">Status</th>
                        <th className="py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {claims.map((c) => {
                        const isHigh = c.risk_score >= 65;
                        const isMed = c.risk_score >= 25 && c.risk_score < 65;
                        return (
                          <tr key={c.id} className="hover:bg-slate-800/30 transition">
                            <td className="py-3 font-mono font-medium text-white">{c.claim_uid}</td>
                            <td className="py-3 font-mono text-slate-200">{c.claimed_mwh.toLocaleString()} MWh</td>
                            <td className="py-3 text-slate-400 text-[11px]">
                              {new Date(c.period_start).toLocaleDateString()} - {new Date(c.period_end).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full border font-mono text-[10px] font-bold ${
                                isHigh
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  : isMed
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              }`}>
                                {c.risk_score.toFixed(1)} / 100 • {c.risk_level}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                c.status === "APPROVED"
                                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                                  : c.status === "HELD"
                                  ? "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                                  : "bg-amber-950/60 text-amber-300 border border-amber-800/40"
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => setSelectedClaim(c)}
                                className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] underline"
                              >
                                View Forensic
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: GENERATOR / TRADER - CERTIFICATES WALLET */}
            {!isRegulator && activeTab === "certificates" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-400" />
                      <span>Digital REC Certificate Wallet</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Minted green attributes backed by cryptographic SHA-256 blocks
                    </p>
                  </div>
                  <button
                    onClick={() => user && loadDashboardData(user)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                {certificates.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                    No active REC certificates held in this wallet. Approved claims will mint new RECs.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-emerald-500/50 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                              {cert.fuel_type} ENERGY
                            </span>
                            <div className="font-mono text-sm font-bold text-white mt-0.5">{cert.certificate_uid}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            cert.status === "ISSUED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : cert.status === "REDEEMED"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                          }`}>
                            {cert.status}
                          </span>
                        </div>

                        <div className="border-t border-slate-800/80 pt-3 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-slate-500 text-[10px]">Volume</div>
                            <div className="font-mono font-bold text-white">{cert.mwh.toLocaleString()} MWh</div>
                          </div>
                          <div>
                            <div className="text-slate-500 text-[10px]">Vintage</div>
                            <div className="font-mono text-slate-300">{cert.vintage_year}-{cert.vintage_month.toString().padStart(2, "0")}</div>
                          </div>
                        </div>

                        {cert.status === "ISSUED" && (
                          <div className="pt-2 flex gap-2">
                            <button
                              onClick={() => setTransferringCert(cert)}
                              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>Transfer</span>
                            </button>
                            <button
                              onClick={() => handleRedeemCert(cert.id)}
                              className="py-1.5 px-3 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-700/50 rounded-xl text-xs font-semibold transition"
                            >
                              Redeem
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: GENERATOR / TRADER - POWER PLANTS */}
            {!isRegulator && activeTab === "plants" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Factory className="w-5 h-5 text-emerald-400" />
                    <span>Registered Renewable Generation Facilities</span>
                  </h3>
                  <p className="text-xs text-slate-400">Clean power plants registered with grid telemetry links</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plants.map((p) => (
                    <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white text-sm">{p.name}</h4>
                          <span className="text-[11px] font-mono text-emerald-400">{p.fuel_type} • {p.nameplate_capacity_mw} MW Capacity</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                          {p.status}
                        </span>
                      </div>
                      <div className="border-t border-slate-800/80 pt-3 space-y-1 text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>Interconnect Code:</span>
                          <span className="font-mono text-slate-200">{p.grid_interconnection_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Theoretical Capacity Factor:</span>
                          <span className="font-mono text-slate-200">{(p.max_capacity_factor * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Location:</span>
                          <span className="text-slate-300">{p.location_address || "Mojave Desert, CA"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: REGULATOR - INVESTIGATION CASES */}
            {isRegulator && activeTab === "cases" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Scale className="w-5 h-5 text-blue-400" />
                      <span>Regulatory Adjudication Cases</span>
                    </h3>
                    <p className="text-xs text-slate-400">Claims flagged for potential double counting, capacity fraud, or meter mismatches</p>
                  </div>
                  <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                    {cases.filter(c => c.status === "OPEN").length} Pending Cases
                  </span>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {cases.map((cs) => (
                    <div key={cs.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-white">{cs.case_number}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            cs.priority === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          }`}>
                            {cs.priority} PRIORITY
                          </span>
                          <span className="text-slate-400 text-xs">| Claim #{cs.claim_id}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          {cs.findings || "Automated forensic trigger: Discrepancy detected during validation pipeline."}
                        </p>
                        <div className="text-[11px] text-slate-500 font-mono mt-1">
                          Decision Action: {cs.decision_action} • Status: {cs.status}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {cs.status === "OPEN" ? (
                          <button
                            onClick={() => {
                              setSelectedCase(cs);
                              setAdjudicateAction("CONFIRM_FRAUD_HOLD");
                              setAdjudicateNotes(cs.findings || "");
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow transition"
                          >
                            Adjudicate Case
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono bg-slate-800/60 px-3 py-1 rounded-lg">
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: REGULATOR - LEDGER AUDIT */}
            {isRegulator && activeTab === "ledger" && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-teal-400" />
                        <span>SHA-256 Cryptographic Ledger Explorer</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Zero-tampering hash-linked chain securing claim submissions, mints, and transfers
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                        ledgerAudit?.is_valid
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}>
                        {ledgerAudit?.is_valid ? "✓ SHA-256 CHAIN 100% VALID" : "✗ TAMPER DETECTED"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {ledgerBlocks.map((blk) => (
                      <div
                        key={blk.id}
                        className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl font-mono text-xs space-y-1.5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-teal-400 font-bold">BLOCK #{blk.index} • {blk.event_type}</span>
                          <span className="text-slate-500 text-[10px]">{new Date(blk.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-300 text-[11px]">
                          Entity: {blk.entity_type} ({blk.entity_id})
                        </div>
                        <div className="text-[10px] text-slate-500 break-all">
                          <span className="text-slate-400">Current Hash:</span> {blk.current_hash}
                        </div>
                        <div className="text-[10px] text-slate-500 break-all">
                          <span className="text-slate-400">Prev Hash:</span> {blk.previous_hash}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DEFAULT (CLAIMS LISTING & AI RISK RADAR) */}
            {(activeTab === "dashboard" || (isRegulator && activeTab === "claims")) && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <FileSearch className={`w-5 h-5 ${isRegulator ? "text-blue-400" : "text-emerald-400"}`} />
                      <span>{isRegulator ? "Forensic Claims Audit & Multi-Engine Risk Scores" : "Recent Generation Claims"}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cross-referenced against smart meter telemetry, grid interconnection capacity, and ML anomaly models
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">Click any row for complete forensic evidence</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-400 pb-2">
                      <tr>
                        <th className="py-2.5">Claim UID</th>
                        <th className="py-2.5">Claimed MWh</th>
                        <th className="py-2.5">AI Risk Score</th>
                        <th className="py-2.5">Engine Recommendation</th>
                        <th className="py-2.5">Status</th>
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
            )}
          </>
        )}
      </main>

      {/* MODAL: SUBMIT NEW CLAIM (Generator) */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>Submit Renewable Generation Claim</span>
              </h3>
              <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Select Power Plant Facility</label>
                <select
                  value={newClaimPlantId}
                  onChange={(e) => setNewClaimPlantId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.fuel_type} - {p.nameplate_capacity_mw} MW)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Claimed Production (MWh)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newClaimMwh}
                  onChange={(e) => setNewClaimMwh(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Generation Start Date</label>
                  <input
                    type="text"
                    required
                    value={newClaimStart}
                    onChange={(e) => setNewClaimStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Generation End Date</label>
                  <input
                    type="text"
                    required
                    value={newClaimEnd}
                    onChange={(e) => setNewClaimEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Smart Meter Reading Reference ID</label>
                <input
                  type="number"
                  value={newClaimMeterId}
                  onChange={(e) => setNewClaimMeterId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit to Forensic Pipeline</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFER REC (Generator / Trader) */}
      {transferringCert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
                <span>Transfer REC Certificate</span>
              </h3>
              <button onClick={() => setTransferringCert(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleTransferCert} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Certificate UID</div>
                <div className="font-mono font-bold text-white text-sm">{transferringCert.certificate_uid}</div>
                <div className="text-slate-400 text-[11px] mt-1">{transferringCert.mwh} MWh • {transferringCert.fuel_type}</div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Transfer Destination (Recipient User ID)</label>
                <input
                  type="number"
                  required
                  value={transferToUserId}
                  onChange={(e) => setTransferToUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="e.g. 3 (Trader account)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTransferringCert(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Execute Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADJUDICATE CASE (Regulator) */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-400" />
                <span>Adjudicate Case: {selectedCase.case_number}</span>
              </h3>
              <button onClick={() => setSelectedCase(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAdjudicateCase} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Claim:</span>
                  <span className="font-mono text-white">Claim #{selectedCase.claim_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Case Priority:</span>
                  <span className="font-mono text-rose-400 font-bold">{selectedCase.priority}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Regulatory Decision Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjudicateAction("CONFIRM_FRAUD_HOLD")}
                    className={`p-3 rounded-xl border text-left transition ${
                      adjudicateAction === "CONFIRM_FRAUD_HOLD"
                        ? "bg-rose-950/40 border-rose-600 text-rose-200"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-rose-400">
                      <XCircle className="w-4 h-4" />
                      <span>Confirm Fraud Hold</span>
                    </div>
                    <p className="text-[10px] mt-1 text-slate-400">Permanently reject claim & record violation</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjudicateAction("CLEAR_AND_ISSUE")}
                    className={`p-3 rounded-xl border text-left transition ${
                      adjudicateAction === "CLEAR_AND_ISSUE"
                        ? "bg-emerald-950/40 border-emerald-600 text-emerald-200"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Clear & Issue REC</span>
                    </div>
                    <p className="text-[10px] mt-1 text-slate-400">Dismiss anomaly as legitimate & mint certificate</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Judicial Findings & Regulatory Order</label>
                <textarea
                  rows={3}
                  required
                  value={adjudicateNotes}
                  onChange={(e) => setAdjudicateNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs"
                  placeholder="Record justification, audit trail notes, or statutory sanction..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCase(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
                  <span>Sign & Seal Decision</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FORENSIC RISK BREAKDOWN */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                  AI Forensic Risk Assessment
                </span>
                <h3 className="text-lg font-bold text-white">{selectedClaim.claim_uid}</h3>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-300">
                  Decision: {selectedClaim.risk_breakdown?.recommendation || (selectedClaim.risk_score >= 65 ? "HOLD" : "APPROVE")}
                </div>
                <div className="text-xs text-slate-400 mt-1 max-w-sm">
                  {selectedClaim.risk_breakdown?.summary_explanation || "Forensic rule evaluation complete."}
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-3xl font-black text-white">{selectedClaim.risk_score.toFixed(1)}</div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Score / 100</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">Triggered Rules & Evidence:</div>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {selectedClaim.risk_breakdown?.factors?.map((f, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-xs ${
                      f.flagged
                        ? "bg-rose-950/30 border-rose-800/60 text-rose-200"
                        : "bg-slate-950/40 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="flex justify-between font-bold">
                      <span>[{f.rule_id}] {f.name}</span>
                      <span className={f.flagged ? "text-rose-400" : "text-slate-500"}>{f.severity}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed">{f.description}</p>
                    {f.evidence_details && Object.keys(f.evidence_details).length > 0 && (
                      <pre className="mt-2 p-2 bg-black/40 rounded-lg text-[10px] font-mono overflow-x-auto text-slate-300">
                        {JSON.stringify(f.evidence_details, null, 2)}
                      </pre>
                    )}
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
