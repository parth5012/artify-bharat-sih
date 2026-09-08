from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.passport_service import passport_service
from app.schemas.passport import PassportIssueRequest, HeritagePassportResponse, PublicPassportVerification

router = APIRouter(prefix="/passport", tags=["Heritage Passport & Verification"])


@router.post("/issue", response_model=HeritagePassportResponse)
async def issue_heritage_passport(payload: PassportIssueRequest, db: AsyncSession = Depends(get_db)):
    """
    Page 6: Verification & Heritage Passport Generation.
    Computes cryptographic SHA-256 hash combining artisan credentials, geo-cluster,
    product payload, and timestamp.
    Generates QR code encoding public verification link.
    """
    try:
        passport = await passport_service.issue_passport(db, payload.product_id)
        return HeritagePassportResponse(
            product_id=passport.product_id,
            passport_hash=passport.passport_hash,
            qr_code_data_uri=passport.qr_code_data_uri,
            verification_url=passport.verification_url,
            issued_at=passport.issued_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/verify/{passport_hash}", response_model=PublicPassportVerification)
async def verify_heritage_passport(passport_hash: str, db: AsyncSession = Depends(get_db)):
    """
    Buyer Journey Steps 1-3: Public Heritage Passport Verification Portal.
    Verifies authenticity backed by SHA-256 hash or 6-character shortcode.
    Displays:
    - Artisan government credentials (TRIFED / Pehchan ID / MoSJE)
    - Geographical Indication (GI) status
    - Voice story audio
    - Transparent Financial Cost Breakdown (Raw materials + Fair wage + Artisan profit)
    """
    verification_data = await passport_service.verify_passport(db, passport_hash)
    if not verification_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Heritage Passport hash could not be verified. This product cannot be validated as an authentic GI craft."
        )

    return PublicPassportVerification(**verification_data)


@router.get("/code/{shortcode}", response_model=PublicPassportVerification)
async def resolve_passport_shortcode(shortcode: str, db: AsyncSession = Depends(get_db)):
    """
    Resolves human-readable 6-character shortcode (e.g., A7X-9B2) to full digital passport.
    """
    data = passport_service.resolve_shortcode(shortcode)
    if not data:
        # Fallback to general verify
        data = await passport_service.verify_passport(db, shortcode)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shortcode {shortcode} not found or expired."
        )
    return PublicPassportVerification(**data)
