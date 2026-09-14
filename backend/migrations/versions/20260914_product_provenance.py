"""Add provenance coordinates and capture timestamp to products."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260914_product_provenance"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("provenance_latitude", sa.Float(), nullable=True))
    op.add_column("products", sa.Column("provenance_longitude", sa.Float(), nullable=True))
    op.add_column(
        "products",
        sa.Column("provenance_timestamp", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("products", "provenance_timestamp")
    op.drop_column("products", "provenance_longitude")
    op.drop_column("products", "provenance_latitude")
