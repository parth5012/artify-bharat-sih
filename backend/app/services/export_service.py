import csv
import io
import uuid
import xml.etree.ElementTree as ET
from urllib.parse import quote
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


    def validate_ondc_beckn_schema(self, payload: Dict[str, Any]) -> bool:
        """
        Validates ONDC Beckn Protocol v1.0 on_search catalog response shape.
        Rejects missing context, wrong currency, missing providers/items, or missing passport tag.
        """
        if not isinstance(payload, dict):
            raise ValueError("ONDC Beckn schema validation failed: payload must be a JSON object")

        context = payload.get("context")
        if not isinstance(context, dict):
            raise ValueError("ONDC Beckn schema validation failed: missing 'context' block")

        for req_field in ("domain", "country", "city", "action", "bpp_id"):
            if not context.get(req_field):
                raise ValueError(f"ONDC Beckn schema validation failed: context missing '{req_field}'")

        if context.get("country") != "IND":
            raise ValueError("ONDC Beckn schema validation failed: country must be 'IND'")

        if context.get("action") != "on_search":
            raise ValueError("ONDC Beckn schema validation failed: action must be 'on_search'")

        message = payload.get("message")
        if not isinstance(message, dict):
            raise ValueError("ONDC Beckn schema validation failed: missing 'message' block")

        catalog = message.get("catalog")
        if not isinstance(catalog, dict):
            raise ValueError("ONDC Beckn schema validation failed: missing 'catalog' block")

        providers = catalog.get("bpp/providers")
        if not isinstance(providers, list) or len(providers) == 0:
            raise ValueError("ONDC Beckn schema validation failed: catalog must have non-empty 'bpp/providers'")

        for prov in providers:
            if not prov.get("id"):
                raise ValueError("ONDC Beckn schema validation failed: provider missing 'id'")
            items = prov.get("items")
            if not isinstance(items, list) or len(items) == 0:
                raise ValueError("ONDC Beckn schema validation failed: provider must have non-empty 'items'")

            for item in items:
                if not item.get("id"):
                    raise ValueError("ONDC Beckn schema validation failed: item missing 'id'")
                price = item.get("price")
                if not isinstance(price, dict):
                    raise ValueError("ONDC Beckn schema validation failed: item missing 'price'")
                if price.get("currency") != "INR":
                    raise ValueError("ONDC Beckn schema validation failed: price currency must be INR")
                if not price.get("value"):
                    raise ValueError("ONDC Beckn schema validation failed: price missing 'value'")

                tags = item.get("tags")
                if not isinstance(tags, list):
                    raise ValueError("ONDC Beckn schema validation failed: item missing 'tags'")

                tag_map = {t.get("code"): t.get("value") for t in tags if isinstance(t, dict)}
                if "heritage_passport" not in tag_map or not tag_map.get("heritage_passport"):
                    raise ValueError("ONDC Beckn schema validation failed: item missing 'heritage_passport' tag")

        return True

    def format_for_ondc(
        self,
        product: Product,
        artisan: Artisan,
        pricing: ProductPricing,
        passport: HeritagePassport,
    ) -> Dict[str, Any]:
        """
        ONDC (Open Network for Digital Commerce) Beckn Protocol JSON Schema.
        Validates input entities and returns verified Beckn v1.0 catalog payload.
        """
        if not product or not artisan or not pricing or not passport:
            raise ValueError("All entities (product, artisan, pricing, passport) are required for ONDC export")

        if not passport.passport_hash:
            raise ValueError("Heritage Passport must have a valid passport_hash for ONDC export")

        if pricing.recommended_price is None:
            raise ValueError("Pricing must have recommended_price for ONDC export")

        payload = {
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
                            "id": str(artisan.id),
                            "descriptor": {"name": artisan.name},
                            "items": [
                                {
                                    "id": str(product.id),
                                    "descriptor": {
                                        "name": product.title,
                                        "long_desc": product.description or "",
                                        "images": [product.enhanced_image_path or ""],
                                    },
                                    "price": {
                                        "currency": "INR",
                                        "value": str(pricing.recommended_price),
                                    },
                                    "tags": [
                                        {"code": "heritage_passport", "value": passport.passport_hash},
                                        {"code": "gi_status", "value": product.gi_tag_status or ""},
                                        {"code": "cluster", "value": artisan.cluster_name or ""},
                                    ],
                                }
                            ],
                        }
                    ],
                }
            },
        }

        self.validate_ondc_beckn_schema(payload)
        return payload

    def format_for_whatsapp(
        self,
        product: Product,
        artisan: Artisan,
        pricing: ProductPricing,
        passport: HeritagePassport,
        upi_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        WhatsApp Cloud API interactive catalog card payload generator.
        Creates an interactive CTA card with product image, fair price,
        cryptographic shortcode, verification URL, and direct UPI payment deep-link.
        """
        if not product or not artisan or not pricing or not passport:
            raise ValueError("All entities (product, artisan, pricing, passport) are required for WhatsApp export")

        shortcode = passport.shortcode or passport.passport_hash[:6].upper()
        verification_url = passport.verification_url or f"https://artifybharat.in/verify/{shortcode}"
        image_url = product.enhanced_image_path or "https://artifybharat.in/assets/craft-placeholder.png"

        target_upi = upi_id or getattr(artisan, "upi_id", None) or f"{artisan.phone}@upi"
        artisan_encoded = quote(artisan.name or "Artisan")
        title_encoded = quote(product.title[:20] if product.title else "Handcrafted")
        upi_payment_link = (
            f"upi://pay?pa={target_upi}&pn={artisan_encoded}"
            f"&am={pricing.recommended_price:.2f}&cu=INR"
            f"&tn={title_encoded}-{shortcode}"
        )

        body_text = (
            f"*{product.title}*\n"
            f"Crafted by: {artisan.name} ({artisan.cluster_name or artisan.state or 'India'})\n"
            f"Fair-Wage Price: ₹{pricing.recommended_price:.2f}\n"
            f"Provenance: {product.gi_tag_status or 'Authentic Artisan Craft'}\n"
            f"Cryptographic Shortcode: {shortcode}\n"
            f"Verify authenticity: {verification_url}"
        )

        return {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "type": "interactive",
            "interactive": {
                "type": "cta_url",
                "header": {
                    "type": "image",
                    "image": {
                        "link": image_url,
                    },
                },
                "body": {
                    "text": body_text,
                },
                "footer": {
                    "text": f"ArtifyBharat Digital Heritage Passport #{shortcode}",
                },
                "action": {
                    "name": "cta_url",
                    "parameters": {
                        "display_text": "Verify & Buy",
                        "url": verification_url,
                    },
                },
            },
            "metadata": {
                "digital_passport_hash": passport.passport_hash,
                "shortcode": shortcode,
                "verification_url": verification_url,
                "upi_payment_link": upi_payment_link,
                "base_price_inr": pricing.recommended_price,
                "currency": "INR",
                "product_id": str(product.id),
                "artisan_id": str(artisan.id),
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
            "quality_assurance": "100% Handcrafted Authenticity Guaranteed Cryptographic Passport",
        }

    def format_for_shg_csv(
        self,
        product: Product,
        artisan: Artisan,
        pricing: ProductPricing,
        passport: HeritagePassport,
        min_quantity: int = 10,
        discount_pct: float = 15.0,
    ) -> Dict[str, Any]:
        """
        Self Help Group (SHG) bulk wholesale pricing format.
        Calculates tiered volume pricing, lot price, lead time, and cryptographic authenticity fields.
        """
        if not product or not artisan or not pricing or not passport:
            raise ValueError("All entities (product, artisan, pricing, passport) are required for SHG export")

        unit_price = pricing.recommended_price
        bulk_unit_price = round(unit_price * (1.0 - (discount_pct / 100.0)), 2)
        total_lot_price = round(bulk_unit_price * min_quantity, 2)
        lead_time_days = int(pricing.labor_days * max(1.0, min_quantity / 2.0))
        shortcode = passport.shortcode or passport.passport_hash[:6].upper()
        state_code = artisan.state[:2].upper() if artisan.state else "IN"
        shg_catalog_code = f"SHG-{state_code}-{uuid.uuid4().hex[:6].upper()}"

        return {
            "shg_catalog_code": shg_catalog_code,
            "artisan_id": str(artisan.id),
            "artisan_name": artisan.name,
            "cluster_name": artisan.cluster_name or "",
            "product_id": str(product.id),
            "title": product.title,
            "craft_category": product.craft_category or "handloom",
            "standard_retail_price_inr": unit_price,
            "minimum_wholesale_quantity": min_quantity,
            "wholesale_discount_percentage": discount_pct,
            "wholesale_unit_price_inr": bulk_unit_price,
            "total_lot_price_inr": total_lot_price,
            "production_lead_time_days": lead_time_days,
            "digital_passport_hash": passport.passport_hash,
            "verification_url": passport.verification_url,
            "shortcode": shortcode,
        }

    def to_shg_csv(
        self,
        product: Union[Product, List[Any]],
        artisan: Optional[Artisan] = None,
        pricing: Optional[ProductPricing] = None,
        passport: Optional[HeritagePassport] = None,
        min_quantity: int = 10,
        discount_pct: float = 15.0,
    ) -> str:
        """
        Generates RFC-4180 compliant CSV string for SHG bulk wholesale catalog.
        """
        headers = [
            "shg_catalog_code",
            "artisan_id",
            "artisan_name",
            "cluster_name",
            "product_id",
            "title",
            "craft_category",
            "standard_retail_price_inr",
            "minimum_wholesale_quantity",
            "wholesale_discount_percentage",
            "wholesale_unit_price_inr",
            "total_lot_price_inr",
            "production_lead_time_days",
            "digital_passport_hash",
            "verification_url",
            "shortcode",
        ]

        items = []
        if isinstance(product, list):
            items = product
        elif artisan and pricing and passport:
            items = [(product, artisan, pricing, passport, min_quantity, discount_pct)]
        else:
            raise ValueError("Invalid parameters for to_shg_csv: provide product, artisan, pricing, and passport")

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()

        for item in items:
            if isinstance(item, (tuple, list)):
                p = item[0]
                a = item[1]
                pr = item[2]
                pass_obj = item[3]
                mq = item[4] if len(item) > 4 else min_quantity
                dp = item[5] if len(item) > 5 else discount_pct
                row = self.format_for_shg_csv(p, a, pr, pass_obj, min_quantity=mq, discount_pct=dp)
            elif isinstance(item, dict):
                if "shg_catalog_code" in item:
                    row = item
                else:
                    row = self.format_for_shg_csv(
                        item["product"],
                        item["artisan"],
                        item["pricing"],
                        item["passport"],
                        min_quantity=item.get("min_quantity", min_quantity),
                        discount_pct=item.get("discount_pct", discount_pct),
                    )
            else:
                continue

            writer.writerow(row)

        return output.getvalue()


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
            elif ch.lower() in ("gem_xml", "gem-xml"):
                xml_content = self.format_for_gem_xml(product, artisan, pricing, passport)
                payload = {
                    "xml_content": xml_content,
                    "catalog_format": "XML",
                    "hsn_code": "50072010",
                    "passport_hash": passport.passport_hash,
                    "verification_url": passport.verification_url,
                }
            elif ch.lower() in ("gem_csv", "gem-csv"):
                csv_content = self.to_gem_csv(product, artisan, pricing, passport)
                payload = {
                    "csv_content": csv_content,
                    "catalog_format": "CSV",
                    "hsn_code": "50072010",
                    "passport_hash": passport.passport_hash,
                    "verification_url": passport.verification_url,
                }
            elif ch.lower() == "ondc":
                payload = self.format_for_ondc(product, artisan, pricing, passport)
            elif ch.lower() in ("whatsapp", "whatsapp_card", "whatsapp_cloud"):
                payload = self.format_for_whatsapp(product, artisan, pricing, passport)
            elif ch.lower() in ("shg_bulk", "shg", "shg_wholesale"):
                payload = self.format_for_shg_csv(product, artisan, pricing, passport, min_b2b_qty, discount_pct)
                payload["csv_content"] = self.to_shg_csv(product, artisan, pricing, passport, min_b2b_qty, discount_pct)
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

