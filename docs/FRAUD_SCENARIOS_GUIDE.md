# REC Guardian: Pre-Configured Fraud Scenarios & Testing Guide

> **Purpose**: This guide details the 5 realistic pre-configured forensic scenarios seeded into the platform database, explaining the fraud mechanics, which detection engines trigger, and how regulators investigate and adjudicate them.

---

## 📋 Scenario Matrix Overview

| Scenario # | Scenario Description | Target Identifier | Primary Engine Flags | Risk Score | Expected Outcome |
|---|---|---|---|:---:|---|
| **1** | **Clean Legitimate Claim** | `CLM-2026-LEGIT-01` | None (Within $2\%$ meter tolerance, normal CF) | **14.2 / 100** | Auto-Approved, REC Minted (`REC-2026-SOL-09921`) |
| **2** | **Meter Mismatch Over-Claim** | `CLM-2026-FRAUD-MTR` | `RULE-005` (Meter Mismatch +216.7%), ML Outlier | **88.0 / 100** | Status `HELD`, Case Opened (`CASE-2026-MTR-001`) |
| **3** | **Physical Capacity Impossibility** | `CLM-2026-FRAUD-CAP` | `RULE-003` & `RULE-004` (Exceeds Physical Max by >250%) | **95.0 / 100** | Status `HELD`, Case Opened (`CASE-2026-CAP-001`) |
| **4** | **Document Evidence Reuse** | `CLM-2026-FRAUD-DOC` | `RULE-009` (Exact SHA-256 PDF report collision) | **89.5 / 100** | Status `HELD`, Cross-Facility Alert |
| **5** | **Circular Wash Trading Ring** | `REC-2026-WND-88319` | NetworkX Directed Graph Cycle Detection ($A \to B \to C \to A$) | **Graph Alert** | Flagged in Graph Surveillance & Lineage |

---

## 1. Scenario 1: Clean Legitimate Generation

### Fraud Anatomy
- **Facility**: Mojave Desert Solar One (50 MW Solar PV)
- **Claimed Volume**: 1,200.0 MWh over 31-day period (March 2026)
- **Substation Meter Reading**: 1,195.0 MWh Net Generation
- **Capacity Factor**: $\frac{1200}{50 \times 744} \approx 3.2\%$ (Early commissioning stage, within valid baseline)

### Detection Pipeline Evaluation
- **Deterministic Rules**:
  - `RULE-005` (Meter Mismatch): Difference is $\frac{1200 - 1195}{1195} \approx 0.41\% \le 2.0\%$ tolerance $\implies$ **PASSED**.
  - `RULE-003` (Capacity Bounds): Well within 50 MW physical envelope $\implies$ **PASSED**.
  - `RULE-008` (Duplicate Check): Unique fingerprint $\implies$ **PASSED**.
- **ML Anomaly Model**: Isolation Forest classifies vector as inlier $\implies$ Anomaly Score: **12.0 / 100**.
- **Risk Fusion**: Composite score **14.2 / 100** (Recommendation: `APPROVE`).

### System Action
1. Claim automatically transitions to `APPROVED`.
2. Digital REC certificate minted onto ledger: `REC-2026-SOL-09921` (Volume: 1,200 MWh, Vintage: 2026-03).
3. Cryptographic block committed to SHA-256 ledger.

---

## 2. Scenario 2: Smart Meter vs. Claim Mismatch (+216% Over-Claim)

### Fraud Anatomy
- **Facility**: Mojave Desert Solar One (50 MW Solar PV)
- **Substation Calibrated Meter**: **1,200.0 MWh**
- **Producer Claimed Volume**: **3,800.0 MWh**
- **Over-Claim Delta**: $+2,600.0\text{ MWh}$ ($+216.7\%$ inflation above actual generation)

### Detection Pipeline Evaluation
- **Deterministic Rule Engine**:
  - `RULE-005` (`METER_CLAIM_MISMATCH`) triggers with **CRITICAL** severity.
  - Formula: $\Delta = \frac{3800 - 1200}{1200} = +216.7\% \gg 2.0\%$.
  - Rule engine score contribution: **+80.0 points**.
- **ML Anomaly Model**:
  - Input vector $\vec{X} = [0.102, 3.16, 76.0]$ severely deviates from calibrated solar baselines.
  - Isolation Forest flags extreme statistical outlier: Anomaly score **92.4 / 100**.
- **Risk Fusion**:
  - Score reaches **88.0 / 100** (Risk Level: `CRITICAL`, Recommendation: `HOLD`).

### System Action & Regulatory Investigation
1. Claim is automatically locked into status `HELD`. Certificate issuance is blocked.
2. An investigation docket is auto-opened: `CASE-2026-MTR-001` (Priority: `CRITICAL`).
3. Case appears in the Regulatory Authority console for human adjudication (`CONFIRM_FRAUD_HOLD` vs `CLEAR_AND_ISSUE`).

---

