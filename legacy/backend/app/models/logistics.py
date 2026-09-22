from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._shared import TimestampMixin, new_id


class LogisticsDispatch(TimestampMixin, Base):
    """
    Supporting model (not one of the original 7 in Task 1.1, but required to
    back the india-post dispatch/track endpoints in Phase 5).
    """

    __tablename__ = "logistics_dispatches"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: new_id("dispatch")
    )
    order_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    artisan_id: Mapped[str] = mapped_column(ForeignKey("artisans.id"), index=True, nullable=False)
    product_id: Mapped[Optional[str]] = mapped_column(ForeignKey("products.id"), index=True)

    tracking_id: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    barcode_code128: Mapped[str] = mapped_column(String(64), nullable=False)

    origin_pin: Mapped[str] = mapped_column(String(6), nullable=False)
    destination_pin: Mapped[str] = mapped_column(String(6), nullable=False)

    status: Mapped[str] = mapped_column(String(30), default="LABEL_CREATED", nullable=False)
    # LABEL_CREATED -> CSC_VLE_ACCEPTED -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED
