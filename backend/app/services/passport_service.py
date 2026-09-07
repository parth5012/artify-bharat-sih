from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.product import Product
from app.models.artisan import Artisan
from app.models.pricing import ProductPricing
from app.models.passport import HeritagePassport
from app.core.passport import generate_passport_hash, generate_passport_qr_code
from app.config import get_settings

settings = get_settings()


class PassportService:
    """
    Implements Page 6 Cryptographic Verification & Heritage Passport Generation
    and Buyer Journey Steps 1-3 (Trust Verification & Cost Transparency).
    """

    async def issue_passport(self, db: AsyncSession, product_id: str) -> HeritagePassport:
        # Fetch Product, Artisan, Pricing
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
        timestamp_now = datetime.now(timezone.utc).isoformat()

        # Generate deterministic SHA-256 hash
        passport_hash = generate_passport_hash(
            artisan_id=artisan.id,
            trifed_id=artisan.trifed_id,
            geo_lat=artisan.geo_lat,
            geo_lng=artisan.geo_lng,
            product_title=product.title,
            craft_category=product.craft_category,
            timestamp_iso=timestamp_now,
            raw_material_cost=raw_cost,
            labor_days=labor_days,
        )

        qr_data_uri = generate_passport_qr_code(passport_hash)
        verification_url = f"{settings.PASSPORT_VERIFICATION_BASE_URL}/{passport_hash}"

        payload_snapshot = {
            "artisan": {
                "name": artisan.name,
                "cluster": artisan.cluster_name,
                "district": artisan.district,
                "state": artisan.state,
                "trifed_id": artisan.trifed_id,
                "pehchan_id": artisan.pehchan_id,
                "geo_lat": artisan.geo_lat,
                "geo_lng": artisan.geo_lng,
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
                "final_price": pricing.final_price if pricing else 4500.0,
            },
            "hash": passport_hash,
            "issued_at": timestamp_now,
        }

        # Check existing passport
        existing_passport_res = await db.execute(
            select(HeritagePassport).where(HeritagePassport.product_id == product_id)
        )
        existing_passport = existing_passport_res.scalar_one_or_none()

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
        """
        Public verification lookup for buyers and procurement officers.
        """
        stmt = select(HeritagePassport).where(HeritagePassport.passport_hash == passport_hash)
        res = await db.execute(stmt)
        passport = res.scalar_one_or_none()
        if not passport:
            return None

        data = passport.payload_snapshot
        return {
            "passport_hash": passport.passport_hash,
            "is_authentic": True,
            "product_title": data["product"]["title"],
            "craft_category": data["product"]["craft_category"],
            "gi_tag_status": data["product"]["gi_tag_status"],
            "artisan_name": data["artisan"]["name"],
            "cluster_name": data["artisan"]["cluster"],
            "state": data["artisan"]["state"],
            "district": data["artisan"]["district"],
            "trifed_id": data["artisan"]["trifed_id"],
            "pehchan_id": data["artisan"]["pehchan_id"],
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
                "calculated_fair_wage": data["pricing"]["calculated_fair_wage"],
                "artisan_net_profit": data["pricing"]["artisan_net_profit"],
                "total_suggested_price": data["pricing"]["final_price"],
            },
            "issued_at": passport.issued_at,
        }


passport_service = PassportService()
