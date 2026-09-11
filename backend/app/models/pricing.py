from __future__ import annotations

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._shared import TimestampMixin, new_id


class ProductPricing(TimestampMixin, Base):
    """Written by Yash's pricing service (pricing/calculate); read-only here."""

    __tablename__ = "product_pricing"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: new_id("price")
    )
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True, nullable=False)

    statutory_floor_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    retail_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    bulk_price_tier: Mapped[float | None] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)

    product: Mapped["Product"] = relationship(back_populates="pricing")
