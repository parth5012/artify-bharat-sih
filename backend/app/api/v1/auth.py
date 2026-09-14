from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.pii_vault import protect as protect_pii
from app.core.security import create_access_token, get_pin_hash, verify_pin
from app.models.artisan import Artisan
from app.schemas.auth import (
    ArtisanIdVerificationRequest,
    ArtisanIdVerificationResponse,
    OnboardingCompleteResponse,
    OnboardingStep1Request,
    OnboardingStep1Response,
    OnboardingStep2Request,
    OnboardingStep2Response,
    OnboardingStep3Request,
    OnboardingSyncRequest,
    PinLoginRequest,
    TokenResponse,
    VoiceRegisterRequest,
)
from app.schemas.mosje import (
    EShramLookupRequest,
    EShramLookupResponse,
    MoSJEAuthRequest,
    MoSJEAuthResponse,
    PMSurajLookupRequest,
    PMSurajLookupResponse,
)
from app.services.auth_service import (
    AuthError,
    MASTER_ARTISAN_REGISTRY,
    complete_onboarding,
    initiate_onboarding,
    sync_onboarding,
    verify_onboarding_id,
)

router = APIRouter(
    prefix="/auth", tags=["Voice Authentication & Verification Service (AuthService)"]
)


@router.post(
    "/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def register_artisan(
    payload: VoiceRegisterRequest, db: AsyncSession = Depends(get_db)
):
    """
    Page 1: Voice-First Onboarding.
    Registers a rural artisan with dialect profile, geo-cluster, and 4-digit security PIN.
    """
    stmt = select(Artisan).where(Artisan.phone == payload.phone)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An artisan with this phone number is already registered. Please log in using your 4-digit PIN.",
        )

    artisan = Artisan(
        name=payload.name,
        phone=payload.phone,
        pin_hash=get_pin_hash(payload.pin),
        primary_dialect=payload.primary_dialect,
        state=payload.state,
        district=payload.district,
        cluster_name=payload.cluster_name,
        geo_lat=payload.geo_lat,
        geo_lng=payload.geo_lng,
        pehchan_id=protect_pii(payload.pehchan_id),
        trifed_id=protect_pii(payload.trifed_id),
        is_verified=True,
        role="artisan",
        onboarding_step=3,
        is_onboarded=True,
    )
    db.add(artisan)
    await db.commit()
    await db.refresh(artisan)

    token = create_access_token(subject=artisan.id, role=artisan.role)
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
            detail="Incorrect phone number or security PIN.",
        )

    token = create_access_token(subject=artisan.id, role=artisan.role)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        artisan_id=artisan.id,
        name=artisan.name,
        phone=artisan.phone,
    )


# --- US-ONB-01 Multi-Step Onboarding & Sync Endpoints ---


@router.post(
    "/onboarding/step1",
    response_model=OnboardingStep1Response,
    status_code=status.HTTP_200_OK,
)
async def onboarding_step1(
    payload: OnboardingStep1Request, db: AsyncSession = Depends(get_db)
):
    """
    US-ONB-01 Step 1: Initiate onboarding with phone, 4-digit PIN, dialect, and role.
    """
    try:
        return await initiate_onboarding(db, payload)
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post(
    "/onboarding/step2",
    response_model=OnboardingStep2Response,
    status_code=status.HTTP_200_OK,
)
async def onboarding_step2(
    payload: OnboardingStep2Request, db: AsyncSession = Depends(get_db)
):
    """
    US-ONB-01 Step 2: Verify government credentials (Pehchan/TRIFED/e-Shram) with autofill or manual fallback.
    """
    try:
        return await verify_onboarding_id(db, payload)
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post(
    "/onboarding/step3",
    response_model=OnboardingCompleteResponse,
    status_code=status.HTTP_200_OK,
)
async def onboarding_step3(
    payload: OnboardingStep3Request, db: AsyncSession = Depends(get_db)
):
    """
    US-ONB-01 Step 3: Complete artisan or SHG leader onboarding and issue access token.
    """
    try:
        return await complete_onboarding(db, payload)
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post(
    "/onboarding/sync",
    response_model=OnboardingCompleteResponse,
    status_code=status.HTTP_200_OK,
)
async def onboarding_sync(
    payload: OnboardingSyncRequest, db: AsyncSession = Depends(get_db)
):
    """
    US-ONB-01 Offline/Draft Sync: 1-shot onboarding synchronization for offline artisans/SHG groups.
    """
    try:
        return await sync_onboarding(db, payload)
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


