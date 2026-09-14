from datetime import datetime, timezone
import uuid
from typing import Optional
from sqlalchemy import String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

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
