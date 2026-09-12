import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class PMDakshEnrollment(Base):
    __tablename__ = "pmdaksh_enrollments"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: f"daksh_{uuid.uuid4().hex[:12]}"
    )
    artisan_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("artisans.id"), nullable=True, index=True
    )
    artisan_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    sector: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="ENROLLED", nullable=False)
    is_certified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_trainer: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    wage_before_inr: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    wage_after_inr: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    wage_increase_percent: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
