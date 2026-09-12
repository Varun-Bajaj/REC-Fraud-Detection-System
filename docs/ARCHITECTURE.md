# System Architecture

## Renewable Energy Certificate (REC) Fraud Detection & Tracking System

This document outlines the end-to-end architecture of the REC Fraud Detection & Tracking System, integrating **Hyperledger Fabric v2.5** distributed ledger technology with an off-chain **FastAPI** backend, **PostgreSQL** relational database, and modern **React / Next.js** forensic intelligence frontend.

---

## 1. Architectural Overview

```mermaid
graph TB
    subgraph Client Layer
        UI["React / Next.js Dashboard<br/>(Forensic UI, Timeline, Verifier)"]
    end

    subgraph API & Intelligence Layer
        FastAPI["FastAPI Application Server<br/>(Business Logic, Auth, Routing)"]
        FraudEngine["Forensic Fraud Engine<br/>(Double-Counting, Anomaly Detection)"]
        HashService["Document Hashing Service<br/>(SHA-256 Digest Generator)"]
    end

    subgraph Storage Layer
        Postgres[("PostgreSQL / Database<br/>Users, Facilities, Raw Documents, Alerts")]
        DocStore[("Off-Chain Document Store<br/>Generation Certificates, Meter Reports")]
    end

    subgraph DLT Integration Layer
        Gateway["Fabric Gateway Bridge Service<br/>(Node.js / gRPC / TLS)"]
    end

    subgraph Hyperledger Fabric Network
        Orderer["Raft Ordering Service<br/>(orderer.rec.com:7050)"]
        Channel["rec-channel (Ledger & Blocks)"]
        
        subgraph Org1["RegulatorOrg (RegulatorOrgMSP)"]
            PeerReg["peer0.regulator.rec.com:7051"]
        end
        subgraph Org2["IssuerOrg (IssuerOrgMSP)"]
            PeerIss["peer0.issuer.rec.com:8051"]
        end
        subgraph Org3["BuyerOrg (BuyerOrgMSP)"]
            PeerBuy["peer0.buyer.rec.com:9051"]
        end
        subgraph Org4["AuditorOrg (AuditorOrgMSP)"]
            PeerAud["peer0.auditor.rec.com:10051"]
        end

        SmartContract["RECContract (CCAAS v1.0)<br/>createREC, transferREC, retireREC, cancelREC"]
    end

    UI -->|REST / HTTPS| FastAPI
    FastAPI --> Postgres
    FastAPI --> DocStore
    FastAPI --> FraudEngine
    FastAPI --> HashService
    FastAPI -->|REST / JSON| Gateway
    Gateway -->|gRPC / Mutual TLS| PeerReg
    Gateway -->|gRPC / Mutual TLS| PeerIss
    Gateway -->|gRPC / Mutual TLS| PeerBuy
    Gateway -->|gRPC / Mutual TLS| PeerAud
    PeerReg --> Channel
    PeerIss --> Channel
    PeerBuy --> Channel
    PeerAud --> Channel
    Channel --> Orderer
    PeerReg --> SmartContract
    PeerIss --> SmartContract
    PeerBuy --> SmartContract
    PeerAud --> SmartContract
```

---

## 2. Why Permissioned Blockchain & Why Hyperledger Fabric?

### 2.1 Public vs Permissioned Blockchains
* **Public Blockchains (e.g. Ethereum, Solana)**:
  * Publicly readable by anonymous entities, high and volatile transaction fees (gas), low throughput, and lack of native enterprise privacy partitions.
  * In regulatory and corporate REC trading, market participants must be strictly verified entities (Regulators, Certified Issuing Registries, Verified Corporate Buyers, Accredited Auditors).
* **Permissioned DLT (Hyperledger Fabric)**:
  * **Known Identities**: Every transaction is cryptographically signed using X.509 PKI digital certificates issued by an authorized Certificate Authority.
  * **Deterministic Finality**: Uses Raft crash-fault-tolerant (CFT) ordering without probabilistic forks or proof-of-work/stake mining delays.
  * **Granular MSP Authorization**: Chaincode can directly inspect the caller's Membership Service Provider (MSP) identifier (e.g. `IssuerOrgMSP` vs `BuyerOrgMSP`) to enforce strict separation of duties.
  * **Zero Gas Fees**: High-throughput transaction settlement without transaction gas volatility.

### 2.2 Why Blockchain Instead of Only PostgreSQL?
| Metric / Threat | PostgreSQL Only | Hyperledger Fabric DLT + PostgreSQL |
| :--- | :--- | :--- |
| **Trust Model** | Centralized database administrator has root access and can rewrite rows | Decentralized consensus across 4 independent organizations |
| **Tamper-Evidence** | Logs and records can be altered, truncated, or deleted | Cryptographically chained blocks; immutable audit history |
| **Double Spending / Reuse** | Depends on application-level locks vulnerable to DB replication race conditions | State machine transition enforced by multi-peer majority endorsement |
| **Auditability** | Difficult to prove external tamper-resistance to third-party auditors | Complete chronological transaction key history (`getHistoryForKey`) |

---

## 3. On-Chain vs Off-Chain Data Separation

A foundational principle of enterprise blockchain architecture is **never store large binary documents on the ledger**.

```mermaid
sequenceDiagram
    autonumber
    actor Generator as Energy Producer
    participant API as FastAPI Backend
    participant Storage as Off-Chain Storage (PostgreSQL / Disk)
    participant Fabric as Hyperledger Fabric Ledger

    Generator->>API: Upload generation-proof.pdf
    API->>API: Compute SHA-256 digest
    API->>Storage: Store generation-proof.pdf off-chain
    API->>Fabric: Invoke createREC(..., documentHash)
    Fabric-->>Fabric: Validate IssuerOrgMSP, record documentHash
    Fabric-->>API: Emit REC_CREATED, return TxID
    API-->>Generator: Confirmation with on-chain TxID
```

### What Goes On-Chain:
* Certificate identifier (`recId`)
* Generator facility ID (`generatorId`)
* Energy type (`energySource`)
* Generation period date (`generationDate`)
* Generation quantity (`generationMWh`, `issuedQuantity`)
* Current owner & Participant balance map (`balances: { [owner]: quantity }`)
* Active & Retired quantities (`activeQuantity`, `retiredQuantity`)
* Certificate lifecycle status (`ACTIVE`, `RETIRED`, `CANCELLED`)
* **Cryptographic SHA-256 document fingerprint (`documentHash`)**
* State change timestamps and Fabric Transaction IDs

### What Stays Off-Chain:
* Raw PDF reports, meter readings, single-line diagrams, inverter logs
* User passwords, JWT sessions, profile details
* AI / ML model weights and training datasets
* Intermediate fraud scoring calculations and logs
