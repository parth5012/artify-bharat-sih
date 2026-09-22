from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._shared import TimestampMixin, new_id


class ChannelExport(TimestampMixin, Base):
    """Owned/written by Parth's export service — sync status per channel."""

    __tablename__ = "channel_exports"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: new_id("export")
    )
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True, nullable=False)

    channel: Mapped[str] = mapped_column(String(30), nullable=False)
    # channel in {"gem", "ondc", "whatsapp", "shg"}
    sync_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    external_ref: Mapped[Optional[str]] = mapped_column(String(255))
