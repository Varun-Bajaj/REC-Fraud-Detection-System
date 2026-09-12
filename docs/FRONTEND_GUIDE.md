# REC Guardian - Frontend & UX Architecture Guide

This document details the frontend architecture, institutional design system, user experience workflows, component hierarchy, and synchronization between the dual frontend implementations in **REC Guardian**.

---

## 1. Design System & Institutional Theme

### 1.1 Philosophy: Beyond "Vibe-Coded" to Institutional GovTech
Early prototypes of ESG and crypto dashboards often fall into the trap of "vibe coding" — gratuitous neon cyan/magenta gradients, low-contrast text, glowing blurred blobs, and ambiguous charts. For a sovereign regulatory fraud detection system, such styling harms credibility and impairs rapid investigative triage.

**REC Guardian** employs a high-contrast, institutional GovTech design system engineered specifically for:
- Energy regulatory commissions (e.g., CERC, FERC, Ofgem)
- Independent compliance auditors (e.g., Big 4, ESG forensic teams)
- Clean energy market participants requiring rapid verification of high-value green credits

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       INSTITUTIONAL PALETTE TOKENS                          │
├──────────────────┬───────────────────┬───────────────────┬──────────────────┤
│ Background Canvas│ Regulatory Cobalt │ Clean Energy Green│ Forensic Alert   │
│ Obsidian Slate   │ Sovereign Gov     │ MWh Production    │ Critical Risk    │
│ #080d19 / #0f172a│ #1d4ed8 / #2563eb │ #059669 / #10b981 │ #dc2626 / #ef4444│
└──────────────────┴───────────────────┴───────────────────┴──────────────────┘
```

### 1.2 Core Color Tokens & Semantics

| Token Name | Hex Code | UI Semantic & Application |
| :--- | :--- | :--- |
| **Canvas Deep Base** | `#080d19` | Main application background; minimizes eye fatigue during long audits. |
| **Card & Surface Slate** | `#0f172a` | Container surfaces, modal backdrops, table headers. |
| **Border / Rule Muted** | `#1e293b` | Structural borders, subtle dividers, inactive pill borders. |
| **Regulatory Cobalt** | `#1d4ed8` / `#2563eb` | Regulatory portal badges, navigation highlights, primary audit actions. |
| **Clean Energy Emerald** | `#059669` / `#10b981` | Clean claim approval status, active renewable plants, ledger validity. |
| **Forensic Warning Amber** | `#d97706` / `#f59e0b` | Medium risk claims, pending review notices, non-critical warnings. |
| **Forensic Alert Crimson** | `#dc2626` / `#ef4444` | High/Critical fraud holds, wash trading cycles, ledger tampering alerts. |
| **Technical Cyan** | `#0d9488` / `#14b8a6` | Telemetry readings, smart meter IDs, cryptographic SHA-256 hashes. |

---

## 2. Dual Frontend Implementations

To maximize accessibility for hackathon evaluation and long-term production development, REC Guardian provides **two synchronized frontend solutions**:

```
                              ┌───────────────────────────┐
                              │     FastAPI Backend       │
                              │     http://127.0.0.1:8000 │
                              └─────────────┬─────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
       ┌───────────────────────────┐                 ┌───────────────────────────┐
       │   Embedded Zero-Node SPA  │                 │    Standalone Next.js     │
       │   `backend/app/static/`   │                 │        `frontend/`        │
       ├───────────────────────────┤                 ├───────────────────────────┤
       │ • Pure HTML5 + JS (ES6)   │                 │ • Next.js 14 App Router   │
       │ • React 18 + Babel CDN    │                 │ • TypeScript & React 18   │
       │ • Tailwind CSS CDN        │                 │ • Tailwind CSS + Lucide   │
       │ • Vis.js Network CDN      │                 │ • Modular Typed API Client│
       │ • Served by FastAPI at /  │                 │ • Dev Server: Port 3000   │
       │ • Zero NPM friction       │                 │ • Production SSR/SSG ready│
       └───────────────────────────┘                 └───────────────────────────┘
```

### 2.1 Solution A: Zero-Dependency Embedded SPA (`backend/app/static/`)
- **Location**: `backend/app/static/index.html` and `backend/app/static/app.js`
- **Zero-Friction Evaluation**: Runs out of the box when `python backend/run.py` is executed. Evaluators do **not** need Node.js, npm, or bun installed.
- **Technologies**: React 18 (production UMD build), Tailwind CSS (play CDN with custom theme config), Babel Standalone (in-browser JSX transpilation), Vis.js Network (dynamic canvas physics), Lucide Icons (vanilla DOM injector).
- **Endpoint**: Directly accessible at `http://127.0.0.1:8000/` or `http://127.0.0.1:8000/app`.