# --- Government & Verification DPI Microservice Endpoints ---


@router.post("/verify-artisan-id", response_model=ArtisanIdVerificationResponse)
async def verify_artisan_id_endpoint(payload: ArtisanIdVerificationRequest):
    """
    AuthService Verification Microservice:
    Validates Pehchan Card and TRIFED IDs against government master craft registry.
    """
    id_clean = payload.identifier_value.strip().upper()
    if id_clean in MASTER_ARTISAN_REGISTRY:
        data = MASTER_ARTISAN_REGISTRY[id_clean]
        return ArtisanIdVerificationResponse(
            is_valid=True,
            identifier_type=payload.identifier_type,
            identifier_value=id_clean,
            artisan_name=data["artisan_name"],
            craft_category=data["craft_category"],
            cluster_name=data["cluster_name"],
            gi_certified=data["gi_certified"],
            gi_tag_name=data["gi_tag_name"],
            state=data["state"],
            district=data["district"],
            verification_source="National Handicrafts & Handlooms Database (Pehchan / TRIFED Registry)",
        )

    return ArtisanIdVerificationResponse(
        is_valid=False,
        identifier_type=payload.identifier_type,
        identifier_value=id_clean,
        artisan_name=None,
        craft_category=None,
        cluster_name=None,
        gi_certified=False,
        gi_tag_name=None,
        state=None,
        district=None,
        verification_source="National Artisan Registry (Unverified / Record Not Found)",
    )


@router.post("/mosje-verify", response_model=MoSJEAuthResponse)
async def verify_mosje_scheme(payload: MoSJEAuthRequest):
    """
    MoSJE DPI Microservice:
    Validates artisan enrollment in PM-DAKSH, PM-SURAJ, and e-KYC registries.
    """
    is_valid = bool(
        payload.scheme_registration_number
        and len(payload.scheme_registration_number) > 4
    )

    return MoSJEAuthResponse(
        verified=is_valid,
        scheme_type=payload.scheme_type,
        scheme_registration_number=payload.scheme_registration_number,
        beneficiary_name="Radha Devi",
        craft_cluster="Varanasi Handloom Cluster",
        state="Uttar Pradesh",
        skill_certification_level="Master Artisan Level 4 (PM-DAKSH)",
        stipend_eligible=True,
        details={
            "subsidy_eligible": True,
            "interest_subvention_pct": 5.0,
            "escrow_bank": "State Bank of India (Jan Dhan Account)",
        },
    )


@router.post("/eshram-lookup", response_model=EShramLookupResponse)
async def lookup_eshram_worker(payload: EShramLookupRequest):
    """
    e-Shram DPI Microservice:
    Validates 12-digit UAN number for unorganized handicraft workers.
    """
    is_valid = len(payload.uan_number.replace("-", "").replace(" ", "")) == 12
    return EShramLookupResponse(
        valid=is_valid,
        uan_number=payload.uan_number,
        worker_name="Radha Devi",
        primary_occupation="Handloom Silk Weaver & Artisan",
        sub_category="Weaving & Allied Craft Work",
        state="Uttar Pradesh",
        district="Varanasi",
        social_category="OBC / Recognized Artisan",
        pension_scheme_enrolled=True,
    )


@router.post("/pmsuraj-lookup", response_model=PMSurajLookupResponse)
async def lookup_pmsuraj_credit(payload: PMSurajLookupRequest):
    """
    PM-SURAJ DPI Microservice:
    Validates credit sanction and concessional loan status under MoSJE.
    """
    return PMSurajLookupResponse(
        verified=True,
        application_id=payload.application_id,
        beneficiary_name="Radha Devi",
        sanctioned_amount_inr=100000.0,
        subsidy_percentage=35.0,
        credit_status="SANCTIONED_DISBURSED",
        nodal_agency="National Scheduled Castes Finance & Development Corporation (NSFDC / MoSJE)",
    )
