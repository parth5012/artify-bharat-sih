"""add product provenance coordinates and timestamp

Revision ID: 20260914_product_provenance
Revises:
"""

from alembic import op
import sqlalchemy as sa


revision = "20260914_product_provenance"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("provenance_latitude", sa.Float(), nullable=True))
    op.add_column("products", sa.Column("provenance_longitude", sa.Float(), nullable=True))
    op.add_column("products", sa.Column("provenance_timestamp", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "provenance_timestamp")
    op.drop_column("products", "provenance_longitude")
    op.drop_column("products", "provenance_latitude")