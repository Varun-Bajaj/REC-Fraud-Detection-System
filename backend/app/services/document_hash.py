import hashlib
import os
from typing import Dict, Any, Tuple
from fastapi import UploadFile

from app.config import settings


class DocumentHashService:
    """
    Service for off-chain document hashing and cryptographic verification.
    Only SHA-256 hashes are recorded on-chain, while raw files remain off-chain.
    """

    @staticmethod
    def calculate_sha256(content: bytes) -> str:
        """Computes SHA-256 hexadecimal digest of document bytes."""
        return hashlib.sha256(content).hexdigest().lower()

    @classmethod
    def save_document(cls, content: bytes, filename: str = "document.pdf") -> str:
        """Saves document bytes to off-chain storage and returns storage_path."""
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        file_hash = cls.calculate_sha256(content)
        safe_filename = f"{file_hash[:16]}_{filename}"
        storage_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
        with open(storage_path, "wb") as f:
            f.write(content)
        return storage_path

    @classmethod
    async def process_and_store_document(cls, file: UploadFile) -> Tuple[str, str, int]:
        """
        Saves uploaded file to off-chain storage directory and returns (file_hash, storage_path, file_size).
        """
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        content = await file.read()
        file_hash = cls.calculate_sha256(content)
        file_size = len(content)

        safe_filename = f"{file_hash[:16]}_{file.filename or 'document.pdf'}"
        storage_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

        with open(storage_path, "wb") as f:
            f.write(content)

        # Reset cursor
        await file.seek(0)
        return file_hash, storage_path, file_size

    @classmethod
    def verify_document_against_hash(cls, file_bytes: bytes, registered_hash: str) -> Dict[str, Any]:
        """
        Verifies uploaded document bytes against a registered on-chain SHA-256 hash.
        Accurately reports byte match without falsely claiming real-world legal certification.
        """
        computed_hash = cls.calculate_sha256(file_bytes)
        target_hash = registered_hash.strip().lower()

        is_match = computed_hash == target_hash
        if is_match:
            return {
                "match": True,
                "status": "DOCUMENT_VERIFIED",
                "message": "MATCH: Uploaded document content byte integrity verified against the on-chain SHA-256 hash.",
                "computed_hash": computed_hash,
                "registered_hash": target_hash,
                "disclaimer": "Byte match proves file integrity against registered hash; does not constitute legal title certification.",
            }
        else:
            return {
                "match": False,
                "status": "DOCUMENT_INTEGRITY_FAILURE",
                "message": "MISMATCH: Document content does not match the registered on-chain SHA-256 fingerprint. Potential document tampering detected.",
                "computed_hash": computed_hash,
                "registered_hash": target_hash,
                "disclaimer": "Byte divergence indicates modified or counterfeit documentation.",
            }
