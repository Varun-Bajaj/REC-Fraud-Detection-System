const { useState, useEffect, useRef } = React;
const API_BASE = "/api/v1";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const DEMO_LINEAGE_QUERIES = [
  { label: "Meter Overclaim (+216%)", query: "CLM-2026-FRAUD-MTR", type: "FRAUD" },
  { label: "Capacity Impossibility (>240%)", query: "CLM-2026-FRAUD-CAP", type: "FRAUD" },
  { label: "Circular Wash Trading Loop", query: "REC-2026-WND-88319", type: "LOOP" },
  { label: "Verified Solar REC", query: "REC-2026-SOL-09921", type: "CLEAN" },
  { label: "Clean Generation Baseline", query: "CLM-2026-LEGIT-01", type: "CLEAN" },
];

const LOGIN_PORTALS = [
  {
    id: "regulator",
    title: "Regulatory Authority",
    subtitle: "RERC Commission",
    email: "regulator@recguardian.org",
    role: "REGULATOR",
    icon: "fa-shield-halved",
    color: "blue",
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    activeBorder: "border-blue-500",
    activeBg: "bg-blue-50",
  },
  {
    id: "admin",
    title: "System Administrator",
    subtitle: "REC Guardian Authority",
    email: "admin@recguardian.org",
    role: "ADMIN",
    icon: "fa-crown",
    color: "purple",
    bg: "bg-purple-50",
    border: "border-purple-200",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-700",
    activeBorder: "border-purple-500",
    activeBg: "bg-purple-50",
  },
  {
    id: "auditor",
    title: "Forensic ESG Auditor",
    subtitle: "Apex Forensic Audit Group",
    email: "auditor@recguardian.org",
    role: "AUDITOR",
    icon: "fa-magnifying-glass-chart",
    color: "amber",
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-50",
  },
  {
    id: "solar",
    title: "Solar Energy Producer",
    subtitle: "Helios Solar LLC — 50 MW",
    email: "generator@solarfarm.com",
    role: "GENERATOR",
    icon: "fa-solar-panel",
    color: "yellow",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-700",
    activeBorder: "border-yellow-500",
    activeBg: "bg-yellow-50",
  },
  {
    id: "wind",
    title: "Wind Energy Producer",
    subtitle: "Boreas Wind Energy — 120 MW",
    email: "generator2@windpower.com",
    role: "GENERATOR",
    icon: "fa-wind",
    color: "cyan",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-700",
    activeBorder: "border-cyan-500",
    activeBg: "bg-cyan-50",
  },
  {
    id: "trader",
    title: "Energy Trader",
    subtitle: "Global Carbon & REC Exchange",
    email: "trader@energytrade.com",
    role: "GENERATOR",
    icon: "fa-arrow-right-arrow-left",
    color: "indigo",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-700",
    activeBorder: "border-indigo-500",
    activeBg: "bg-indigo-50",
  },
];

// ─── SMALL REUSABLE COMPONENTS ─────────────────────────────────────────────────

