from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_pin_hash, verify_pin, create_access_token
from app.models.artisan import Artisan
from app.schemas.auth import VoiceRegisterRequest, PinLoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Voice Authentication & Onboarding"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_artisan(payload: VoiceRegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Page 1: Voice-First Onboarding.
    Registers rural artisan with dialect profile, geo-cluster, and 4-digit security PIN.
    """
    stmt = select(Artisan).where(Artisan.phone == payload.phone)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An artisan with this phone number is already registered. Please log in using your 4-digit PIN."
        )

    artisan = Artisan(
        name=payload.name,
        phone=payload.phone,
        pin_hash=get_pin_hash(payload.pin),
        primary_dialect=payload.primary_dialect,
        state=payload.state,
        district=payload.district,
        cluster_name=payload.cluster_name,
        trifed_id=payload.trifed_id,
        pehchan_id=payload.pehchan_id,
        geo_lat=payload.geo_lat,
        geo_lng=payload.geo_lng,
        is_verified=True,
    )
    db.add(artisan)
    await db.commit()
    await db.refresh(artisan)

    token = create_access_token(subject=artisan.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        artisan_id=artisan.id,
        name=artisan.name,
        phone=artisan.phone,
    )


@router.post("/login", response_model=TokenResponse)
async def login_artisan(payload: PinLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    4-Digit Security PIN Login for registered artisans.
    """
    stmt = select(Artisan).where(Artisan.phone == payload.phone)
    res = await db.execute(stmt)
    artisan = res.scalar_one_or_none()

    if not artisan or not verify_pin(payload.pin, artisan.pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or security PIN."
        )

    token = create_access_token(subject=artisan.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        artisan_id=artisan.id,
        name=artisan.name,
        phone=artisan.phone,
    )
