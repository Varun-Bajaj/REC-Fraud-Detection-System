# REC Guardian: System Architecture & Technical Specification

> **AI-Powered Renewable Energy Certificate (REC) Fraud Detection, Telemetry Verification & Tamper-Evident Ledger Platform**  
> **Team**: KHATRON KE KHILADI (Varun Bajaj, Kevin Chen, Dhruv Patel)  
> **Target Problem**: Comprehensive fraud prevention in REC issuance, duplicate claim elimination, physical generation validation, and secondary market wash-trading surveillance.

---

## 1. Executive Summary & Problem Definition

A **Renewable Energy Certificate (REC)** is a market-based instrument representing the legal property rights to the environmental attributes of 1 Megawatt-hour (MWh) of renewable electricity generated.

Because electricity generated from clean sources (solar, wind, hydro) is indistinguishable from fossil power once injected into the electrical transmission grid, market integrity depends entirely on the accounting and verification layer. In legacy REC registries, significant vulnerabilities exist:

```
[ Power Plant ] ──> [ Generation Claim ] ──> [ Registry Issuance ] ──> [ Secondary Market Trading ] ──> [ Retirement / Scope 2 Claim ]
                           │                            │                               │
                     ⚠️ Risk 1:                   ⚠️ Risk 2:                      ⚠️ Risk 3:
               Meter vs. Claim Mismatch       Capacity Impossibility           Circular Wash-Trading
               (Over-issuance Fraud)          & Document Reuse                 & Phantom Transactions
```

1. **Meter vs. Claim Mismatch**: Generators reporting more generation than metered at the grid substation (+200% over-claims).
2. **Physical Capacity Impossibility**: Smaller facilities claiming generation that mathematically exceeds nameplate capacity $\times$ hours $\times$ maximum theoretical capacity factor.
3. **Evidence Document Reuse**: Submitting identical single-line diagrams, utility interconnection approvals, or meter CSV reports across unrelated facilities or time intervals.
4. **Duplicate Submission Fingerprinting**: Resubmitting identical or overlapping generation periods across different registries.
5. **Circular Wash Trading**: Market counterparties rapidly passing certificates in closed loops ($A \to B \to C \to A$) to artificially inflate perceived market volume or launder fraudulent certificates.

**REC Guardian** replaces fragmented, manual auditing with a unified **6-Layer Real-Time Intelligence Architecture**.

---

## 2. The 6-Layer Architecture Pipeline

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

---

## 3. Detailed Component Deep-Dive

### Layer 1: Data Sources & Entities

The system maintains normalized relational models representing the full physical and market lifecycle in SQLite/PostgreSQL via SQLAlchemy:

| Entity | Model File | Purpose & Key Attributes |
|---|---|---|
| **User & RBAC** | `app/models/user.py` | Role-based accounts (`ADMIN`, `REGULATOR`, `AUDITOR`, `GENERATOR`), bcrypt-hashed passwords. |
| **Power Facility** | `app/models/plant.py` | Asset name, `FuelType` (Solar, Wind, Hydro, Biomass), `nameplate_capacity_mw`, `grid_interconnection_id`, `max_capacity_factor`. |
| **Smart Meter** | `app/models/meter.py` | `meter_serial_number`, `interval_start`, `interval_end`, `energy_generated_mwh`, raw meter payload hash. |
| **Generation Claim** | `app/models/claim.py` | `claim_uid`, claimed MWh, `submission_fingerprint` (SHA-256), `status` (`APPROVED`, `HELD`, `UNDER_REVIEW`, `REJECTED`), risk breakdown. |
| **Evidence Document** | `app/models/claim.py` | `file_hash` (SHA-256), `document_type`, file name, storage path for document deduplication. |
| **REC Certificate** | `app/models/certificate.py`| Globally unique `certificate_uid`, vintage month/year, volume MWh, fuel type, `status` (`ISSUED`, `TRANSFERRED`, `REDEEMED`, `REVOKED`). |
| **Certificate Transfer** | `app/models/certificate.py`| Counterparty transfer log: `from_user_id`, `to_user_id`, `transfer_type`, `tx_hash`, timestamp. |
| **Investigation Case** | `app/models/investigation.py`| Formal regulatory docket: `case_number`, priority (`LOW` to `CRITICAL`), `findings`, `decision_action` (`CONFIRM_FRAUD_HOLD` vs `CLEAR_AND_ISSUE`). |
| **Ledger Block** | `app/models/ledger.py` | Cryptographic block: `index`, `timestamp`, `event_type`, `data_hash`, `previous_hash`, `current_hash`. |

