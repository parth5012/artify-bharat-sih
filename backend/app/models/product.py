from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._shared import TimestampMixin, new_id


class Product(TimestampMixin, Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: new_id("prod")
    )
    artisan_id: Mapped[str] = mapped_column(ForeignKey("artisans.id"), index=True, nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    craft_category: Mapped[Optional[str]] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    # status in {"draft", "published", "sold_out"}

    wip_photo_refs: Mapped[Optional[str]] = mapped_column(String(1000))  # comma-separated URLs/keys
    final_photo_refs: Mapped[Optional[str]] = mapped_column(String(1000))

    # Denormalized latest jury outcome for quick reads; source of truth is JuryTicket
    verification_status: Mapped[str] = mapped_column(String(30), default="unverified", nullable=False)

    artisan: Mapped["Artisan"] = relationship(back_populates="products")
    pricing: Mapped[list["ProductPricing"]] = relationship(back_populates="product")
    jury_tickets: Mapped[list["JuryTicket"]] = relationship(back_populates="product")
