"""Widen artisan govt-ID columns to hold PII-vault tokens (Task 1.5b).

Revision ID: 7a1b2c3d4e5f
Revises: None (first revision; tables are otherwise managed via Base.metadata)
Create Date: 2026-09-11

Schema change: artisans.trifed_id / pehchan_id String(50) -> String(512) so
rows can store opaque AES-256-GCM vault tokens (base64url, ~64+ chars) instead
of plaintext government IDs.

Backfill guidance (DPDP Act 2023) — run offline with PII_VAULT_KEY set::

    from sqlalchemy import select
    from app.core.pii_vault import protect, is_vault_token
    rows = (await db.execute(select(Artisan))).scalars().all()
    for artisan in rows:
        for field in ("trifed_id", "pehchan_id"):
            value = getattr(artisan, field)
            if value and not is_vault_token(value):
                setattr(artisan, field, protect(value))
    await db.commit()

The loop is idempotent (is_vault_token skips already-tokenized rows).
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "7a1b2c3d4e5f"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "artisans",
        "trifed_id",
        existing_type=sa.String(50),
        type_=sa.String(512),
        existing_nullable=True,
    )
    op.alter_column(
        "artisans",
        "pehchan_id",
        existing_type=sa.String(50),
        type_=sa.String(512),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "artisans",
        "pehchan_id",
        existing_type=sa.String(512),
        type_=sa.String(50),
        existing_nullable=True,
    )
    op.alter_column(
        "artisans",
        "trifed_id",
        existing_type=sa.String(512),
        type_=sa.String(50),
        existing_nullable=True,
    )
