"""add artisan onboarding columns and widen tokens

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-14
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("artisans") as batch_op:
        batch_op.add_column(
            sa.Column("onboarding_step", sa.Integer(), nullable=False, server_default="1")
        )
        batch_op.add_column(
            sa.Column("is_onboarded", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(
            sa.Column("shg_group_name", sa.String(255), nullable=True)
        )
        batch_op.add_column(
            sa.Column("shg_member_count", sa.Integer(), nullable=True)
        )
        batch_op.alter_column(
            "eshram_uan",
            type_=sa.String(512),
            existing_type=sa.String(12),
            existing_nullable=True,
        )
        batch_op.alter_column(
            "pehchan_id",
            type_=sa.String(512),
            existing_type=sa.String(50),
            existing_nullable=True,
        )
        batch_op.alter_column(
            "trifed_id",
            type_=sa.String(512),
            existing_type=sa.String(50),
            existing_nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("artisans") as batch_op:
        # Clear encrypted tokens that exceed VARCHAR(12) before narrowing
        op.execute(sa.text("UPDATE artisans SET eshram_uan = NULL WHERE length(eshram_uan) > 12"))
        op.execute(sa.text("UPDATE artisans SET pehchan_id = NULL WHERE length(pehchan_id) > 50"))
        op.execute(sa.text("UPDATE artisans SET trifed_id = NULL WHERE length(trifed_id) > 50"))
        batch_op.drop_column("shg_member_count")
        batch_op.drop_column("shg_group_name")
        batch_op.drop_column("is_onboarded")
        batch_op.drop_column("onboarding_step")
        batch_op.alter_column(
            "eshram_uan",
            type_=sa.String(12),
            existing_type=sa.String(512),
            existing_nullable=True,
        )
        batch_op.alter_column(
            "pehchan_id",
            type_=sa.String(50),
            existing_type=sa.String(512),
            existing_nullable=True,
        )
        batch_op.alter_column(
            "trifed_id",
            type_=sa.String(50),
            existing_type=sa.String(512),
            existing_nullable=True,
        )
