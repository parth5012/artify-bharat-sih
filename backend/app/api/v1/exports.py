from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.export_service import export_adapter_service
from app.schemas.export import (
    ExportChannelRequest,
    ExportChannelResponse,
    ChannelExportResult,
)

router = APIRouter(prefix="/exports", tags=["One-Tap Multi-Channel Government Export"])


@router.post("/sync", response_model=ExportChannelResponse)
async def export_product_to_channels(
    payload: ExportChannelRequest, db: AsyncSession = Depends(get_db)
):
    """
    Page 7: One-Tap Multi-Channel Government Export.
    Adapts internal product specification into compliant schema payloads for:
    - GeM (Government e-Marketplace procurement schema)
    - ONDC (Open Network for Digital Commerce Beckn Protocol)
    - Amazon Karigar & Direct B2B institutional procurement
    """
    try:
        exports = await export_adapter_service.export_product(
            db=db,
            product_id=payload.product_id,
            target_channels=payload.target_channels,
            min_b2b_qty=payload.b2b_bulk_min_quantity or 10,
            discount_pct=payload.b2b_bulk_discount_percentage or 15.0,
        )

        results = []
        passport_hash = ""
        for exp in exports:
            ch_lower = exp.channel.lower()
            if "xml" in ch_lower or ch_lower == "gem":
                fmt = "XML"
            elif "csv" in ch_lower or "shg" in ch_lower:
                fmt = "CSV"
            elif ch_lower == "ondc":
                fmt = "JSON_BECKN"
            elif "whatsapp" in ch_lower:
                fmt = "WHATSAPP_INTERACTIVE"
            else:
                fmt = "REST_API"

            p_hash = (
                exp.export_payload.get("authenticity_verification", {}).get(
                    "digital_passport_hash"
                )
                or exp.export_payload.get("metadata", {}).get("digital_passport_hash")
                or exp.export_payload.get("passport_hash", "")
            )
            if p_hash:
                passport_hash = p_hash

            results.append(
                ChannelExportResult(
                    channel=exp.channel,
                    status=exp.sync_status,
                    external_reference_id=exp.external_reference_id or "",
                    format=fmt,
                    details={"synced_records": 1, "target": exp.channel},
                )
            )

        return ExportChannelResponse(
            product_id=payload.product_id,
            passport_hash=passport_hash,
            results=results,
            message=f"Successfully exported product to {len(results)} external procurement channels.",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
