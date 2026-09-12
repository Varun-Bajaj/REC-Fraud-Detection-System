# REST API Reference: Hyperledger Fabric REC Service

This document provides request and response schemas for all Hyperledger Fabric REC endpoints.

All endpoints are available at `/api/...` and `/api/v1/...`.

---

## 1. Summary of Required Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/rec` | Issue a new REC on Hyperledger Fabric via IssuerOrgMSP. |
| `POST` | `/api/rec/{recId}/transfer` | Transfer active REC units to another owner account. |
| `POST` | `/api/rec/{recId}/retire` | Permanently retire REC units for Scope 2 compliance. |
| `POST` | `/api/rec/{recId}/cancel` | Revoke / cancel a REC (RegulatorOrg / IssuerOrg). |
| `GET` | `/api/rec/{recId}` | Retrieve current on-chain state and off-chain metadata. |
| `GET` | `/api/rec/{recId}/history` | Retrieve complete chronological block transaction history. |
| `GET` | `/api/rec/{recId}/verify` | Cryptographically verify REC state and balance consistency. |
| `POST` | `/api/documents/upload` | Upload proof document, calculate SHA-256 fingerprint. |
| `POST` | `/api/rec/{recId}/verify-document` | Verify re-uploaded document against on-chain SHA-256 hash. |
| `GET` | `/api/fraud/alerts` | Retrieve active fraud alerts and double-counting anomalies. |
| `GET` | `/api/rec` | List all registered RECs with live ledger state. |

---

## 2. Detailed Endpoint Specifications

### 2.1 Issue REC: `POST /api/rec`
* **Request Body**:
```json
{
  "recId": "REC-000001",
  "generatorId": "GEN-SOLAR-01",
  "energySource": "SOLAR",
  "generationDate": "2026-09-10",
  "generationMWh": 100.0,
  "issuedQuantity": 100,
  "documentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```
* **Success Response (`201 Created`)**:
```json
{
  "message": "REC successfully issued on Hyperledger Fabric ledger.",
  "asset": {
    "recId": "REC-000001",
    "generatorId": "GEN-SOLAR-01",
    "energySource": "SOLAR",
    "generationDate": "2026-09-10",
    "generationMWh": 100,
    "issuedQuantity": 100,
    "currentOwner": "ISSUER-ORG",
    "activeQuantity": 100,
    "retiredQuantity": 0,
    "status": "ACTIVE",
    "documentHash": "e3b0c442...",
    "createdAt": "2026-09-12T19:27:25.548Z",
    "updatedAt": "2026-09-12T19:27:25.548Z",
    "balances": {
      "ISSUER-ORG": 100
    }
  },
  "fraudEvaluation": {
    "recId": "REC-000001",
    "riskScore": 0.0,
    "riskLevel": "LOW",
    "reasons": []
  }
}
```

---

### 2.2 Transfer REC: `POST /api/rec/{recId}/transfer`
* **Request Body**:
```json
{
  "fromOwner": "ISSUER-ORG",
  "toOwner": "CORP-BUYER-A",
  "quantity": 40,
  "transactionReference": "TRADE-REF-001",
  "callerOrg": "issuer"
}
```
* **Success Response (`200 OK`)**:
```json
{
  "message": "Successfully transferred 40 REC units to CORP-BUYER-A.",
  "asset": {
    "recId": "REC-000001",
    "currentOwner": "CORP-BUYER-A",
    "activeQuantity": 100,
    "retiredQuantity": 0,
    "balances": {
      "ISSUER-ORG": 60,
      "CORP-BUYER-A": 40
    }
  }
}
```

---

### 2.3 Retire REC: `POST /api/rec/{recId}/retire`
* **Request Body**:
```json
{
  "owner": "CORP-BUYER-A",
  "quantity": 20,
  "retirementReason": "Scope 2 ESG Compliance Goal 2026",
  "callerOrg": "buyer"
}
```
* **Success Response (`200 OK`)**:
```json
{
  "message": "Successfully retired 20 REC units for owner CORP-BUYER-A.",
  "asset": {
    "recId": "REC-000001",
    "activeQuantity": 80,
    "retiredQuantity": 20,
    "balances": {
      "ISSUER-ORG": 60,
      "CORP-BUYER-A": 20
    }
  }
}
```

---

### 2.4 Cancel REC: `POST /api/rec/{recId}/cancel`
* **Request Body**:
```json
{
  "reason": "Regulatory Directive: Fraudulent Telemetry",
  "callerOrg": "regulator"
}
```
* **Success Response (`200 OK`)**:
```json
{
  "message": "REC REC-000001 has been CANCELLED on the distributed ledger.",
  "asset": {
    "recId": "REC-000001",
    "status": "CANCELLED"
  }
}
```

---

### 2.5 Blockchain History: `GET /api/rec/{recId}/history`
* **Success Response (`200 OK`)**:
```json
{
  "recId": "REC-000001",
  "totalEvents": 3,
  "history": [
    {
      "txId": "2459b9f07daeb0f88...",
      "timestamp": "2026-09-12T19:27:25.548Z",
      "isDelete": false,
      "value": {
        "recId": "REC-000001",
        "activeQuantity": 100,
        "retiredQuantity": 0,
        "currentOwner": "ISSUER-ORG"
      }
    },
    {
      "txId": "f908e23bb410ac901...",
      "timestamp": "2026-09-12T19:27:28.120Z",
      "isDelete": false,
      "value": {
        "recId": "REC-000001",
        "activeQuantity": 100,
        "retiredQuantity": 0,
        "currentOwner": "CORP-BUYER-A"
      }
    },
    {
      "txId": "c345100ba9811ae23...",
      "timestamp": "2026-09-12T19:27:31.125Z",
      "isDelete": false,
      "value": {
        "recId": "REC-000001",
        "activeQuantity": 80,
        "retiredQuantity": 20,
        "currentOwner": "CORP-BUYER-A"
      }
    }
  ]
}
```

---

### 2.6 Document Verification: `POST /api/rec/{recId}/verify-document`
* **Multipart Form Input**: `file: <binary_pdf>`
* **Matching Response (`200 OK`)**:
```json
{
  "match": true,
  "status": "DOCUMENT VERIFIED",
  "message": "Document byte integrity matches the immutable on-chain SHA-256 hash registered with this REC.",
  "computed_hash": "e3b0c442...",
  "registered_hash": "e3b0c442...",
  "disclaimer": "Cryptographic match verifies byte-level integrity against the registered hash; legal validity requires authorized issuing body audit."
}
```
* **Tampered Response (`200 OK`)**:
```json
{
  "match": false,
  "status": "DOCUMENT INTEGRITY FAILURE",
  "message": "Document SHA-256 hash does NOT match the registered blockchain hash! File has been altered or replaced.",
  "computed_hash": "88a1b2c3...",
  "registered_hash": "e3b0c442...",
  "disclaimer": "Integrity check failed: bytes differ from the fingerprint committed to the Hyperledger Fabric ledger."
}
```
