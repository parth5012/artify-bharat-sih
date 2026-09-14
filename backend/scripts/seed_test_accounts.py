"""Seed mock marketplace test accounts into the dev database.

Creates (idempotently — safe to re-run):
  - Artisan  artisan-002 / Mohammad Rahim Ansari / 9876543202 / PIN 2222
  - Customer Test Buyer / 9876543201 (phone_hash + vault token, no plaintext)
  - Products prod-001/002/003 (published + listed) **with images**
    downloaded from the internet into ``media_storage/raw|enhanced`` and
    wired to ``Product.raw_image_path / enhanced_image_path``.
  - Heritage Passports for prod-001/002/003 with pinned shortcodes
    ABC-123 / VRN-456 / MDB-789 so the buyer portal Quick Samples
    (ABC123, VRN456, MDB789) resolve against the real backend
    (hyphen-insensitive lookup) instead of "Passport Not Found".

Usage (from backend/):
    uv run python scripts/seed_test_accounts.py
    uv run python scripts/seed_test_accounts.py --no-images
    uv run python scripts/seed_test_accounts.py --force-images
    uv run python scripts/seed_test_accounts.py --no-passports

Honours DATABASE_URL (default sqlite ./artify_bharat.db). Ensures tables
exist via Base.metadata.create_all so it works on a fresh dev DB.

Image behaviour:
  - Downloads each product image via httpx (20s timeout, follows
    redirects, requires image/* content-type, 1KB–20MB guard).
  - Idempotent: skips download when both stored files already exist
    unless ``--force-images`` is passed.
  - Offline-safe: on any download failure writes a Pillow 800x800 (1:1
    square, matching UI_Capture) placeholder JPEG so seeding never fails
    without internet and the marketplace still renders visuals.
"""

from __future__ import annotations

import argparse
import asyncio
import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.core.database import AsyncSessionLocal, Base, engine  # noqa: E402
from app.core.security import get_pin_hash  # noqa: E402
from app.core.storage import storage_manager  # noqa: E402
from app.models import Artisan, Customer, Product  # noqa: E402

ARTISAN_ID = "artisan-002"
ARTISAN_NAME = "Mohammad Rahim Ansari"
ARTISAN_PHONE = "9876543202"
ARTISAN_PIN = "2222"

BUYER_NAME = "Test Buyer"
BUYER_PHONE = "9876543201"

PRODUCT_ID = "prod-001"

# Picsum seed URLs: stable per seed, no API key, 800x800 1:1 square.
# Pinned shortcodes match the buyer-portal Quick Samples (ABC123, VRN456,
# MDB789); stored hyphenated (XXX-XXX) and resolved hyphen-insensitively.
SEED_PRODUCTS: list[dict] = [
    {
        "id": "prod-001",
        "title": "Hand-woven Banarasi Zari Silk Saree",
        "description": "GI-tagged Banarasi brocade saree, hand-woven in Varanasi cluster.",
        "craft_category": "handloom",
        "gi_tag_status": "Banarasi Brocade & Saree (GI Tagged)",
        "image_url": "https://picsum.photos/seed/artify-prod-001/800",
        "shortcode": "ABC-123",
        "pricing": {
            "raw_material_cost": 5200.0,
            "labor_days": 12.0,
            "daily_fair_wage_rate": 650.0,
            "final_price": 16800.0,
        },
    },
    {
        "id": "prod-002",
        "title": "Madhubani Hand-Painted Tussar Silk Dupatta",
        "description": "Folk-art Madhubani dupatta on tussar silk, natural dyes.",
        "craft_category": "handloom",
        "gi_tag_status": "Madhubani Painting (GI Tagged)",
        "image_url": "https://picsum.photos/seed/artify-prod-002/800",
        "shortcode": "VRN-456",
        "pricing": {
            "raw_material_cost": 1100.0,
            "labor_days": 6.0,
            "daily_fair_wage_rate": 550.0,
            "final_price": 5800.0,
        },
    },
    {
        "id": "prod-003",
        "title": "Kashmiri Pashmina Handloom Shawl",
        "description": "Soft pashmina shawl, hand-loomed by Kashmir cluster artisans.",
        "craft_category": "handloom",
        "gi_tag_status": "Kashmir Pashmina (GI Tagged)",
        "image_url": "https://picsum.photos/seed/artify-prod-003/800",
        "shortcode": "MDB-789",
        "pricing": {
            "raw_material_cost": 9500.0,
            "labor_days": 20.0,
            "daily_fair_wage_rate": 900.0,
            "final_price": 32500.0,
        },
    },
]

MIN_IMAGE_BYTES = 1024
MAX_IMAGE_BYTES = 20 * 1024 * 1024
DOWNLOAD_TIMEOUT = 20.0


