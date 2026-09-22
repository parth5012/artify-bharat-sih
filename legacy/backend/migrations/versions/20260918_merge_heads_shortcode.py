"""Merge divergent heads into a single line (#103).

Revision ID: 9c3d4e5f6a7b
Revises: 8b2c3d4e5f6a, 20260914_product_provenance
Create Date: 2026-09-18

``alembic heads`` reported two heads: the shortcode-index line
(``8b2c3d4e5f6a``) and the orphan provenance line
(``20260914_product_provenance``, ``down_revision=None``). This is a
no-op merge: canonical shortcode storage stays ``VARCHAR(7)`` XXX-XXX
(model ``HeritagePassport.shortcode`` + ``8b2c3d4e5f6a`` + unique index
``ix_heritage_passports_shortcode``).

Note: the legacy ``backend/alembic/versions/0001_initial_schema.py`` tree
(``String(20)`` shortcode) is NOT on the configured ``script_location``
(``migrations``) and is intentionally left untouched; see TECH_DEBT.
"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "9c3d4e5f6a7b"
down_revision: Union[str, Sequence[str], None] = (
    "8b2c3d4e5f6a",
    "20260914_product_provenance",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
