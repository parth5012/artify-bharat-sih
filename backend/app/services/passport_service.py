import base64
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.product import Product
from app.models.artisan import Artisan
from app.models.pricing import ProductPricing
from app.models.passport import HeritagePassport
from app.core.passport import compute_wip_digest, generate_passport_hash, generate_passport_qr_code
from app.core.pii_vault import reveal as reveal_pii
from app.config import get_settings

settings = get_settings()

def generate_shortcode(hash_str: str) -> str:
    """Generate deterministic 6-character alphanumeric shortcode (e.g., A7X-9B2) from SHA-256 hash."""
    clean = "".join(c.upper() for c in hash_str if c.isalnum())
    if len(clean) < 6:
        clean = clean.ljust(6, "X")
    return f"{clean[0:3]}-{clean[3:6]}"

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
            existing_passport.qr_code_data_uri = qr_data_uri
            existing_passport.verification_url = verification_url
            existing_passport.payload_snapshot = payload_snapshot
            passport = existing_passport
        else:
            passport = HeritagePassport(
                product_id=product_id,
                passport_hash=passport_hash,
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

    def resolve_shortcode(self, shortcode: str) -> Optional[Dict[str, Any]]:
        raw = shortcode.upper().strip().replace(" ", "").replace("_", "")
        if raw in self._shortcode_index:
            return self._shortcode_index[raw]
        
        # Try inserting hyphen for 6-char input (e.g. A7X9B2 -> A7X-9B2)
        if len(raw) == 6 and "-" not in raw:
            hyphenated = f"{raw[:3]}-{raw[3:]}"
            if hyphenated in self._shortcode_index:
                return self._shortcode_index[hyphenated]
                
        # Try stripping hyphen if indexed without
        dehyphenated = raw.replace("-", "")
        if dehyphenated in self._shortcode_index:
            return self._shortcode_index[dehyphenated]

        return None


passport_service = PassportService()

