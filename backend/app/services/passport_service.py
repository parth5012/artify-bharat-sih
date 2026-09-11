import base64
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.product import Product
from app.models.artisan import Artisan
from app.models.pricing import ProductPricing
from app.models.passport import HeritagePassport
from app.core.passport import compute_wip_digest, generate_passport_hash, generate_passport_qr_code
from app.core.pii_vault import reveal as reveal_pii
from app.config import get_settings

settings = get_settings()

BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def _base62_encode(num: int) -> str:
    """Encode a non-negative int to base62 using BASE62_ALPHABET."""
    if num == 0:
        return BASE62_ALPHABET[0]
    out: list[str] = []
    while num > 0:
        num, rem = divmod(num, 62)
        out.append(BASE62_ALPHABET[rem])
    return "".join(reversed(out))


def generate_shortcode(hash_str: str, salt: str = "") -> str:
    """Generate deterministic base62 6-char shortcode (XXX-XXX) from SHA-256 hex.

    Maps int(hash, 16) % 62**6 through base62, padded to 6 chars. ``salt``
    re-hashes with a counter suffix for collision resolution.
    """
    if salt:
        digest = hashlib.sha256(f"{hash_str}{salt}".encode("utf-8")).hexdigest()
    else:
        try:
            int(hash_str, 16)
            digest = hash_str.strip().lower()
            if len(digest) < 16:
                digest = hashlib.sha256(hash_str.encode("utf-8")).hexdigest()
        except (ValueError, AttributeError):
            digest = hashlib.sha256(str(hash_str).encode("utf-8")).hexdigest()
    num = int(digest, 16) % (62 ** 6)
    encoded = _base62_encode(num).rjust(6, BASE62_ALPHABET[0])[-6:]
    return f"{encoded[:3]}-{encoded[3:]}"


def _shortcode_variants(code: str) -> list[str]:
    """Ordered lookup variants: exact, upper, hyphen insert/remove."""
    base = code.strip().replace(" ", "").replace("_", "")
    variants: list[str] = []

    def _add(v: str) -> None:
        if v and v not in variants:
            variants.append(v)

    _add(base)
    _add(base.upper())
    dehy = base.replace("-", "")
    _add(dehy)
    _add(dehy.upper())
    if len(dehy) == 6:
        _add(f"{dehy[:3]}-{dehy[3:]}")
        _add(f"{dehy[:3].upper()}-{dehy[3:].upper()}")
    return variants

def generate_escpos_thermal_bytes(shortcode: str, title: str, artisan: str, price: float) -> str:
    """Generates base64-encoded ESC/POS binary commands for 58mm thermal printers."""
    commands = bytearray()
    commands.extend(b"\x1b\x40") # Init
    commands.extend(b"\x1b\x61\x01") # Center
    commands.extend(b"\x1b\x45\x01") # Bold
    commands.extend(b"ARTIFY BHARAT (MoSJE)\n")
    commands.extend(b"HERITAGE DIGITAL PASSPORT\n")
    commands.extend(b"\x1b\x45\x00") # Bold off
    commands.extend(f"Product: {title[:24]}\n".encode("utf-8"))
    commands.extend(f"Artisan: {artisan[:24]}\n".encode("utf-8"))
    commands.extend(f"Price: Rs. {int(price)}\n".encode("utf-8"))
    commands.extend(b"\x1b\x45\x01")
    commands.extend(f"CODE: {shortcode}\n".encode("utf-8"))
    commands.extend(b"\x1b\x45\x00")
    commands.extend(b"Scan or enter at: artify.gov.in\n")
    commands.extend(b"\n\n\x1d\x56\x41\x00") # Cut paper
    return base64.b64encode(commands).decode("ascii")


