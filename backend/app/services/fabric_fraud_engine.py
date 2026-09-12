import uuid
import logging
from typing import Dict, Any, List, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.fabric_rec import FabricRECRecord, FabricFraudAlert

logger = logging.getLogger("fabric_fraud_engine")


class FabricFraudEngine:
    """
    Forensic Fraud Engine for Hyperledger Fabric RECs.
    Combines on-chain ledger state, chronological transaction history, and
    off-chain database records to detect fraud, double-counting, and suspicious activity.
    """

    @classmethod
    def evaluate_rec(
        cls,
        rec_asset: Dict[str, Any],
        history: List[Dict[str, Any]],
        db: Session,
    ) -> Dict[str, Any]:
        """
        Evaluates a REC asset against forensic fraud detection rules.
        Returns risk score (0-100), risk level, reasons, and records alerts in database.
        """
        rec_id = rec_asset.get("recId", "")
        doc_hash = rec_asset.get("documentHash", "")
        generator_id = rec_asset.get("generatorId", "")
        generation_date = rec_asset.get("generationDate", "")
        issued_qty = rec_asset.get("issuedQuantity", 0)
        active_qty = rec_asset.get("activeQuantity", 0)
        retired_qty = rec_asset.get("retiredQuantity", 0)
        status = rec_asset.get("status", "ACTIVE")

        risk_score = 0.0
        reasons: List[str] = []
        alerts_to_create: List[Dict[str, Any]] = []

        # 1. Check for Repeated Document Hash (Double Counting / Duplicate Verification Proof)
        if doc_hash:
            duplicate_doc = (
                db.query(FabricRECRecord)
                .filter(FabricRECRecord.document_hash == doc_hash, FabricRECRecord.rec_id != rec_id)
                .first()
            )
            if duplicate_doc:
                risk_score += 85.0
                reason = f"Duplicate document hash detected. Identical proof document used in REC {duplicate_doc.rec_id}."
                reasons.append(reason)
                alerts_to_create.append({
                    "type": "DUPLICATE_DOCUMENT_HASH",
                    "severity": "CRITICAL",
                    "description": reason,
                    "evidence": {
                        "documentHash": doc_hash,
                        "conflictRecId": duplicate_doc.rec_id,
                    },
                })

        # 2. Check for Same Generator claiming on the same date (Double Generation Claim)
        if generator_id and generation_date:
            duplicate_gen = (
                db.query(FabricRECRecord)
                .filter(
                    FabricRECRecord.generator_id == generator_id,
                    FabricRECRecord.generation_date == generation_date,
                    FabricRECRecord.rec_id != rec_id,
                )
                .first()
            )
            if duplicate_gen:
                risk_score += 40.0
                reason = f"Duplicate generation record: Generator {generator_id} already has issued REC {duplicate_gen.rec_id} for generation date {generation_date}."
                reasons.append(reason)
                alerts_to_create.append({
                    "type": "DUPLICATE_GENERATION_CLAIM",
                    "severity": "HIGH",
                    "description": reason,
                    "evidence": {
                        "generatorId": generator_id,
                        "generationDate": generation_date,
                        "conflictRecId": duplicate_gen.rec_id,
                    },
                })

        # 3. Quantity Consistency & Conservation Law Check
        if active_qty + retired_qty != issued_qty:
            risk_score += 35.0
            reason = f"Quantity imbalance: Active ({active_qty}) + Retired ({retired_qty}) != Issued ({issued_qty})."
            reasons.append(reason)
            alerts_to_create.append({
                "type": "QUANTITY_INCONSISTENCY",
                "severity": "HIGH",
                "description": reason,
                "evidence": {
                    "issued": issued_qty,
                    "active": active_qty,
                    "retired": retired_qty,
                },
            })

        # 4. Status Check
        if status == "CANCELLED":
            reasons.append("Certificate is officially CANCELLED on the distributed ledger.")
            risk_score += 20.0
        elif status == "RETIRED" and active_qty > 0:
            risk_score += 30.0
            reasons.append("Status marked RETIRED but active quantity remains greater than zero.")

        # 5. Transaction History Analysis (Transfer Velocity & Circular Flow)
        if history and len(history) > 1:
            transfers = [
                h for h in history
                if h.get("value") and h["value"].get("activeQuantity") is not None
            ]
            
            # Check for high transaction velocity (e.g. > 5 transfers in short period)
            if len(transfers) >= 5:
                risk_score += 15.0
                reasons.append(f"High transaction frequency detected ({len(transfers)} lifecycle transactions on ledger).")

        # Cap risk score at 100.0
        risk_score = min(100.0, risk_score)

        if risk_score >= 70.0:
            risk_level = "HIGH"
        elif risk_score >= 35.0:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # Update off-chain record
        rec_record = db.query(FabricRECRecord).filter(FabricRECRecord.rec_id == rec_id).first()
        if rec_record:
            rec_record.fraud_risk_score = risk_score
            rec_record.fraud_risk_level = risk_level
            rec_record.fraud_reasons = reasons

        # Store alert events in DB
        for alert_data in alerts_to_create:
            existing = (
                db.query(FabricFraudAlert)
                .filter(
                    FabricFraudAlert.rec_id == rec_id,
                    FabricFraudAlert.alert_type == alert_data["type"],
                )
                .first()
            )
            if not existing:
                new_alert = FabricFraudAlert(
                    alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                    rec_id=rec_id,
                    alert_type=alert_data["type"],
                    severity=alert_data["severity"],
                    description=alert_data["description"],
                    evidence=alert_data["evidence"],
                    detected_at=datetime.now(timezone.utc),
                )
                db.add(new_alert)

        db.commit()

        return {
            "recId": rec_id,
            "riskScore": risk_score,
            "riskLevel": risk_level,
            "reasons": reasons,
        }

    @classmethod
    def get_all_alerts(cls, db: Session) -> List[Dict[str, Any]]:
        """Retrieves all active fraud alerts detected across the ledger."""
        alerts = db.query(FabricFraudAlert).order_by(FabricFraudAlert.detected_at.desc()).all()
        return [
            {
                "alert_id": a.alert_id,
                "rec_id": a.rec_id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "description": a.description,
                "evidence": a.evidence,
                "detected_at": a.detected_at.isoformat() if a.detected_at else "",
            }
            for a in alerts
        ]
