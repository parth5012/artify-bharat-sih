from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ProductPricing(Base):
    __tablename__ = "product_pricing"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), unique=True, index=True, nullable=False)

    # Cost breakdown per Playbook
    raw_material_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    labor_days: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    daily_fair_wage_rate: Mapped[float] = mapped_column(Float, default=450.0)  # Standard craft cluster daily minimum benchmark
    calculated_fair_wage: Mapped[float] = mapped_column(Float, default=0.0)

    # Market Benchmark from XGBoost & Web Scrapers
    benchmark_min_price: Mapped[float] = mapped_column(Float, default=0.0)
    benchmark_max_price: Mapped[float] = mapped_column(Float, default=0.0)
    recommended_price: Mapped[float] = mapped_column(Float, default=0.0)
    final_price: Mapped[float] = mapped_column(Float, default=0.0)
    artisan_net_profit: Mapped[float] = mapped_column(Float, default=0.0)

    model_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationship
    product = relationship("Product", back_populates="pricing")
