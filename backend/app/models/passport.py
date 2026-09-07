from datetime import datetime, timezone
import uuid
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class HeritagePassport(Base):
    __tablename__ = "heritage_passports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), unique=True, index=True, nullable=False)

    passport_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)  # SHA-256 hex
    qr_code_data_uri: Mapped[str] = mapped_column(Text, nullable=False)
    verification_url: Mapped[str] = mapped_column(String(500), nullable=False)

    # Immutable snapshot payload locked at issue time
    payload_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)

    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationship
    product = relationship("Product", back_populates="passport")


class ChannelExport(Base):
    __tablename__ = "channel_exports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), index=True, nullable=False)

    channel: Mapped[str] = mapped_column(String(50), nullable=False)  # "GeM", "ONDC", "Amazon_Karigar", "Direct_B2B"
    external_reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    export_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    sync_status: Mapped[str] = mapped_column(String(50), default="synced")  # "pending", "synced", "failed"
    exported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationship
    product = relationship("Product", back_populates="exports")