---

### Layer 2: Data Pre-Validation Engine

Before running AI models, incoming raw generation submissions pass through deterministic physical boundary filters:
- **Interval Duration Verification**: Checks whether $\Delta t = t_{\text{end}} - t_{\text{start}} > 0$.
- **Asset Existence & Interconnection Check**: Verifies active registration of the plant and grid interconnection code.
- **Meter Alignment**: Validates that telemetry readings from the utility substation overlap the claimed generation interval.

---

### Layer 3: Hybrid Fraud Detection Engine

The fraud detection pipeline combines deterministic physical laws with machine learning to identify both **known fraud patterns** and **novel unknown anomalies**.

#### A. Deterministic Rule Engine (`app/engines/rule_engine.py`)

Deterministic rules operate with zero false positives on known violations:

1. **`RULE-005`: Smart Meter vs. Claim Tolerance Check**:
   $$\Delta_{\text{mismatch}} = \frac{\text{Claimed MWh} - \text{Metered MWh}}{\text{Metered MWh}}$$
   If $\Delta_{\text{mismatch}} > 0.02$ (+2% tolerance threshold), the rule triggers with high severity (+80 risk score points).
2. **`RULE-003` & `RULE-004`: Physical Capacity Factor Bounds**:
   $$\text{Max Theoretical Energy} = \text{Capacity}_{\text{MW}} \times \Delta t_{\text{hours}} \times \text{CapacityFactor}_{\text{max}}$$
   If claimed generation exceeds the absolute physical limit ($\text{Capacity}_{\text{MW}} \times \Delta t_{\text{hours}}$), the system triggers a **CRITICAL** impossibility flag (+95 risk score points).
3. **`RULE-008`: Duplicate Submission Fingerprinting**:
   Every claim produces a deterministic SHA-256 fingerprint:
   $$\text{Fingerprint} = \text{SHA256}(\text{PlantID} \parallel t_{\text{start}} \parallel t_{\text{end}} \parallel \text{ClaimedMWh})$$
   If this fingerprint already exists on the registry, it is immediately blocked as a duplicate (+90 risk score points).
4. **`RULE-009`: Cross-Facility Document Evidence Hash Collision**:
   Extracts the SHA-256 checksum of attached PDF/CSV audit reports. If a document hash matches an earlier submission from a *different* plant, a document-reuse fraud alert is triggered (+85 risk score points).
5. **Lifecycle State Protection (`app/api/v1/certificates.py`)**:
   Enforces terminal state integrity: certificates in status `REDEEMED` or `REVOKED` cannot be transferred, claimed again, or re-minted.

#### B. Machine Learning Anomaly Detection Engine (`app/engines/ml_engine.py`)

Employs **Scikit-learn `IsolationForest`** trained on multidimensional operational feature vectors:

$$\vec{X} = \begin{bmatrix} \text{CapacityFactor} \\ \text{MeterRatio} \\ \text{GenerationDensity} \end{bmatrix} = \begin{bmatrix} \frac{\text{Claimed MWh}}{\text{Capacity}_{\text{MW}} \times \Delta t_{\text{hours}}} \\ \frac{\text{Claimed MWh}}{\text{Metered MWh}} \\ \frac{\text{Claimed MWh}}{\text{Capacity}_{\text{MW}}} \end{bmatrix}$$

- Calibrated against fuel-specific baselines (Solar average CF $15\text{--}28\%$, Wind $25\text{--}50\%$, Hydro $35\text{--}65\%$).
- The model outputs an isolation score transformed into an interpretable continuous anomaly score ($0\text{--}100$).
- Detects subtle creeping overclaims (+8% across 10 months) that evade rigid threshold traps.

#### C. Graph Relationship Engine (`app/engines/graph_engine.py`)

Models secondary market certificate transactions as a **NetworkX Directed Multigraph** $G = (V, E)$:
- **Nodes ($V$)**: Market participants (producers, aggregators, traders, compliance buyers).
- **Edges ($E$)**: Individual certificate transfer transactions with volume and timestamp weights.
- **Cycle Detection**: Uses Johnson’s elementary cycle algorithm to detect closed wash-trading loops ($A \to B \to C \to A$):
  ```
  [ Producer A ] ──transfer──> [ Trader B ] ──transfer──> [ Aggregator C ] ──transfer──> [ Producer A ]
  ```
