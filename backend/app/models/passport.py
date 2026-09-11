from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._shared import TimestampMixin, new_id


class HeritagePassport(TimestampMixin, Base):
    """Owned/written by Parth's passport_service.py; Product/Artisan FKs feed it."""

    __tablename__ = "heritage_passports"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: new_id("passport")
    )
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True, nullable=False)
    artisan_id: Mapped[str] = mapped_column(ForeignKey("artisans.id"), index=True, nullable=False)

    sha256_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    shortcode: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    qr_ref: Mapped[Optional[str]] = mapped_column(String(255))