## 3. Scenario 3: Physical Capacity Impossibility (>250% Above Physics)

### Fraud Anatomy
- **Facility**: Mojave Desert Solar One (50 MW Nameplate Capacity)
- **Interval**: 1 Month (720 Hours)
- **Theoretical Absolute Physical Limit**:
  $$\text{Max Possible Energy} = 50\text{ MW} \times 720\text{ Hours} = 36,000\text{ MWh}$$
  *(Even if running at 100% capacity factor 24 hours a day with zero night darkness)*
- **Claimed Volume**: **90,000.0 MWh** ($>250\%$ above theoretical physical limits!)

### Detection Pipeline Evaluation
- **Deterministic Rule Engine**:
  - `RULE-004` (`THEORETICAL_CAPACITY_LIMIT`) triggers: Claimed 90,000 MWh exceeds the absolute mathematical ceiling of 36,000 MWh.
  - `RULE-003` (`NAMEPLATE_CAPACITY_VIOLATION`) triggers: Capacity factor is $250.0\%$ (Solar maximum realistic CF is $\le 32\%$).
- **Risk Fusion Hard Override**:
  - Because a physical impossibility was detected, the hard override activates:
    $$\text{FinalScore} = \max(\text{FinalScore}, 95.0) = 95.0 / 100$$

### System Action
1. Claim immediately flagged `CRITICAL` and held.
2. Investigation Case `CASE-2026-CAP-001` opened with findings: *"Physical impossibility: Generation exceeds 100% continuous nameplate capacity by 2.5x."*

---

## 4. Scenario 4: Cross-Facility Document Evidence Hash Reuse

### Fraud Anatomy
- **Legitimate Origin**: Mojave Desert Solar One uploaded third-party engineering audit report `mojave_solar_audit_q1_2026.pdf` with SHA-256 hash:
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- **Fraudulent Submitter**: Columbia Gorge Wind Facility submits an unrelated wind generation claim, attaching the exact same PDF audit report.

### Detection Pipeline Evaluation
- **Deterministic Rule Engine**:
  - `RULE-009` (`DOCUMENT_EVIDENCE_REUSE`) computes the SHA-256 checksum of the evidence file.
  - Cross-references historical registry attachments: Detects that hash `e3b0c442...` was previously registered to a completely different facility (`Plant #1` vs `Plant #3`).
  - Score contribution: **+85.0 points**.

### System Action
1. Claim blocked from minting.
2. Forensic audit logs document recycling alert across facility boundaries.

---

## 5. Scenario 5: Circular Wash Trading Ring ($A \to B \to C \to A$)

### Fraud Anatomy
- **Certificate**: `REC-2026-WND-88319` (5,000 MWh Wind REC)
- **Trade Hop 1**: Boreas Wind Energy (`user-5`) transfers to Global Carbon Exchange (`user-6`).
- **Trade Hop 2**: Global Carbon Exchange (`user-6`) transfers to Helios Solar (`user-4`).
- **Trade Hop 3**: Helios Solar (`user-4`) transfers *back* to Boreas Wind Energy (`user-5`).
- **Objective**: Artificial volume pump / phantom liquidity laundering without real carbon offset transfer.

### Detection Pipeline Evaluation
- **Graph Relationship Engine**:
  - Builds directed trading graph from `CertificateTransfer` records.
  - Runs Johnson's elementary cycle algorithm:
    $$\text{Cycle Detected}: \text{user-5} \longrightarrow \text{user-6} \longrightarrow \text{user-4} \longrightarrow \text{user-5}$$
  - Computes clustering coefficient and marks counterparties as wash-trading ring participants.

### System Action
1. Visual Network Graph in the UI highlights the circular cycle edges in bright crimson.
2. Certificate Lineage Explorer displays all 3 secondary trading hops with transaction hashes.

---

## 6. How to Test & Demo These Scenarios

### Step 1: Trace Any Scenario in the Lineage Explorer
1. Navigate to the **Certificate Explorer & Timeline** tab in the UI.
2. Click any of the pre-configured preset buttons:
   - `Meter Overclaim (+216%)` $\implies$ loads `CLM-2026-FRAUD-MTR`
   - `Capacity Impossible (>240%)` $\implies$ loads `CLM-2026-FRAUD-CAP`
   - `Circular Wash Ring (3 Hops)` $\implies$ loads `REC-2026-WND-88319`
3. Observe the full 6-stage lineage card and the step-by-step chronological **Evidence Timeline**.

### Step 2: Execute Regulatory Adjudication
1. Log in as **Regulatory Officer** (`regulator@recguardian.org`).
2. Open the **Regulatory Cases** tab.
3. Click **"Adjudicate Case"** on `CASE-2026-MTR-001`.
4. Choose **"Confirm Fraud Hold"**, enter regulatory justification notes, and click **"Sign & Seal Decision"**.
5. Observe the claim status permanently sealed as rejected and the resolution block committed to the ledger.
