import {
  User,
  Plant,
  Claim,
  Certificate,
  InvestigationCase,
  LedgerBlock,
  LedgerVerifyResult,
  DashboardStats,
  RiskBreakdown,
} from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export class ApiService {
  private static token: string | null = null;

  static setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("rec_token", token);
      else localStorage.removeItem("rec_token");
    }
  }

  static getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("rec_token");
    }
    return this.token;
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Network request failed" }));
      throw new Error(errorData.detail || `Request failed with status ${res.status}`);
    }

    return res.json();
  }

  // Auth
  static async loginJson(email: string, password = "password123"): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login-json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Authentication failed" }));
      throw new Error(err.detail || "Authentication failed");
    }
    const data = await res.json();
    this.setToken(data.access_token);
    return data;
  }

  static async register(userData: {
    email: string;
    password: string;
    full_name: string;
    organization_name?: string;
    role?: string;
  }): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Registration failed" }));
      throw new Error(err.detail || "Registration failed");
    }
    return res.json();
  }

  static async login(username: string, password = "password123"): Promise<{ access_token: string; user: User }> {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!res.ok) throw new Error("Authentication failed");
    const data = await res.json();
    this.setToken(data.access_token);
    return data;
  }

  static logout() {
    this.setToken(null);
  }

  static async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  // Analytics & Dashboards
  static async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>("/analytics/dashboard");
  }

  static async getTransferGraph(): Promise<{
    nodes: any[];
    edges: any[];
    detected_cycles: string[][];
    clustering_coefficient: number;
  }> {
    return this.request("/analytics/network-graph");
  }

  // Plants
  static async getPlants(): Promise<Plant[]> {
    return this.request<Plant[]>("/plants/");
  }

  static async createPlant(plant: Partial<Plant>): Promise<Plant> {
    return this.request<Plant>("/plants/", {
      method: "POST",
      body: JSON.stringify(plant),
    });
  }

  // Claims
  static async getClaims(limit = 50): Promise<Claim[]> {
    return this.request<Claim[]>(`/claims/?limit=${limit}`);
  }

  static async getClaim(id: number): Promise<Claim> {
    return this.request<Claim>(`/claims/${id}`);
  }

  static async submitClaim(claimData: {
    plant_id: number;
    period_start: string;
    period_end: string;
    claimed_mwh: number;
    meter_reading_id?: number;
    document_hashes?: any[];
  }): Promise<Claim> {
    return this.request<Claim>("/claims/", {
      method: "POST",
      body: JSON.stringify(claimData),
    });
  }

  static async reevaluateClaim(id: number): Promise<{ breakdown: RiskBreakdown }> {
    return this.request<{ breakdown: RiskBreakdown }>(`/claims/${id}/evaluate`, {
      method: "POST",
    });
  }

  // Certificates
  static async getCertificates(): Promise<Certificate[]> {
    return this.request<Certificate[]>("/certificates/");
  }

  static async getCertificateLineage(identifier: string): Promise<any> {
    return this.request(`/certificates/lineage/${encodeURIComponent(identifier)}`);
  }

  static async transferCertificate(certId: number, toUserId: number, notes?: string): Promise<any> {
    return this.request(`/certificates/${certId}/transfer`, {
      method: "POST",
      body: JSON.stringify({ to_user_id: toUserId, notes }),
    });
  }

  static async redeemCertificate(certId: number): Promise<Certificate> {
    return this.request<Certificate>(`/certificates/${certId}/redeem`, {
      method: "POST",
    });
  }

  // Investigations
  static async getInvestigations(): Promise<InvestigationCase[]> {
    return this.request<InvestigationCase[]>("/investigations/");
  }

  static async adjudicateCase(
    caseId: number,
    decisionAction: "CONFIRM_FRAUD_HOLD" | "CLEAR_AND_ISSUE",
    findings: string
  ): Promise<InvestigationCase> {
    return this.request<InvestigationCase>(`/investigations/${caseId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision_action: decisionAction, findings }),
    });
  }

  static async aiInvestigateCase(caseId: number): Promise<{
    case_id: number;
    case_number: string;
    agent_verdict: string;
    agent_risk_score: number;
    violations: string[];
    agent_reasoning: string;
    registry_evidence: any;
    weather_evidence: any;
  }> {
    return this.request(`/investigations/${caseId}/ai-investigate`, {
      method: "POST",
    });
  }

  // Ledger & Verification
  static async getLedgerBlocks(limit = 100): Promise<LedgerBlock[]> {
    return this.request<LedgerBlock[]>(`/ledger/blocks?limit=${limit}`);
  }

  static async verifyLedgerIntegrity(): Promise<LedgerVerifyResult> {
    return this.request<LedgerVerifyResult>("/ledger/verify");
  }

  static async verifyDocument(file: File): Promise<{
    file_name: string;
    computed_sha256: string;
    is_registered: boolean;
    first_seen_claim_uid?: string;
    tamper_detected: boolean;
    verification_status: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request("/ledger/verify-document", {
      method: "POST",
      body: formData,
    });
  }

  // --- Hyperledger Fabric Permissioned Ledger Methods ---

  static async listFabricRECs(): Promise<any[]> {
    return this.request<any[]>("/rec");
  }

  static async getFabricREC(recId: string): Promise<any> {
    return this.request<any>(`/rec/${recId}`);
  }

  static async createFabricREC(payload: {
    recId: string;
    generatorId: string;
    energySource: string;
    generationDate: string;
    generationMWh: number;
    issuedQuantity: number;
    documentHash: string;
  }): Promise<any> {
    return this.request<any>("/rec", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  static async transferFabricREC(
    recId: string,
    payload: {
      fromOwner: string;
      toOwner: string;
      quantity: number;
      transactionReference?: string;
      callerOrg?: string;
    }
  ): Promise<any> {
    return this.request<any>(`/rec/${recId}/transfer`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  static async retireFabricREC(
    recId: string,
    payload: {
      owner: string;
      quantity: number;
      retirementReason?: string;
      callerOrg?: string;
    }
  ): Promise<any> {
    return this.request<any>(`/rec/${recId}/retire`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  static async cancelFabricREC(
    recId: string,
    payload: {
      reason?: string;
      callerOrg?: string;
    }
  ): Promise<any> {
    return this.request<any>(`/rec/${recId}/cancel`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  static async getFabricRECHistory(recId: string): Promise<{ recId: string; totalEvents: number; history: any[] }> {
    return this.request<any>(`/rec/${recId}/history`);
  }

  static async verifyFabricREC(recId: string): Promise<any> {
    return this.request<any>(`/rec/${recId}/verify`);
  }

  static async uploadFabricDocument(file: File): Promise<{
    file_name: string;
    document_hash: string;
    file_size_bytes: number;
    storage_path: string;
    message: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request("/documents/upload", {
      method: "POST",
      body: formData,
    });
  }

  static async verifyFabricDocument(
    recId: string,
    file: File
  ): Promise<{
    match: boolean;
    status: string;
    message: string;
    computed_hash: string;
    registered_hash: string;
    disclaimer: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request(`/rec/${recId}/verify-document`, {
      method: "POST",
      body: formData,
    });
  }

  static async getFabricFraudAlerts(): Promise<any[]> {
    return this.request<any[]>("/fraud/alerts");
  }
}

