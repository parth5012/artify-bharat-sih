from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Boolean, DateTime, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Artisan(Base):
    __tablename__ = "artisans"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    phone: Mapped[str] = mapped_column(
        String(20), unique=True, index=True, nullable=False
    )
    pin_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    primary_dialect: Mapped[str] = mapped_column(String(50), default="bhojpuri")

    # Onboarding & Role Context (US-ONB-01)
    role: Mapped[str] = mapped_column(String(50), default="artisan", nullable=False)
    onboarding_step: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_onboarded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    eshram_uan: Mapped[str | None] = mapped_column(String(512), nullable=True)
    shg_group_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    shg_member_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Geographic & Demographic Context
    state: Mapped[str] = mapped_column(String(100), default="Uttar Pradesh")
    district: Mapped[str] = mapped_column(String(100), default="Varanasi")
    cluster_name: Mapped[str] = mapped_column(
        String(150), default="Varanasi Handloom Cluster"
    )
    geo_lat: Mapped[float] = mapped_column(Float, nullable=True, default=25.3176)
    geo_lng: Mapped[float] = mapped_column(Float, nullable=True, default=82.9739)

    # Government Credentials — stored as opaque PII-vault tokens (see
    # app.core.pii_vault.protect); widened to hold base64url tokens.
    # Use reveal() only at display boundaries; never log the result.
    trifed_id: Mapped[str] = mapped_column(String(512), nullable=True, index=True)
    pehchan_id: Mapped[str] = mapped_column(String(512), nullable=True, index=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    products = relationship(
        "Product", back_populates="artisan", cascade="all, delete-orphan"
    )
    payouts = relationship(
        "PayoutTransaction", back_populates="artisan", cascade="all, delete-orphan"
    )
