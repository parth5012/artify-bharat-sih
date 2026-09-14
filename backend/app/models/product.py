from __future__ import annotations

from datetime import datetime, timezone
import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    Text,
    Float,
    DateTime,
    ForeignKey,
    JSON,
    Boolean,
    Integer,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.reservation import Reservation


class Product(Base):
    __tablename__ = "products"

    __table_args__ = (
        Index("ix_products_is_listed_status", "is_listed", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    artisan_id: Mapped[str] = mapped_column(String(36), ForeignKey("artisans.id"), index=True, nullable=False)

    # Core Catalog Attributes
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    craft_category: Mapped[str] = mapped_column(String(100), default="handloom")
    gi_tag_status: Mapped[str] = mapped_column(String(100), default="Banarasi Brocade & Saree (GI Tagged)")

    # Media & Studio Assets
    raw_image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    enhanced_image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    voice_audio_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Voice & NLP Inferences
    transcript_regional: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    transcript_english: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    visual_complexity_score: Mapped[float] = mapped_column(Float, default=0.75)
    seo_tags: Mapped[Optional[dict]] = mapped_column(JSON, default=list)

    # Workflow Status: "draft", "enhanced", "cataloged", "priced", "passport_issued", "published"
    status: Mapped[str] = mapped_column(String(50), default="draft", index=True)

    # Marketplace hybrid stock: unique 1-of-1 (stock_qty=1) + quantity items.
    # Verified-only listings query is_listed + status passport_issued/published.
    stock_qty: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    stock_type: Mapped[str] = mapped_column(String(20), default="unique", nullable=False)
    is_listed: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    reserved_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    artisan = relationship("Artisan", back_populates="products")
    pricing = relationship("ProductPricing", back_populates="product", uselist=False, cascade="all, delete-orphan")
    passport = relationship("HeritagePassport", back_populates="product", uselist=False, cascade="all, delete-orphan")
    exports = relationship("ChannelExport", back_populates="product", cascade="all, delete-orphan")
    jury_tickets = relationship("JuryTicket", back_populates="product", cascade="all, delete-orphan")
    reservations: Mapped[list["Reservation"]] = relationship(
        "Reservation", back_populates="product", cascade="all, delete-orphan"
    )
