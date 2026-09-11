import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.plant import FuelType


class CertificateStatus(str, enum.Enum):
    ISSUED = "ISSUED"
    TRANSFERRED = "TRANSFERRED"
    REDEEMED = "REDEEMED"
    REVOKED = "REVOKED"


class TransferType(str, enum.Enum):
    ISSUANCE = "ISSUANCE"
    TRANSFER = "TRANSFER"
    RETIREMENT = "RETIREMENT"


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    certificate_uid = Column(String(100), unique=True, index=True, nullable=False)
    claim_id = Column(Integer, ForeignKey("certificate_claims.id"), unique=True, nullable=False)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)
    current_owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    fuel_type = Column(Enum(FuelType), nullable=False)
    mwh = Column(Float, nullable=False)
    vintage_year = Column(Integer, nullable=False)
    vintage_month = Column(Integer, nullable=False)
    issuance_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(Enum(CertificateStatus), default=CertificateStatus.ISSUED, nullable=False)

    # Relationships
    claim = relationship("CertificateClaim", back_populates="certificate")
    plant = relationship("Plant", back_populates="certificates")
    current_owner = relationship("User", back_populates="certificates_owned", foreign_keys=[current_owner_id])
    transfers = relationship("CertificateTransfer", back_populates="certificate", cascade="all, delete-orphan")


class CertificateTransfer(Base):
    __tablename__ = "certificate_transfers"

    id = Column(Integer, primary_key=True, index=True)
    certificate_id = Column(Integer, ForeignKey("certificates.id"), nullable=False)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Null if direct issuance
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    transfer_type = Column(Enum(TransferType), default=TransferType.TRANSFER, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    tx_hash = Column(String(64), index=True, nullable=False)  # SHA-256 transaction hash

    # Relationships
    certificate = relationship("Certificate", back_populates="transfers")
    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])
