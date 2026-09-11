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
