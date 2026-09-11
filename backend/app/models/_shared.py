"""
Shared helpers for all models: prefixed human-readable IDs (e.g. art_vns_001,
prod_9918, jury_..., rep_antifraud_...) and a created/updated timestamp mixin.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


def new_id(prefix: str) -> str:
    """Generate a short, prefixed, URL-safe unique ID e.g. `art_7f3a9c2b1d4e`."""
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