### 2.2 Solution B: Standalone Next.js 14 Production App (`frontend/`)
- **Location**: `frontend/src/app/page.tsx`, `frontend/src/lib/api.ts`
- **Production Architecture**: Next.js 14 App Router with full TypeScript typings, component isolation, and build-time verification.
- **Key Files**:
  - `frontend/src/lib/api.ts`: Typed Axios/Fetch client with automatic Bearer JWT injection, error handling, and type definitions for all schemas (`Claim`, `Certificate`, `Investigation`, `LedgerAudit`, `LineageResponse`).
  - `frontend/src/app/page.tsx`: Full interactive dashboard matching the institutional design system.
  - `frontend/src/app/globals.css`: Tailwind utility classes and CSS variables.

---

## 3. Dual-Portal Role-Based Experience

The frontend dynamically reconfigures its navigation, metric cards, action buttons, and data visibility based on the authenticated user's role.

### 3.1 Role Comparison Matrix

| Feature / Workspace | Generator / Trader | Regulatory Authority / Auditor | Admin |
| :--- | :---: | :---: | :---: |
| **Telemetry & Plants Overview** | Own Facilities Only | Market-wide Surveillance | All |
| **Submit Generation Claim** | Yes (Linked to meters) | Read-only | Yes |
| **REC Wallet & Transfers** | Own Balances & P2P Transfer | Audit all Wallets | All |
| **Retire / Redeem RECs** | Yes (Scope 2 Compliance) | View audit trail | Yes |
| **Fraud Investigation Triage** | Read-only Case Status | **Full Adjudication Authority** | Full |
| **Wash Trading Graph Surveillance**| Hidden | **Interactive Vis.js Network** | Yes |
| **Cryptographic Ledger Verifier** | Verify Own Hashes | **Market-wide Audit & Tamper Tool**| Full |

---

### 3.2 Generator & Trader Workflow

```
┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│  Select Clean Facility  │ ───► │ Input MWh & Upload Doc  │ ───► │ Instant Hybrid Scoring  │
│  Helios Solar Farm (50MW│      │ Telemetry vs Claim      │      │ Low Risk: Auto-Approve  │
└─────────────────────────┘      └─────────────────────────┘      └────────────┬────────────┘
                                                                               │
                                 ┌─────────────────────────┐                   │
                                 │   Digital Wallet REC    │ ◄─────────────────┘
                                 │  Transfer / Redeem MWh  │
                                 └─────────────────────────┘
```

1. **Dashboard Home**: Summarizes the generator's active renewable generation assets (MW capacity, technology, commissioning date).
2. **Submit Claim Modal**:
   - Generator selects their registered facility and corresponding smart meter reading interval.
   - Enters claimed energy ($E_{\text{claim}}$ MWh) and period start/end dates.
   - Uploads or references generation evidence (PDF report SHA-256 hash).
   - Real-time client-side preview calculates expected capacity factor ($CF$) and warns if $CF > CF_{\text{baseline}}$.
3. **Digital REC Wallet**:
   - Displays all minted certificates owned by the user.
   - **P2P Transfer Action**: Transfer specific certificate serials to counterparties.
   - **Retire Action**: Permanently retire RECs for corporate sustainability reporting; prompts for retirement beneficiary name and reason.

---

### 3.3 Regulatory & Forensic Authority Workflow

```
┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│   Claims Triage Radar   │ ───► │  Forensic Deep-Dive     │ ───► │ Human Adjudication      │
│  Filter by Risk Level   │      │ Inspect Engine Evidence │      │ Confirm Fraud / Issue   │
│  (Critical / High / Med)│      │ Tolerance & Feature Vec │      │ Writes to SHA-256 Ledger│
└─────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘
```

1. **Claims Triage Table**:
   - Filter claims by risk status (`HELD`, `NEEDS_REVIEW`, `APPROVED`).
   - Visual risk score badges: Green ($< 30$), Amber ($30 - 69$), Red ($\ge 70$).
   - Quick expansion reveals breakdown: Rule Engine, ML Anomaly Score, and Graph Risk.
2. **Investigation Case Drawer**:
   - Click any flagged claim to inspect forensic evidence.
   - Displays metered vs claimed deviation percentage, calculated capacity factor, and isolation forest anomaly rating.
   - **Adjudication Form**: Regulator submits decision (`CONFIRM_FRAUD_HOLD`, `CLEAR_AND_ISSUE`, `REQUEST_ADDITIONAL_INFO`) accompanied by mandatory investigative case notes.