class PassportService:
    """
    Implements Cryptographic Verification & Heritage Passport Generation,
    6-character shortcode resolver (A7X-9B2), GPS/Timestamp lock, and ESC/POS thermal printing.
    """
    
    def __init__(self):
        self._shortcode_index: Dict[str, Dict[str, Any]] = {
            "A7X-9B2": {
                "passport_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "shortcode": "A7X-9B2",
                "is_authentic": True,
                "product_title": "Handwoven Banarasi Katan Silk Saree",
                "craft_category": "Handloom Silk Weaving",
                "gi_tag_status": "Banarasi Brocade & Saree (GI-39)",
                "artisan_name": "Radha Devi",
                "cluster_name": "Varanasi Handloom Cluster",
                "state": "Uttar Pradesh",
                "district": "Varanasi",
                "mosje_status": "PM-DAKSH Level 4 Certified Master Artisan",
                "geo_coordinates": {"latitude": 25.3176, "longitude": 82.9739},
                "wip_photo_url": "https://storage.artify.gov.in/wip/banarasi_wip_01.jpg",
                "enhanced_image_url": "https://storage.artify.gov.in/studio/banarasi_final_01.png",
                "voice_story_url": "https://storage.artify.gov.in/audio/radha_devi_story.mp3",
                "cost_breakdown": {
                    "raw_material_cost": 3200.0,
                    "labor_days": 10.0,
                    "daily_wage_rate": 480.0,
                    "fair_labor_wage": 4800.0,
                    "calculated_fair_wage": 4800.0,
                    "artisan_profit": 1500.0,
                    "artisan_net_profit": 1500.0,
                    "packaging": 300.0,
                    "total_suggested_price": 9800.0,
                    "final_price": 9800.0
                },
                "issued_at": "2026-09-08T18:00:00Z"
            },
            "M3B-77L": {
                "passport_hash": "f4c1b892a01d5678bc901ef23456789abcdef0123456789abcdef0123456789a",
                "shortcode": "M3B-77L",
                "is_authentic": True,
                "product_title": "Tree of Life Mithila Folk Painting",
                "craft_category": "Traditional Painting & Folk Art",
                "gi_tag_status": "Madhubani Paintings of Bihar (GI-105)",
                "artisan_name": "Geeta Jha",
                "cluster_name": "Mithila Painting Cluster",
                "state": "Bihar",
                "district": "Madhubani",
                "mosje_status": "PM-DAKSH Level 3 Certified Folk Artist",
                "geo_coordinates": {"latitude": 26.3541, "longitude": 86.0718},
                "wip_photo_url": "https://storage.artify.gov.in/wip/madhubani_wip_01.jpg",
                "enhanced_image_url": "https://storage.artify.gov.in/studio/madhubani_final_01.png",
                "voice_story_url": "https://storage.artify.gov.in/audio/geeta_jha_story.mp3",
                "cost_breakdown": {
                    "raw_material_cost": 650.0,
                    "labor_days": 5.0,
                    "daily_wage_rate": 450.0,
                    "fair_labor_wage": 2250.0,
                    "calculated_fair_wage": 2250.0,
                    "artisan_profit": 900.0,
                    "artisan_net_profit": 900.0,
                    "packaging": 200.0,
                    "total_suggested_price": 4000.0,
                    "final_price": 4000.0
                },
                "issued_at": "2026-09-08T15:30:00Z"
            },
            "K9P-12M": {
                "passport_hash": "99a8b7c6d5e4f3210123456789abcdef0123456789abcdef0123456789abcdef0",
                "shortcode": "K9P-12M",
                "is_authentic": True,
                "product_title": "Hand-Spun Kashmiri Pashmina Sozni Stole",
                "craft_category": "Fine Wool & Needle Embroidery",
                "gi_tag_status": "Kashmir Pashmina (GI-46)",
                "artisan_name": "Bashir Ahmed Mir",
                "cluster_name": "Kashmir Pashmina Cluster",
                "state": "Jammu & Kashmir",
                "district": "Srinagar",
                "mosje_status": "Master Artisan & PM-SURAJ Beneficiary",
                "geo_coordinates": {"latitude": 34.0837, "longitude": 74.7973},
                "wip_photo_url": "https://storage.artify.gov.in/wip/pashmina_wip_01.jpg",
                "enhanced_image_url": "https://storage.artify.gov.in/studio/pashmina_final_01.png",
                "voice_story_url": "https://storage.artify.gov.in/audio/bashir_mir_story.mp3",
                "cost_breakdown": {
                    "raw_material_cost": 4800.0,
                    "labor_days": 18.0,
                    "daily_wage_rate": 550.0,
                    "fair_labor_wage": 9900.0,
                    "calculated_fair_wage": 9900.0,
                    "artisan_profit": 3500.0,
                    "artisan_net_profit": 3500.0,
                    "packaging": 400.0,
                    "total_suggested_price": 18600.0,
                    "final_price": 18600.0
                },
                "issued_at": "2026-09-08T12:00:00Z"
            }
        }

    async def issue_passport(self, db: AsyncSession, product_id: str) -> HeritagePassport:
        stmt = select(Product).where(Product.id == product_id)
        res = await db.execute(stmt)
        product = res.scalar_one_or_none()
        if not product:
            raise ValueError(f"Product with ID {product_id} not found.")

        artisan_res = await db.execute(select(Artisan).where(Artisan.id == product.artisan_id))
        artisan = artisan_res.scalar_one_or_none()
        if not artisan:
            raise ValueError(f"Artisan with ID {product.artisan_id} not found.")

        pricing_res = await db.execute(select(ProductPricing).where(ProductPricing.product_id == product_id))
        pricing = pricing_res.scalar_one_or_none()

        raw_cost = pricing.raw_material_cost if pricing else 500.0
        labor_days = pricing.labor_days if pricing else 15.0
        
        existing_passport_res = await db.execute(
            select(HeritagePassport).where(HeritagePassport.product_id == product_id)
        )
        existing_passport = existing_passport_res.scalar_one_or_none()

        if existing_passport:
            first_issue_time = (
                existing_passport.payload_snapshot.get("issued_at")
                if existing_passport.payload_snapshot and "issued_at" in existing_passport.payload_snapshot
                else existing_passport.created_at.isoformat()
            )
            issue_timestamp = first_issue_time
        else:
            issue_timestamp = datetime.now(timezone.utc).isoformat()

        # DPDP Act 2023: detokenize govt IDs in-memory ONLY for the
        # deterministic hash input. Plaintext is never persisted — the
        # payload snapshot and shortcode index below carry no govt IDs.
        trifed_plain = reveal_pii(artisan.trifed_id)
        # WIP provenance: digest the raw/WIP capture reference so any WIP
        # photo swap flips the deterministic passport hash.
        wip_digest = compute_wip_digest(getattr(product, "raw_image_path", None))
        passport_hash = generate_passport_hash(
            artisan_id=artisan.id,
            trifed_id=trifed_plain if isinstance(trifed_plain, str) else None,
            geo_lat=artisan.geo_lat,
            geo_lng=artisan.geo_lng,
            product_title=product.title,
            craft_category=product.craft_category,
            timestamp_iso=issue_timestamp,
            raw_material_cost=raw_cost,
            labor_days=labor_days,
            wip_sha256=wip_digest,
        )

        shortcode = generate_shortcode(passport_hash)
        # Collision handling: rehash with salt counter while the candidate
        # shortcode is taken by a different passport hash in the DB (or seed index).
        _collision_counter = 0
        while True:
            clash = await db.execute(
                select(HeritagePassport).where(HeritagePassport.shortcode == shortcode)
            )
            clash_row = clash.scalar_one_or_none()
            clash_hash = clash_row.passport_hash if clash_row else None
            clash_product = clash_row.product_id if clash_row else None
            seed_clash = self._shortcode_index.get(shortcode)
            seed_clash_hash = seed_clash.get("passport_hash") if seed_clash else None
            if clash_row is None or clash_hash == passport_hash or clash_product == product_id:
                if seed_clash is None or seed_clash_hash == passport_hash:
                    break
            _collision_counter += 1
            shortcode = generate_shortcode(passport_hash, salt=str(_collision_counter))
        qr_data_uri = generate_passport_qr_code(passport_hash)
        verification_url = f"{settings.PASSPORT_VERIFICATION_BASE_URL}/{shortcode}"
        final_price = pricing.final_price if pricing else 4500.0
        escpos_b64 = generate_escpos_thermal_bytes(shortcode, product.title, artisan.name, final_price)

        payload_snapshot = {
            "artisan": {
                "name": artisan.name,
                "cluster": artisan.cluster_name,
                "district": artisan.district,
                "state": artisan.state,
                # DPDP: no trifed_id / pehchan_id persisted in snapshots.
                "geo_lat": artisan.geo_lat,
                "geo_lng": artisan.geo_lng,
                "mosje_status": "MoSJE Verified Artisan",
            },
            "product": {
                "title": product.title,
                "description": product.description,
                "craft_category": product.craft_category,
                "gi_tag_status": product.gi_tag_status,
                "enhanced_image_path": product.enhanced_image_path,
                "voice_audio_path": product.voice_audio_path,
            },
            "pricing": {
                "raw_material_cost": raw_cost,
                "labor_days": labor_days,
                "calculated_fair_wage": pricing.calculated_fair_wage if pricing else (labor_days * 450.0),
                "artisan_net_profit": pricing.artisan_net_profit if pricing else 1750.0,
                "packaging": 300.0,
                "final_price": final_price,
            },
            "hash": passport_hash,
            "shortcode": shortcode,
            "issued_at": issue_timestamp,
            "thermal_escpos_payload_base64": escpos_b64
        }

        self._shortcode_index[shortcode] = {
            "passport_hash": passport_hash,
            "shortcode": shortcode,
            "is_authentic": True,
            "product_title": product.title,
            "craft_category": product.craft_category,
            "gi_tag_status": product.gi_tag_status,
            "artisan_name": artisan.name,
            "cluster_name": artisan.cluster_name,
            "state": artisan.state,
            "district": artisan.district,
            # DPDP: no trifed_id / pehchan_id in the resolvable index.
            "mosje_status": "MoSJE Verified Artisan",
            "geo_coordinates": {"latitude": artisan.geo_lat, "longitude": artisan.geo_lng},
            "enhanced_image_url": product.enhanced_image_path,
            "voice_story_url": product.voice_audio_path,
            "cost_breakdown": {
                "raw_material_cost": raw_cost,
                "labor_days": labor_days,
                "daily_wage_rate": 450.0,
                "fair_labor_wage": pricing.calculated_fair_wage if pricing else (labor_days * 450.0),
                "calculated_fair_wage": pricing.calculated_fair_wage if pricing else (labor_days * 450.0),
                "artisan_profit": pricing.artisan_net_profit if pricing else 1750.0,
                "artisan_net_profit": pricing.artisan_net_profit if pricing else 1750.0,
                "packaging": 300.0,
                "total_suggested_price": final_price,
                "final_price": final_price
            },
            "issued_at": issue_timestamp
        }

        if existing_passport:
            existing_passport.passport_hash = passport_hash
            existing_passport.shortcode = shortcode
            existing_passport.qr_code_data_uri = qr_data_uri
            existing_passport.verification_url = verification_url
            existing_passport.payload_snapshot = payload_snapshot
            passport = existing_passport
        else:
            passport = HeritagePassport(
                product_id=product_id,
                passport_hash=passport_hash,
                shortcode=shortcode,
                qr_code_data_uri=qr_data_uri,
                verification_url=verification_url,
                payload_snapshot=payload_snapshot,
            )
            db.add(passport)

        product.status = "passport_issued"
        await db.commit()
        await db.refresh(passport)
        return passport

    async def verify_passport(self, db: AsyncSession, passport_hash: str) -> Optional[Dict[str, Any]]:
        clean_code = passport_hash.upper().strip()
        if clean_code in self._shortcode_index:
            return self._shortcode_index[clean_code]
            
        stmt = select(HeritagePassport).where(HeritagePassport.passport_hash == passport_hash)
        res = await db.execute(stmt)
        passport = res.scalar_one_or_none()
        if not passport:
            return None

        data = passport.payload_snapshot
        shortcode = data.get("shortcode") or generate_shortcode(passport.passport_hash)
        
        return {
            "passport_hash": passport.passport_hash,
            "shortcode": shortcode,
            "is_authentic": True,
            "product_title": data["product"]["title"],
            "craft_category": data["product"]["craft_category"],
            "gi_tag_status": data["product"]["gi_tag_status"],
            "artisan_name": data["artisan"]["name"],
            "cluster_name": data["artisan"]["cluster"],
            "state": data["artisan"]["state"],
            "district": data["artisan"]["district"],
            "mosje_status": data["artisan"].get("mosje_status", "MoSJE Verified Artisan"),
            "geo_coordinates": {
                "latitude": data["artisan"]["geo_lat"],
                "longitude": data["artisan"]["geo_lng"],
            },
            "enhanced_image_url": data["product"]["enhanced_image_path"],
            "voice_story_url": data["product"]["voice_audio_path"],
            "cost_breakdown": {
                "raw_material_cost": data["pricing"]["raw_material_cost"],
                "labor_days": data["pricing"]["labor_days"],
                "daily_wage_rate": 450.0,
                "fair_labor_wage": data["pricing"].get("calculated_fair_wage", 4800.0),
                "calculated_fair_wage": data["pricing"].get("calculated_fair_wage", 4800.0),
                "artisan_profit": data["pricing"].get("artisan_net_profit", 1750.0),
                "artisan_net_profit": data["pricing"].get("artisan_net_profit", 1750.0),
                "packaging": 300.0,
                "total_suggested_price": data["pricing"]["final_price"],
                "final_price": data["pricing"]["final_price"]
            },
            "issued_at": passport.issued_at,
        }

    async def resolve_shortcode(
        self, shortcode: str, db: Optional[AsyncSession] = None
    ) -> Optional[Dict[str, Any]]:
        """Resolve a 6-char shortcode: indexed DB lookup first, then seed index.

        Accepts hyphen-insensitive + case-insensitive input (e.g. ``a7x9b2``,
        ``A7X-9B2``). Old seed codes remain resolvable via the in-memory index.
        """
        variants = _shortcode_variants(shortcode)

        def _row_to_public(row: HeritagePassport, fallback: str) -> Dict[str, Any]:
            data = row.payload_snapshot or {}
            product = data.get("product", {}) if isinstance(data, dict) else {}
            artisan = data.get("artisan", {}) if isinstance(data, dict) else {}
            pricing = data.get("pricing", {}) if isinstance(data, dict) else {}
            sc = data.get("shortcode") if isinstance(data, dict) else None
            return {
                "passport_hash": row.passport_hash,
                "shortcode": sc or row.shortcode or fallback,
                "is_authentic": True,
                "product_title": product.get("title", ""),
                "craft_category": product.get("craft_category", ""),
                "gi_tag_status": product.get("gi_tag_status", ""),
                "artisan_name": artisan.get("name", ""),
                "cluster_name": artisan.get("cluster", ""),
                "state": artisan.get("state", ""),
                "district": artisan.get("district", ""),
                "mosje_status": artisan.get("mosje_status", "MoSJE Verified Artisan"),
                "geo_coordinates": {
                    "latitude": artisan.get("geo_lat"),
                    "longitude": artisan.get("geo_lng"),
                },
                "enhanced_image_url": product.get("enhanced_image_path"),
                "voice_story_url": product.get("voice_audio_path"),
                "cost_breakdown": {
                    "raw_material_cost": pricing.get("raw_material_cost", 0.0),
                    "labor_days": pricing.get("labor_days", 0.0),
                    "daily_wage_rate": 450.0,
                    "fair_labor_wage": pricing.get("calculated_fair_wage", 0.0),
                    "calculated_fair_wage": pricing.get("calculated_fair_wage", 0.0),
                    "artisan_profit": pricing.get("artisan_net_profit", 0.0),
                    "artisan_net_profit": pricing.get("artisan_net_profit", 0.0),
                    "packaging": 300.0,
                    "total_suggested_price": pricing.get("final_price", 0.0),
                    "final_price": pricing.get("final_price", 0.0),
                },
                "issued_at": row.issued_at
                if not (isinstance(data, dict) and data.get("issued_at"))
                else data.get("issued_at"),
            }

        if db is not None:
            try:
                for cand in variants:
                    res = await db.execute(
                        select(HeritagePassport).where(HeritagePassport.shortcode == cand)
                    )
                    row = res.scalar_one_or_none()
                    if row is not None:
                        return _row_to_public(row, cand)
                # Case-insensitive + hyphen-insensitive fallback for mixed-case
                # base62 codes (e.g. user types lowercase of "AbC-DeF").
                for cand in variants:
                    res = await db.execute(
                        select(HeritagePassport).where(
                            func.lower(HeritagePassport.shortcode) == cand.lower()
                        )
                    )
                    row = res.scalar_one_or_none()
                    if row is not None:
                        return _row_to_public(row, cand)
                dehy_lower = shortcode.strip().replace(" ", "").replace("_", "").replace("-", "").lower()
                if dehy_lower:
                    res = await db.execute(
                        select(HeritagePassport).where(
                            func.replace(func.lower(HeritagePassport.shortcode), "-", "")
                            == dehy_lower
                        )
                    )
                    row = res.scalar_one_or_none()
                    if row is not None:
                        return _row_to_public(row, row.shortcode or shortcode)
            except Exception:
                pass  # e.g. shortcode column missing pre-migration; fall through to seeds

        for cand in variants:
            if cand in self._shortcode_index:
                return self._shortcode_index[cand]

        return None


passport_service = PassportService()