function TwinLeafLogo({ size = "md" }) {
  const s = size === "lg" ? 48 : size === "xl" ? 64 : size === "sm" ? 28 : 36;
  return (
    <svg viewBox="0 0 36 36" width={s} height={s} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 25C11 15 20 8 20 8C20 8 21 17 17 21C14.5 23.5 12.5 24.8 11 25Z" fill="#84cc16"/>
      <path d="M25 25C25 15 16 8 16 8C16 8 15 17 19 21C21.5 23.5 23.5 24.8 25 25Z" fill="#15803d"/>
      <path d="M18 28V20" stroke="#86efac" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function StatusBadge({ status }) {
  const map = {
    APPROVED: "badge-green", ISSUED: "badge-green", ACTIVE: "badge-green",
    HELD: "badge-red", REJECTED: "badge-red", REVOKED: "badge-red", RESOLVED_FRAUD: "badge-red",
    UNDER_REVIEW: "badge-amber", PENDING: "badge-amber", OPEN: "badge-amber", UNDER_INVESTIGATION: "badge-amber",
    TRANSFERRED: "badge-blue", RESOLVED_LEGITIMATE: "badge-blue",
    REDEEMED: "badge-gray", CLOSED: "badge-gray",
    CRITICAL: "badge-red", HIGH: "badge-red",
    MEDIUM: "badge-amber", LOW: "badge-green",
    REGULATOR: "badge-blue", ADMIN: "badge-forest", AUDITOR: "badge-amber",
    GENERATOR: "badge-green",
  };
  const cls = map[status] || "badge-gray";
  return <span className={`badge ${cls}`}>{status}</span>;
}

function RiskScorePill({ score }) {
  const cls = score >= 70 ? "bg-red-100 text-red-800" : score >= 30 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
  return <span className={`badge ${cls} font-mono`}>{score?.toFixed(1)}</span>;
}

function Spinner() {
  return <i className="fa-solid fa-spinner fa-spin text-leaf-700"></i>;
}

function EmptyState({ icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-sage-400">
      <i className={`fa-solid ${icon} text-4xl mb-3`}></i>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// ─── LOGIN SCREEN ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, loginError, loading }) {
  const [selectedPortal, setSelectedPortal] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState("portal"); // "portal" | "manual" | "register"
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regOrg, setRegOrg] = useState("");

  const handlePortalSelect = (portal) => {
    setSelectedPortal(portal);
    setEmail(portal.email);
    setPassword("password123");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    onLogin(regEmail, regPassword, { full_name: regName, organization_name: regOrg, role: "GENERATOR" }, true);
  };

  return (
    <div className="min-h-screen bg-leaf-pattern flex flex-col">
      {/* Top brand bar */}
      <div className="gradient-forest py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
              <TwinLeafLogo size="sm" />
            </div>
            <div>
              <div className="text-sprout-400 text-[10px] font-bold tracking-widest uppercase">TEAM: KHATRON KE KHILADI</div>
              <div className="text-white text-lg font-bold tracking-tight leading-none">REC GUARDIAN</div>
            </div>
          </div>
          <div className="hidden md:flex items-center px-4 py-1.5 rounded-full border-2 border-sprout-500/70 bg-forest-900/50">
            <span className="text-sprout-300 text-xs font-bold tracking-widest uppercase">DETECT · EXPLAIN · INVESTIGATE · PRESERVE</span>
          </div>
          <div className="text-white/50 text-xs hidden sm:block">Powered by AI Forensics + SHA-256 Ledger</div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-4xl animate-fade-in">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-leaf-100 border border-leaf-200 text-leaf-700 text-xs font-semibold mb-4">
              <i className="fa-solid fa-circle text-[8px] text-leaf-500"></i> Renewable Energy Certificate Fraud Detection Platform
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-forest-900 mb-2">Welcome to REC Guardian</h1>
            <p className="text-sage-600 text-sm max-w-xl mx-auto">
              Select your role portal below to access the forensic surveillance platform. Each portal provides role-specific capabilities and data access.
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[{id:"portal", label:"Quick Login", icon:"fa-bolt"}, {id:"manual", label:"Manual Login", icon:"fa-keyboard"}, {id:"register", label:"Register New", icon:"fa-user-plus"}].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setAuthMode(tab.id); setSelectedPortal(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  authMode === tab.id ? "bg-leaf-700 text-white shadow-sm" : "bg-white border border-sage-200 text-forest-900 hover:bg-sage-50"
                }`}
              >
                <i className={`fa-solid ${tab.icon} text-xs`}></i> {tab.label}
              </button>
            ))}
          </div>

          {/* PORTAL SELECTION MODE */}
          {authMode === "portal" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {LOGIN_PORTALS.map(portal => (
                  <button
                    key={portal.id}
                    onClick={() => handlePortalSelect(portal)}
                    className={`persona-card rounded-xl border-2 p-4 text-left transition-premium ${
                      selectedPortal?.id === portal.id
                        ? `${portal.activeBorder} ${portal.activeBg}`
                        : `${portal.border} bg-white`
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${portal.iconBg} ${portal.iconColor} flex items-center justify-center mb-3`}>
                      <i className={`fa-solid ${portal.icon} text-lg`}></i>
                    </div>
                    <div className="font-bold text-forest-900 text-sm leading-tight mb-0.5">{portal.title}</div>
                    <div className="text-sage-500 text-xs">{portal.subtitle}</div>
                    <div className="mt-2">
                      <StatusBadge status={portal.role} />
                    </div>
                  </button>
                ))}
              </div>

              {selectedPortal && (
                <div className="bg-white rounded-2xl border border-sage-200 shadow-premium p-6 animate-fade-in">
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-12 h-12 rounded-xl ${selectedPortal.iconBg} ${selectedPortal.iconColor} flex items-center justify-center`}>
                      <i className={`fa-solid ${selectedPortal.icon} text-xl`}></i>
                    </div>
                    <div>
                      <div className="font-bold text-forest-900">{selectedPortal.title}</div>
                      <div className="text-sage-500 text-xs">{selectedPortal.subtitle}</div>
                    </div>
                    <div className="ml-auto">
                      <StatusBadge status={selectedPortal.role} />
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-forest-900 mb-1.5">Email Address</label>
                      <div className="relative">
                        <i className="fa-solid fa-envelope absolute left-3 top-3 text-sage-400 text-sm"></i>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-sage-200 bg-sage-50 text-sm transition-premium"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-forest-900 mb-1.5">Password</label>
                      <div className="relative">
                        <i className="fa-solid fa-lock absolute left-3 top-3 text-sage-400 text-sm"></i>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-sage-200 bg-sage-50 text-sm transition-premium"
                          required
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-sage-400 hover:text-sage-600">
                          <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`}></i>
                        </button>
                      </div>
                    </div>

                    {loginError && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation"></i> {loginError}
                      </div>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm">
                      {loading ? <><Spinner /> Authenticating...</> : <><i className="fa-solid fa-arrow-right-to-bracket"></i> Access {selectedPortal.title} Portal</>}
                    </button>
                  </form>
                </div>
              )}

              {!selectedPortal && (
                <p className="text-center text-sage-500 text-xs mt-2">
                  <i className="fa-solid fa-arrow-up mr-1"></i> Select a portal above to log in. All demo accounts use password: <span className="font-mono font-semibold text-forest-900">password123</span>
                </p>
              )}
            </div>
          )}

          {/* MANUAL LOGIN MODE */}
          {authMode === "manual" && (
            <div className="bg-white rounded-2xl border border-sage-200 shadow-premium p-8 max-w-md mx-auto animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-leaf-100 text-leaf-700 flex items-center justify-center">
                  <i className="fa-solid fa-keyboard text-xl"></i>
                </div>
                <div>
                  <div className="font-bold text-forest-900">Manual Sign In</div>
                  <div className="text-sage-500 text-xs">Enter your credentials directly</div>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-forest-900 mb-1.5">Email Address</label>
                  <div className="relative">
                    <i className="fa-solid fa-envelope absolute left-3 top-3 text-sage-400 text-sm"></i>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-sage-200 text-sm transition-premium" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-forest-900 mb-1.5">Password</label>
                  <div className="relative">
                    <i className="fa-solid fa-lock absolute left-3 top-3 text-sage-400 text-sm"></i>
                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-sage-200 text-sm transition-premium" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-sage-400">
                      <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`}></i>
                    </button>
                  </div>
                </div>
                {loginError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{loginError}</div>
                )}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  {loading ? <><Spinner /> Signing in...</> : <><i className="fa-solid fa-arrow-right-to-bracket"></i> Sign In</>}
                </button>
              </form>
            </div>
          )}

          {/* REGISTER MODE */}
          {authMode === "register" && (
            <div className="bg-white rounded-2xl border border-sage-200 shadow-premium p-8 max-w-md mx-auto animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-leaf-100 text-leaf-700 flex items-center justify-center">
                  <i className="fa-solid fa-user-plus text-xl"></i>
                </div>
                <div>
                  <div className="font-bold text-forest-900">Register as Energy Producer</div>
                  <div className="text-sage-500 text-xs">Create a new generator/trader account</div>
                </div>
              </div>
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-forest-900 mb-1.5">Full Name</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Jane Smith"
                    className="w-full px-3 py-2.5 rounded-lg border border-sage-200 text-sm transition-premium" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-forest-900 mb-1.5">Email Address</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="jane@energyco.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-sage-200 text-sm transition-premium" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-forest-900 mb-1.5">Password</label>
                  <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Set a strong password"
                    className="w-full px-3 py-2.5 rounded-lg border border-sage-200 text-sm transition-premium" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-forest-900 mb-1.5">Organization Name</label>
                  <input type="text" value={regOrg} onChange={e => setRegOrg(e.target.value)} placeholder="Sunrise Wind Farm LLC"
                    className="w-full px-3 py-2.5 rounded-lg border border-sage-200 text-sm transition-premium" />
                </div>
                {loginError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{loginError}</div>
                )}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  {loading ? <><Spinner /> Creating account...</> : <><i className="fa-solid fa-user-plus"></i> Create Account</>}
                </button>
              </form>
            </div>
          )}

          {/* Bottom info bar */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { icon: "fa-shield-halved", label: "AI Fraud Detection", sub: "Rule Engine + Isolation Forest" },
              { icon: "fa-cubes-stacked", label: "SHA-256 Ledger", sub: "Tamper-evident audit chain" },
              { icon: "fa-circle-nodes", label: "Graph Surveillance", sub: "NetworkX wash-trading detection" },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-sage-200 p-4 shadow-card">
                <i className={`fa-solid ${f.icon} text-leaf-600 text-xl mb-2`}></i>
                <div className="text-xs font-bold text-forest-900">{f.label}</div>
                <div className="text-[11px] text-sage-500 mt-0.5">{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Data
  const [dashboardStats, setDashboardStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [plants, setPlants] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [ledgerBlocks, setLedgerBlocks] = useState([]);
  const [ledgerAudit, setLedgerAudit] = useState(null);
  const [networkGraphData, setNetworkGraphData] = useState(null);

  // Lineage
  const [lineageInput, setLineageInput] = useState("CLM-2026-FRAUD-MTR");
  const [lineageData, setLineageData] = useState(null);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [lineageError, setLineageError] = useState(null);

  // Modals
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [adjudicateAction, setAdjudicateAction] = useState("CONFIRM_FRAUD_HOLD");
  const [adjudicateFindings, setAdjudicateFindings] = useState("");
  const [transferringCert, setTransferringCert] = useState(null);
  const [transferTargetUser, setTransferTargetUser] = useState(3);
  const [transferNotes, setTransferNotes] = useState("");
  const [docVerifyResult, setDocVerifyResult] = useState(null);
  const [verifyingDoc, setVerifyingDoc] = useState(false);

  // Claim form
  const [newClaimPlantId, setNewClaimPlantId] = useState(1);
  const [newClaimStart, setNewClaimStart] = useState("2026-03-01T00:00:00Z");
  const [newClaimEnd, setNewClaimEnd] = useState("2026-03-31T23:59:59Z");
  const [newClaimMwh, setNewClaimMwh] = useState(1200);
  const [claimSubmitError, setClaimSubmitError] = useState(null);

  // Table filters
  const [claimsStatus, setClaimsStatus] = useState("ALL");
  const [claimsSearch, setClaimsSearch] = useState("");

  const graphRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── API HELPERS ─────────────────────────────────────────────────────────────

  const apiFetch = async (endpoint, options = {}, tok = token) => {
    const headers = { ...(options.headers || {}) };
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (!res.ok) {
      if (res.status === 401) { handleLogout(); throw new Error("Session expired."); }
      const e = await res.json().catch(() => ({ detail: "API error" }));
      throw new Error(e.detail || `HTTP ${res.status}`);
    }
    return res.json();
  };

  // ─── AUTH ─────────────────────────────────────────────────────────────────────

  // Check for saved token on mount
  useEffect(() => {
    const saved = localStorage.getItem("rec_token");
    if (saved) {
      setToken(saved);
      (async () => {
        try {
          const me = await apiFetch("/auth/me", {}, saved);
          setCurrentUser(me);
          await loadAllData(saved);
        } catch {
          localStorage.removeItem("rec_token");
        }
      })();
    }
  }, []);

  const handleLogin = async (email, password, registerData = null, isRegister = false) => {
    setLoginError(null);
    setLoading(true);
    try {
      if (isRegister && registerData) {
        // Register first
        await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, ...registerData }),
        }).then(async r => {
          if (!r.ok) { const e = await r.json(); throw new Error(e.detail || "Registration failed"); }
          return r.json();
        });
      }
      const res = await fetch(`${API_BASE}/auth/login-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Invalid credentials"); }
      const data = await res.json();
      setToken(data.access_token);
      setCurrentUser(data.user);
      localStorage.setItem("rec_token", data.access_token);
      await loadAllData(data.access_token);
      showToast(`Welcome, ${data.user.full_name}!`);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setCurrentUser(null);
    localStorage.removeItem("rec_token");
    setClaims([]); setCertificates([]); setPlants([]); setInvestigations([]); setLedgerBlocks([]);
  };

  // ─── DATA LOADING ──────────────────────────────────────────────────────────────

  const loadAllData = async (tok) => {
    setLoading(true);
    const h = tok ? { Authorization: `Bearer ${tok}` } : {};
    try {
      const [s, c, certs, cs, audit, blocks, pl, gr] = await Promise.all([
        fetch(`${API_BASE}/analytics/dashboard`, {headers:h}).then(r=>r.ok?r.json():null).catch(()=>null),
        fetch(`${API_BASE}/claims/?limit=100`, {headers:h}).then(r=>r.ok?r.json():[]).catch(()=>[]),
        fetch(`${API_BASE}/certificates/`, {headers:h}).then(r=>r.ok?r.json():[]).catch(()=>[]),
        fetch(`${API_BASE}/investigations/`, {headers:h}).then(r=>r.ok?r.json():[]).catch(()=>[]),
        fetch(`${API_BASE}/ledger/verify`, {headers:h}).then(r=>r.ok?r.json():null).catch(()=>null),
        fetch(`${API_BASE}/ledger/blocks?limit=50`, {headers:h}).then(r=>r.ok?r.json():[]).catch(()=>[]),
        fetch(`${API_BASE}/plants/`, {headers:h}).then(r=>r.ok?r.json():[]).catch(()=>[]),
        fetch(`${API_BASE}/analytics/network-graph`, {headers:h}).then(r=>r.ok?r.json():null).catch(()=>null),
      ]);
      if (s) setDashboardStats(s);
      setClaims(c||[]); setCertificates(certs||[]); setInvestigations(cs||[]);
      setLedgerAudit(audit); setLedgerBlocks(blocks||[]); setPlants(pl||[]); setNetworkGraphData(gr);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ─── ACTIONS ───────────────────────────────────────────────────────────────────

  const handleLineageSearch = async (q) => {
    if (!q) return;
    setLineageLoading(true); setLineageError(null);
    try { setLineageData(await apiFetch(`/certificates/lineage/${encodeURIComponent(q.trim())}`)); }
    catch (e) { setLineageError(e.message); setLineageData(null); }
    finally { setLineageLoading(false); }
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault(); setClaimSubmitError(null); setActionLoading(true);
    try {
      await apiFetch("/claims/", { method:"POST", body: JSON.stringify({ plant_id: Number(newClaimPlantId), period_start: newClaimStart, period_end: newClaimEnd, claimed_mwh: Number(newClaimMwh) }) });
      setShowClaimModal(false);
      await loadAllData(token);
      showToast("Claim submitted and evaluated!");
      setActiveTab("claims");
    } catch (e) { setClaimSubmitError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleAdjudicate = async () => {
    if (!selectedCase) return;
    setActionLoading(true);
    try {
      await apiFetch(`/investigations/${selectedCase.id}/decision`, { method:"POST", body: JSON.stringify({ decision_action: adjudicateAction, findings: adjudicateFindings || "Adjudicated by regulatory authority." }) });
      setSelectedCase(null); await loadAllData(token);
      showToast("Judicial ruling committed to ledger.");
    } catch (e) { showToast(e.message, "error"); }
    finally { setActionLoading(false); }
  };

  const handleTransfer = async () => {
    if (!transferringCert) return;
    setActionLoading(true);
    try {
      await apiFetch(`/certificates/${transferringCert.id}/transfer`, { method:"POST", body: JSON.stringify({ to_user_id: Number(transferTargetUser), notes: transferNotes || "OTC transfer" }) });
      setTransferringCert(null); await loadAllData(token);
      showToast("Certificate transferred successfully.");
    } catch (e) { showToast(e.message, "error"); }
    finally { setActionLoading(false); }
  };

  const handleRedeem = async (certId) => {
    if (!confirm("Permanently retire this REC for Scope 2 compliance?")) return;
    setActionLoading(true);
    try { await apiFetch(`/certificates/${certId}/redeem`, { method:"POST" }); await loadAllData(token); showToast("REC retired for compliance."); }
    catch (e) { showToast(e.message, "error"); }
    finally { setActionLoading(false); }
  };

  const handleDocVerify = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setVerifyingDoc(true);
    try { const fd = new FormData(); fd.append("file",f); setDocVerifyResult(await apiFetch("/ledger/verify-document", { method:"POST", body:fd })); }
    catch (e) { showToast(e.message, "error"); }
    finally { setVerifyingDoc(false); }
  };

  // ─── GRAPH ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab === "surveillance" && graphRef.current && networkGraphData && window.vis) {
      const nodes = new vis.DataSet((networkGraphData.nodes||[]).map(n => ({
        id: n.id, label: `${n.label}\n${n.role}`, shape: "box",
        color: { background: n.role==="GENERATOR"?"#dcfce7":"#eff6ff", border: n.role==="GENERATOR"?"#16a34a":"#3b82f6", highlight:{background:"#bbf7d0",border:"#15803d"} },
        font: { color:"#143d2b", size:12, face:"Inter" }, margin:10,
      })));
      const edges = new vis.DataSet((networkGraphData.edges||[]).map(e => ({
        from:e.from, to:e.to, label:`${e.volume_mwh||1200} MWh`,
        color:{color:e.is_suspicious_cycle?"#dc2626":"#94a3b8"},
        width:e.is_suspicious_cycle?3.5:1.5, arrows:"to",
        font:{size:10,color:e.is_suspicious_cycle?"#dc2626":"#64748b",align:"middle"},
        dashes: e.is_suspicious_cycle,
      })));
      const n = new vis.Network(graphRef.current, {nodes,edges}, {
        physics:{barnesHut:{gravitationalConstant:-3500,springLength:180}},
        interaction:{hover:true,zoomView:true,dragView:true},
      });
      return () => n.destroy();
    }
  }, [activeTab, networkGraphData]);

  // ─── DERIVED ──────────────────────────────────────────────────────────────────

  const filteredClaims = claims.filter(c => {
    const statusOk = claimsStatus==="ALL" || c.status===claimsStatus;
    const queryOk = !claimsSearch || c.claim_uid.toLowerCase().includes(claimsSearch.toLowerCase()) || c.status.toLowerCase().includes(claimsSearch.toLowerCase());
    return statusOk && queryOk;
  });
  const heldCount = claims.filter(c=>c.status==="HELD"||c.status==="REJECTED").length;
  const openCases = investigations.filter(c=>c.status==="OPEN").length;
  const totalMwhClaimed = dashboardStats?.total_mwh_claimed || claims.reduce((a,c)=>a+c.claimed_mwh,0);
  const totalMwhIssued = dashboardStats?.total_mwh_issued || certificates.reduce((a,c)=>a+c.mwh,0);

  const isRegulator = currentUser && ["REGULATOR","AUDITOR","ADMIN"].includes(currentUser.role);

  const NAV_TABS = [
    { id:"dashboard", label:"Dashboard", icon:"fa-chart-pie" },
    { id:"claims", label:"Claims", icon:"fa-file-shield", badge:heldCount||null },
    { id:"lineage", label:"Lineage Explorer", icon:"fa-timeline" },
    { id:"wallet", label:"REC Wallet", icon:"fa-wallet" },
    { id:"investigations", label:"Adjudication", icon:"fa-gavel", badge:openCases||null, regulatorOnly:true },
    { id:"ledger", label:"Ledger", icon:"fa-cubes-stacked" },
    { id:"surveillance", label:"Graph Surveillance", icon:"fa-circle-nodes", regulatorOnly:true },
  ].filter(t => !t.regulatorOnly || isRegulator);

  // ─── SHOW LOGIN IF NOT AUTHENTICATED ──────────────────────────────────────────

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} loginError={loginError} loading={loading} />;
  }

  // ─── AUTHENTICATED LAYOUT ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-sage-50 flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-xl border text-sm font-semibold flex items-center gap-2 animate-fade-in ${
          toast.type==="error" ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}>
          <i className={`fa-solid ${toast.type==="error"?"fa-triangle-exclamation":"fa-circle-check"}`}></i>
          {toast.msg}
        </div>
      )}

      {/* ── TOP HEADER ── */}
      <header className="gradient-forest text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <TwinLeafLogo size="sm" />
              </div>
              <div className="hidden sm:block">
                <div className="text-sprout-400 text-[9px] font-bold tracking-widest uppercase leading-none">KHATRON KE KHILADI</div>
                <div className="text-white text-base font-bold leading-tight">REC GUARDIAN</div>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
              {NAV_TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`nav-tab flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab===tab.id?"active":"text-white/80 hover:bg-white/10"}`}>
                  <i className={`fa-solid ${tab.icon}`}></i>
                  {tab.label}
                  {tab.badge ? <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white">{tab.badge}</span> : null}
                </button>
              ))}
            </nav>

            {/* Right: User & Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Motto (desktop) */}
              <div className="hidden xl:flex items-center px-3 py-1 rounded-full border border-sprout-500/60 bg-forest-900/50">
                <span className="text-sprout-300 text-[10px] font-bold tracking-widest uppercase">DETECT · EXPLAIN · INVESTIGATE</span>
              </div>

              {/* User pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15">
                <div className="w-6 h-6 rounded-full bg-sprout-500 text-forest-950 flex items-center justify-center text-xs font-bold">
                  {currentUser.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="text-right">
                  <div className="text-white text-xs font-semibold leading-none">{currentUser.full_name?.split(" ")[0]}</div>
                  <div className="text-sprout-300 text-[10px] font-mono">{currentUser.role}</div>
                </div>
              </div>

              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/10">
                <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
                <span className="hidden sm:inline">Sign Out</span>
              </button>

              <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10">
                <i className="fa-solid fa-bars text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE DRAWER ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 modal-overlay" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative z-50 w-72 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col animate-slide-in">
            <div className="gradient-forest p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TwinLeafLogo size="sm" />
                <div>
                  <div className="text-sprout-400 text-[9px] font-bold">KHATRON KE KHILADI</div>
                  <div className="text-white text-sm font-bold">REC GUARDIAN</div>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded text-white/70 hover:text-white">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div className="p-4 border-b border-sage-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-leaf-100 text-leaf-700 flex items-center justify-center font-bold text-sm">
                {currentUser.full_name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-bold text-forest-900">{currentUser.full_name}</div>
                <StatusBadge status={currentUser.role} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV_TABS.map(tab => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeTab===tab.id ? "bg-leaf-700 text-white shadow-sm" : "text-forest-900 hover:bg-sage-100"
                  }`}>
                  <div className="flex items-center gap-3">
                    <i className={`fa-solid ${tab.icon} w-4 text-center`}></i>
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge ? <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500 text-white">{tab.badge}</span> : null}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-sage-100">
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-50">
                <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ╔══════════════════════════════════════════════════════════════════════╗ */}
        {/* ║  DASHBOARD                                                           ║ */}
        {/* ╚══════════════════════════════════════════════════════════════════════╝ */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-forest-900">Platform Overview</h2>
                <p className="text-sm text-sage-500">Real-time forensic intelligence dashboard</p>
              </div>
              <div className="flex items-center gap-2">
                {ledgerAudit?.is_valid
                  ? <span className="badge badge-green gap-1.5"><i className="fa-solid fa-circle text-[8px]"></i> Ledger Verified</span>
                  : <span className="badge badge-amber gap-1.5"><i className="fa-solid fa-circle text-[8px]"></i> Verifying...</span>
                }
                <button onClick={() => loadAllData(token)} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sage-200 hover:bg-sage-100 text-xs font-semibold transition-premium shadow-card bg-white">
                  <i className={`fa-solid fa-rotate-right text-leaf-700 ${loading?"fa-spin":""}`}></i> Refresh
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label:"Clean MWh Claimed", value:`${(totalMwhClaimed/1000).toFixed(1)}K`, sub:"MWh", icon:"fa-solar-panel", iconBg:"bg-yellow-100", iconColor:"text-yellow-700", progress:(totalMwhIssued/Math.max(totalMwhClaimed,1))*100, progressLabel:`${(totalMwhIssued/1000).toFixed(1)}K MWh verified` },
                { label:"Active Generation Assets", value:plants.length||2, sub:"Facilities", icon:"fa-industry", iconBg:"bg-blue-100", iconColor:"text-blue-700" },
                { label:"Claims Under Surveillance", value:claims.length, sub:"Total", icon:"fa-magnifying-glass-chart", iconBg:"bg-amber-100", iconColor:"text-amber-700", extra:`${heldCount} HELD | ${claims.filter(c=>c.status==="APPROVED").length} Approved` },
                { label:"Investigation Dockets", value:investigations.length, sub:"Cases", icon:"fa-gavel", iconBg:"bg-red-100", iconColor:"text-red-700", extra:`${openCases} awaiting ruling` },
              ].map((kpi,i) => (
                <div key={i} className="bg-white rounded-2xl border border-sage-200 p-5 shadow-card hover-card transition-premium">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs font-semibold text-sage-500 uppercase tracking-wider">{kpi.label}</p>
                    <div className={`w-9 h-9 rounded-xl ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center`}>
                      <i className={`fa-solid ${kpi.icon} text-sm`}></i>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-forest-900 leading-none mb-0.5">
                    {kpi.value} <span className="text-base font-normal text-sage-400">{kpi.sub}</span>
                  </div>
                  {kpi.progress !== undefined && (
                    <div className="mt-3">
                      <div className="w-full bg-sage-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-leaf-600 h-full rounded-full transition-all duration-700" style={{width:`${Math.min(kpi.progress,100)}%`}}></div>
                      </div>
                      <p className="text-[11px] text-sage-500 mt-1">{kpi.progressLabel}</p>
                    </div>
                  )}
                  {kpi.extra && <p className="text-xs text-sage-500 mt-1.5">{kpi.extra}</p>}
                </div>
              ))}
            </div>

            {/* Middle Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Claims Preview Table */}
              <div className="lg:col-span-3 bg-white rounded-2xl border border-sage-200 shadow-card overflow-hidden">
                <div className="px-5 py-4 border-b border-sage-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-forest-900">Recent Claims</h3>
                    <p className="text-xs text-sage-500">Live multi-engine fraud scoring</p>
                  </div>
                  <button onClick={() => setActiveTab("claims")} className="flex items-center gap-1 text-xs font-semibold text-leaf-700 hover:text-leaf-900">
                    View All <i className="fa-solid fa-chevron-right text-[10px]"></i>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-sage-50/80 border-b border-sage-100">
                      <tr>
                        {["Claim UID","Volume","Risk Score","Status"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-sage-500">{h}</th>
                        ))}
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage-50">
                      {claims.slice(0,5).map(claim => (
                        <tr key={claim.id} className="table-row transition-colors">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-forest-900">{claim.claim_uid}</td>
                          <td className="px-4 py-3 text-sm font-medium text-forest-900">{claim.claimed_mwh.toLocaleString()} MWh</td>
                          <td className="px-4 py-3"><RiskScorePill score={claim.risk_score} /></td>
                          <td className="px-4 py-3"><StatusBadge status={claim.status} /></td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => setSelectedClaim(claim)} className="text-xs font-semibold text-leaf-700 hover:text-leaf-900">Inspect</button>
                          </td>
                        </tr>
                      ))}
                      {claims.length === 0 && <tr><td colSpan={5}><EmptyState icon="fa-file-circle-xmark" message="No claims yet" /></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lineage Shortcut + Open Cases */}
              <div className="lg:col-span-2 space-y-4">
                {/* Quick Lineage */}
                <div className="bg-white rounded-2xl border border-sage-200 shadow-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-leaf-100 text-leaf-700 flex items-center justify-center">
                      <i className="fa-solid fa-timeline text-sm"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-forest-900 text-sm">Lineage Explorer</h3>
                      <p className="text-[11px] text-sage-500">Trace provenance in 6 stages</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={lineageInput} onChange={e => setLineageInput(e.target.value)} onKeyDown={e => e.key==="Enter" && (handleLineageSearch(lineageInput),setActiveTab("lineage"))}
                      placeholder="CLM-2026-FRAUD-MTR" className="flex-1 px-3 py-2 rounded-lg border border-sage-200 text-xs font-mono bg-sage-50 transition-premium" />
                    <button onClick={() => { handleLineageSearch(lineageInput); setActiveTab("lineage"); }}
                      className="btn-primary px-3 py-2 rounded-lg text-xs font-bold">Trace</button>
                  </div>
                  <div className="space-y-1.5">
                    {DEMO_LINEAGE_QUERIES.map(q => (
                      <button key={q.query} onClick={() => { setLineageInput(q.query); handleLineageSearch(q.query); setActiveTab("lineage"); }}
                        className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg bg-sage-50 hover:bg-sage-100 transition-premium border border-sage-100">
                        <span className="text-xs font-medium text-forest-900">{q.label}</span>
                        <span className={`badge ${q.type==="FRAUD"?"badge-red":q.type==="LOOP"?"badge-amber":"badge-green"}`}>{q.type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Open Investigations Preview (Regulator only) */}
                {isRegulator && openCases > 0 && (
                  <div className="bg-red-50 rounded-2xl border border-red-200 shadow-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <i className="fa-solid fa-triangle-exclamation text-red-600"></i>
                      <span className="text-sm font-bold text-red-800">{openCases} Open Case{openCases!==1?"s":""} Require Action</span>
                    </div>
                    {investigations.filter(c=>c.status==="OPEN").slice(0,2).map(c => (
                      <div key={c.id} className="flex items-center justify-between py-2 border-t border-red-100">
                        <div>
                          <div className="font-mono text-xs font-bold text-red-900">{c.case_number}</div>
                          <StatusBadge status={c.priority} />
                        </div>
                        <button onClick={() => { setSelectedCase(c); setActiveTab("investigations"); }} className="text-xs font-bold text-red-700 hover:text-red-900">Adjudicate →</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════════════╗ */}
        {/* ║  CLAIMS TRIAGE                                                       ║ */}
        {/* ╚══════════════════════════════════════════════════════════════════════╝ */}
        {activeTab === "claims" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-forest-900">Claims Forensic Triage</h2>
                <p className="text-sm text-sage-500">Real-time meter comparison, physics validation & Isolation Forest scoring</p>
              </div>
              <button onClick={() => setShowClaimModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm shrink-0">
                <i className="fa-solid fa-plus"></i> Submit Claim
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-sage-400 text-xs"></i>
                <input type="text" value={claimsSearch} onChange={e => setClaimsSearch(e.target.value)} placeholder="Search by claim UID or status..."
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-sage-200 bg-white text-sm shadow-card transition-premium" />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {["ALL","APPROVED","HELD","UNDER_REVIEW","PENDING"].map(s => (
                  <button key={s} onClick={() => setClaimsStatus(s)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-premium ${
                      claimsStatus===s ? "bg-leaf-700 text-white shadow-sm" : "bg-white border border-sage-200 text-forest-900 hover:bg-sage-50"
                    }`}>
                    {s} {s==="ALL"?`(${claims.length})`:s==="HELD"?`(${heldCount})`:s==="APPROVED"?`(${claims.filter(c=>c.status==="APPROVED").length})`:""}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-sage-200 shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-sage-50 border-b border-sage-100">
                    <tr>
                      {["Claim UID","Facility","Volume","Period","Risk Score","Level","Status",""].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-sage-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage-50">
                    {filteredClaims.map(c => (
                      <tr key={c.id} className="table-row transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-forest-900">{c.claim_uid}</td>
                        <td className="px-4 py-3.5 text-xs text-sage-600">{plants.find(p=>p.id===c.plant_id)?.name||`Plant #${c.plant_id}`}</td>
                        <td className="px-4 py-3.5 text-sm font-semibold text-forest-900">{c.claimed_mwh.toLocaleString()} <span className="text-xs font-normal text-sage-400">MWh</span></td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-sage-500">{c.period_start?.substring(0,10)}<br/>{c.period_end?.substring(0,10)}</td>
                        <td className="px-4 py-3.5"><RiskScorePill score={c.risk_score} /></td>
                        <td className="px-4 py-3.5"><StatusBadge status={c.risk_level||"LOW"} /></td>
                        <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setSelectedClaim(c)} className="px-2.5 py-1 rounded-lg bg-sage-100 hover:bg-sage-200 text-xs font-semibold text-forest-900 transition-premium">Inspect</button>
                            <button onClick={() => { setLineageInput(c.claim_uid); handleLineageSearch(c.claim_uid); setActiveTab("lineage"); }}
                              className="px-2.5 py-1 rounded-lg bg-leaf-50 hover:bg-leaf-100 text-xs font-semibold text-leaf-800 transition-premium">Lineage</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredClaims.length===0 && <tr><td colSpan={8}><EmptyState icon="fa-file-circle-xmark" message="No claims match your filter" /></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════════════╗ */}
        {/* ║  LINEAGE EXPLORER                                                    ║ */}
        {/* ╚══════════════════════════════════════════════════════════════════════╝ */}
        {activeTab === "lineage" && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-forest-900">Certificate Lineage Explorer</h2>
              <p className="text-sm text-sage-500">6-stage telemetry provenance trace and chronological evidence timeline</p>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl border border-sage-200 shadow-card p-5">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-3.5 text-sage-400 text-sm"></i>
                  <input type="text" value={lineageInput} onChange={e => setLineageInput(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLineageSearch(lineageInput)}
                    placeholder="Enter Certificate UID or Claim UID (e.g. CLM-2026-FRAUD-MTR)..."
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-sage-200 font-mono text-sm bg-sage-50 transition-premium" />
                </div>
                <button onClick={() => handleLineageSearch(lineageInput)} disabled={lineageLoading}
                  className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap">
                  {lineageLoading ? <><Spinner /> Tracing...</> : <><i className="fa-solid fa-magnifying-glass"></i> Trace Lineage</>}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {DEMO_LINEAGE_QUERIES.map(q => (
                  <button key={q.query} onClick={() => { setLineageInput(q.query); handleLineageSearch(q.query); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage-100 hover:bg-sage-200 text-xs font-semibold text-forest-900 transition-premium border border-sage-200">
                    <span className={`badge ${q.type==="FRAUD"?"badge-red":q.type==="LOOP"?"badge-amber":"badge-green"} py-0`}>{q.type}</span>
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {lineageError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i> {lineageError}
              </div>
            )}

            {lineageData && (
              <div className="space-y-5">
                {/* Stage Cards */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sage-500 mb-3">6-Stage Provenance Pipeline</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { stage:1, title:"Generation Asset", icon:"fa-industry", data:[
                        { k:"Facility", v: lineageData.plant?.name||"—" },
                        { k:"Technology", v: lineageData.plant?.fuel_type||"SOLAR" },
                        { k:"Nameplate Capacity", v: `${lineageData.plant?.nameplate_capacity_mw||50} MW` },
                      ]},
                      { stage:2, title:"Substation Meter", icon:"fa-gauge-high", data:[
                        { k:"Meter Serial", v: lineageData.meter?.meter_serial_number||"MTR-SOL-001" },
                        { k:"Recorded Energy", v: `${lineageData.meter?.energy_generated_mwh?.toLocaleString()||"1,200"} MWh` },
                        { k:"Source", v: "Utility Grid IoT" },
                      ]},
                      { stage:3, title:"Claim Cryptography", icon:"fa-lock", data:[
                        { k:"Claim UID", v: lineageData.claim?.claim_uid||"—", mono:true },
                        { k:"Claimed Energy", v: `${lineageData.claim?.claimed_mwh?.toLocaleString()||0} MWh` },
                        { k:"Status", v: lineageData.claim?.status||"—", badge:true },
                      ]},
                      { stage:4, title:"Forensic Risk Score", icon:"fa-scale-balanced", data:[
                        { k:"Composite Score", v: `${lineageData.claim?.risk_score?.toFixed(1)||0} / 100` },
                        { k:"Risk Level", v: lineageData.claim?.risk_score>=70?"CRITICAL FRAUD":lineageData.claim?.risk_score>=30?"MEDIUM":"LOW", badge:true },
                        { k:"Decision", v: lineageData.claim?.risk_score>=70?"HELD — Blocked":"APPROVED" },
                      ]},
                      { stage:5, title:"Ledger Anchoring", icon:"fa-cubes-stacked", data:[
                        { k:"Linked Blocks", v: `${lineageData.ledger_blocks?.length||0} SHA-256 Blocks` },
                        { k:"Hash Chain", v:"Validated ✓", green:true },
                        { k:"Immutability", v:"Append-Only Guaranteed" },
                      ]},
                      { stage:6, title:"REC Token State", icon:"fa-certificate", data: lineageData.certificate
                        ? [{ k:"Cert UID", v: lineageData.certificate.certificate_uid, mono:true }, { k:"Status", v: lineageData.certificate.status, badge:true }, { k:"Transfer Hops", v: `${lineageData.transfers?.length||0}` }]
                        : [{ k:"Certificate", v:"Not Minted" }, { k:"Reason", v:"Claim HELD / Fraudulent" }, { k:"Action", v:"Pending Adjudication" }]
                      },
                    ].map(card => (
                      <div key={card.stage} className="bg-white rounded-2xl border border-sage-200 shadow-card overflow-hidden hover-card transition-premium">
                        <div className="px-4 py-3 bg-gradient-to-r from-leaf-700 to-leaf-600 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <i className={`fa-solid ${card.icon} text-white/90 text-sm`}></i>
                            <span className="text-white font-bold text-sm">{card.title}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">Stage {card.stage}</span>
                        </div>
                        <div className="p-4 space-y-2">
                          {card.data.map((row,i) => (
                            <div key={i} className="flex items-start justify-between gap-2">
                              <span className="text-xs text-sage-500 shrink-0">{row.k}</span>
                              {row.badge ? <StatusBadge status={row.v} />
                                : <span className={`text-xs font-semibold text-right ${row.mono?"font-mono":""} ${row.green?"text-emerald-700":""} text-forest-900`}>{row.v}</span>
                              }
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vertical Timeline */}
                {lineageData.timeline?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-sage-200 shadow-card p-6">
                    <h3 className="font-bold text-forest-900 flex items-center gap-2 mb-5">
                      <i className="fa-solid fa-timeline text-leaf-700"></i> Chronological Evidence Timeline
                    </h3>
                    <div className="relative pl-8 space-y-5 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-sage-200">
                      {lineageData.timeline.map((item,i) => (
                        <div key={i} className="relative">
                          <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                            item.severity==="CRITICAL"?"bg-red-500":item.severity==="WARNING"?"bg-amber-400":"bg-leaf-500"
                          }`}></div>
                          <div className="bg-sage-50 rounded-xl border border-sage-100 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                              <span className="text-sm font-bold text-forest-900">{item.title}</span>
                              <span className="font-mono text-[11px] text-sage-400">{item.timestamp?new Date(item.timestamp).toLocaleString():"Recorded"}</span>
                            </div>
                            <p className="text-xs text-sage-600 leading-relaxed">{item.description}</p>
                            <div className="mt-2 flex flex-wrap gap-2 items-center">
                              <span className="badge badge-gray">{item.stage}</span>
                              {item.actor && <span className="text-[11px] text-sage-400">Actor: {item.actor}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!lineageData && !lineageLoading && !lineageError && (
              <EmptyState icon="fa-timeline" message="Enter a certificate or claim UID above to explore its full provenance history" />
            )}
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════════════╗ */}
        {/* ║  REC WALLET                                                          ║ */}
        {/* ╚══════════════════════════════════════════════════════════════════════╝ */}
        {activeTab === "wallet" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-forest-900">Digital REC Wallet</h2>
                <p className="text-sm text-sage-500">Manage certified renewable tokens, execute transfers, or retire for ESG compliance</p>
              </div>
              <span className="badge badge-lime text-sm px-3 py-1">
                {certificates.filter(c=>c.status==="ISSUED").length} Active RECs
              </span>
            </div>

            {certificates.length === 0 && <EmptyState icon="fa-wallet" message="No certificates in wallet" />}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map(cert => (
                <div key={cert.id} className="bg-white rounded-2xl border border-sage-200 shadow-card hover-card transition-premium overflow-hidden">
                  {/* Header band */}
                  <div className={`px-5 py-3 border-b border-sage-100 flex items-center justify-between ${
                    cert.status==="ISSUED"?"bg-gradient-to-r from-leaf-50 to-emerald-50":cert.status==="REDEEMED"?"bg-sage-50":"bg-red-50"
                  }`}>
                    <StatusBadge status={cert.status} />
                    <span className="font-mono text-xs text-sage-400">V: {cert.vintage_year}-{String(cert.vintage_month).padStart(2,"0")}</span>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="font-mono text-sm font-bold text-forest-900 leading-tight">{cert.certificate_uid}</div>
                    <div className="text-2xl font-bold text-forest-900">{cert.mwh.toLocaleString()} <span className="text-sm font-normal text-sage-400">MWh</span></div>
                    <div className="space-y-1 text-xs text-sage-500">
                      <div className="flex justify-between"><span>Technology</span><span className="font-semibold text-forest-900">{cert.fuel_type}</span></div>
                      <div className="flex justify-between"><span>Current Holder</span><span className="font-mono">User #{cert.current_owner_id}</span></div>
                    </div>
                    {cert.status === "ISSUED" && (
                      <div className="pt-3 border-t border-sage-100 flex gap-2">
                        <button onClick={() => setTransferringCert(cert)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-sage-200 hover:bg-sage-50 text-xs font-semibold text-forest-900 transition-premium">
                          <i className="fa-solid fa-arrow-right-arrow-left"></i> Transfer
                        </button>
                        <button onClick={() => handleRedeem(cert.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-leaf-700 hover:bg-leaf-800 text-white text-xs font-bold transition-premium">
                          <i className="fa-solid fa-circle-check"></i> Redeem
                        </button>
                      </div>
                    )}
                    {cert.status !== "ISSUED" && (
                      <p className="text-xs text-sage-400 italic pt-2 border-t border-sage-100">Certificate closed</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════════════╗ */}
        {/* ║  REGULATORY ADJUDICATION                                             ║ */}
        {/* ╚══════════════════════════════════════════════════════════════════════╝ */}
        {activeTab === "investigations" && isRegulator && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-forest-900">Regulatory Adjudication Terminal</h2>
              <p className="text-sm text-sage-500">Human-in-the-loop judicial review for flagged fraud claims and market irregularities</p>
            </div>

            <div className="bg-white rounded-2xl border border-sage-200 shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-sage-50 border-b border-sage-100">
                    <tr>
                      {["Case Number","Linked Claim","Priority","Status","Ruling","Action"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-sage-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage-50">
                    {investigations.map(c => (
                      <tr key={c.id} className="table-row transition-colors">
                        <td className="px-4 py-4 font-mono text-xs font-bold text-forest-900">{c.case_number}</td>
                        <td className="px-4 py-4 font-mono text-xs text-sage-600">Claim #{c.claim_id}</td>
                        <td className="px-4 py-4"><StatusBadge status={c.priority} /></td>
                        <td className="px-4 py-4"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-4 text-xs text-sage-500 font-semibold">{c.decision_action||"PENDING"}</td>
                        <td className="px-4 py-4">
                          <button onClick={() => setSelectedCase(c)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-leaf-700 hover:bg-leaf-800 text-white text-xs font-bold transition-premium">
                            <i className="fa-solid fa-gavel"></i> Adjudicate
                          </button>
                        </td>
                      </tr>
                    ))}
                    {investigations.length === 0 && <tr><td colSpan={6}><EmptyState icon="fa-gavel" message="No investigation dockets" /></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════════════╗ */}
        {/* ║  CRYPTOGRAPHIC LEDGER                                                ║ */}
        {/* ╚══════════════════════════════════════════════════════════════════════╝ */}
        {activeTab === "ledger" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-forest-900">Cryptographic Ledger Inspector</h2>
                <p className="text-sm text-sage-500">Append-only SHA-256 block chain with tamper detection traversal</p>
              </div>
              <button onClick={() => loadAllData(token)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sage-200 bg-white shadow-card hover:bg-sage-50 text-xs font-semibold transition-premium">
                <i className="fa-solid fa-rotate-right text-leaf-700"></i> Re-verify Chain
              </button>
            </div>

            {/* Chain Status Banner */}
            <div className={`rounded-2xl border p-4 flex items-center gap-4 ${ledgerAudit?.is_valid?"bg-emerald-50 border-emerald-200":"bg-amber-50 border-amber-200"}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${ledgerAudit?.is_valid?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700"}`}>
                <i className={`fa-solid ${ledgerAudit?.is_valid?"fa-shield-check":"fa-shield-exclamation"}`}></i>
              </div>
              <div>
                <div className={`font-bold text-sm ${ledgerAudit?.is_valid?"text-emerald-900":"text-amber-900"}`}>
                  Chain Integrity: {ledgerAudit?.is_valid ? "VERIFIED — All blocks valid" : "CHECKING..."}
                </div>
                <div className={`text-xs mt-0.5 ${ledgerAudit?.is_valid?"text-emerald-700":"text-amber-700"}`}>
                  {ledgerAudit?.total_blocks||ledgerBlocks.length} blocks anchored · {ledgerAudit?.verification_message||"Traversal in progress"}
                </div>
              </div>
            </div>

            {/* Document Verifier */}
            <div className="bg-white rounded-2xl border border-sage-200 shadow-card p-5">
              <h3 className="font-bold text-forest-900 text-sm flex items-center gap-2 mb-4">
                <i className="fa-solid fa-file-circle-check text-leaf-700"></i> Evidence Document Hash Verifier
              </h3>
              <div className="border-2 border-dashed border-sage-200 rounded-xl p-8 text-center bg-sage-50/50 hover:bg-sage-50 transition-premium">
                <input type="file" id="doc-input" className="hidden" onChange={handleDocVerify} disabled={verifyingDoc} />
                <label htmlFor="doc-input" className="cursor-pointer flex flex-col items-center">
                  <i className={`fa-solid fa-file-arrow-up text-3xl mb-3 ${verifyingDoc?"fa-bounce text-leaf-500":"text-sage-300"}`}></i>
                  <span className="text-sm font-semibold text-forest-900">{verifyingDoc?"Computing SHA-256 hash...":"Drop evidence document here"}</span>
                  <span className="text-xs text-sage-400 mt-1">PDF, CSV, PNG · Click to browse files</span>
                </label>
              </div>
              {docVerifyResult && (
                <div className={`mt-4 p-4 rounded-xl border text-xs font-mono space-y-1 ${docVerifyResult.is_registered?"bg-forest-900 text-white border-forest-800":"bg-amber-50 text-amber-900 border-amber-200"}`}>
                  <p className="font-bold text-sprout-400 text-sm font-sans">{docVerifyResult.verification_status}</p>
                  <p>File: <span className="opacity-80">{docVerifyResult.file_name}</span></p>
                  <p className="break-all">Hash: <span className="opacity-80">{docVerifyResult.computed_sha256}</span></p>
                  <p>First Claim: <span className="opacity-80">{docVerifyResult.first_seen_claim_uid||"None — New Unregistered Hash"}</span></p>
                </div>
              )}
            </div>

            {/* Block Explorer */}
            <div className="bg-white rounded-2xl border border-sage-200 shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-sage-100">
                <h3 className="font-bold text-forest-900 text-sm">Ledger Block Explorer</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-sage-50 border-b border-sage-100">
                    <tr>
                      {["#","Timestamp","Event","Entity","Block Hash","Parent Hash"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-sage-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage-50 font-mono text-[11px]">
                    {ledgerBlocks.map(blk => (
                      <tr key={blk.id} className="table-row transition-colors">
                        <td className="px-4 py-3 font-bold text-forest-900">#{blk.index}</td>
                        <td className="px-4 py-3 text-sage-500 font-sans text-xs">{new Date(blk.timestamp).toLocaleString()}</td>
                        <td className="px-4 py-3"><span className="badge badge-gray font-sans">{blk.event_type}</span></td>
                        <td className="px-4 py-3 text-sage-700 font-sans">{blk.entity_id}</td>
                        <td className="px-4 py-3 text-leaf-700 truncate max-w-[120px]">{blk.current_hash}</td>
                        <td className="px-4 py-3 text-sage-400 truncate max-w-[120px]">{blk.previous_hash}</td>
                      </tr>
                    ))}
                    {ledgerBlocks.length===0 && <tr><td colSpan={6}><EmptyState icon="fa-cubes-stacked" message="No blocks loaded" /></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════════════╗ */}
        {/* ║  GRAPH SURVEILLANCE                                                  ║ */}
        {/* ╚══════════════════════════════════════════════════════════════════════╝ */}
        {activeTab === "surveillance" && isRegulator && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-forest-900">Market Surveillance Graph</h2>
                <p className="text-sm text-sage-500">NetworkX cycle detection uncovers circular wash-trading loops (A→B→C→A)</p>
              </div>
              <button onClick={() => loadAllData(token)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sage-200 bg-white shadow-card hover:bg-sage-50 text-xs font-semibold transition-premium">
                <i className="fa-solid fa-rotate-right text-leaf-700"></i> Refresh Graph
              </button>
            </div>

            {networkGraphData?.detected_cycles?.length > 0 && (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-arrows-spin text-lg"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-red-900 mb-1">⚠ Circular Wash-Trading Rings Detected!</h4>
                    <p className="text-xs text-red-700 mb-3">NetworkX identified {networkGraphData.detected_cycles.length} closed transfer loop(s). Certificates cycling without genuine end-use retirement:</p>
                    <div className="flex flex-wrap gap-2">
                      {networkGraphData.detected_cycles.map((cycle,i) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-900 text-xs font-mono font-bold border border-red-200">
                          {cycle.join(" ➔ ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-sage-200 shadow-card p-4">
              <div ref={graphRef} className="w-full h-[560px] rounded-xl bg-sage-50/50 border border-sage-100"></div>
            </div>
          </div>
        )}

      </main>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/*  MODALS                                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      {/* ── Forensic Risk Inspection Modal ── */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 modal-overlay" onClick={() => setSelectedClaim(null)}></div>
          <div className="relative z-50 w-full max-w-lg bg-white rounded-2xl shadow-premium border border-sage-200 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="gradient-forest px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <div className="text-sprout-300 text-xs font-semibold uppercase tracking-wider">Forensic Risk Analysis</div>
                <div className="text-white font-bold font-mono">{selectedClaim.claim_uid}</div>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Score Ring */}
              <div className="flex items-center gap-5 p-4 rounded-xl bg-sage-50 border border-sage-200">
                <div className="shrink-0 text-center">
                  <div className={`text-4xl font-bold ${selectedClaim.risk_score>=70?"text-red-700":selectedClaim.risk_score>=30?"text-amber-600":"text-emerald-700"}`}>
                    {selectedClaim.risk_score.toFixed(1)}
                  </div>
                  <div className="text-xs text-sage-500 font-semibold">/ 100</div>
                </div>
                <div className="flex-1">
                  <StatusBadge status={selectedClaim.risk_level||"LOW"} />
                  <p className="text-sm font-bold text-forest-900 mt-1">
                    {selectedClaim.risk_score>=70?"CRITICAL — Certificate Held":"Claim Verified"}
                  </p>
                  <p className="text-xs text-sage-500 mt-0.5">Composite multi-engine forensic score</p>
                </div>
              </div>
              {/* Engine Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:"Rule Engine", val:selectedClaim.risk_breakdown?.rule_engine_score, icon:"fa-ruler" },
                  { label:"ML Anomaly", val:selectedClaim.risk_breakdown?.ml_anomaly_score, icon:"fa-brain" },
                  { label:"Graph Risk", val:selectedClaim.risk_breakdown?.graph_risk_score, icon:"fa-circle-nodes" },
                ].map(e => (
                  <div key={e.label} className="p-3 rounded-xl bg-sage-50 border border-sage-200 text-center">
                    <i className={`fa-solid ${e.icon} text-leaf-600 mb-1`}></i>
                    <div className="text-xs text-sage-500 font-semibold">{e.label}</div>
                    <div className="text-lg font-bold text-forest-900">{e.val?.toFixed(1)||"0.0"}</div>
                  </div>
                ))}
              </div>
              {/* Explanation */}
              {selectedClaim.risk_breakdown?.summary_explanation && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                  <span className="font-bold">Forensic Finding: </span>
                  {selectedClaim.risk_breakdown.summary_explanation}
                </div>
              )}
              {/* Factors */}
              {selectedClaim.risk_breakdown?.factors?.filter(f=>f.flagged).map((f,i) => (
                <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-red-900">{f.name}</span>
                    <span className="badge badge-red">{f.severity}</span>
                  </div>
                  <p className="text-red-700">{f.description}</p>
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setSelectedClaim(null)} className="px-4 py-2 rounded-xl border border-sage-200 hover:bg-sage-50 text-sm font-semibold text-forest-900">Close</button>
                <button onClick={() => { setLineageInput(selectedClaim.claim_uid); handleLineageSearch(selectedClaim.claim_uid); setActiveTab("lineage"); setSelectedClaim(null); }}
                  className="btn-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5">
                  <i className="fa-solid fa-timeline"></i> View Full Lineage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit Claim Modal ── */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 modal-overlay" onClick={() => setShowClaimModal(false)}></div>
          <div className="relative z-50 w-full max-w-lg bg-white rounded-2xl shadow-premium border border-sage-200 animate-fade-in">
            <div className="gradient-forest px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <div className="text-sprout-300 text-xs font-semibold uppercase tracking-wider">Multi-Engine Evaluation</div>
                <div className="text-white font-bold">Submit Generation Claim</div>
              </div>
              <button onClick={() => setShowClaimModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSubmitClaim} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-forest-900 mb-1.5">Power Generation Asset</label>
                <select value={newClaimPlantId} onChange={e=>setNewClaimPlantId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-sage-200 bg-sage-50 text-sm transition-premium">
                  {plants.map(p => <option key={p.id} value={p.id}>{p.name} — {p.nameplate_capacity_mw} MW {p.fuel_type}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest-900 mb-1.5">Period Start</label>
                  <input type="text" value={newClaimStart} onChange={e=>setNewClaimStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-sage-200 bg-sage-50 text-sm font-mono transition-premium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-forest-900 mb-1.5">Period End</label>
                  <input type="text" value={newClaimEnd} onChange={e=>setNewClaimEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-sage-200 bg-sage-50 text-sm font-mono transition-premium" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-forest-900 mb-1.5">Claimed Volume (MWh)</label>
                <div className="relative">
                  <input type="number" value={newClaimMwh} min={1} onChange={e=>setNewClaimMwh(Number(e.target.value))}
                    className="w-full px-3 py-2.5 pr-14 rounded-xl border border-sage-200 bg-sage-50 text-sm font-mono transition-premium" required />
                  <span className="absolute right-3 top-3 text-xs text-sage-400 font-semibold">MWh</span>
                </div>
              </div>
              {claimSubmitError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation"></i> {claimSubmitError}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowClaimModal(false)} className="flex-1 py-2.5 rounded-xl border border-sage-200 hover:bg-sage-50 text-sm font-semibold text-forest-900">Cancel</button>
                <button type="submit" disabled={actionLoading} className="flex-1 btn-primary py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  {actionLoading ? <><Spinner /> Evaluating...</> : <><i className="fa-solid fa-bolt"></i> Submit to Fraud Engine</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Adjudication Modal ── */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 modal-overlay" onClick={() => setSelectedCase(null)}></div>
          <div className="relative z-50 w-full max-w-lg bg-white rounded-2xl shadow-premium border border-sage-200 animate-fade-in">
            <div className="gradient-forest px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <div className="text-sprout-300 text-xs font-semibold uppercase tracking-wider">Judicial Ruling</div>
                <div className="text-white font-bold">{selectedCase.case_number}</div>
              </div>
              <button onClick={() => setSelectedCase(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-sage-50 border border-sage-200 flex items-center gap-3">
                <StatusBadge status={selectedCase.priority} />
                <div>
                  <div className="text-sm font-bold text-forest-900">Case #{selectedCase.id} — Claim #{selectedCase.claim_id}</div>
                  <div className="text-xs text-sage-500">{selectedCase.status}</div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-forest-900 mb-2">Ruling Decision</label>
                <div className="space-y-2">
                  {[{val:"CONFIRM_FRAUD_HOLD", label:"CONFIRM FRAUD — Reject & Sanction", desc:"Certificate issuance permanently blocked. Sanctions logged to ledger.", color:"red"},
                    {val:"CLEAR_AND_ISSUE", label:"CLEAR & ISSUE — Approve REC", desc:"False positive override. Verified REC minted and ledger anchored.", color:"green"}
                  ].map(opt => (
                    <label key={opt.val} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-premium ${
                      adjudicateAction===opt.val ? (opt.color==="red"?"border-red-400 bg-red-50":"border-emerald-400 bg-emerald-50") : "border-sage-200 hover:bg-sage-50"
                    }`}>
                      <input type="radio" name="ruling" value={opt.val} checked={adjudicateAction===opt.val} onChange={()=>setAdjudicateAction(opt.val)} className="mt-0.5" />
                      <div>
                        <div className={`text-xs font-bold ${opt.color==="red"?"text-red-800":"text-emerald-800"}`}>{opt.label}</div>
                        <div className="text-xs text-sage-500 mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-forest-900 mb-1.5">Legal Findings & Investigation Notes</label>
                <textarea value={adjudicateFindings} onChange={e=>setAdjudicateFindings(e.target.value)} rows={3}
                  placeholder="Document your findings, evidence reviewed, and statutory basis for this ruling..."
                  className="w-full px-3 py-2.5 rounded-xl border border-sage-200 bg-sage-50 text-sm transition-premium resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setSelectedCase(null)} className="flex-1 py-2.5 rounded-xl border border-sage-200 hover:bg-sage-50 text-sm font-semibold text-forest-900">Cancel</button>
                <button onClick={handleAdjudicate} disabled={actionLoading}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white transition-premium ${
                    adjudicateAction==="CONFIRM_FRAUD_HOLD" ? "bg-red-600 hover:bg-red-700" : "bg-leaf-700 hover:bg-leaf-800"
                  }`}>
                  {actionLoading ? <><Spinner /> Signing...</> : <><i className="fa-solid fa-gavel"></i> Sign & Commit Ruling</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer Modal ── */}
      {transferringCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 modal-overlay" onClick={() => setTransferringCert(null)}></div>
          <div className="relative z-50 w-full max-w-md bg-white rounded-2xl shadow-premium border border-sage-200 animate-fade-in">
            <div className="gradient-forest px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <div className="text-sprout-300 text-xs font-semibold uppercase tracking-wider">P2P Certificate Transfer</div>
                <div className="text-white font-bold font-mono">{transferringCert.certificate_uid}</div>
              </div>
              <button onClick={() => setTransferringCert(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-sage-50 border border-sage-200 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-sage-500">Volume</span><span className="font-bold text-forest-900">{transferringCert.mwh.toLocaleString()} MWh</span></div>
                <div className="flex justify-between"><span className="text-sage-500">Technology</span><span className="font-semibold text-forest-900">{transferringCert.fuel_type}</span></div>
              </div>
              <div>
                <label className="block text-xs font-bold text-forest-900 mb-1.5">Recipient User ID</label>
                <input type="number" min={1} value={transferTargetUser} onChange={e=>setTransferTargetUser(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-sage-200 bg-sage-50 text-sm font-mono transition-premium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-forest-900 mb-1.5">Transfer Reference Note</label>
                <input type="text" value={transferNotes} onChange={e=>setTransferNotes(e.target.value)} placeholder="OTC bilateral trade reference..."
                  className="w-full px-3 py-2.5 rounded-xl border border-sage-200 bg-sage-50 text-sm transition-premium" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setTransferringCert(null)} className="flex-1 py-2.5 rounded-xl border border-sage-200 hover:bg-sage-50 text-sm font-semibold text-forest-900">Cancel</button>
                <button onClick={handleTransfer} disabled={actionLoading} className="flex-1 btn-primary py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  {actionLoading ? <><Spinner /> Transferring...</> : <><i className="fa-solid fa-arrow-right-arrow-left"></i> Confirm Transfer</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