- **Reciprocal Volume Scoring**: Flags rapid back-and-forth trades between identical counterparties occurring within short time horizons.

---

### Layer 4: Multi-Engine Risk Fusion Engine (`app/engines/risk_engine.py`)

Combines all detection engines into a defensible, explainable composite risk score:

$$\text{FinalScore} = w_{\text{rule}} S_{\text{rule}} + w_{\text{ml}} S_{\text{ml}} + w_{\text{graph}} S_{\text{graph}}$$

- **Weights**: $w_{\text{rule}} = 0.45, \quad w_{\text{ml}} = 0.30, \quad w_{\text{graph}} = 0.25$
- **Hard Override Mechanism**: If any critical physical impossibility (`RULE-003`, `RULE-004`) or exact duplicate fingerprint (`RULE-008`) is detected:
  $$\text{FinalScore} = \max(\text{FinalScore}, 88.0)$$
- **Triage Recommendation**:
  - Score $< 25.0 \implies$ `APPROVE` (Green light, auto-mint REC)
  - $25.0 \le \text{Score} < 65.0 \implies$ `NEEDS_REVIEW` (Flagged for secondary audit)
  - Score $\ge 65.0 \implies$ `HOLD` (Fraud hold, investigation docket created)

---

### Layer 5: Investigation & Regulatory Adjudication Engine

Provides human-in-the-loop regulatory oversight:
- **Case Docket Management**: Automatic ticket generation (`CASE-YYYY-XXX-NNN`) when a claim is held.
- **Evidence Timeline Synthesis**: Dynamically reconstructs an immutable, step-by-step chronological narrative linking:
  $$\text{Meter Reading} \longrightarrow \text{Claim Submission} \longrightarrow \text{AI Evaluation} \longrightarrow \text{Case Filing} \longrightarrow \text{Adjudication}$$
- **Regulatory Action Orders**:
  - `CONFIRM_FRAUD_HOLD`: Permanently seals the claim as rejected, marks the case resolved as fraud, and logs statutory sanctions onto the ledger.
  - `CLEAR_AND_ISSUE`: Regulatory officer overrides a false positive, approves the claim, and issues the verified REC token onto the ledger.

---

### Layer 6: Cryptographic Trust Ledger (`app/engines/ledger_engine.py`)

Ensures zero-tampering and complete auditability without reliance on external gas fees:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Block 0        │       │  Block 1        │       │  Block 2        │
│  Genesis Block  │ <──── │  Claim Evaluated│ <──── │  REC Issued     │
│  Hash: 0000...  │       │  Prev: Block 0  │       │  Prev: Block 1  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

- **Block Anatomy**:
  - `index`: Sequential integer ($0, 1, 2, \dots$)
  - `timestamp`: ISO-8601 UTC timestamp (`YYYY-MM-DDTHH:MM:SSZ`)
  - `event_type`: `GENESIS`, `CLAIM_SUBMITTED`, `CLAIM_EVALUATED`, `CERTIFICATE_ISSUED`, `CERTIFICATE_TRANSFERRED`, `CERTIFICATE_REDEEMED`, `INVESTIGATION_RESOLVED`
  - `entity_type` & `entity_id`: e.g. `CLAIM`, `CLM-2026-FRAUD-MTR`
  - `data_hash`: SHA-256 of the JSON canonical event payload
  - `previous_hash`: SHA-256 of the previous block in the chain
  - `current_hash`: $\text{SHA256}(\text{index} \parallel \text{timestamp} \parallel \text{event\_type} \parallel \text{data\_hash} \parallel \text{previous\_hash})$
- **Tamper Traversal Algorithm**: The `/api/v1/ledger/verify` endpoint dynamically traverses the entire chain from Genesis to head, re-computing each block hash and validating pointer links. If any historical record is modified directly in the database, the check halts and pinpoints the exact corrupted block index.

---

## 4. Security, JWT RBAC & Role Isolation

1. **Password Hashing**: Direct `bcrypt` hashing with salt rounds.
2. **JWT Authorization**: Cryptographic signing via `pyjwt` with `HS256`, containing user ID, role, and expiration window.
3. **Strict RBAC Enforcement**:
   - Generators are strictly isolated to their own facility assets and submitted claims.
   - Any attempt by a Generator to access regulatory adjudication endpoints (`/api/v1/investigations/{id}/decision`) is rejected with **HTTP 403 Forbidden**.
   - Regulators and Forensic Auditors possess global market surveillance privileges.