---

## 4. Key Specialized Components

### 4.1 Certificate Lineage Explorer (`/certificates`)
The Certificate Lineage Explorer provides an end-to-end, multi-stage provenance trace for any renewable energy certificate.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Stage 1   │────►│   Stage 2   │────►│   Stage 3   │────►│   Stage 4   │────►│   Stage 5   │────►│   Stage 6   │
│  Facility   │     │ Smart Meter │     │ Fingerprint │     │ Risk Engine │     │  Ledgering  │     │ Wallet & TX │
│ Generation  │     │ Telemetry   │     │ Hashes      │     │ Multi-Score │     │  Immutable  │     │ P2P History │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

#### Lineage Features:
1. **6 Visual Stage Cards**:
   - **Generation Source**: Facility name, fuel type (Solar, Wind, Hydro), registered capacity (MW), location coordinates.
   - **Meter Telemetry**: Meter serial ID, gross generation recorded, bidirectional grid export, data logger health.
   - **Cryptographic Fingerprint**: SHA-256 payload hash, document evidence hash, duplicate collision check.
   - **Forensic Risk Score**: Composite score ($0-100$), rule engine result, Isolation Forest outlier index.
   - **Cryptographic Ledger**: Ledger block height index, block hash, parent block hash, Unix timestamp.
   - **Ownership & Trading History**: Current holder, previous transfers, redemption/retirement state.
2. **Chronological Evidence Timeline**:
   - Displays a unified vertical timeline mapping every event in the certificate's existence:
     - Telemetry meter logging
     - Claim submission
     - Multi-engine risk evaluation
     - Regulator adjudication (if flagged)
     - Certificate minting & genesis ledger anchoring
     - P2P transfers between trading accounts
     - Scope 2 retirement and compliance stamping

---

### 4.2 Wash Trading Graph Surveillance (`/analytics`)
Implemented using **Vis.js Network** (embedded) and interactive SVG canvas:
- **Nodes**: Represent trading accounts, generators, and buyers. Sized by trading volume and color-coded by role (Green = Generator, Blue = Trader, Amber = High Velocity Trader).
- **Edges**: Directed arrows showing certificate transfers. Edge labels indicate certificate count and transfer timestamp.
- **Cycle Highlighting**: Circular wash trading patterns ($A \to B \to C \to A$) detected by NetworkX are highlighted in glowing crimson with pulsating edges.
- **Physics Engine**: Force-directed Barnes-Hut simulation allows analysts to drag, zoom, isolate subgraphs, and inspect counterparty clusters.

---

### 4.3 Tamper-Evident Ledger Verifier (`/ledger`)
Provides real-time proof of data integrity:
- **Block Inspector**: Step through block sequence from Block #0 (Genesis) to the latest mined block.
- **Tamper Demonstration Button**: Allows auditors to simulate a database injection attack (modifying an energy value retroactively).
- **Audit Verification Output**:
  - Valid state: Displays green checkmark with zero broken hashes across all blocks.
  - Tampered state: Pinpoints the exact block where `SHA256(Block_N) != Block_N.hash` and where parent hash continuity was severed.

---

## 5. UI State Management & API Integration

### 5.1 Authentication State Flow
```
User Enters Credentials ──► POST /api/v1/auth/login-json
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
         Success (HTTP 200)                         Error (HTTP 401)
                 │                                         │
        Extract `access_token`                      Display Error Toast
        Decode JWT Payload                          Highlight Invalid Fields
        Store in `localStorage`
                 │
  Set Global Auth Context & Axios Headers
  Load User Profile (Role, Org, Permissions)
                 │
  Re-route to Persona Dashboard
```

### 5.2 Polling & Real-time Updates
- Periodic polling (15-second interval) automatically refreshes the Claims Triage Table and Investigation queues.
- Real-time toast notifications alert the user upon successful claim submission, transfer execution, or adjudication decision.

---

## 6. Running and Building the Frontends

### 6.1 Embedded SPA (Recommended for Demos)
Zero setup required. Simply start the backend:
```bash
python backend/run.py
```
Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in any modern browser (Chrome, Firefox, Safari, Edge).

### 6.2 Standalone Next.js App
For frontend developers modifying React/Next.js components:
```bash
cd frontend
npm install
npm run dev
```
The Next.js development server will start at [http://localhost:3000](http://localhost:3000) with hot module reloading (HMR) and proxy requests to `http://127.0.0.1:8000`.

To build for production:
```bash
cd frontend
npm run build
npm start
```
