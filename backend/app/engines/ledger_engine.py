import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.ledger import LedgerBlock, LedgerEventType
from app.models.claim import DocumentEvidence, CertificateClaim
from app.schemas.ledger import LedgerVerifyResponse, DocumentVerifyResponse


class LedgerEngine:
    """
    Cryptographic SHA-256 Hash-Chain Engine.
    Provides append-only, tamper-evident audit trail for all REC lifecycle events.
    """

    GENESIS_PREV_HASH = "0" * 64

    @classmethod
    def format_block_timestamp(cls, dt: datetime) -> str:
        """Format datetime to deterministic UTC ISO string (second precision)."""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    @classmethod
    def calculate_data_hash(cls, payload: Dict[str, Any]) -> str:
        """Deterministically hashes payload dict using SHA-256."""
        serialized = json.dumps(payload, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    @classmethod
    def calculate_block_hash(
        cls,
        index: int,
        timestamp_str: str,
        event_type: str,
        entity_id: str,
        data_hash: str,
        previous_hash: str,
    ) -> str:
        """Computes cryptographic header hash for a ledger block."""
        header = f"{index}|{timestamp_str}|{event_type}|{entity_id}|{data_hash}|{previous_hash}"
        return hashlib.sha256(header.encode("utf-8")).hexdigest()

    @classmethod
    def initialize_genesis_block(cls, db: Session) -> LedgerBlock:
        """Creates Genesis block if ledger is empty."""
        existing = db.query(LedgerBlock).filter(LedgerBlock.index == 0).first()
        if existing:
            return existing

        now = datetime.now(timezone.utc)
        ts_str = cls.format_block_timestamp(now)
        payload = {
            "genesis_message": "REC Guardian Sovereign Forensic Ledger Initialized",
            "standard": "GHG Protocol Scope 2 / I-REC / EECS Compatible",
            "platform_version": "1.0.0",
        }
        data_hash = cls.calculate_data_hash(payload)
        genesis_hash = cls.calculate_block_hash(
            index=0,
            timestamp_str=ts_str,
            event_type=LedgerEventType.GENESIS.value,
            entity_id="GENESIS",
            data_hash=data_hash,
            previous_hash=cls.GENESIS_PREV_HASH,
        )

        genesis_block = LedgerBlock(
            index=0,
            timestamp=now,
            event_type=LedgerEventType.GENESIS,
            entity_type="SYSTEM",
            entity_id="GENESIS",
            data_payload=payload,
            data_hash=data_hash,
            previous_hash=cls.GENESIS_PREV_HASH,
            current_hash=genesis_hash,
        )
        db.add(genesis_block)
        db.commit()
        db.refresh(genesis_block)
        return genesis_block

    @classmethod
    def record_event(
        cls,
        db: Session,
        event_type: LedgerEventType,
        entity_type: str,
        entity_id: str,
        data_payload: Dict[str, Any],
    ) -> LedgerBlock:
        """Appends a new event block to the tamper-evident hash chain."""
        # Ensure genesis exists
        last_block = db.query(LedgerBlock).order_by(LedgerBlock.index.desc()).first()
        if not last_block:
            last_block = cls.initialize_genesis_block(db)

        new_index = last_block.index + 1
        now = datetime.now(timezone.utc)
        ts_str = cls.format_block_timestamp(now)
        data_hash = cls.calculate_data_hash(data_payload)
        block_hash = cls.calculate_block_hash(
            index=new_index,
            timestamp_str=ts_str,
            event_type=event_type.value,
            entity_id=str(entity_id),
            data_hash=data_hash,
            previous_hash=last_block.current_hash,
        )

        new_block = LedgerBlock(
            index=new_index,
            timestamp=now,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=str(entity_id),
            data_payload=data_payload,
            data_hash=data_hash,
            previous_hash=last_block.current_hash,
            current_hash=block_hash,
        )
        db.add(new_block)
        db.commit()
        db.refresh(new_block)
        return new_block

    @classmethod
    def verify_integrity(cls, db: Session) -> LedgerVerifyResponse:
        """
        Traverses and cryptographically verifies the entire ledger chain from Genesis to Head.
        Detects any retroactive modifications, deletions, or data corruption.
        """
        blocks = db.query(LedgerBlock).order_by(LedgerBlock.index.asc()).all()
        now = datetime.now(timezone.utc)

        if not blocks:
            cls.initialize_genesis_block(db)
            blocks = db.query(LedgerBlock).order_by(LedgerBlock.index.asc()).all()

        prev_hash = cls.GENESIS_PREV_HASH
        for idx, block in enumerate(blocks):
            # Check sequential index
            if block.index != idx:
                return LedgerVerifyResponse(
                    is_valid=False,
                    total_blocks=len(blocks),
                    tampered_block_index=block.index,
                    verification_message=f"Sequence break detected at block #{block.index}. Expected index {idx}.",
                    verified_at=now,
                )

            # Check previous hash link
            if block.previous_hash != prev_hash:
                return LedgerVerifyResponse(
                    is_valid=False,
                    total_blocks=len(blocks),
                    tampered_block_index=block.index,
                    verification_message=(
                        f"Hash link broken at block #{block.index}. "
                        f"Recorded previous hash does not match prior block current hash."
                    ),
                    verified_at=now,
                )

            # Recompute data hash
            recomputed_data_hash = cls.calculate_data_hash(block.data_payload)
            if recomputed_data_hash != block.data_hash:
                return LedgerVerifyResponse(
                    is_valid=False,
                    total_blocks=len(blocks),
                    tampered_block_index=block.index,
                    verification_message=(
                        f"Data payload corruption detected in block #{block.index}. "
                        f"Stored data hash does not match recalculated hash."
                    ),
                    verified_at=now,
                )

            # Recompute current block hash
            block_ts_str = cls.format_block_timestamp(block.timestamp)
            recomputed_block_hash = cls.calculate_block_hash(
                index=block.index,
                timestamp_str=block_ts_str,
                event_type=block.event_type.value,
                entity_id=block.entity_id,
                data_hash=block.data_hash,
                previous_hash=block.previous_hash,
            )
            if recomputed_block_hash != block.current_hash:
                return LedgerVerifyResponse(
                    is_valid=False,
                    total_blocks=len(blocks),
                    tampered_block_index=block.index,
                    verification_message=(
                        f"Header hash mismatch in block #{block.index}. "
                        f"Block header has been altered."
                    ),
                    verified_at=now,
                )

            prev_hash = block.current_hash

        return LedgerVerifyResponse(
            is_valid=True,
            total_blocks=len(blocks),
            tampered_block_index=None,
            verification_message=(
                f"Ledger integrity verified successfully. All {len(blocks)} cryptographic links "
                f"from Genesis are intact."
            ),
            verified_at=now,
        )

    @classmethod
    def verify_document_content(
        cls,
        db: Session,
        file_bytes: bytes,
        file_name: str,
    ) -> DocumentVerifyResponse:
        """Verifies uploaded document bytes against on-chain evidence records."""
        computed_sha = hashlib.sha256(file_bytes).hexdigest()

        # Check evidence records
        doc = (
            db.query(DocumentEvidence)
            .join(CertificateClaim, DocumentEvidence.claim_id == CertificateClaim.id)
            .filter(DocumentEvidence.file_hash == computed_sha)
            .first()
        )

        if doc:
            return DocumentVerifyResponse(
                file_name=file_name,
                computed_sha256=computed_sha,
                is_registered=True,
                first_seen_claim_uid=doc.claim.claim_uid,
                first_seen_timestamp=doc.uploaded_at,
                tamper_detected=False,
                verification_status="AUTHENTIC_MATCH",
            )
        else:
            return DocumentVerifyResponse(
                file_name=file_name,
                computed_sha256=computed_sha,
                is_registered=False,
                first_seen_claim_uid=None,
                first_seen_timestamp=None,
                tamper_detected=True,
                verification_status="UNREGISTERED_OR_MODIFIED",
            )
