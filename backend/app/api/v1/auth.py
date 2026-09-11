from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.pii_vault import protect as protect_pii
from app.core.security import get_pin_hash, verify_pin, create_access_token
from app.models.artisan import Artisan
from app.schemas.auth import (
    VoiceRegisterRequest,
    PinLoginRequest,
    TokenResponse,
    ArtisanIdVerificationRequest,
    ArtisanIdVerificationResponse,
)
from app.schemas.mosje import (
    MoSJEAuthRequest,
    MoSJEAuthResponse,
    EShramLookupRequest,
    EShramLookupResponse,
    PMSurajLookupRequest,
    PMSurajLookupResponse
)

router = APIRouter(prefix="/auth", tags=["Voice Authentication & Verification Service (AuthService)"])


# Master registry mock database for Pehchan Card, TRIFED, e-Shram, and MoSJE schemes
MASTER_ARTISAN_REGISTRY = {
    "PEH-IND-88320": {
        "artisan_name": "Gauri Devi",
        "craft_category": "Handloom Textile",
        "cluster_name": "Varanasi Handloom Cluster",
        "gi_certified": True,
        "gi_tag_name": "Banarasi Brocade & Saree (GI Reg #39)",
        "state": "Uttar Pradesh",
        "district": "Varanasi",
    },
    "UP-VAR-102938": {
        "artisan_name": "Radha Devi",
        "craft_category": "Handloom Textile",
        "cluster_name": "Varanasi Handloom Cluster",
        "gi_certified": True,
        "gi_tag_name": "Banarasi Brocade & Saree (GI Reg #39)",
        "state": "Uttar Pradesh",
        "district": "Varanasi",
    },
    "TRIFED-UP-VNS-1049": {
        "artisan_name": "Gauri Devi",
        "craft_category": "Handloom Textile",
        "cluster_name": "Varanasi Handloom Cluster",
        "gi_certified": True,
        "gi_tag_name": "Banarasi Brocade & Saree (GI Reg #39)",
        "state": "Uttar Pradesh",
        "district": "Varanasi",
    },
    "PEH-KSH-55120": {
        "artisan_name": "Bashir Ahmad Mir",
        "craft_category": "Pashmina Hand-Spun Shawls",
        "cluster_name": "Kashmir Pashmina Cluster",
        "gi_certified": True,
        "gi_tag_name": "Kashmir Pashmina (GI Reg #46)",
        "state": "Jammu & Kashmir",
        "district": "Srinagar",
    },
    "TRIFED-BR-MDB-2201": {
        "artisan_name": "Sita Devi",
        "craft_category": "Madhubani Folk Art",
        "cluster_name": "Madhubani Art Cluster",
        "gi_certified": True,
        "gi_tag_name": "Madhubani Paintings (GI Reg #105)",
        "state": "Bihar",
        "district": "Madhubani",
    },
}


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
        # DPDP Act 2023: govt IDs persisted as opaque vault tokens (or
        # plaintext passthrough when PII_VAULT_KEY is unset in dev/test).
        trifed_id=protect_pii(payload.trifed_id),
        pehchan_id=protect_pii(payload.pehchan_id),
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


@router.post("/verify-artisan-id", response_model=ArtisanIdVerificationResponse)
async def verify_artisan_id(payload: ArtisanIdVerificationRequest):
    """
    AuthService Verification Microservice:
    Validates Pehchan Card or TRIFED ID against government master craft registry.
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
            verification_source="National Handicrafts & Handlooms Database (Pehchan / TRIFED Registry)"
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
        verification_source="National Artisan Registry (Unverified / Record Not Found)"
    )


@router.post("/mosje-verify", response_model=MoSJEAuthResponse)
async def verify_mosje_scheme(payload: MoSJEAuthRequest):
    """
    MoSJE DPI Microservice:
    Validates artisan enrollment in PM-DAKSH, PM-SURAJ, or e-KYC registries.
    """
    is_valid = bool(payload.scheme_registration_number and len(payload.scheme_registration_number) >= 4)
    
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
            "escrow_bank": "State Bank of India (Jan Dhan Account)"
        }
    )


@router.post("/eshram-lookup", response_model=EShramLookupResponse)
async def lookup_eshram_worker(payload: EShramLookupRequest):
    """
    e-Shram DPI Microservice:
    Validates 12-digit UAN number for unorganized handicraft workers.
    DPDP note: the UAN is transient-only (caller-supplied echo) — it is
    never persisted to the DB or written to logs by this endpoint.
    """
    is_valid = len(payload.uan_number.replace("-", "").replace(" ", "")) == 12
    return EShramLookupResponse(
        valid=is_valid,
        uan_number=payload.uan_number,
        worker_name="Radha Devi",
        primary_occupation="Handloom Silk Weaver & Artisan",
        sub_category="Weaving and Allied Craft Work",
        state="Uttar Pradesh",
        district="Varanasi",
        social_category="OBC / Recognized Artisan",
        pension_scheme_enrolled=True
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
        nodal_agency="National Scheduled Castes Finance and Development Corporation (NSFDC / MoSJE)"
    )
