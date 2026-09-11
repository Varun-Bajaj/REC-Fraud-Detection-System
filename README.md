# REC Guardian
### AI-Powered Renewable Energy Certificate Fraud Detection & Forensic Intelligence Platform

**Team**: KHATRON KE KHILADI  
**Role Breakdown**:
- **Varun**: Backend & AI/ML Engineer
- **Kevin**: Blockchain & Security Engineer
- **Dhruv**: Frontend & Product Engineer

---

## 1. Problem & Core Mission
A Renewable Energy Certificate (REC) represents a claim: *"this much renewable electricity was generated."* That claim passes through many hands — generator, meter, issuer, trader, buyer — before it is finally redeemed. At every handoff, fraud risks occur:
1. **Meter vs. Claim Mismatch**: Generators claiming more energy than the meter recorded.
2. **Duplicate Claims**: Resubmission of identical generation records or overlapping intervals.
3. **Physical Capacity Violations**: Generation claims that exceed physical plant capacity or theoretical laws.
4. **Document Reuse**: Evidence files (meter reports, single line diagrams) recycled across unrelated claims.
5. **Wash Trading Rings**: Suspicious circular transfers between accounts to artificially inflate volumes.

**REC Guardian** acts as a sovereign forensic intelligence layer:
$$\text{Detect} \longrightarrow \text{Explain} \longrightarrow \text{Investigate} \longrightarrow \text{Preserve Evidence}$$

---

## 2. Key Architecture & Forensic Engines

### Detection Layers:
1. **Deterministic Rule Engine** (`backend/app/engines/rule_engine.py`):
   - Meter vs claim tolerance checks ($\Delta > 2\%$)
   - Theoretical plant capacity factor ceilings
   - Exact duplicate payload fingerprinting (SHA-256)
   - Cross-facility evidence file hash collision detection
2. **ML Anomaly Engine** (`backend/app/engines/ml_engine.py`):
   - Scikit-learn **Isolation Forest** multi-dimensional outlier detection
   - Profiles capacity factor, meter ratio, and generation density against calibrated fuel baselines
3. **Graph Relationship Engine** (`backend/app/engines/graph_engine.py`):
   - **NetworkX** directed transfer graph analysis
   - Cycle detection algorithms to catch circular wash trading ($A \to B \to C \to A$)
   - Counterparty clustering and reciprocity scoring
4. **Risk Fusion & Decision Engine** (`backend/app/engines/risk_engine.py`):
   - Weighted ensemble ($w_{\text{rules}} = 0.45, w_{\text{ml}} = 0.30, w_{\text{graph}} = 0.25$) with critical fraud override
   - Explainable breakdown: provides human-readable reasons, score contributions, and evidence
   - Actionable recommendations: `APPROVE`, `NEEDS_REVIEW`, or `HOLD`
5. **Tamper-Evident SHA-256 Ledger** (`backend/app/engines/ledger_engine.py`):
   - Append-only hash chain linking Genesis block to every certificate lifecycle event
   - Cryptographic integrity audit API detects any retroactively modified data

---

## 3. Quick Start Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)

### 1. Environment Setup
```bash
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
This automatically initializes the database, creates the Genesis block on the cryptographic ledger, seeds realistic demo accounts & test scenarios, and launches the FastAPI server.

- **Interactive Forensic Dashboard UI**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/) or [http://127.0.0.1:8000/app](http://127.0.0.1:8000/app)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc UI**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 3. Frontend Architecture (Next.js & Embedded SPA)
- **Zero-Dependency Embedded App**: Built with React 18, Tailwind CSS, Lucide icons, and Vis.js Network. Served directly by FastAPI with zero Node.js friction.
- **Standalone Next.js Codebase** (`frontend/`): Complete TypeScript + Tailwind CSS production app with typed API clients and components for frontend engineers.


---

## 4. Seed Accounts & Credentials

| Role | Email | Password | Organization |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@recguardian.org` | `password123` | REC Guardian Authority |
| **Regulator** | `regulator@recguardian.org` | `password123` | Renewable Energy Regulatory Commission |
| **Auditor** | `auditor@recguardian.org` | `password123` | Apex Forensic ESG Audit Group |
| **Generator (Solar)** | `generator@solarfarm.com` | `password123` | Helios Solar Generation LLC |
| **Generator (Wind)** | `generator2@windpower.com` | `password123` | Boreas Wind Energy Ltd |
| **Trader** | `trader@energytrade.com` | `password123` | Global Carbon & REC Exchange |

---

## 5. Pre-Configured Fraud Scenarios

1. **Clean Legitimate Claim** (`CLM-2026-LEGIT-01`): Conforms to solar meter reading and baseline capacity factor ($\text{Risk} < 15$). Auto-approved and certificate minted.
2. **Meter Mismatch Overclaim** (`CLM-2026-FRAUD-MTR`): Claimed 3,800 MWh vs metered 1,200 MWh (+216% overclaim). Status `HELD`, Investigation case opened.
3. **Physical Capacity Violation** (`CLM-2026-FRAUD-CAP`): 50 MW plant claiming 90,000 MWh in a single month (>245% theoretical max capacity). Flagged `CRITICAL`.
4. **Document Evidence Reuse** (`CLM-2026-FRAUD-DOC`): Wind facility submitting the exact SHA-256 PDF report hash from the Mojave Solar plant.
5. **Circular Wash Trading Ring**: 3-node cycle (`generator2@windpower.com` $\to$ `trader@energytrade.com` $\to$ `generator@solarfarm.com` $\to$ `generator2@windpower.com`) flagged by NetworkX cycle detection.

---

## 6. Running Automated Tests

```bash
pytest backend/tests -v
```
All 16 test cases verify:
- Deterministic Rule Engine violations (meter, capacity, duplicates, document reuse)
- ML Isolation Forest outlier detection
- NetworkX circular transfer cycle detection
- Cryptographic SHA-256 ledger integrity & tamper detection
- End-to-end REST API workflows (auth, claims, certificates, investigations, analytics)
