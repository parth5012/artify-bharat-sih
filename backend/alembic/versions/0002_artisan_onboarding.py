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


def downgrade() -> None:
    with op.batch_alter_table("artisans") as batch_op:
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
