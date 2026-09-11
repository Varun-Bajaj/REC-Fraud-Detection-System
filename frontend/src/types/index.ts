export type UserRole = "GENERATOR" | "REGULATOR" | "AUDITOR" | "ADMIN";

export interface User {
  id: number;
  email: string;
  full_name: string;
  organization_name?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export type FuelType = "SOLAR" | "WIND" | "HYDRO" | "BIOMASS" | "GEOTHERMAL";

export interface Plant {
  id: number;
  owner_id: number;
  name: string;
  fuel_type: FuelType;
  nameplate_capacity_mw: number;
  grid_interconnection_id: string;
  location_address?: string;
  latitude?: number;
  longitude?: number;
  max_capacity_factor: number;
  status: "ACTIVE" | "SUSPENDED" | "DECOMMISSIONED";
  created_at: string;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ClaimStatus = "PENDING" | "APPROVED" | "UNDER_REVIEW" | "HELD" | "REJECTED";

export interface RiskFactorItem {
  rule_id: string;
  name: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score_contribution: number;
  description: string;
  flagged: boolean;
  evidence_details?: Record<string, any>;
}

export interface RiskBreakdown {
  rule_engine_score: number;
  ml_anomaly_score: number;
  graph_risk_score: number;
  final_risk_score: number;
  risk_level: RiskLevel;
  recommendation: "APPROVE" | "NEEDS_REVIEW" | "HOLD";
  summary_explanation: string;
  factors: RiskFactorItem[];
}

export interface Claim {
  id: number;
  claim_uid: string;
  plant_id: number;
  submitted_by_user_id: number;
  period_start: string;
  period_end: string;
  claimed_mwh: number;
  meter_reading_id?: number;
  submission_fingerprint: string;
  status: ClaimStatus;
  risk_score: number;
  risk_level: RiskLevel;
  risk_breakdown?: RiskBreakdown;
  created_at: string;
  updated_at: string;
}

export interface Certificate {
  id: number;
  certificate_uid: string;
  claim_id: number;
  plant_id: number;
  current_owner_id: number;
  fuel_type: FuelType;
  mwh: number;
  vintage_year: number;
  vintage_month: number;
  issuance_date: string;
  status: "ISSUED" | "TRANSFERRED" | "REDEEMED" | "REVOKED";
}

export interface InvestigationCase {
  id: number;
  case_number: string;
  claim_id: number;
  assigned_investigator_id?: number;
  status: "OPEN" | "UNDER_INVESTIGATION" | "RESOLVED_FRAUD" | "RESOLVED_LEGITIMATE" | "CLOSED";
  priority: RiskLevel;
  findings?: string;
  decision_action: "PENDING" | "CONFIRM_FRAUD_HOLD" | "CLEAR_AND_ISSUE";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LedgerBlock {
  id: number;
  index: number;
  timestamp: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  data_payload: Record<string, any>;
  data_hash: string;
  previous_hash: string;
  current_hash: string;
}

export interface LedgerVerifyResult {
  is_valid: boolean;
  total_blocks: number;
  tampered_block_index?: number;
  verification_message: string;
  verified_at: string;
}

export interface DashboardStats {
  total_plants: number;
  total_mwh_claimed: number;
  total_mwh_issued: number;
  total_claims: number;
  claims_pending: number;
  claims_approved: number;
  claims_under_review: number;
  claims_held: number;
  total_certificates_issued: number;
  total_certificates_transferred: number;
  total_certificates_redeemed: number;
  open_investigation_cases: number;
  risk_distribution: Record<RiskLevel, number>;
}
