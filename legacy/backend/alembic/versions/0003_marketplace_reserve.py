"""marketplace reserve-only models: customers, reservations, product stock fields

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-14
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, server_default=""),
        sa.Column("phone_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("phone_token", sa.String(512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "reservations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "product_id",
            sa.String(64),
            sa.ForeignKey("products.id"),
            nullable=False,
        ),
        sa.Column(
            "customer_id",
            sa.String(36),
            sa.ForeignKey("customers.id"),
            nullable=False,
        ),
        sa.Column("qty", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "status",
            sa.String(30),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("pickup_code", sa.String(6), nullable=True, unique=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_reservations_product_id", "reservations", ["product_id"])
    op.create_index("ix_reservations_customer_id", "reservations", ["customer_id"])
    op.create_index("ix_reservations_status", "reservations", ["status"])

    with op.batch_alter_table("products") as batch_op:
        batch_op.add_column(
            sa.Column(
                "stock_qty", sa.Integer(), nullable=False, server_default="1"
            )
        )
        batch_op.add_column(
            sa.Column(
                "stock_type",
                sa.String(20),
                nullable=False,
                server_default="unique",
            )
        )
        batch_op.add_column(
            sa.Column(
                "is_listed",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch_op.add_column(
            sa.Column(
                "reserved_qty", sa.Integer(), nullable=False, server_default="0"
            )
        )
        batch_op.create_index("ix_products_is_listed", ["is_listed"])
        batch_op.create_index(
            "ix_products_is_listed_status", ["is_listed", "status"]
        )


def downgrade() -> None:
    with op.batch_alter_table("products") as batch_op:
        batch_op.drop_index("ix_products_is_listed_status")
        batch_op.drop_index("ix_products_is_listed")
        batch_op.drop_column("reserved_qty")
        batch_op.drop_column("is_listed")
        batch_op.drop_column("stock_type")
        batch_op.drop_column("stock_qty")

    op.drop_index("ix_reservations_status", table_name="reservations")
    op.drop_index("ix_reservations_customer_id", table_name="reservations")
    op.drop_index("ix_reservations_product_id", table_name="reservations")
    op.drop_table("reservations")

    op.drop_table("customers")
