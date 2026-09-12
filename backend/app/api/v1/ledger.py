from typing import List
from fastapi import APIRouter, Depends, Query, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.ledger import LedgerBlock
from app.engines.ledger_engine import LedgerEngine
from app.schemas.ledger import LedgerBlockResponse, LedgerVerifyResponse, DocumentVerifyResponse

router = APIRouter(prefix="/ledger", tags=["Tamper-Evident Ledger"])


@router.get("/blocks", response_model=List[LedgerBlockResponse])
def get_ledger_blocks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve chronologically ordered ledger blocks."""
    # Ensure genesis block exists
    LedgerEngine.initialize_genesis_block(db)
    return (
        db.query(LedgerBlock)
        .order_by(LedgerBlock.index.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/verify", response_model=LedgerVerifyResponse)
def verify_ledger_integrity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run complete cryptographic SHA-256 audit across all ledger blocks.
    Pinpoints any retroactive modification, hash discrepancy, or sequence break.
    """
    return LedgerEngine.verify_integrity(db)


@router.post("/verify-document", response_model=DocumentVerifyResponse)
async def verify_document_integrity(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a document file to verify authenticity.
    Re-hashes file byte contents with SHA-256 and matches against on-chain evidence hashes.
    """
    content = await file.read()
    return LedgerEngine.verify_document_content(
        db=db,
        file_bytes=content,
        file_name=file.filename or "evidence.pdf",
    )


# Storage for original payload during tamper demonstration
_TAMPER_BACKUP: dict = {}


@router.post("/simulate-tamper")
def simulate_database_tamper(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    HACKATHON DEMO: Simulates a malicious database administrator or SQL injection attack
    altering an off-chain record (e.g. inflating MWh from 500 to 5,000 MWh directly in PostgreSQL/SQLite).
    Leaves the cryptographic SHA-256 block header intact, causing an instant cryptographic verification break.
    """
    global _TAMPER_BACKUP
    LedgerEngine.initialize_genesis_block(db)
    
    # Target the first non-genesis block or the head block
    target_block = db.query(LedgerBlock).filter(LedgerBlock.index > 0).order_by(LedgerBlock.index.asc()).first()
    if not target_block:
        # If only genesis exists, create a sample block first
        target_block = LedgerEngine.record_event(
            db=db,
            event_type=LedgerBlock.event_type.type.enums[1] if hasattr(LedgerBlock.event_type, "type") else "CLAIM_SUBMITTED",
            entity_type="CLAIM",
            entity_id="CLM-2026-DEMO",
            data_payload={"claimed_mwh": 500.0, "facility": "Helios Solar", "status": "PENDING"},
        )

    # Save backup for restoration
    _TAMPER_BACKUP[target_block.index] = {
        "data_payload": dict(target_block.data_payload) if isinstance(target_block.data_payload, dict) else target_block.data_payload,
        "data_hash": target_block.data_hash,
    }

    # Inject malicious modification directly into the database payload WITHOUT updating block hash
    tampered_payload = dict(target_block.data_payload) if isinstance(target_block.data_payload, dict) else {}
    original_mwh = tampered_payload.get("claimed_mwh", 500.0)
    tampered_payload["claimed_mwh"] = 5000.0  # 10x unauthorized inflation
    tampered_payload["_tamper_exploit"] = "MALICIOUS_DBA_UPDATE: 500.0 MWh -> 5000.0 MWh (Direct DB write)"

    target_block.data_payload = tampered_payload
    db.commit()

    return {
        "status": "TAMPER_INJECTED",
        "tampered_block_index": target_block.index,
        "attack_vector": "Rogue Database Admin / Unauthorized Direct Row Update",
        "original_claimed_mwh": original_mwh,
        "malicious_claimed_mwh": 5000.0,
        "message": (
            f"Block #{target_block.index} payload modified directly in database. "
            f"Run /verify to observe the cryptographic hash-chain trap."
        ),
    }


@router.post("/restore-tamper")
def restore_database_tamper(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    HACKATHON DEMO: Self-heals the relational database by restoring original state
    and synchronizing back with the immutable cryptographic ledger.
    """
    global _TAMPER_BACKUP
    if not _TAMPER_BACKUP:
        # Check if any block has tamper exploit flag
        all_blocks = db.query(LedgerBlock).all()
        for b in all_blocks:
            if isinstance(b.data_payload, dict) and "_tamper_exploit" in b.data_payload:
                cleaned_payload = {k: v for k, v in b.data_payload.items() if k != "_tamper_exploit"}
                if "claimed_mwh" in cleaned_payload and cleaned_payload["claimed_mwh"] == 5000.0:
                    cleaned_payload["claimed_mwh"] = 500.0
                b.data_payload = cleaned_payload
                b.data_hash = LedgerEngine.calculate_data_hash(cleaned_payload)
        db.commit()
    else:
        for idx, backup in _TAMPER_BACKUP.items():
            b = db.query(LedgerBlock).filter(LedgerBlock.index == idx).first()
            if b:
                b.data_payload = backup["data_payload"]
                b.data_hash = backup["data_hash"]
        db.commit()
        _TAMPER_BACKUP.clear()

    verify_res = LedgerEngine.verify_integrity(db)
    return {
        "status": "RESTORED_AND_SYNCHRONIZED",
        "is_valid": verify_res.is_valid,
        "total_blocks": verify_res.total_blocks,
        "verification_message": verify_res.verification_message,
    }
