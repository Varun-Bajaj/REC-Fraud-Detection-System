# REC Guardian: REST API Specification & Integration Reference

> **API Base URL**: `http://127.0.0.1:8000/api/v1`  
> **Interactive Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)  
> **ReDoc Specification**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)  
> **Authentication**: HTTP Bearer JWT (`Authorization: Bearer <ACCESS_TOKEN>`)

---

## 1. Authentication & Session Endpoints (`/auth`)

### A. Login with JSON Payload
- **Route**: `POST /api/v1/auth/login-json`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "regulator@recguardian.org",
    "password": "password123"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "user": {
      "id": 2,
      "email": "regulator@recguardian.org",
      "full_name": "Elena Rostova",
      "organization_name": "Renewable Energy Regulatory Commission",
      "role": "REGULATOR",
      "is_active": true,
      "created_at": "2026-03-01T10:00:00Z"
    }
  }
  ```

### B. Self-Registration for Clean Energy Producers
- **Route**: `POST /api/v1/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "producer@evergreensolar.com",
    "password": "SecurePassword123!",
    "full_name": "Samantha Vance",
    "organization_name": "Evergreen Solar Power LLC",
    "role": "GENERATOR"
  }
  ```
- **Response (`201 Created`)**: User profile JSON.

### C. Current Authenticated Profile
- **Route**: `GET /api/v1/auth/me`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response (`200 OK`)**: Full authenticated `UserResponse`.

---

## 2. Power Facilities & Assets (`/plants`)

### A. List Registered Facilities
- **Route**: `GET /api/v1/plants/`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Behavior**:
  - `GENERATOR`: Returns only facilities owned by the authenticated generator account.
  - `REGULATOR` / `AUDITOR` / `ADMIN`: Returns all registered generation facilities market-wide.
- **Response (`200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "owner_id": 4,
      "name": "Mojave Desert Solar One",
      "fuel_type": "SOLAR",
      "nameplate_capacity_mw": 50.0,
      "grid_interconnection_id": "CAISO-SUB-9021",
      "location_address": "Mojave Desert, San Bernardino County, CA",
      "max_capacity_factor": 0.32,
      "status": "ACTIVE",
      "created_at": "2026-01-15T08:00:00Z"
    }
  ]
  ```

### B. Register New Clean Power Facility
- **Route**: `POST /api/v1/plants/`
- **Headers**: `Authorization: Bearer <TOKEN>` (Roles: `GENERATOR`, `ADMIN`)
- **Request Body**: Facility registration payload.

---

## 3. Smart Meter Telemetry Ingestion (`/meters`)

### A. Ingest Smart Meter Telemetry
- **Route**: `POST /api/v1/meters/`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Request Body**:
  ```json
  {
    "plant_id": 1,
    "meter_serial_number": "MTR-SOL-001",
    "interval_start": "2026-03-01T00:00:00Z",
    "interval_end": "2026-03-31T23:59:59Z",
    "energy_generated_mwh": 1200.0,
    "raw_meter_hash": "a4f89d32...",
    "telemetry_source": "UTILITY_SMART_METER"
  }
  ```

---

## 4. Generation Claims & AI Fraud Detection (`/claims`)

### A. Submit Claim & Trigger Real-Time AI Detection
- **Route**: `POST /api/v1/claims/`
- **Headers**: `Authorization: Bearer <TOKEN>` (Roles: `GENERATOR`, `ADMIN`)
- **Execution Pipeline**:
  1. Computes SHA-256 fingerprint of `(plant_id, period_start, period_end, claimed_mwh)`.
  2. Runs Deterministic Rule Engine (`RULE-001` through `RULE-009`).
  3. Runs Scikit-learn Isolation Forest Anomaly Engine.
  4. Runs NetworkX Transfer Graph cycle check.
  5. Fuses scores into weighted composite score ($0\text{--}100$).
  6. Commits Claim Submission & Evaluation events onto Cryptographic Ledger.
  7. If verified ($< 25.0$), auto-mints digital REC certificate. If suspicious ($\ge 65.0$), sets status `HELD` and auto-opens regulatory case.
- **Request Body**:
  ```json
  {
    "plant_id": 1,
    "period_start": "2026-03-01T00:00:00Z",
    "period_end": "2026-03-31T23:59:59Z",
    "claimed_mwh": 3800.0,
    "meter_reading_id": 1
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "id": 5,
    "claim_uid": "CLM-2026-FRAUD-MTR",
    "plant_id": 1,
    "claimed_mwh": 3800.0,
    "status": "HELD",
    "risk_score": 88.0,
    "risk_level": "CRITICAL",
    "risk_breakdown": {
      "rule_engine_score": 80.0,
      "ml_anomaly_score": 92.4,
      "graph_risk_score": 0.0,
      "final_risk_score": 88.0,
      "risk_level": "CRITICAL",
      "recommendation": "HOLD",
      "summary_explanation": "Flagged by 1 deterministic rules (METER_CLAIM_MISMATCH). Overclaimed by 216.7%. Machine learning model flagged statistical outlier (score: 92.4/100).",
      "factors": [
        {
          "rule_id": "RULE-005",
          "name": "METER_CLAIM_MISMATCH",
          "severity": "CRITICAL",
          "score_contribution": 80.0,
          "description": "Claimed 3,800.0 MWh exceeds calibrated meter reading of 1,200.0 MWh by 216.7% (Tolerance: 2.0%).",
          "flagged": true
        }
      ]
    }
  }
  ```

### B. List Generation Claims
- **Route**: `GET /api/v1/claims/?status=HELD&limit=50`
- **Headers**: `Authorization: Bearer <TOKEN>`

---

## 5. REC Certificates, Wallet & Lineage Explorer (`/certificates`)

### A. List Active REC Certificates
- **Route**: `GET /api/v1/certificates/`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Behavior**: Generators view only their owned digital wallet RECs; Regulators view all market RECs.

### B. 6-Stage Lineage & Evidence Timeline Deep-Dive
- **Route**: `GET /api/v1/certificates/lineage/{identifier}`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Identifier**: Any Certificate UID (`REC-2026-SOL-09921`), Claim UID (`CLM-2026-FRAUD-MTR`), or Case Number (`CASE-2026-MTR-001`).
- **Response (`200 OK`)**:
  ```json
  {
    "found": true,
    "query": "CLM-2026-FRAUD-MTR",
    "search_type": "CLAIM",
    "plant": { "name": "Mojave Desert Solar One", "capacity_mw": 50.0 },
    "meter": { "serial": "MTR-SOL-001", "energy_generated_mwh": 1200.0 },
    "claim": { "uid": "CLM-2026-FRAUD-MTR", "mwh": 3800.0, "status": "HELD", "risk_score": 88.0 },
    "investigation": { "case_number": "CASE-2026-MTR-001", "priority": "CRITICAL", "status": "OPEN" },
    "certificate": null,
    "transfers": [],
    "ledger_blocks": [
      { "index": 2, "event_type": "CLAIM_SUBMITTED", "current_hash": "b8f2..." },
      { "index": 3, "event_type": "CLAIM_EVALUATED", "current_hash": "c9a1..." }
    ],
    "timeline": [
      {
        "timestamp": "2026-03-01T00:00:00Z",
        "stage": "GROUND_TRUTH",
        "title": "Calibrated Meter Reading Recorded",
        "description": "Meter MTR-SOL-001 recorded 1,200.0 MWh generated at Mojave Desert Solar One.",
        "severity": "INFO",
        "actor": "Smart Meter IoT"
      },
      {
        "timestamp": "2026-03-12T10:00:00Z",
        "stage": "SUBMISSION",
        "title": "Generation Claim Submitted (CLM-2026-FRAUD-MTR)",
        "description": "Submitted 3,800.0 MWh for period Mar 01, 2026 to Mar 31, 2026.",
        "severity": "INFO",
        "actor": "Clean Energy Producer"
      },
      {
        "timestamp": "2026-03-12T10:00:01Z",
        "stage": "AI_DETECTION",
        "title": "Multi-Engine Forensic Evaluation: 88.0/100",
        "description": "Recommendation: HOLD. Flagged by METER_CLAIM_MISMATCH (+216.7%).",
        "severity": "CRITICAL",
        "actor": "AI Forensic Engine"
      },
      {
        "timestamp": "2026-03-12T10:00:02Z",
        "stage": "INVESTIGATION",
        "title": "Regulatory Investigation Case Opened (CASE-2026-MTR-001)",
        "description": "Priority: CRITICAL. Status: OPEN.",
        "severity": "CRITICAL",
        "actor": "Regulatory Officer"
      }
    ]
  }
  ```

### C. Peer-to-Peer Certificate Transfer
- **Route**: `POST /api/v1/certificates/{cert_id}/transfer`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Terminal Guard**: Rejects with `HTTP 400` if status is `REDEEMED` or `REVOKED`.

### D. Scope 2 Compliance Retirement / Redemption
- **Route**: `POST /api/v1/certificates/{cert_id}/redeem`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Terminal Action**: Permanently marks certificate `REDEEMED` and commits proof block to the ledger.

---

## 6. Regulatory Investigations & Human-in-the-Loop Adjudication (`/investigations`)

### A. List Open Investigation Cases
- **Route**: `GET /api/v1/investigations/?status=OPEN`
- **Headers**: `Authorization: Bearer <TOKEN>` (Roles: `REGULATOR`, `AUDITOR`, `ADMIN`)

### B. Adjudicate Case (Sign & Seal Judicial Decision)
- **Route**: `POST /api/v1/investigations/{case_id}/decision`
- **Headers**: `Authorization: Bearer <TOKEN>` (Strict RBAC: `REGULATOR`, `ADMIN` only; Generators blocked with `HTTP 403`)
- **Request Body**:
  ```json
  {
    "decision_action": "CONFIRM_FRAUD_HOLD",
    "findings": "Audit confirms meter reading bypass. Overclaim exceeds physical reality. Statutory fine issued."
  }
  ```
- **Alternate Action**: `"decision_action": "CLEAR_AND_ISSUE"` clears false positive, approves claim, and mints certificate onto ledger.

---

## 7. Cryptographic Trust Ledger & Tamper Detection (`/ledger`)

### A. Ledger Chain Integrity Audit
- **Route**: `GET /api/v1/ledger/verify`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response (`200 OK`)**:
  ```json
  {
    "is_valid": true,
    "total_blocks": 28,
    "tampered_block_index": null,
    "verification_message": "Ledger integrity confirmed: All 28 cryptographic blocks are valid and un-tampered.",
    "verified_at": "2026-09-12T16:30:00Z"
  }
  ```

### B. Drag-and-Drop Document Hash Tamper Verifier
- **Route**: `POST /api/v1/ledger/verify-document`
- **Form Data**: `file: <FILE_BLOB>`
- **Response**: Computes SHA-256 in memory and matches against registry database.

---

## 8. Analytics & Graph Surveillance (`/analytics`)

### A. Role-Scoped Dashboard KPIs
- **Route**: `GET /api/v1/analytics/dashboard`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Role Isolation**: Scoped to owned assets for Generators; market-wide macro surveillance for Regulators.

### B. Secondary Market Network Graph & Cycle Detection
- **Route**: `GET /api/v1/analytics/network-graph`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response**:
  ```json
  {
    "nodes": [
      { "id": "user-4", "label": "Helios Solar", "role": "GENERATOR" },
      { "id": "user-5", "label": "Boreas Wind", "role": "GENERATOR" },
      { "id": "user-6", "label": "Global Carbon", "role": "GENERATOR" }
    ],
    "edges": [
      { "from": "user-5", "to": "user-6", "volume": 5000.0 },
      { "from": "user-6", "to": "user-4", "volume": 5000.0 },
      { "from": "user-4", "to": "user-5", "volume": 5000.0 }
    ],
    "detected_cycles": [
      ["user-5", "user-6", "user-4", "user-5"]
    ],
    "clustering_coefficient": 0.42
  }
  ```
