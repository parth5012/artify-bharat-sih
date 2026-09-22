"""initial schema - artisans, products, pricing, passports, exports, jury, payouts, logistics

Revision ID: 0001
Revises:
Create Date: 2026-09-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "artisans",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(15), nullable=False, unique=True),
        sa.Column("pin_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="artisan"),
        sa.Column("primary_dialect", sa.String(50), nullable=False),
        sa.Column("cluster_name", sa.String(150)),
        sa.Column("state", sa.String(100)),
        sa.Column("district", sa.String(100)),
        sa.Column("pehchan_id", sa.String(50), unique=True),
        sa.Column("trifed_id", sa.String(50), unique=True),
        sa.Column("eshram_uan", sa.String(12), unique=True),
        sa.Column("pmdaksh_level", sa.String(20)),
        sa.Column("pmsuraj_eligible", sa.Boolean()),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("trust_score", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("welfare_access_frozen", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("aadhaar_token", sa.String(255)),
        sa.Column("bank_account_token", sa.String(255)),
        sa.Column("jan_dhan_account_token", sa.String(255)),
        sa.Column("ifsc_code", sa.String(11)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_artisans_phone", "artisans", ["phone"])
    op.create_index("ix_artisans_pehchan_id", "artisans", ["pehchan_id"])
    op.create_index("ix_artisans_trifed_id", "artisans", ["trifed_id"])
    op.create_index("ix_artisans_eshram_uan", "artisans", ["eshram_uan"])

    op.create_table(
        "products",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("artisan_id", sa.String(64), sa.ForeignKey("artisans.id"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("craft_category", sa.String(100)),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("wip_photo_refs", sa.String(1000)),
        sa.Column("final_photo_refs", sa.String(1000)),
        sa.Column("verification_status", sa.String(30), nullable=False, server_default="unverified"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_products_artisan_id", "products", ["artisan_id"])

    op.create_table(
        "product_pricing",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("product_id", sa.String(64), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("statutory_floor_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("retail_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("bulk_price_tier", sa.Numeric(10, 2)),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_product_pricing_product_id", "product_pricing", ["product_id"])

    op.create_table(
        "heritage_passports",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("product_id", sa.String(64), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("artisan_id", sa.String(64), sa.ForeignKey("artisans.id"), nullable=False),
        sa.Column("sha256_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("shortcode", sa.String(20), nullable=False, unique=True),
        sa.Column("qr_ref", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_heritage_passports_product_id", "heritage_passports", ["product_id"])
    op.create_index("ix_heritage_passports_artisan_id", "heritage_passports", ["artisan_id"])
    op.create_index("ix_heritage_passports_shortcode", "heritage_passports", ["shortcode"])

    op.create_table(
        "channel_exports",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("product_id", sa.String(64), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("channel", sa.String(30), nullable=False),
        sa.Column("sync_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("external_ref", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_channel_exports_product_id", "channel_exports", ["product_id"])

    op.create_table(
        "jury_tickets",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("product_id", sa.String(64), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="PENDING"),
        sa.Column("assigned_juror_ids", sa.String(255), nullable=False),
        sa.Column("reassigned_from", sa.String(255)),
        sa.Column("quorum_verdict", sa.String(30)),
        sa.Column("average_craft_score", sa.Float()),
        sa.Column("anomaly_score", sa.Float()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_jury_tickets_product_id", "jury_tickets", ["product_id"])

    op.create_table(
        "jury_votes",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("jury_ticket_id", sa.String(64), sa.ForeignKey("jury_tickets.id"), nullable=False),
        sa.Column("juror_id", sa.String(64), sa.ForeignKey("artisans.id"), nullable=False),
        sa.Column("vote", sa.String(30), nullable=False),
        sa.Column("craft_score", sa.Integer(), nullable=False),
        sa.Column("digital_signature", sa.String(512), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_jury_votes_jury_ticket_id", "jury_votes", ["jury_ticket_id"])
    op.create_index("ix_jury_votes_juror_id", "jury_votes", ["juror_id"])

    op.create_table(
        "anti_fraud_reports",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("product_id", sa.String(64), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("jury_ticket_id", sa.String(64), sa.ForeignKey("jury_tickets.id")),
        sa.Column("reason", sa.String(200), nullable=False),
        sa.Column("evidence_photo_ref", sa.String(255)),
        sa.Column("status", sa.String(30), nullable=False, server_default="ESCALATED_TO_DM"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_anti_fraud_reports_product_id", "anti_fraud_reports", ["product_id"])

    op.create_table(
        "payout_transactions",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("artisan_id", sa.String(64), sa.ForeignKey("artisans.id"), nullable=False),
        sa.Column("product_id", sa.String(64), sa.ForeignKey("products.id")),
        sa.Column("order_id", sa.String(64)),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("platform_fee_pct", sa.Numeric(5, 2), nullable=False, server_default="0.0"),
        sa.Column("utr_number", sa.String(30), nullable=False, unique=True),
        sa.Column("channel", sa.String(20), nullable=False, server_default="PFMS_DBT"),
        sa.Column("status", sa.String(20), nullable=False, server_default="INITIATED"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_payout_transactions_artisan_id", "payout_transactions", ["artisan_id"])
    op.create_index("ix_payout_transactions_order_id", "payout_transactions", ["order_id"])

    op.create_table(
        "logistics_dispatches",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("order_id", sa.String(64), nullable=False),
        sa.Column("artisan_id", sa.String(64), sa.ForeignKey("artisans.id"), nullable=False),
        sa.Column("product_id", sa.String(64), sa.ForeignKey("products.id")),
        sa.Column("tracking_id", sa.String(30), nullable=False, unique=True),
        sa.Column("barcode_code128", sa.String(64), nullable=False),
        sa.Column("origin_pin", sa.String(6), nullable=False),
        sa.Column("destination_pin", sa.String(6), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="LABEL_CREATED"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_logistics_dispatches_order_id", "logistics_dispatches", ["order_id"])
    op.create_index("ix_logistics_dispatches_tracking_id", "logistics_dispatches", ["tracking_id"])


def downgrade() -> None:
    op.drop_table("logistics_dispatches")
    op.drop_table("payout_transactions")
    op.drop_table("anti_fraud_reports")
    op.drop_table("jury_votes")
    op.drop_table("jury_tickets")
    op.drop_table("channel_exports")
    op.drop_table("heritage_passports")
    op.drop_table("product_pricing")
    op.drop_table("products")
    op.drop_table("artisans")
