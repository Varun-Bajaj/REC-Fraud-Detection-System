const { useState, useEffect, useRef } = React;

const API_BASE = "/api/v1";

// Default demo credentials
const DEMO_USERS = [
  { label: "Admin", email: "admin@recguardian.org", role: "ADMIN", icon: "fa-crown", color: "purple" },
  { label: "Regulator", email: "regulator@recguardian.org", role: "REGULATOR", icon: "fa-shield-halved", color: "blue" },
  { label: "Auditor", email: "auditor@recguardian.org", role: "AUDITOR", icon: "fa-magnifying-glass-chart", color: "amber" },
  { label: "Solar Gen", email: "generator@solarfarm.com", role: "GENERATOR", icon: "fa-solar-panel", color: "emerald" },
  { label: "Wind Gen", email: "generator2@windpower.com", role: "GENERATOR", icon: "fa-wind", color: "cyan" },
  { label: "REC Trader", email: "trader@energytrade.com", role: "GENERATOR", icon: "fa-arrow-right-arrow-left", color: "indigo" },
];

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("rec_token") || "");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [dashboardStats, setDashboardStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [plants, setPlants] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [ledgerBlocks, setLedgerBlocks] = useState([]);
  const [ledgerAudit, setLedgerAudit] = useState(null);
  const [networkGraphData, setNetworkGraphData] = useState(null);

  // Modals
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [docVerifyResult, setDocVerifyResult] = useState(null);
  const [docVerifyLoading, setDocVerifyLoading] = useState(false);

  // Helper fetch with auth
  const apiFetch = async (endpoint, options = {}) => {
    const headers = {
      ...(options.headers || {}),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(errData.detail || "API request failed");
    }
    return res.json();
  };

  // Login handler
  const loginAs = async (email, password = "password123") => {
    try {
      setLoading(true);
      setError(null);
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      setToken(data.access_token);
      setCurrentUser(data.user);
      localStorage.setItem("rec_token", data.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check auth on load
  useEffect(() => {
    if (token) {
      apiFetch("/auth/me")
        .then((user) => setCurrentUser(user))
        .catch(() => {
          localStorage.removeItem("rec_token");
          setToken("");
          loginAs("regulator@recguardian.org");
        });
    } else {
      loginAs("regulator@recguardian.org");
    }
  }, [token]);

  // Load active tab data
  const loadData = async () => {
    if (!token) return;
    try {
      if (activeTab === "dashboard") {
        const stats = await apiFetch("/analytics/dashboard");
        setDashboardStats(stats);
        const clm = await apiFetch("/claims/?limit=10");
        setClaims(clm);
      } else if (activeTab === "claims") {
        const clm = await apiFetch("/claims/?limit=50");
        setClaims(clm);
      } else if (activeTab === "investigations") {
        const inv = await apiFetch("/investigations/?limit=50");
        setInvestigations(inv);
      } else if (activeTab === "network") {
        const net = await apiFetch("/analytics/network-graph");
        setNetworkGraphData(net);
      } else if (activeTab === "ledger") {
        const blocks = await apiFetch("/ledger/blocks?limit=50");
        setLedgerBlocks(blocks);
        const audit = await apiFetch("/ledger/verify");
        setLedgerAudit(audit);
      } else if (activeTab === "plants") {
        const pl = await apiFetch("/plants/");
        setPlants(pl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, currentUser]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-dark-850 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <i className="fa-solid fa-shield-halved text-white text-lg"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">REC Guardian</span>
                <span className="text-xs bg-brand-500/10 text-brand-400 border border-brand-500/30 px-2 py-0.5 rounded-full font-medium">AI & Ledger v1.0</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Renewable Energy Certificate Forensic Intelligence</p>
            </div>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-dark-900 border border-slate-700/60 rounded-xl p-1 text-xs">
              <span className="px-2 text-slate-400 font-medium">Quick Role:</span>
              {DEMO_USERS.map((u) => {
                const isActive = currentUser && currentUser.email === u.email;
                return (
                  <button
                    key={u.email}
                    onClick={() => loginAs(u.email)}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-brand-600 text-white font-medium shadow"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <i className={`fa-solid ${u.icon} text-[10px]`}></i>
                    <span>{u.label}</span>
                  </button>
                );
              })}
            </div>

            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-700/50">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-brand-400">
                  {currentUser.full_name.charAt(0)}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-medium text-white">{currentUser.full_name}</div>
                  <div className="text-[10px] text-slate-400">{currentUser.role}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-800/80 overflow-x-auto">
          {[
            { id: "dashboard", label: "Intelligence Dashboard", icon: "fa-chart-pie" },
            { id: "claims", label: "Claims & Fraud Radar", icon: "fa-clipboard-check", badge: claims.length },
            { id: "investigations", label: "Forensic Cases", icon: "fa-scale-balanced", badge: dashboardStats?.open_investigation_cases },
            { id: "network", label: "Transfer Graph (NetworkX)", icon: "fa-circle-nodes" },
            { id: "ledger", label: "SHA-256 Ledger Audit", icon: "fa-link" },
            { id: "plants", label: "Facilities & Meters", icon: "fa-industry" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 text-xs font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  active
                    ? "border-brand-500 text-brand-400 bg-brand-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <i className={`fa-solid ${tab.icon}`}></i>
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    tab.id === "investigations" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-slate-800 text-slate-300"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Tab 1: Dashboard */}
        {activeTab === "dashboard" && (
          <DashboardTab
            stats={dashboardStats}
            recentClaims={claims}
            onSelectClaim={(c) => setSelectedClaim(c)}
            onNewClaim={() => setShowClaimModal(true)}
            currentUser={currentUser}
          />
        )}

        {/* Tab 2: Claims */}
        {activeTab === "claims" && (
          <ClaimsTab
            claims={claims}
            onSelectClaim={(c) => setSelectedClaim(c)}
            onNewClaim={() => setShowClaimModal(true)}
            currentUser={currentUser}
            onReload={loadData}
          />
        )}

        {/* Tab 3: Investigations */}
        {activeTab === "investigations" && (
          <InvestigationsTab
            investigations={investigations}
            apiFetch={apiFetch}
            onReload={loadData}
            currentUser={currentUser}
          />
        )}

        {/* Tab 4: Network Graph */}
        {activeTab === "network" && (
          <NetworkGraphTab graphData={networkGraphData} onReload={loadData} />
        )}

        {/* Tab 5: Ledger */}
        {activeTab === "ledger" && (
          <LedgerTab
            blocks={ledgerBlocks}
            audit={ledgerAudit}
            apiFetch={apiFetch}
            onReload={loadData}
            docVerifyResult={docVerifyResult}
            setDocVerifyResult={setDocVerifyResult}
            docVerifyLoading={docVerifyLoading}
            setDocVerifyLoading={setDocVerifyLoading}
          />
        )}

        {/* Tab 6: Plants */}
        {activeTab === "plants" && (
          <PlantsTab plants={plants} apiFetch={apiFetch} onReload={loadData} />
        )}
      </main>

      {/* Claim Detail & Risk Breakdown Modal */}
      {selectedClaim && (
        <RiskBreakdownModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
          apiFetch={apiFetch}
          onReload={loadData}
        />
      )}

      {/* New Claim Modal */}
      {showClaimModal && (
        <SubmitClaimModal
          onClose={() => setShowClaimModal(false)}
          apiFetch={apiFetch}
          onSubmitted={() => {
            setShowClaimModal(false);
            loadData();
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-dark-850 border-t border-slate-800 text-xs text-slate-500 py-4 text-center mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>REC Guardian &copy; 2026 — Team KHATRON KE KHILADI (Varun, Kevin, Dhruv)</div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>FastAPI Backend: <span className="text-emerald-400">Live</span></span>
            <span>SHA-256 Ledger: <span className="text-emerald-400">Synced</span></span>
            <span>ML Isolation Forest: <span className="text-emerald-400">Active</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------
// TAB 1: DASHBOARD
// -------------------------------------------------------------
function DashboardTab({ stats, recentClaims, onSelectClaim, onNewClaim, currentUser }) {
  if (!stats) return <div className="text-center py-20 text-slate-400">Loading intelligence metrics...</div>;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-dark-850 via-slate-900 to-dark-850 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Forensic Intelligence & Fraud Radar</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-layered verification: Smart Meter Telemetry vs Physical Laws vs Isolation Forest ML vs NetworkX Transfer Graph.
          </p>
        </div>
        <div className="flex gap-2">
          {currentUser?.role === "GENERATOR" && (
            <button
              onClick={onNewClaim}
              className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-brand-600/20 flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              <span>Submit Generation Claim</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-850 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total MWh Verified</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <i className="fa-solid fa-bolt text-xs"></i>
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {stats.total_mwh_issued.toLocaleString()} <span className="text-xs font-sans text-slate-400 font-normal">MWh</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            From {stats.total_certificates_issued} minted RECs
          </div>
        </div>

        <div className="bg-dark-850 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Fraud Radar Triggered</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <i className="fa-solid fa-triangle-exclamation text-xs"></i>
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">
            {stats.claims_held + stats.claims_under_review} <span className="text-xs font-sans text-slate-400 font-normal">Claims</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.claims_held} Held on Audit • {stats.claims_under_review} Needs Review
          </div>
        </div>

        <div className="bg-dark-850 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Forensic Cases</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <i className="fa-solid fa-gavel text-xs"></i>
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
            {stats.open_investigation_cases}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Human-in-the-loop regulatory review
          </div>
        </div>

        <div className="bg-dark-850 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Transfer Volume & Loops</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <i className="fa-solid fa-arrows-rotate text-xs"></i>
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {stats.total_certificates_transferred}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.total_certificates_redeemed} RECs retired / redeemed
          </div>
        </div>
      </div>

      {/* Risk Distribution Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-dark-850 border border-slate-800 p-5 rounded-2xl">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-brand-400"></i>
            <span>Forensic Risk Distribution</span>
          </h2>
          <div className="space-y-3">
            {[
              { label: "Low Risk (Auto-Approved)", count: stats.risk_distribution.LOW, color: "bg-emerald-500", text: "text-emerald-400" },
              { label: "Medium Risk (Needs Review)", count: stats.risk_distribution.MEDIUM, color: "bg-amber-500", text: "text-amber-400" },
              { label: "High Risk (Held)", count: stats.risk_distribution.HIGH, color: "bg-orange-500", text: "text-orange-400" },
              { label: "Critical Risk (Fraud Trigger)", count: stats.risk_distribution.CRITICAL, color: "bg-rose-500", text: "text-rose-400" },
            ].map((r) => {
              const total = stats.total_claims || 1;
              const pct = Math.round((r.count / total) * 100);
              return (
                <div key={r.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{r.label}</span>
                    <span className={`font-mono font-medium ${r.text}`}>{r.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-dark-900 rounded-full overflow-hidden">
                    <div className={`h-full ${r.color}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Claims Table (2 Columns) */}
        <div className="lg:col-span-2 bg-dark-850 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <i className="fa-solid fa-list-check text-brand-400"></i>
              <span>Recent Generation Claims & Risk Scores</span>
            </h2>
            <span className="text-xs text-slate-400">Click row for full AI explanation</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-2">Claim ID</th>
                  <th className="pb-2">Claimed MWh</th>
                  <th className="pb-2">Risk Score</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentClaims.slice(0, 6).map((c) => {
                  const riskColor =
                    c.risk_score >= 80 ? "text-rose-400 bg-rose-500/10 border-rose-500/30" :
                    c.risk_score >= 50 ? "text-orange-400 bg-orange-500/10 border-orange-500/30" :
                    c.risk_score >= 25 ? "text-amber-400 bg-amber-500/10 border-amber-500/30" :
                    "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectClaim(c)}
                      className="hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="py-2.5 font-mono font-medium text-slate-200">{c.claim_uid}</td>
                      <td className="py-2.5 font-mono text-slate-300">{c.claimed_mwh.toLocaleString()} MWh</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-mono font-semibold ${riskColor}`}>
                          {c.risk_score.toFixed(1)} / 100
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className="text-slate-300 font-medium">{c.status}</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button className="text-brand-400 hover:text-brand-300 text-xs">
                          Inspect <i className="fa-solid fa-chevron-right text-[10px] ml-1"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// TAB 2: CLAIMS & FRAUD RADAR
// -------------------------------------------------------------
function ClaimsTab({ claims, onSelectClaim, onNewClaim, currentUser, onReload }) {
  const [filter, setFilter] = useState("ALL");

  const filtered = claims.filter((c) => {
    if (filter === "ALL") return true;
    if (filter === "LOW") return c.risk_level === "LOW";
    if (filter === "MEDIUM") return c.risk_level === "MEDIUM";
    if (filter === "HIGH") return c.risk_level === "HIGH" || c.risk_level === "CRITICAL";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Generation Claims & Verification Radar</h1>
          <p className="text-xs text-slate-400 mt-0.5">Every claim undergoes real-time multi-agent fraud screening before certification.</p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser?.role === "GENERATOR" && (
            <button
              onClick={onNewClaim}
              className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              <span>Submit New Claim</span>
            </button>
          )}
          <button
            onClick={onReload}
            className="bg-dark-850 hover:bg-slate-800 text-slate-300 text-xs px-3 py-2 rounded-xl border border-slate-700"
          >
            <i className="fa-solid fa-rotate-right"></i>
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 text-xs">
        {["ALL", "LOW", "MEDIUM", "HIGH"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filter === f
                ? "bg-brand-600 border-brand-500 text-white font-medium"
                : "bg-dark-850 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {f === "ALL" ? "All Claims" : `${f} Risk`}
          </button>
        ))}
      </div>

      {/* Claims Table */}
      <div className="bg-dark-850 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-dark-900/60 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-4">Claim UID</th>
              <th className="p-4">Plant & Period</th>
              <th className="p-4">Claimed MWh</th>
              <th className="p-4">Forensic Risk Score</th>
              <th className="p-4">Recommendation</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((c) => {
              const isHigh = c.risk_score >= 65;
              const isMed = c.risk_score >= 25 && c.risk_score < 65;
              const badgeClass = isHigh
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                : isMed
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

              return (
                <tr
                  key={c.id}
                  onClick={() => onSelectClaim(c)}
                  className="hover:bg-slate-800/40 cursor-pointer transition"
                >
                  <td className="p-4 font-mono font-medium text-white">{c.claim_uid}</td>
                  <td className="p-4 text-slate-300">
                    <div>Plant #{c.plant_id}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(c.period_start).toLocaleDateString()} &rarr; {new Date(c.period_end).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4 font-mono font-semibold text-white">{c.claimed_mwh.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full border font-mono font-bold ${badgeClass}`}>
                      {c.risk_score.toFixed(1)} / 100
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-slate-200">
                      {c.risk_breakdown?.recommendation || (isHigh ? "HOLD" : isMed ? "NEEDS_REVIEW" : "APPROVE")}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-dark-900 border border-slate-700 text-slate-300">
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-brand-400 hover:text-white transition">
                      Forensic Report &rarr;
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// TAB 3: INVESTIGATIONS (CASE MANAGEMENT)
// -------------------------------------------------------------
function InvestigationsTab({ investigations, apiFetch, onReload, currentUser }) {
  const [adjudicatingCase, setAdjudicatingCase] = useState(null);
  const [decisionAction, setDecisionAction] = useState("CONFIRM_FRAUD_HOLD");
  const [findingsText, setFindingsText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleDecision = async (e) => {
    e.preventDefault();
    if (!adjudicatingCase) return;
    try {
      setSubmitting(true);
      await apiFetch(`/investigations/${adjudicatingCase.id}/decision`, {
        method: "POST",
        body: JSON.stringify({
          decision_action: decisionAction,
          findings: findingsText || "Regulatory determination completed post forensic evidence audit.",
        }),
      });
      setAdjudicatingCase(null);
      onReload();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Forensic Investigation Cases</h1>
        <p className="text-xs text-slate-400 mt-0.5">Human-in-the-loop regulatory adjudications for high-risk claims flagged by AI engines.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {investigations.map((inv) => {
          const isResolved = inv.status.startsWith("RESOLVED") || inv.status === "CLOSED";
          const statusColor =
            inv.status === "RESOLVED_FRAUD" ? "text-rose-400 bg-rose-500/10 border-rose-500/30" :
            inv.status === "RESOLVED_LEGITIMATE" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" :
            "text-amber-400 bg-amber-500/10 border-amber-500/30";

          return (
            <div key={inv.id} className="bg-dark-850 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm font-bold text-white">{inv.case_number}</span>
                  <div className="text-[11px] text-slate-500">Claim ID #{inv.claim_id}</div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusColor}`}>
                  {inv.status}
                </span>
              </div>

              <div className="bg-dark-900 border border-slate-800/80 p-3 rounded-xl text-xs space-y-1.5">
                <div className="text-slate-400 font-medium">Forensic Findings:</div>
                <p className="text-slate-300 leading-relaxed">{inv.findings || "Automated trigger: Extreme generation mismatch or capacity violation."}</p>
                {inv.notes && (
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                    <span className="font-medium text-slate-400">Notes:</span> {inv.notes}
                  </div>
                )}
              </div>

              {!isResolved && (currentUser?.role === "REGULATOR" || currentUser?.role === "ADMIN") && (
                <button
                  onClick={() => {
                    setAdjudicatingCase(inv);
                    setFindingsText(inv.findings || "");
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-brand-400 text-xs font-semibold py-2 rounded-xl transition border border-slate-700"
                >
                  Adjudicate Case &rarr;
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Adjudication Modal */}
      {adjudicatingCase && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-850 border border-slate-700 w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Regulatory Adjudication: {adjudicatingCase.case_number}</h3>
              <button onClick={() => setAdjudicatingCase(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleDecision} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Determination Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionAction("CONFIRM_FRAUD_HOLD")}
                    className={`py-2 px-3 rounded-xl border font-semibold text-center transition ${
                      decisionAction === "CONFIRM_FRAUD_HOLD"
                        ? "bg-rose-500/20 border-rose-500 text-rose-300"
                        : "bg-dark-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    Confirm Fraud (Reject)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionAction("CLEAR_AND_ISSUE")}
                    className={`py-2 px-3 rounded-xl border font-semibold text-center transition ${
                      decisionAction === "CLEAR_AND_ISSUE"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-dark-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    Clear & Issue REC
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Regulatory Findings & Legal Reason</label>
                <textarea
                  rows="4"
                  value={findingsText}
                  onChange={(e) => setFindingsText(e.target.value)}
                  className="w-full bg-dark-900 border border-slate-700 rounded-xl p-3 text-slate-200 font-sans focus:outline-none focus:border-brand-500"
                  placeholder="Enter detailed reasons for this regulatory decision..."
                  required
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjudicatingCase(null)}
                  className="px-4 py-2 bg-dark-900 hover:bg-slate-800 text-slate-400 rounded-xl border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition"
                >
                  {submitting ? "Committing to Ledger..." : "Commit Adjudication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// TAB 4: TRANSFER GRAPH (NETWORKX VISUALIZATION)
// -------------------------------------------------------------
function NetworkGraphTab({ graphData, onReload }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!graphData || !containerRef.current || !window.vis) return;

    // Convert nodes
    const nodes = new vis.DataSet(
      graphData.nodes.map((n) => {
        let color = "#3b82f6";
        if (n.role === "ADMIN") color = "#a855f7";
        if (n.role === "REGULATOR") color = "#0ea5e9";
        if (n.role === "AUDITOR") color = "#f59e0b";
        if (n.role === "GENERATOR") color = "#10b981";

        return {
          id: n.id,
          label: `${n.label}\n(${n.role})`,
          color: { background: color, border: "#1e293b" },
          font: { color: "#ffffff", size: 12, face: "Inter" },
          shape: "box",
          margin: 10,
        };
      })
    );

    // Convert edges
    const edges = new vis.DataSet(
      graphData.edges.map((e) => ({
        from: e.source,
        to: e.target,
        label: `${e.mwh.toLocaleString()} MWh`,
        font: { color: e.is_suspicious_cycle ? "#fb7185" : "#94a3b8", size: 10, align: "horizontal" },
        color: { color: e.is_suspicious_cycle ? "#e11d48" : "#475569", highlight: "#10b981" },
        width: e.is_suspicious_cycle ? 3 : 1.5,
        arrows: "to",
      }))
    );

    const options = {
      physics: {
        stabilization: true,
        barnesHut: { gravitationalConstant: -3000, springLength: 150 },
      },
      interaction: { hover: true, zoomView: true, dragView: true },
    };

    const network = new vis.Network(containerRef.current, { nodes, edges }, options);
    return () => network.destroy();
  }, [graphData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Entity Relationship & Transfer Graph</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            NetworkX cycle detection uncovers circular wash-trading loops ($A \to B \to C \to A$) designed to fake transaction volume.
          </p>
        </div>
        <button
          onClick={onReload}
          className="bg-dark-850 hover:bg-slate-800 text-slate-300 text-xs px-3 py-2 rounded-xl border border-slate-700"
        >
          <i className="fa-solid fa-rotate-right mr-1"></i> Refresh Network
        </button>
      </div>

      {/* Circular Loop Alert */}
      {graphData?.detected_cycles && graphData.detected_cycles.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-arrows-spin text-sm"></i>
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-400">Suspicious Circular Wash Trading Ring Detected!</h4>
            <p className="text-xs text-rose-200 mt-1">
              NetworkX detected {graphData.detected_cycles.length} closed cycle(s) between accounts. Certificates are transferred in circles without true end-user retirement:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {graphData.detected_cycles.map((cycle, idx) => (
                <span key={idx} className="font-mono text-[11px] bg-rose-950/60 border border-rose-800 text-rose-300 px-2 py-1 rounded-lg">
                  Ring #{idx + 1}: {cycle.join(" &rarr; ")} &rarr; {cycle[0]}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Network Canvas */}
      <div className="bg-dark-850 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex justify-between items-center mb-2 px-2">
          <span className="text-xs text-slate-400">Interactive Directed Graph (Drag nodes to inspect)</span>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Red Edge = Cycle (Wash Trade)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500"></span> Gray Edge = Normal Transfer</span>
          </div>
        </div>
        <div ref={containerRef} className="w-full h-[520px] rounded-xl bg-dark-950 border border-slate-800"></div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// TAB 5: SHA-256 TAMPER-EVIDENT LEDGER
// -------------------------------------------------------------
function LedgerTab({
  blocks,
  audit,
  apiFetch,
  onReload,
  docVerifyResult,
  setDocVerifyResult,
  docVerifyLoading,
  setDocVerifyLoading,
}) {
  const [runningAudit, setRunningAudit] = useState(false);

  const runFullAudit = async () => {
    try {
      setRunningAudit(true);
      await onReload();
    } finally {
      setRunningAudit(false);
    }
  };

  const handleDocumentVerify = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setDocVerifyLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch("/ledger/verify-document", {
        method: "POST",
        body: formData,
      });
      setDocVerifyResult(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setDocVerifyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Tamper-Evident SHA-256 Ledger</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Every claim, evaluation, issuance, and transfer is cryptographically linked in an append-only hash chain.
          </p>
        </div>
        <button
          onClick={runFullAudit}
          disabled={runningAudit}
          className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-brand-600/20"
        >
          <i className="fa-solid fa-lock text-xs"></i>
          <span>{runningAudit ? "Auditing Full Chain..." : "Run Cryptographic Audit"}</span>
        </button>
      </div>

      {/* Audit Banner */}
      {audit && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          audit.is_valid
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-rose-500/10 border-rose-500/30 text-rose-300"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              audit.is_valid ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
            }`}>
              <i className={`fa-solid ${audit.is_valid ? "fa-shield-check" : "fa-triangle-exclamation"}`}></i>
            </div>
            <div>
              <div className="text-sm font-bold">
                {audit.is_valid ? "Ledger Cryptographic Integrity: 100% Intact" : "Ledger Tampering Detected!"}
              </div>
              <div className="text-xs opacity-80">{audit.verification_message}</div>
            </div>
          </div>
          <span className="font-mono text-xs font-semibold bg-dark-900/60 px-3 py-1 rounded-lg border border-current">
            {audit.total_blocks} Blocks Verified
          </span>
        </div>
      )}

      {/* Document Authenticity Verifier */}
      <div className="bg-dark-850 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <i className="fa-solid fa-file-shield text-brand-400"></i>
          <span>Document Integrity Verification (SHA-256 Re-Hashing)</span>
        </h3>
        <p className="text-xs text-slate-400">
          Upload any evidence report to recompute its cryptographic hash and check against on-chain records.
        </p>

        <div className="flex items-center gap-4">
          <label className="cursor-pointer bg-dark-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2">
            <i className="fa-solid fa-upload"></i>
            <span>Select File to Verify</span>
            <input type="file" onChange={handleDocumentVerify} className="hidden" />
          </label>
          {docVerifyLoading && <span className="text-xs text-slate-400">Hashing and auditing on-chain...</span>}
        </div>

        {docVerifyResult && (
          <div className="bg-dark-900 border border-slate-800 p-4 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-400">File: {docVerifyResult.file_name}</span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                docVerifyResult.is_registered ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
              }`}>
                {docVerifyResult.verification_status}
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-400 break-all">
              <span className="text-slate-500">SHA-256:</span> {docVerifyResult.computed_sha256}
            </div>
            {docVerifyResult.first_seen_claim_uid && (
              <div className="text-slate-300 pt-1 border-t border-slate-800/60">
                Registered on-chain under claim <span className="font-mono font-semibold text-brand-400">{docVerifyResult.first_seen_claim_uid}</span> at {new Date(docVerifyResult.first_seen_timestamp).toLocaleString()}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Block Explorer */}
      <div className="bg-dark-850 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 font-semibold text-sm text-white flex items-center justify-between">
          <span>Block Explorer</span>
          <span className="text-xs text-slate-400">Total {blocks.length} Blocks</span>
        </div>
        <div className="divide-y divide-slate-800/80">
          {blocks.map((b) => (
            <div key={b.id} className="p-4 hover:bg-slate-800/30 transition text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                    #{b.index}
                  </span>
                  <span className="font-semibold text-white">{b.event_type}</span>
                  <span className="text-slate-500">({b.entity_type} {b.entity_id})</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">{new Date(b.timestamp).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px] text-slate-400">
                <div className="truncate">
                  <span className="text-slate-600">Prev:</span> {b.previous_hash}
                </div>
                <div className="truncate text-emerald-400">
                  <span className="text-slate-600">Hash:</span> {b.current_hash}
                </div>
              </div>

              <div className="bg-dark-900/60 p-2 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto">
                {JSON.stringify(b.data_payload)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// TAB 6: PLANTS & METERS
// -------------------------------------------------------------
function PlantsTab({ plants, apiFetch, onReload }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Registered Generation Facilities & Smart Meters</h1>
        <p className="text-xs text-slate-400 mt-0.5">Physical plant specs, location coordinates, and smart meter telemetry logs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plants.map((p) => {
          const fuelIcon =
            p.fuel_type === "SOLAR" ? "fa-solar-panel text-amber-400" :
            p.fuel_type === "WIND" ? "fa-wind text-cyan-400" : "fa-water text-blue-400";

          return (
            <div key={p.id} className="bg-dark-850 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-dark-900 border border-slate-800 flex items-center justify-center">
                  <i className={`fa-solid ${fuelIcon}`}></i>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {p.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{p.name}</h3>
                <div className="text-xs text-slate-400">{p.location_address || "United States"}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
                <div>
                  <div className="text-slate-500">Nameplate Capacity</div>
                  <div className="font-mono font-bold text-white text-sm">{p.nameplate_capacity_mw} MW</div>
                </div>
                <div>
                  <div className="text-slate-500">Max Capacity Factor</div>
                  <div className="font-mono font-bold text-brand-400 text-sm">{Math.round(p.max_capacity_factor * 100)}%</div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400 bg-dark-900 p-2 rounded-lg truncate">
                <span className="text-slate-500">Interconnection:</span> {p.grid_interconnection_id}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MODAL: EXPLAINABLE RISK BREAKDOWN
// -------------------------------------------------------------
function RiskBreakdownModal({ claim, onClose, apiFetch, onReload }) {
  const [breakdown, setBreakdown] = useState(claim.risk_breakdown || null);
  const [reEvaluating, setReEvaluating] = useState(false);

  const reEvaluate = async () => {
    try {
      setReEvaluating(true);
      const res = await apiFetch(`/claims/${claim.id}/evaluate`, { method: "POST" });
      setBreakdown(res.breakdown);
      onReload();
    } catch (err) {
      alert(err.message);
    } finally {
      setReEvaluating(false);
    }
  };

  const riskScore = breakdown ? breakdown.final_risk_score : claim.risk_score;
  const isHigh = riskScore >= 65;
  const isMed = riskScore >= 25 && riskScore < 65;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-dark-850 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 space-y-5 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="text-xs text-brand-400 font-mono font-bold">FORENSIC AUDIT FILE</div>
            <h2 className="text-lg font-bold text-white">{claim.claim_uid}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Score Summary Box */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          isHigh ? "bg-rose-500/10 border-rose-500/30" : isMed ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30"
        }`}>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider opacity-80">
              Recommendation: {breakdown?.recommendation || (isHigh ? "HOLD" : isMed ? "NEEDS_REVIEW" : "APPROVE")}
            </div>
            <p className="text-xs text-slate-200 mt-1 max-w-md">{breakdown?.summary_explanation || "Forensic evaluation."}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black font-mono">
              {riskScore.toFixed(1)}<span className="text-xs font-normal opacity-70">/100</span>
            </div>
            <div className="text-[10px] font-semibold uppercase">{breakdown?.risk_level || claim.risk_level} RISK</div>
          </div>
        </div>

        {/* Engine Breakdown Pills */}
        {breakdown && (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-dark-900 border border-slate-800 p-2.5 rounded-xl">
              <div className="text-slate-400 text-[10px]">Rule Engine (45%)</div>
              <div className="font-mono font-bold text-white text-sm mt-0.5">{breakdown.rule_engine_score.toFixed(1)}</div>
            </div>
            <div className="bg-dark-900 border border-slate-800 p-2.5 rounded-xl">
              <div className="text-slate-400 text-[10px]">ML Isolation Forest (30%)</div>
              <div className="font-mono font-bold text-white text-sm mt-0.5">{breakdown.ml_anomaly_score.toFixed(1)}</div>
            </div>
            <div className="bg-dark-900 border border-slate-800 p-2.5 rounded-xl">
              <div className="text-slate-400 text-[10px]">NetworkX Graph (25%)</div>
              <div className="font-mono font-bold text-white text-sm mt-0.5">{breakdown.graph_risk_score.toFixed(1)}</div>
            </div>
          </div>
        )}

        {/* Factor Explanations */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300">Detailed Red Flags & Rule Breakdown:</div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {breakdown?.factors?.map((f, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  f.flagged
                    ? f.severity === "CRITICAL"
                      ? "bg-rose-950/30 border-rose-800/80 text-rose-200"
                      : "bg-amber-950/30 border-amber-800/80 text-amber-200"
                    : "bg-dark-900/60 border-slate-800 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="font-mono text-[10px] bg-dark-900 px-1.5 py-0.5 rounded border border-current">{f.rule_id}</span>
                    <span>{f.name}</span>
                  </span>
                  <span className="font-mono text-[10px] font-semibold">{f.severity}</span>
                </div>
                <p className="text-[11px] leading-relaxed">{f.description}</p>
                {f.evidence_details && (
                  <pre className="text-[10px] font-mono bg-dark-950/60 p-1.5 rounded overflow-x-auto text-slate-400">
                    {JSON.stringify(f.evidence_details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
          <button
            onClick={reEvaluate}
            disabled={reEvaluating}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
          >
            <i className="fa-solid fa-rotate mr-1"></i>
            {reEvaluating ? "Running Scikit-learn + Rules..." : "Re-run Forensic Engines"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-900 hover:bg-slate-800 text-slate-300 text-xs rounded-xl border border-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MODAL: SUBMIT GENERATION CLAIM
// -------------------------------------------------------------
function SubmitClaimModal({ onClose, apiFetch, onSubmitted }) {
  const [plants, setPlants] = useState([]);
  const [plantId, setPlantId] = useState("");
  const [claimedMwh, setClaimedMwh] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [docHash, setDocHash] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch("/plants/").then((res) => {
      setPlants(res);
      if (res.length > 0) setPlantId(res[0].id);
    });
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 30);
    setStartDate(past.toISOString().split("T")[0]);
    setEndDate(now.toISOString().split("T")[0]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const docs = docHash ? [
        {
          document_type: "METER_REPORT",
          file_name: "meter_report_verified.pdf",
          file_hash: docHash,
          file_size_bytes: 204800,
        }
      ] : [];

      await apiFetch("/claims/", {
        method: "POST",
        body: JSON.stringify({
          plant_id: parseInt(plantId),
          period_start: new Date(startDate).toISOString(),
          period_end: new Date(endDate).toISOString(),
          claimed_mwh: parseFloat(claimedMwh),
          document_hashes: docs,
        }),
      });

      onSubmitted();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-850 border border-slate-700 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white">Submit REC Generation Claim</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Generation Facility</label>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className="w-full bg-dark-900 border border-slate-700 rounded-xl p-2.5 text-slate-200"
              required
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.fuel_type} - {p.nameplate_capacity_mw} MW)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Period Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-xl p-2 text-slate-200"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Period End</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-xl p-2 text-slate-200"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Claimed Clean Energy (MWh)</label>
            <input
              type="number"
              step="any"
              value={claimedMwh}
              onChange={(e) => setClaimedMwh(e.target.value)}
              placeholder="e.g. 5000.0"
              className="w-full bg-dark-900 border border-slate-700 rounded-xl p-2.5 text-slate-200 font-mono"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Supporting Evidence SHA-256 (Optional)</label>
            <input
              type="text"
              value={docHash}
              onChange={(e) => setDocHash(e.target.value)}
              placeholder="64-character hex hash or leave blank for auto"
              className="w-full bg-dark-900 border border-slate-700 rounded-xl p-2.5 text-slate-200 font-mono text-[11px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-dark-900 hover:bg-slate-800 text-slate-400 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition"
            >
              {submitting ? "Scanning..." : "Submit Claim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Mount the React Application
ReactDOM.render(<App />, document.getElementById("root"));
