"""Seed product images: download from internet, fallback to placeholder.

TDD red-first: covers download validation + placeholder fallback +
idempotent product upsert with image paths.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

BACKEND_ROOT = Path(__file__).resolve().parent.parent
SEED_PATH = BACKEND_ROOT / "scripts" / "seed_test_accounts.py"


def load_seed_module():
    spec = importlib.util.spec_from_file_location("seed_test_accounts", SEED_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["seed_test_accounts"] = module
    spec.loader.exec_module(module)
    return module


seed_mod = load_seed_module()


def test_seed_products_have_image_urls():
    assert hasattr(seed_mod, "SEED_PRODUCTS")
    assert len(seed_mod.SEED_PRODUCTS) >= 1
    for item in seed_mod.SEED_PRODUCTS:
        assert item["id"]
        assert item["image_url"].startswith("http")


def test_placeholder_bytes_are_valid_jpeg():
    data = seed_mod.placeholder_image_bytes("prod-001 Test")
    assert data[:2] == b"\xff\xd8"  # JPEG magic
    assert len(data) > 1000


@pytest.mark.asyncio
async def test_download_rejects_non_image_content():
    fake_resp = AsyncMock()
    fake_resp.status_code = 200
    fake_resp.headers = {"content-type": "text/html"}
    fake_resp.content = b"<html>nope</html>"
    fake_resp.raise_for_status = AsyncMock(return_value=None) if False else lambda: None

    fake_client = AsyncMock()
    fake_client.__aenter__.return_value = fake_client
    fake_client.__aexit__.return_value = False
    fake_client.get.return_value = fake_resp

    with patch("httpx.AsyncClient", return_value=fake_client):
        result = await seed_mod.download_image_bytes("https://example.com/x")
    assert result is None


@pytest.mark.asyncio
async def test_ensure_images_falls_back_to_placeholder(tmp_path, db_session):
    from app.models.product import Product

    artisan_id = "artisan-002"
    from app.models.artisan import Artisan

    db_session.add(Artisan(id=artisan_id, name="T", phone="9876543202", pin_hash="x"))
    product = Product(
        id="prod-img-fallback",
        artisan_id=artisan_id,
        title="Fallback Saree",
        status="published",
        is_listed=True,
    )
    db_session.add(product)
    await db_session.commit()

    with patch.object(
        seed_mod, "download_image_bytes", return_value=None
    ), patch.object(seed_mod.storage_manager, "local_dir", tmp_path), patch.object(
        seed_mod.storage_manager, "raw_dir", tmp_path / "raw"
    ), patch.object(
        seed_mod.storage_manager, "enhanced_dir", tmp_path / "enhanced"
    ):
        (tmp_path / "raw").mkdir(parents=True, exist_ok=True)
        (tmp_path / "enhanced").mkdir(parents=True, exist_ok=True)
        status = await seed_mod.ensure_product_images(
            product, "https://example.com/broken.jpg", db_session
        )

    assert status == "placeholder"
    assert product.raw_image_path and Path(product.raw_image_path).exists()
    assert product.enhanced_image_path and Path(product.enhanced_image_path).exists()


@pytest.mark.asyncio
async def test_ensure_images_cached_when_files_exist(tmp_path, db_session):
    from app.models.artisan import Artisan
    from app.models.product import Product

    db_session.add(
        Artisan(id="artisan-002", name="T", phone="9876543202", pin_hash="x")
    )
    raw = tmp_path / "raw" / "prod-cached_raw.jpg"
    enh = tmp_path / "enhanced" / "prod-cached_enhanced.jpg"
    raw.parent.mkdir(parents=True, exist_ok=True)
    enh.parent.mkdir(parents=True, exist_ok=True)
    raw.write_bytes(b"rawimg")
    enh.write_bytes(b"enhimg")
    product = Product(
        id="prod-cached",
        artisan_id="artisan-002",
        title="Cached",
        status="published",
        is_listed=True,
        raw_image_path=str(raw),
        enhanced_image_path=str(enh),
    )
    db_session.add(product)
    await db_session.commit()

    with patch.object(
        seed_mod, "download_image_bytes", side_effect=AssertionError("no download")
    ):
        status = await seed_mod.ensure_product_images(
            product, "https://example.com/should-not-fetch.jpg", db_session
        )
    assert status == "cached"
