from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models._shared import TimestampMixin

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.customer import Customer

RESERVATION_STATUSES = (
    "pending",
    "confirmed",
    "declined",
    "expired",
    "completed",
    "cancelled",
)

HOLD_DAYS = 7


def default_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=HOLD_DAYS)


class Reservation(TimestampMixin, Base):
    """Reserve-only hold: buyer reserves, artisan confirms, offline pay.

    7-day hold via ``expires_at`` + cron release (later ticket).
    ``pickup_code`` is a 6-char buyer-facing code shown at reserve time.
    """

    __tablename__ = "reservations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    product_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("products.id"), index=True, nullable=False
    )
    customer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("customers.id"), index=True, nullable=False
    )

    qty: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="pending", index=True, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=default_expiry,
        nullable=False,
    )
    pickup_code: Mapped[Optional[str]] = mapped_column(
        String(6), unique=True, index=True, nullable=True
    )

    # created_at / updated_at via TimestampMixin (server_default func.now()).

    product: Mapped["Product"] = relationship("Product", back_populates="reservations")
    customer: Mapped["Customer"] = relationship(
        "Customer", back_populates="reservations"
    )
