"""Add indexed shortcode column on heritage_passports (Task 4.2).

Revision ID: 8b2c3d4e5f6a
Revises: 7a1b2c3d4e5f
Create Date: 2026-09-11

Schema change: heritage_passports.shortcode String(7) NULL (+ unique index
ix_heritage_passports_shortcode) to back the base62 XXX-XXX shortcode with
indexed DB lookup. Nullable so pre-existing rows survive the upgrade; new
passports always set it (see PassportService.issue_passport collision-safe
generation). Backfill from payload_snapshot['shortcode'] where present::

    UPDATE heritage_passports
       SET shortcode = payload_snapshot->>'shortcode'
     WHERE shortcode IS NULL;

Downgrade drops the index then the column.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "8b2c3d4e5f6a"
down_revision: Union[str, None] = "7a1b2c3d4e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "heritage_passports",
        sa.Column("shortcode", sa.String(7), nullable=True),
    )
    op.create_index(
        "ix_heritage_passports_shortcode",
        "heritage_passports",
        ["shortcode"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_heritage_passports_shortcode", table_name="heritage_passports")
    op.drop_column("heritage_passports", "shortcode")
