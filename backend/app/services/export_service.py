import csv
import io
import uuid
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional, Union, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.product import Product
from app.models.artisan import Artisan
from app.models.pricing import ProductPricing
from app.models.passport import HeritagePassport, ChannelExport
from app.core.pii_vault import reveal as reveal_pii


class ExportAdapterService:
    """
    Implements Page 7 One-Tap Multi-Channel Government & Enterprise Export.
    Transforms internal JSON schemas to:
    - GeM (Government e-Marketplace XML / CSV procurement specifications)
    - ONDC (Open Network for Digital Commerce Beckn Protocol JSON schemas)
    - Amazon Karigar / Commercial B2C listing formats
    - Direct B2B institutional procurement catalogs
    """

    def format_for_gem(self, product: Product, artisan: Artisan, pricing: ProductPricing, passport: HeritagePassport) -> Dict[str, Any]:
        """
        GeM (Government e-Marketplace) Product Specification.
        Requires TRIFED / Pehchan ID, GI certificate status, and HSN compliance.
        DPDP: the vault token is detokenized here at the govt-channel display
        boundary only; the result is never logged.
        """
        trifed_display = reveal_pii(artisan.trifed_id)
        return {
            "gem_catalog_version": "3.0",
            "category_code": "HANDLOOM_SAREE_7210",
            "seller_details": {
                "organization_name": f"{artisan.name} Handloom Enterprise",
                "trifed_artisan_id": trifed_display,
                "artisan_state": artisan.state,
                "cluster_location": artisan.cluster_name,
            },
            "product_details": {
                "title": product.title,
                "item_description": product.description,
                "gi_certification_tagged": bool(product.gi_tag_status),
                "gi_tag_number": product.gi_tag_status,
                "country_of_origin": "India",
                "hsn_code": "50072010",
                "unit_of_measurement": "PIECE",
                "base_price_inr": pricing.recommended_price,
            },
            "authenticity_verification": {
                "digital_passport_hash": passport.passport_hash,
                "verification_url": passport.verification_url,
            },
        }

    def format_for_gem_xml(
        self,
        product: Product,
        artisan: Artisan,
        pricing: ProductPricing,
        passport: HeritagePassport,
    ) -> str:
        """
        GeM (Government e-Marketplace) XML Catalog Specification.
        Generates well-formed XML with seller_details, product_details (HSN 50072010),
        and authenticity_verification blocks.
        """
        gem_dict = self.format_for_gem(product, artisan, pricing, passport)
        root = ET.Element("gem_catalog", attrib={"version": str(gem_dict.get("gem_catalog_version", "3.0"))})
        ET.SubElement(root, "category_code").text = str(gem_dict.get("category_code", "HANDLOOM_SAREE_7210"))

        seller_el = ET.SubElement(root, "seller_details")
        for k, v in gem_dict.get("seller_details", {}).items():
            child = ET.SubElement(seller_el, k)
            child.text = str(v) if v is not None else ""

        prod_el = ET.SubElement(root, "product_details")
        ET.SubElement(prod_el, "product_id").text = str(product.id)
        for k, v in gem_dict.get("product_details", {}).items():
            child = ET.SubElement(prod_el, k)
            child.text = str(v) if v is not None else ""

        auth_el = ET.SubElement(root, "authenticity_verification")
        for k, v in gem_dict.get("authenticity_verification", {}).items():
            child = ET.SubElement(auth_el, k)
            child.text = str(v) if v is not None else ""

        return ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")

    def to_gem_csv(
        self,
        product: Union[Product, List[Any]],
        artisan: Optional[Artisan] = None,
        pricing: Optional[ProductPricing] = None,
        passport: Optional[HeritagePassport] = None,
    ) -> str:
        """
        GeM (Government e-Marketplace) CSV Bulk Catalog Generator.
        Generates standard CSV with stable headers and mandatory GeM procurement fields.
        """
        headers = [
            "gem_catalog_version",
            "category_code",
            "organization_name",
            "trifed_artisan_id",
            "artisan_state",
            "cluster_location",
            "product_id",
            "title",
            "item_description",
            "gi_certification_tagged",
            "gi_tag_number",
            "country_of_origin",
            "hsn_code",
            "unit_of_measurement",
            "base_price_inr",
            "digital_passport_hash",
            "verification_url",
        ]

        items = []
        if isinstance(product, list):
            items = product
        elif artisan and pricing and passport:
            items = [(product, artisan, pricing, passport)]
        else:
            raise ValueError("Invalid parameters for to_gem_csv: provide product, artisan, pricing, and passport")

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()

        for item in items:
            if isinstance(item, (tuple, list)):
                p, a, pr, pass_obj = item[0], item[1], item[2], item[3]
            elif isinstance(item, dict):
                p, a, pr, pass_obj = item["product"], item["artisan"], item["pricing"], item["passport"]
            else:
                continue

            gem_dict = self.format_for_gem(p, a, pr, pass_obj)
            seller = gem_dict.get("seller_details", {})
            prod = gem_dict.get("product_details", {})
            auth = gem_dict.get("authenticity_verification", {})

            row = {
                "gem_catalog_version": gem_dict.get("gem_catalog_version", "3.0"),
                "category_code": gem_dict.get("category_code", "HANDLOOM_SAREE_7210"),
                "organization_name": seller.get("organization_name", ""),
                "trifed_artisan_id": seller.get("trifed_artisan_id", ""),
                "artisan_state": seller.get("artisan_state", ""),
                "cluster_location": seller.get("cluster_location", ""),
                "product_id": str(p.id),
                "title": prod.get("title", ""),
                "item_description": prod.get("item_description", ""),
                "gi_certification_tagged": str(prod.get("gi_certification_tagged", False)),
                "gi_tag_number": prod.get("gi_tag_number", ""),
                "country_of_origin": prod.get("country_of_origin", "India"),
                "hsn_code": prod.get("hsn_code", "50072010"),
                "unit_of_measurement": prod.get("unit_of_measurement", "PIECE"),
                "base_price_inr": prod.get("base_price_inr", 0.0),
                "digital_passport_hash": auth.get("digital_passport_hash", ""),
                "verification_url": auth.get("verification_url", ""),
            }
            writer.writerow(row)

        return output.getvalue()


    def format_for_ondc(self, product: Product, artisan: Artisan, pricing: ProductPricing, passport: HeritagePassport) -> Dict[str, Any]:
        """
        ONDC (Open Network for Digital Commerce) Beckn Protocol JSON Schema.
        """
        return {
            "context": {
                "domain": "nic2004:52110",
                "country": "IND",
                "city": "std:0542",
                "action": "on_search",
                "bpp_id": "artifybharat.bpp.ondc.org",
            },
            "message": {
                "catalog": {
                    "bpp/descriptor": {
                        "name": "Artify Bharat Artisan Collective",
                        "symbol": "https://artifybharat.in/assets/logo.png",
                    },
                    "bpp/providers": [
                        {
                            "id": artisan.id,
                            "descriptor": {"name": artisan.name},
                            "items": [
                                {
                                    "id": product.id,
                                    "descriptor": {
                                        "name": product.title,
                                        "long_desc": product.description,
                                        "images": [product.enhanced_image_path or ""],
                                    },
                                    "price": {
                                        "currency": "INR",
                                        "value": str(pricing.recommended_price),
                                    },
                                    "tags": [
                                        {"code": "heritage_passport", "value": passport.passport_hash},
                                        {"code": "gi_status", "value": product.gi_tag_status},
                                        {"code": "cluster", "value": artisan.cluster_name},
                                    ],
                                }
                            ],
                        }
                    ],
                }
            },
        }

    def format_for_b2b(
        self,
        product: Product,
        artisan: Artisan,
        pricing: ProductPricing,
        passport: HeritagePassport,
        min_quantity: int = 10,
        discount_pct: float = 15.0
    ) -> Dict[str, Any]:
        unit_price = pricing.recommended_price
        bulk_price = round(unit_price * (1.0 - (discount_pct / 100.0)), 2)

        return {
            "b2b_catalog_reference": f"B2B-{uuid.uuid4().hex[:8].upper()}",
            "artisan_id": artisan.id,
            "product_id": product.id,
            "title": product.title,
            "min_order_quantity": min_quantity,
            "standard_retail_price": unit_price,
            "bulk_institutional_price": bulk_price,
            "lead_time_days": int(pricing.labor_days * (min_quantity / 2)),
            "passport_hash": passport.passport_hash,
            "quality_assurance": "100% Handcrafted Authenticity Guaranteed with Cryptographic Passport",
        }

    async def export_product(
        self,
        db: AsyncSession,
        product_id: str,
        target_channels: List[str],
        min_b2b_qty: int = 10,
        discount_pct: float = 15.0,
    ) -> List[ChannelExport]:
        stmt = select(Product).where(Product.id == product_id)
        res = await db.execute(stmt)
        product = res.scalar_one_or_none()
        if not product:
            raise ValueError("Product not found")

        artisan = (await db.execute(select(Artisan).where(Artisan.id == product.artisan_id))).scalar_one_or_none()
        if not artisan:
            raise ValueError("Artisan not found")

        pricing = (await db.execute(select(ProductPricing).where(ProductPricing.product_id == product_id))).scalar_one_or_none()
        if not pricing:
            raise ValueError("Pricing not configured for product")

        passport = (await db.execute(select(HeritagePassport).where(HeritagePassport.product_id == product_id))).scalar_one_or_none()
        if not passport:
            raise ValueError("Heritage Passport must be issued before exporting to external channels.")

        exports = []
        for ch in target_channels:
            external_ref = f"{ch.upper()}-{uuid.uuid4().hex[:8].upper()}"
            if ch.lower() == "gem":
                payload = self.format_for_gem(product, artisan, pricing, passport)
            elif ch.lower() == "ondc":
                payload = self.format_for_ondc(product, artisan, pricing, passport)
            elif ch.lower() == "direct_b2b":
                payload = self.format_for_b2b(product, artisan, pricing, passport, min_b2b_qty, discount_pct)
            else:
                payload = {
                    "channel": ch,
                    "title": product.title,
                    "price": pricing.recommended_price,
                    "passport_hash": passport.passport_hash,
                }

            export_entry = ChannelExport(
                product_id=product.id,
                channel=ch,
                external_reference_id=external_ref,
                export_payload=payload,
                sync_status="synced",
            )
            db.add(export_entry)
            exports.append(export_entry)

        product.status = "published"
        await db.commit()
        return exports

    async def lock_inventory_on_sale(
        self,
        db: AsyncSession,
        product_id: str,
        originating_channel: str,
    ) -> Dict[str, Any]:
        """
        Multi-Channel Race Condition Guard (SIH PS 26090):
        When a unique 1-of-1 handcrafted item is purchased on ONDC/GeM/WhatsApp,
        instantly locks inventory and marks listings on all other channels as OUT_OF_STOCK.
        """
        product = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
        if not product:
            raise ValueError(f"Product {product_id} not found")

        product.status = "sold_out"

        exports = (await db.execute(select(ChannelExport).where(ChannelExport.product_id == product_id))).scalars().all()
        broadcasted_channels = []
        for exp in exports:
            if exp.channel.lower() != originating_channel.lower():
                exp.sync_status = "delisted_sold"
                broadcasted_channels.append(exp.channel)

        await db.commit()

        return {
            "product_id": product_id,
            "status": "sold_out",
            "purchased_on": originating_channel,
            "delisted_from_channels": broadcasted_channels,
            "inventory_locked": True,
        }


export_adapter_service = ExportAdapterService()

