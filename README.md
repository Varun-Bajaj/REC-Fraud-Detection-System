# REC Guardian
### AI-Powered Renewable Energy Certificate Fraud Detection & Forensic Intelligence Platform

> **Hackathon Team**: KHATRON KE KHILADI  
> **Core Focus**: Preventing duplicate claims, meter overclaiming, physical capacity violations, document evidence reuse, and circular wash trading across Renewable Energy Certificate (REC) markets.

---

## 📚 Technical Documentation Index

> 📕 **Complete Technical Specification Manual**: [Download Master PDF (`docs/REC_Guardian_Complete_Technical_Specification.pdf`)](docs/REC_Guardian_Complete_Technical_Specification.pdf)  
> 📑 **Official Submission Report**: [Download Project Report PDF (`docs/Renewable Energy Certificate (REC) Fraud Detection System.pdf`)](docs/Renewable%20Energy%20Certificate%20(REC)%20Fraud%20Detection%20System.pdf)  
> 🧪 **Verification Evidence Suite**: Sample PDFs available in [`docs/sample_evidence/`](docs/sample_evidence/)

| Document | Markdown & PDF Links | Summary |
| :--- | :--- | :--- |
| 🏛️ **System Architecture** | [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [**PDF**](docs/ARCHITECTURE.pdf) | Core 6-layer architecture, mathematical formulations, and risk fusion ensemble. |
| 🌐 **Fabric Network Spec** | [`fabric-network.md`](docs/fabric-network.md) · [**PDF**](docs/fabric-network.pdf) | Detailed node topology, Raft consensus, MSP identity mapping, and deployment scripts. |
| 📜 **Fabric Chaincode** | [`chaincode.md`](docs/chaincode.md) · [**PDF**](docs/chaincode.pdf) | `RECContract` TypeScript implementation, MSP authorization checks, and lifecycle states. |
| 📊 **REC Data Model** | [`data-model.md`](docs/data-model.md) · [**PDF**](docs/data-model.pdf) | On-chain asset schema, conservation laws, and off-chain PostgreSQL models. |
| 🔐 **Security & Access Control** | [`security.md`](docs/security.md) · [**PDF**](docs/security.pdf) | MSP-level enforcement, off-chain SHA-256 document hashing, and threat modeling. |
| 🔌 **Fabric REST API** | [`api.md`](docs/api.md) · [**PDF**](docs/api.pdf) | Endpoints for REC issuance, transfer, retirement, cancellation, verification, and audit history. |
| 🔌 **Core REST API Reference**| [`API_REFERENCE.md`](docs/API_REFERENCE.md) · [**PDF**](docs/API_REFERENCE.pdf) | Platform OpenAPI/REST documentation across auth, facilities, claims, and telemetry. |
| 🚨 **Fraud Detection Engine** | [`fraud-detection.md`](docs/fraud-detection.md) · [**PDF**](docs/fraud-detection.pdf) | Off-chain multi-engine forensic analysis, double-counting detection, and risk scoring. |
| 🚨 **Fraud Scenarios Guide** | [`FRAUD_SCENARIOS_GUIDE.md`](docs/FRAUD_SCENARIOS_GUIDE.md) · [**PDF**](docs/FRAUD_SCENARIOS_GUIDE.pdf) | Forensic analysis and investigation walkthrough for the 5 seeded fraud scenarios. |
| 🎨 **Frontend & UX Guide** | [`FRONTEND_GUIDE.md`](docs/FRONTEND_GUIDE.md) · [**PDF**](docs/FRONTEND_GUIDE.pdf) | GovTech design system, Lineage Explorer, and Vis.js network surveillance. |
| 📋 **Fabric Implementation** | [`fabric-implementation-plan.md`](docs/fabric-implementation-plan.md) · [**PDF**](docs/fabric-implementation-plan.pdf) | Architectural roadmap, milestones, and on-chain vs off-chain storage design. |
| 🎬 **Official Demo Guide** | [`demo.md`](docs/demo.md) · [**PDF**](docs/demo.pdf) | Interactive walkthrough for the 9-step demonstration scenario and prototype limitations. |

---

## 1. Problem & Core Mission

A **Renewable Energy Certificate (REC)** represents legal property rights to the environmental attributes of 1 Megawatt-hour (MWh) of renewable electricity.

Because electricity injected into the grid is physically indistinguishable, market integrity depends entirely on the accounting and registry layer. In legacy registries, critical vulnerabilities persist:

```
[ Power Plant ] ──> [ Generation Claim ] ──> [ Registry Issuance ] ──> [ Secondary Market Trading ] ──> [ Retirement / Scope 2 Claim ]
                           │                            │                               │
                     ⚠️ Risk 1:                   ⚠️ Risk 2:                      ⚠️ Risk 3:
               Meter vs. Claim Mismatch       Capacity Impossibility           Circular Wash-Trading
               (Over-issuance Fraud)          & Document Reuse                 & Phantom Transactions
```

1. **Meter vs. Claim Mismatches**: Generators claim significantly more generation than calibrated grid meters recorded (e.g., claiming 3,800 MWh on a 1,200 MWh meter reading — $+216.7\%$ overclaim).
2. **Physical Capacity Violations**: Claiming generation volumes that mathematically exceed nameplate capacity $\times$ interval hours $\times$ maximum theoretical capacity factors.
3. **Evidence Document Reuse**: Re-submitting identical single-line diagrams, utility interconnection approvals, or meter CSV reports across unrelated facilities or time intervals.
4. **Duplicate Submission Fingerprinting**: Resubmitting identical or overlapping generation periods to harvest multiple certificates for the same megawatt-hour.
5. **Circular Wash Trading**: Market counterparties rapidly passing certificates in closed loops ($A \to B \to C \to A$) to artificially inflate trading volumes or launder fraudulent certificates.

**REC Guardian** replaces fragmented, manual auditing with a sovereign forensic intelligence pipeline:
$$\text{Detect} \longrightarrow \text{Explain} \longrightarrow \text{Investigate} \longrightarrow \text{Preserve Evidence}$$

---

## 2. 6-Layer Architecture Pipeline

```
                     ┌─────────────────────────────────────────────────────────┐
                     │                     1. DATA SOURCES                     │
                     │  Ground Truth IoT Telemetry • Claims • Certificates     │
                     └────────────────────────────┬────────────────────────────┘
                                                  │
                                                  ▼
                     ┌─────────────────────────────────────────────────────────┐
                     │               2. DATA PRE-VALIDATION ENGINE             │
                     │  Physical Sanity • Interval Checks • Telemetry Alignment│
                     └────────────────────────────┬────────────────────────────┘
                                                  │
                                                  ▼
                     ┌─────────────────────────────────────────────────────────┐
                     │                3. HYBRID FRAUD DETECTION                │
                     │  ┌───────────────────────┐   ┌────────────────────────┐ │
                     │  │ Deterministic Rules   │   │ ML Isolation Forest    │ │
                     │  │ (Physics, DUPs, Hashes)│  │ (Outlier Distributions)│ │
                     │  └───────────┬───────────┘   └───────────┬────────────┘ │
                     └──────────────┼───────────────────────────┼──────────────┘
                                    │                           │
                                    └─────────────┬─────────────┘
                                                  │
                                                  ▼
                     ┌─────────────────────────────────────────────────────────┐
                     │               4. MULTI-ENGINE RISK FUSION               │
                     │    Weighted Ensemble • Hard Override • Explainability   │
                     └────────────────────────────┬────────────────────────────┘
                                                  │
                                                  ▼
                     ┌─────────────────────────────────────────────────────────┐
                     │          5. INVESTIGATION & ADJUDICATION ENGINE         │
                     │   Case Dockets • Evidence Timeline • Judicial Holding   │
                     └────────────────────────────┬────────────────────────────┘
                                                  │
                                                  ▼
                     ┌─────────────────────────────────────────────────────────┐
                     │               6. CRYPTOGRAPHIC TRUST LEDGER             │
                     │  SHA-256 Hash Chain • Immutability Audit • Block Trail  │
                     └─────────────────────────────────────────────────────────┘
```

### Core Engine Responsibilities:
1. **Deterministic Rule Engine** (`backend/app/engines/rule_engine.py`):
   - Strict physical tolerance checks: $\Delta = \frac{|E_{\text{claim}} - E_{\text{meter}}|}{E_{\text{meter}}} > 2.0\%$ triggers `RULE-005` with CRITICAL severity.
   - Theoretical plant capacity factor ceilings: $E_{\text{claim}} > C_{\text{MW}} \times \Delta t \times CF_{\text{baseline}}$ triggers `RULE-003` / `RULE-004`.
   - Exact duplicate payload fingerprinting (SHA-256).
   - Cross-facility evidence file hash collision detection (`RULE-009`).
2. **ML Anomaly Engine** (`backend/app/engines/ml_engine.py`):
   - Scikit-learn **Isolation Forest** multi-dimensional outlier detection.
   - Evaluates normalized feature vectors $\vec{X} = [\text{Capacity Factor}, \text{Meter Ratio}, \text{Generation Density}]$ against fuel-specific baseline distributions.
3. **Graph Relationship Engine** (`backend/app/engines/graph_engine.py`):
   - **NetworkX** directed transfer graph analysis.
   - Johnson's elementary cycle detection algorithm to identify circular wash trading loops ($A \to B \to C \to A$).
   - Counterparty clustering and reciprocity scoring.
4. **Risk Fusion & Decision Engine** (`backend/app/engines/risk_engine.py`):
   - Weighted ensemble formula:
     $$R_{\text{composite}} = 0.45 \cdot R_{\text{rules}} + 0.30 \cdot R_{\text{ml}} + 0.25 \cdot R_{\text{graph}}$$
   - **Hard Override**: Any critical rule violation (e.g. meter mismatch $> 2\%$, duplicate hash, capacity impossibility) enforces $R \ge 85.0$ and status `HELD`.
   - Actionable recommendations: `APPROVE`, `NEEDS_REVIEW`, or `HOLD`.
5. **Investigation & Adjudication Engine** (`backend/app/engines/` & `backend/app/api/v1/investigations.py`):
   - Automated case docket creation (`CASE-YYYY-XXX-NNN`) when a claim is held.
   - **6-Stage Lineage Provenance** & **Chronological Evidence Timeline** generator.
   - Human-in-the-loop regulatory adjudication (`CONFIRM_FRAUD_HOLD` vs `CLEAR_AND_ISSUE`).
6. **Tamper-Evident SHA-256 Ledger** (`backend/app/engines/ledger_engine.py`):
   - Append-only hash chain linking Genesis block to every certificate lifecycle event:
     $$H_i = \text{SHA256}(i \parallel t_i \parallel \text{event\_type} \parallel \text{data\_hash} \parallel H_{i-1})$$
   - Cryptographic integrity audit API detects any retroactively modified records.

---

## 3. Quick Start Guide

### Prerequisites
- Python 3.10+ (Tested and verified on Python 3.14)

### 1. Setup Virtual Environment
```bash
# Clone the repository
git clone https://github.com/Varun-Bajaj/REC-Fraud-Detection-System.git
cd REC-Fraud-Detection-System

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Launch the Platform
```bash
python backend/run.py
```
This automatically initializes the SQLite/PostgreSQL database, seeds realistic demo accounts & test scenarios, anchors the Genesis block on the cryptographic ledger, and launches the FastAPI server.

### 3. Open the Interactive Dashboards
- **Interactive Forensic Dashboard UI**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/) or [http://127.0.0.1:8000/app](http://127.0.0.1:8000/app)
- **Interactive Swagger OpenAPI Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Interactive ReDoc UI**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

> **Note on Frontend Solutions**:
> - **Embedded Zero-Node SPA (`backend/app/static/`)**: Zero setup friction. Runs immediately in any browser with React 18, Tailwind CSS, Lucide icons, and Vis.js Network.
> - **Standalone Next.js App (`frontend/`)**: Production Next.js 14 App Router codebase with full TypeScript typings and typed API clients. To run: `cd frontend && npm install && npm run dev` (starts on port 3000).

---

## 4. Demo Seed Accounts & Credentials

The platform includes seeded accounts across all major market personas:

| Role | Email | Password | Organization | Portal Experience |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin@recguardian.org` | `password123` | REC Guardian Authority | Full administrative control, all views |
| **Regulator** | `regulator@recguardian.org` | `password123` | Renewable Energy Regulatory Commission | Market surveillance, case adjudication, graph radar |
| **Auditor** | `auditor@recguardian.org` | `password123` | Apex Forensic ESG Audit Group | Audit review, ledger verification, evidence inspection |
| **Generator (Solar)** | `generator@solarfarm.com` | `password123` | Helios Solar Generation LLC | Plant portfolio, submit generation claims, REC wallet |
| **Generator (Wind)** | `generator2@windpower.com` | `password123` | Boreas Wind Energy Ltd | Plant portfolio, submit generation claims, REC wallet |
| **Trader** | `trader@energytrade.com` | `password123` | Global Carbon & REC Exchange | P2P certificate transfers, redemption, wallet holdings |

---

## 5. Pre-Configured Fraud Scenarios

The system database is seeded with 5 representative scenarios demonstrating end-to-end detection:

| Scenario | Target Identifier | Description | Engine Detection | Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **1. Clean Legitimate Claim** | `CLM-2026-LEGIT-01` | 1,200 MWh claim against 1,195 MWh meter reading. | $\Delta = 0.41\% \le 2.0\%$, normal CF ($3.2\%$). Risk: **14.2 / 100**. | **Auto-Approved**, minted `REC-2026-SOL-09921`. |
| **2. Meter Mismatch Overclaim** | `CLM-2026-FRAUD-MTR` | Claimed 3,800 MWh vs metered 1,200 MWh ($+216.7\%$). | `RULE-005` (Critical) + ML Isolation Forest outlier ($92.4$). Risk: **88.0 / 100**. | Status **`HELD`**, opened `CASE-2026-MTR-001`. |
| **3. Physical Capacity Violation** | `CLM-2026-FRAUD-CAP` | 50 MW plant claiming 90,000 MWh in 1 month ($>250\%$ theoretical max). | `RULE-003` & `RULE-004` (Theoretical limit $36,000$ MWh). Risk: **95.0 / 100**. | Status **`HELD`**, opened `CASE-2026-CAP-001`. |
| **4. Document Evidence Reuse** | `CLM-2026-FRAUD-DOC` | Wind facility submitting exact SHA-256 PDF hash from Mojave Solar. | `RULE-009` (Hash collision across facilities). Risk: **89.5 / 100**. | Status **`HELD`**, Cross-facility alert. |
| **5. Circular Wash Trading** | `REC-2026-WND-88319` | 3-party transfer cycle ($A \to B \to C \to A$). | NetworkX Directed Graph Cycle Detection. | **Flagged** in Vis.js Network & Lineage. |

For forensic breakdown and evidence reproduction commands, consult [`docs/FRAUD_SCENARIOS_GUIDE.md`](docs/FRAUD_SCENARIOS_GUIDE.md).

---

## 6. Certificate Explorer & 6-Stage Lineage Provenance

Inspect any certificate, claim, or investigation using the `/certificates` Explorer or API:
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://127.0.0.1:8000/api/v1/certificates/lineage/CLM-2026-FRAUD-MTR
```

The response compiles an institutional 6-stage provenance graph and chronological evidence timeline:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Stage 1   │────►│   Stage 2   │────►│   Stage 3   │────►│   Stage 4   │────►│   Stage 5   │────►│   Stage 6   │
│  Facility   │     │ Smart Meter │     │ Fingerprint │     │ Risk Engine │     │  Ledgering  │     │ Wallet & TX │
│ Generation  │     │ Telemetry   │     │ Hashes      │     │ Multi-Score │     │  Immutable  │     │ P2P History │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

1. **Generation Source**: Nameplate MW, fuel type, utility grid interconnection.
2. **Smart Meter Telemetry**: Substation serial ID, gross generation, interval window.
3. **Cryptographic Fingerprint**: SHA-256 claim hash, document evidence hash collision status.
4. **Forensic Risk Score**: Composite score, deterministic rule breakdown, Isolation Forest outlier index.
5. **Cryptographic Ledger**: Block height index, event type, block hash, parent hash link.
6. **Ownership & Trading**: Originating generator, current wallet owner, P2P transfer hops, Scope 2 retirement state.

---

## 7. Hyperledger Fabric Permissioned Ledger (Enterprise DLT)

The platform includes a **real, local Hyperledger Fabric v2.5 permissioned Distributed Ledger Technology (DLT)** network replacing simulated blockchain behavior.

### 7.1 Architecture & The 4 Organizations
* **RegulatorOrg (`RegulatorOrgMSP`)**: Regulatory surveillance, certificate suspension, and administrative cancellation (`cancelREC`).
* **IssuerOrg (`IssuerOrgMSP`)**: Power facility validation and certificate issuance (`createREC`). Only authorized Issuer identities can issue certificates.
* **BuyerOrg (`BuyerOrgMSP`)**: Corporate buyers holding, transferring (`transferREC`), and permanently retiring (`retireREC`) certificates for Scope 2 compliance.
* **AuditorOrg (`AuditorOrgMSP`)**: Independent audit access, verifying transaction block history (`getRECHistory`) and document byte hashes.
* **Channel**: Dedicated `rec-channel` with Raft consensus ordering (`orderer.rec.com:7050`).
* **Smart Contract**: `RECContract` (TypeScript Chaincode as a Service - CCAAS v1.0).

### 7.2 Quick Start Instructions (Clean Machine)

#### Step 1: Start Hyperledger Fabric Network
```bash
# In Bash (Linux / macOS / Git Bash):
cd fabric-network
./network.sh startAll

# In Windows PowerShell:
cd fabric-network
.\network.ps1 startAll
```
This automatically:
1. Generates crypto material (Orderer & 4 Peer Orgs) via `cryptogen`.
2. Launches Docker containers (`orderer.rec.com`, `peer0.regulator`, `peer0.issuer`, `peer0.buyer`, `peer0.auditor`, `cli`).
3. Creates channel `rec-channel` and joins all 4 organizations.
4. Packages, installs, approves, and commits `RECContract` chaincode.
5. Launches the chaincode container `rec-contract:1.0` on port 9999.
6. Builds and starts the Fabric Gateway bridge service on port 5050.

#### Step 2: Start FastAPI Backend
```bash
cd backend
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

#### Step 3: Start Next.js Frontend
```bash
cd frontend
npm run dev
```
Navigate to `http://localhost:3000` and select the **⚡ Hyperledger Fabric DLT & Demo** tab to interact with the real ledger and run the 9-step demo!

---

## 8. Automated Test Suite (16 Fabric DLT + 19 Platform Tests)

The test suite runs automated tests covering all engines, API routes, RBAC isolation, and ledger verification:

### 8.1 Hyperledger Fabric 16-Scenario Specification Suite:
```bash
pytest backend/tests/test_fabric_rec.py -v
```
**All 16 Scenarios Verified on Live Fabric Ledger:**
1. `test_01_create_rec`: Successful issuance on Fabric by IssuerOrgMSP.
2. `test_02_duplicate_rec_creation`: Duplicate REC ID rejected.
3. `test_03_invalid_rec_quantity`: Zero/negative quantities rejected.
4. `test_04_unauthorized_rec_creation`: BuyerOrg unauthorized creation rejected.
5. `test_05_valid_transfer`: P2P active balance transfer between accounts.
6. `test_06_transfer_greater_than_balance`: Smart contract rejects insufficient balance.
7. `test_07_unauthorized_transfer`: Non-owner transfer rejected.
8. `test_08_valid_retirement`: Permanent Scope 2 retirement of active units.
9. `test_09_retirement_greater_than_balance`: Retirement exceeding balance rejected.
10. `test_10_transfer_retired_rec`: Attempt to transfer retired units rejected.
11. `test_11_cancel_rec`: Regulator cancels certificate.
12. `test_12_transfer_cancelled_rec`: Transfer of cancelled certificate rejected.
13. `test_13_duplicate_document_hash`: Fraud engine catches reused document hash (double-counting).
14. `test_14_rec_history`: Complete chronological block timeline retrieved from ledger.
15. `test_15_authorization_by_organization`: Auditor read-only enforcement; mutations rejected.
16. `test_16_ledger_query_and_verify`: State verification and conservation law checks.

### 8.2 Core Intelligence Platform Suite:
```bash
pytest backend/tests/test_api.py backend/tests/test_engines.py -v
```

### Verified Test Cases:
- `test_health_check`: Root system availability.
- `test_auth_login`: OAuth2 password form authentication and JWT issuance.
- `test_auth_login_json_and_roles`: JSON payload authentication and multi-role parsing.
- `test_auth_registration`: Dynamic generator onboarding and duplicate rejection.
- `test_list_plants`: Clean energy facility registry and filtering.
- `test_dashboard_kpis`: Forensic metrics, market volume, and fraud rate aggregation.
- `test_network_graph_api`: NetworkX graph generation and node/edge topology.
- `test_ledger_audit_api`: Full cryptographic hash chain traversal and tamper verification.
- `test_claim_submission_and_evaluation`: Real-time submission, risk fusion, and ledger anchoring.
- `test_certificate_lifecycle`: Certificate minting, P2P wallet transfers, and Scope 2 redemption.
- `test_investigation_and_regulatory_decision`: Regulatory adjudication and RBAC protection (HTTP 403 for unauthorized users).
- `test_certificate_lineage_and_timeline`: 6-stage provenance reconstruction and chronological timeline.
- `test_rule_engine_meter_mismatch`: Deterministic rule violation on $\Delta > 2\%$.
- `test_rule_engine_capacity_violation`: Physics violation on impossible capacity factors.
- `test_rule_engine_duplicate_detection`: SHA-256 fingerprint collision detection.
- `test_rule_engine_document_reuse`: Evidence document hash collision across facilities.
- `test_ml_anomaly_engine`: Scikit-learn Isolation Forest multi-dimensional outlier scoring.
- `test_graph_engine_cycle_detection`: NetworkX circular wash-trading loop detection.
- `test_ledger_tamper_detection`: Cryptographic detection of simulated historical record tampering.

---

## 8. Hackathon Evaluation Checklist

| Requirement / Criterion | Status | Implementation Details |
| :--- | :---: | :--- |
| **Telemetry & Meter Ingestion** | ✅ | Substation telemetry ingestion with timestamp intervals, MWh readings, and payload hashes. |
| **Meter vs. Claim Tolerance Checks** | ✅ | Calibrated $2\%$ threshold formula flagging over-claims with explainable error margins. |
| **Physical Capacity Bounds** | ✅ | Nameplate capacity $\times$ hours $\times$ fuel-specific capacity factor validation. |
| **Duplicate & Collision Prevention** | ✅ | SHA-256 claim fingerprinting and document hash cross-checking. |
| **Machine Learning Anomaly Detection**| ✅ | Scikit-learn Isolation Forest detecting multivariate statistical deviations. |
| **Graph Wash Trading Surveillance** | ✅ | NetworkX directed graph analysis with Johnson's cycle detection and Vis.js physics UI. |
| **Cryptographic Immutability** | ✅ | Append-only SHA-256 hash chain with automated tamper detection traversal. |
| **Regulatory Case Management** | ✅ | Case dockets with evidence timeline and human-in-the-loop judicial decisions. |
| **Institutional GovTech Design** | ✅ | Clean Energy Emerald (`#059669`) & Regulatory Cobalt (`#1d4ed8`) high-contrast theme. |
| **Role-Based Portals & JWT Auth** | ✅ | Dedicated views for Regulators, Auditors, and Generators with strict RBAC enforcement. |
| **Zero-Node Quick Start Option** | ✅ | Embedded React 18 SPA served directly by FastAPI alongside production Next.js 14 app. |
