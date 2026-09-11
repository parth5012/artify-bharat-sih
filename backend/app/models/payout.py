from __future__ import annotations

from typing import Optional, TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._shared import TimestampMixin, new_id

if TYPE_CHECKING:
    from app.models.artisan import Artisan


class PayoutTransaction(TimestampMixin, Base):
    __tablename__ = "payout_transactions"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: new_id("payout")
    )
    artisan_id: Mapped[str] = mapped_column(ForeignKey("artisans.id"), index=True, nullable=False)
    product_id: Mapped[Optional[str]] = mapped_column(ForeignKey("products.id"), index=True)
    order_id: Mapped[Optional[str]] = mapped_column(String(64), index=True)

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    platform_fee_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, nullable=False)
    utr_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    channel: Mapped[str] = mapped_column(String(20), default="PFMS_DBT", nullable=False)
    # channel in {"PFMS_DBT", "UPI"}
    status: Mapped[str] = mapped_column(String(20), default="INITIATED", nullable=False)
    # INITIATED -> SETTLED -> FAILED

    artisan: Mapped["Artisan"] = relationship(back_populates="payouts")
