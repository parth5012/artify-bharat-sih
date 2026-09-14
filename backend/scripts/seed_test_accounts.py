"""Seed mock marketplace test accounts into the dev database.

Creates (idempotently — safe to re-run):
  - Artisan  artisan-002 / Mohammad Rahim Ansari / 9876543202 / PIN 2222
  - Customer Test Buyer / 9876543201 (phone_hash + vault token, no plaintext)
  - Product  prod-001 / Banarasi saree / published + listed, unique 1-of-1

Usage (from backend/):
    uv run python scripts/seed_test_accounts.py

Honours DATABASE_URL (default sqlite ./artify_bharat.db). Ensures tables
exist via Base.metadata.create_all so it works on a fresh dev DB.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.core.database import AsyncSessionLocal, Base, engine  # noqa: E402
from app.core.security import get_pin_hash  # noqa: E402
from app.models import Artisan, Customer, Product  # noqa: E402

ARTISAN_ID = "artisan-002"
ARTISAN_NAME = "Mohammad Rahim Ansari"
ARTISAN_PHONE = "9876543202"
ARTISAN_PIN = "2222"

BUYER_NAME = "Test Buyer"
BUYER_PHONE = "9876543201"

PRODUCT_ID = "prod-001"


async def ensure_schema() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed() -> dict[str, str]:
    result: dict[str, str] = {}
    async with AsyncSessionLocal() as db:
        artisan = (
            await db.execute(select(Artisan).where(Artisan.phone == ARTISAN_PHONE))
        ).scalar_one_or_none()
        if artisan is None:
            artisan = Artisan(
                id=ARTISAN_ID,
                name=ARTISAN_NAME,
                phone=ARTISAN_PHONE,
                pin_hash=get_pin_hash(ARTISAN_PIN),
                cluster_name="Varanasi Handloom Cluster",
                state="Uttar Pradesh",
                district="Varanasi",
                is_onboarded=True,
                onboarding_step=3,
            )
            db.add(artisan)
            result["artisan"] = "created"
        else:
            result["artisan"] = "exists"

        phone_hash = Customer.hash_phone(BUYER_PHONE)
        customer = (
            await db.execute(select(Customer).where(Customer.phone_hash == phone_hash))
        ).scalar_one_or_none()
        if customer is None:
            customer = Customer(name=BUYER_NAME, phone_hash=phone_hash)
            db.add(customer)
            result["customer"] = "created"
        else:
            result["customer"] = "exists"

        product = (
            await db.execute(select(Product).where(Product.id == PRODUCT_ID))
        ).scalar_one_or_none()
        if product is None:
            product = Product(
                id=PRODUCT_ID,
                artisan_id=ARTISAN_ID,
                title="Hand-woven Banarasi Zari Silk Saree",
                craft_category="handloom",
                status="published",
                is_listed=True,
                stock_qty=1,
                stock_type="unique",
                reserved_qty=0,
            )
            db.add(product)
            result["product"] = "created"
        else:
            if not product.is_listed or product.status not in (
                "passport_issued",
                "published",
            ):
                product.is_listed = True
                product.status = "published"
                result["product"] = "relisted"
            else:
                result["product"] = "exists"

        await db.commit()
    return result


async def main() -> None:
    await ensure_schema()
    result = await seed()
    print("seed:", result)
    print(f"artisan login: phone={ARTISAN_PHONE} pin={ARTISAN_PIN}")
    print(f"buyer reserve: phone={BUYER_PHONE} otp=123456 (dev mock)")


if __name__ == "__main__":
    asyncio.run(main())