async def download_image_bytes(
    url: str, timeout: float = DOWNLOAD_TIMEOUT
) -> bytes | None:
    """Download an image, returning None on any failure / non-image content."""
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None
            content_type = resp.headers.get("content-type", "")
            if not content_type.startswith("image/"):
                return None
            data = resp.content
            if not data or len(data) < MIN_IMAGE_BYTES or len(data) > MAX_IMAGE_BYTES:
                return None
            return data
    except Exception:
        return None


def placeholder_image_bytes(label: str = "ArtifyBharat") -> bytes:
    """Generate an 800x800 warm placeholder JPEG (offline fallback)."""
    from PIL import Image, ImageDraw

    size = 800
    img = Image.new("RGB", (size, size), (146, 64, 14))  # deep terracotta
    draw = ImageDraw.Draw(img)
    # Simple border + centred label (default bitmap font, no external deps).
    margin = 24
    draw.rectangle(
        [margin, margin, size - margin, size - margin], outline=(251, 191, 36), width=6
    )
    text = (label[:28] + "…") if len(label) > 29 else label
    # Centre-ish placement without font metrics dependency.
    draw.text((size // 2 - 130, size // 2 - 40), "ArtifyBharat", fill=(255, 251, 235))
    draw.text((size // 2 - 130, size // 2), text, fill=(253, 230, 138))
    draw.text(
        (size // 2 - 130, size // 2 + 40), "Handloom • GI Tagged", fill=(255, 251, 235)
    )
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=82)
    return buf.getvalue()


async def ensure_product_images(
    product: Product,
    image_url: str,
    db,
    force: bool = False,
    timeout: float = DOWNLOAD_TIMEOUT,
) -> str:
    """Ensure raw+enhanced image files exist for a product.

    Returns one of: downloaded | cached | placeholder | skipped.
    """
    raw_path = Path(product.raw_image_path) if product.raw_image_path else None
    enh_path = (
        Path(product.enhanced_image_path) if product.enhanced_image_path else None
    )
    if (
        not force
        and raw_path is not None
        and enh_path is not None
        and raw_path.exists()
        and enh_path.exists()
    ):
        return "cached"

    data = await download_image_bytes(image_url, timeout=timeout)
    status = "downloaded"
    if data is None:
        data = placeholder_image_bytes(f"{product.id} {product.title or ''}")
        status = "placeholder"

    raw_saved = await storage_manager.save_raw_image(data, f"{product.id}_raw.jpg")
    enh_saved = await storage_manager.save_enhanced_image(
        data, f"{product.id}_enhanced.jpg"
    )
    product.raw_image_path = raw_saved
    product.enhanced_image_path = enh_saved
    await db.flush()
    return status


async def ensure_product_pricing(product: Product, spec: dict, db) -> str:
    """Upsert a coherent ProductPricing row (before passport issuance).

    Fair wage = labor_days * daily rate; profit = final - material - wage
    (floored at 0) so the verify cost breakdown never shows wages above
    retail. Returns created | updated | exists.
    """
    from app.models.pricing import ProductPricing  # noqa: E402

    raw = float(spec.get("raw_material_cost", 500.0))
    days = float(spec.get("labor_days", 15.0))
    rate = float(spec.get("daily_fair_wage_rate", 450.0))
    wage = round(days * rate, 2)
    final = float(spec.get("final_price", raw + wage + 300.0))
    profit = round(max(final - raw - wage, 0.0), 2)

    row = (
        await db.execute(
            select(ProductPricing).where(ProductPricing.product_id == product.id)
        )
    ).scalar_one_or_none()
    if row is None:
        row = ProductPricing(
            product_id=product.id,
            raw_material_cost=raw,
            labor_days=days,
            daily_fair_wage_rate=rate,
            calculated_fair_wage=wage,
            benchmark_min_price=round(final * 0.9, 2),
            benchmark_max_price=round(final * 1.1, 2),
            recommended_price=final,
            final_price=final,
            artisan_net_profit=profit,
        )
        db.add(row)
        await db.flush()
        return "created"
    updated = False
    for field, value in (
        ("raw_material_cost", raw),
        ("labor_days", days),
        ("daily_fair_wage_rate", rate),
        ("calculated_fair_wage", wage),
        ("final_price", final),
        ("recommended_price", final),
        ("artisan_net_profit", profit),
    ):
        if getattr(row, field) != value:
            setattr(row, field, value)
            updated = True
    if updated:
        await db.flush()
        return "updated"
    return "exists"


async def ensure_product_passport(product: Product, pinned_shortcode: str, db) -> str:
    """Issue (or re-issue) a Heritage Passport pinned to a demo shortcode.

    Uses the real ``passport_service.issue_passport`` so hashes stay
    cryptographic, then pins ``shortcode`` to the buyer-portal Quick Sample
    code (e.g. ABC-123). Keeps the product published+listed for the
    marketplace. Returns the effective shortcode.
    """
    from app.models.passport import HeritagePassport  # noqa: E402
    from app.services.passport_service import passport_service  # noqa: E402

    passport = await passport_service.issue_passport(db, product.id)

    if passport.shortcode != pinned_shortcode:
        clash = (
            await db.execute(
                select(HeritagePassport).where(
                    HeritagePassport.shortcode == pinned_shortcode
                )
            )
        ).scalar_one_or_none()
        if clash is None or clash.product_id == product.id:
            passport.shortcode = pinned_shortcode
            snap = dict(passport.payload_snapshot or {})
            snap["shortcode"] = pinned_shortcode
            passport.payload_snapshot = snap
            base_url = snap.get("verification_url", "") or passport.verification_url
            root = base_url.rsplit("/", 1)[0] if "/" in base_url else base_url
            passport.verification_url = f"{root}/{pinned_shortcode}"
            await db.flush()

    # issue_passport flips status to passport_issued; seed contract is
    # published + listed (marketplace verified-only accepts both).
    product.is_listed = True
    product.status = "published"
    await db.flush()
    await db.refresh(passport)
    return passport.shortcode or pinned_shortcode


async def ensure_schema() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def _seed_with_db(
    db,
    with_images: bool = True,
    force_images: bool = False,
    timeout: float = DOWNLOAD_TIMEOUT,
    with_passports: bool = True,
) -> dict[str, str]:
    result: dict[str, str] = {}
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

    for item in SEED_PRODUCTS:
        product = (
            await db.execute(select(Product).where(Product.id == item["id"]))
        ).scalar_one_or_none()
        if product is None:
            product = Product(
                id=item["id"],
                artisan_id=ARTISAN_ID,
                title=item["title"],
                description=item.get("description"),
                craft_category=item.get("craft_category", "handloom"),
                gi_tag_status=item.get(
                    "gi_tag_status", "Banarasi Brocade & Saree (GI Tagged)"
                ),
                status="published",
                is_listed=True,
                stock_qty=1,
                stock_type="unique",
                reserved_qty=0,
            )
            db.add(product)
            await db.flush()
            result[f"product:{item['id']}"] = "created"
        else:
            updated = False
            for field in (
                "title",
                "description",
                "craft_category",
                "gi_tag_status",
            ):
                if field in item and getattr(product, field) != item[field]:
                    setattr(product, field, item[field])
                    updated = True
            if not product.is_listed or product.status not in (
                "passport_issued",
                "published",
            ):
                product.is_listed = True
                product.status = "published"
                updated = True
            result[f"product:{item['id']}"] = "relisted" if updated else "exists"

        if with_images:
            img_status = await ensure_product_images(
                product, item["image_url"], db, force=force_images, timeout=timeout
            )
            result[f"image:{item['id']}"] = img_status
        else:
            result[f"image:{item['id']}"] = "skipped"

        if item.get("pricing"):
            pricing_status = await ensure_product_pricing(product, item["pricing"], db)
            result[f"pricing:{item['id']}"] = pricing_status

        if with_passports and item.get("shortcode"):
            code = await ensure_product_passport(product, item["shortcode"], db)
            result[f"passport:{item['id']}"] = code
        else:
            result[f"passport:{item['id']}"] = "skipped"

    # Back-compat key used by TEST.md / older logs.
    result["product"] = result.get(f"product:{PRODUCT_ID}", "exists")

    await db.commit()
    return result


async def seed(
    db=None,
    with_images: bool = True,
    force_images: bool = False,
    timeout: float = DOWNLOAD_TIMEOUT,
    with_passports: bool = True,
) -> dict[str, str]:
    """Seed mock accounts + product images + heritage passports.

    ``db`` accepts an existing AsyncSession (tests); when omitted a new
    session is opened against the configured DATABASE_URL.
    """
    if db is not None:
        return await _seed_with_db(
            db,
            with_images=with_images,
            force_images=force_images,
            timeout=timeout,
            with_passports=with_passports,
        )
    async with AsyncSessionLocal() as session:
        return await _seed_with_db(
            session,
            with_images=with_images,
            force_images=force_images,
            timeout=timeout,
            with_passports=with_passports,
        )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed mock marketplace test accounts + product images."
    )
    parser.add_argument(
        "--no-images", action="store_true", help="Skip downloading product images."
    )
    parser.add_argument(
        "--force-images",
        action="store_true",
        help="Re-download images even when files already exist.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=DOWNLOAD_TIMEOUT,
        help="Per-image download timeout in seconds.",
    )
    parser.add_argument(
        "--no-passports",
        action="store_true",
        help="Skip issuing Heritage Passports for seeded products.",
    )
    return parser.parse_args(argv)


async def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    await ensure_schema()
    result = await seed(
        with_images=not args.no_images,
        force_images=args.force_images,
        timeout=args.timeout,
        with_passports=not args.no_passports,
    )
    print("seed:", result)
    print(f"artisan login: phone={ARTISAN_PHONE} pin={ARTISAN_PIN}")
    print(f"buyer reserve: phone={BUYER_PHONE} otp=123456 (dev mock)")


if __name__ == "__main__":
    asyncio.run(main())
