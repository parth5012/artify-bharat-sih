from __future__ import annotations

from typing import Optional, TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._shared import TimestampMixin, new_id

if TYPE_CHECKING:
    from app.models.product import Product


class JuryTicket(TimestampMixin, Base):
    """
    One anti-corruption jury round for a product: 3 randomized anonymized
    peer jurors, 2/3 quorum, anomaly-checked. Votes live in JuryVote.
    """

    __tablename__ = "jury_tickets"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: new_id("jury")
    )
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True, nullable=False)

    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    # PENDING -> IN_PROGRESS -> QUORUM_GENUINE | QUORUM_SUSPECTED | FLAGGED_VELOCITY_ANOMALY

    assigned_juror_ids: Mapped[str] = mapped_column(String(255), nullable=False)  # comma-separated
    reassigned_from: Mapped[Optional[str]] = mapped_column(String(255))  # audit trail of swaps

    quorum_verdict: Mapped[Optional[str]] = mapped_column(String(30))
    average_craft_score: Mapped[Optional[float]] = mapped_column(Float)
    anomaly_score: Mapped[Optional[float]] = mapped_column(Float)

    product: Mapped["Product"] = relationship(back_populates="jury_tickets")
    votes: Mapped[list["JuryVote"]] = relationship(back_populates="jury_ticket")
    fraud_reports: Mapped[list["AntiFraudReport"]] = relationship(back_populates="jury_ticket")


class JuryVote(TimestampMixin, Base):
    __tablename__ = "jury_votes"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: new_id("vote")
    )
    jury_ticket_id: Mapped[str] = mapped_column(ForeignKey("jury_tickets.id"), index=True, nullable=False)
    juror_id: Mapped[str] = mapped_column(ForeignKey("artisans.id"), index=True, nullable=False)

    vote: Mapped[str] = mapped_column(String(30), nullable=False)
    # GENUINE_HANDMADE | SUSPECTED_MACHINE_MADE
    craft_score: Mapped[int] = mapped_column(nullable=False)  # 1-5
    digital_signature: Mapped[str] = mapped_column(String(512), nullable=False)
    # Skin-in-the-Game: signature permanently linked to juror's e-KYC identity

    jury_ticket: Mapped["JuryTicket"] = relationship(back_populates="votes")


class AntiFraudReport(TimestampMixin, Base):
    """Buyer-facing 'Report Fake' -> physical DM audit queue."""

    __tablename__ = "anti_fraud_reports"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: new_id("rep_antifraud")
    )
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True, nullable=False)
    jury_ticket_id: Mapped[Optional[str]] = mapped_column(ForeignKey("jury_tickets.id"), index=True)

    reason: Mapped[str] = mapped_column(String(200), nullable=False)
    evidence_photo_ref: Mapped[Optional[str]] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), default="ESCALATED_TO_DM", nullable=False)

    jury_ticket: Mapped[Optional["JuryTicket"]] = relationship(back_populates="fraud_reports")
