"""
AuthService for PIN/JWT auth, multi-step artisan onboarding (US-ONB-01),
offline draft synchronization, and government e-KYC lookups.
Government API calls are wrapped with a hackathon sandbox fallback.
PII is encrypted using PIIVault.protect (AES-256-GCM).
"""

from __future__ import annotations

import hashlib
from typing import Optional, cast

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.pii_vault import protect as protect_pii, reveal as reveal_pii
from app.core.security import create_access_token, decode_access_token, get_pin_hash, verify_pin
from app.models.artisan import Artisan
from app.schemas.auth import (
    ArtisanIdVerificationResponse,
    OnboardingCompleteResponse,
    OnboardingStep1Request,
    OnboardingStep1Response,
    OnboardingStep2Request,
    OnboardingStep2Response,
    OnboardingStep3Request,
    OnboardingSyncRequest,
    RegisterRequest,
)
from app.schemas.mosje import (
    EShramLookupResponse,
    MoSJEAuthResponse,
    PMSurajLookupResponse,
)

hash_pin = get_pin_hash

# Aliases for backward compatibility with older services
ArtisanIdVerifyResponse = ArtisanIdVerificationResponse
MosjeVerifyResponse = MoSJEAuthResponse
EshramLookupResponse = EShramLookupResponse
PmSurajLookupResponse = PMSurajLookupResponse

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
    "123456789012": {
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


class AuthError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


async def _safe_govt_call(url: str, payload: dict) -> dict | None:
    """Best-effort call to government API; returns None on any failure so caller falls back to sandbox."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return None


async def register_artisan(db: AsyncSession, req: RegisterRequest) -> Artisan:
    existing = await db.execute(select(Artisan).where(Artisan.phone == req.phone))
    if existing.scalar_one_or_none() is not None:
        raise AuthError("Phone number already registered", 409)

    pehchan_val = (
        cast(str, protect_pii(req.pehchan_id))
        if getattr(req, "pehchan_id", None)
        else None
    )
    trifed_val = (
        cast(str, protect_pii(req.trifed_id))
        if getattr(req, "trifed_id", None)
        else None
    )

    artisan = Artisan(
        name=req.name,
        phone=req.phone,
        pin_hash=get_pin_hash(req.pin),
        role=getattr(req, "role", "artisan"),
        primary_dialect=req.primary_dialect,
        pehchan_id=pehchan_val,
        trifed_id=trifed_val,
        cluster_name=getattr(req, "cluster_name", "Varanasi Handloom Cluster"),
        state=getattr(req, "state", "Uttar Pradesh"),
        district=getattr(req, "district", "Varanasi"),
        is_onboarded=True,
        onboarding_step=3,
    )
    db.add(artisan)
    await db.commit()
    await db.refresh(artisan)
    return artisan


async def authenticate(db: AsyncSession, phone: str, pin: str) -> Artisan:
    result = await db.execute(select(Artisan).where(Artisan.phone == phone))
    artisan = result.scalar_one_or_none()
    if artisan is None or not verify_pin(pin, artisan.pin_hash):
        raise AuthError("Invalid phone or PIN", 401)
    return artisan


def issue_token(artisan: Artisan) -> str:
    return create_access_token(subject=artisan.id, role=artisan.role)


# --- US-ONB-01 Multi-Step Onboarding Implementation ---


async def initiate_onboarding(
    db: AsyncSession, req: OnboardingStep1Request
) -> OnboardingStep1Response:
    """Step 1: Record phone, pin, dialect, and role. Initialize un-onboarded artisan record."""
    stmt = select(Artisan).where(Artisan.phone == req.phone)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing is not None:
        raise AuthError(
            "Phone number already registered. Please log in using your 4-digit PIN.",
            400,
        )

    artisan = Artisan(
        phone=req.phone,
        pin_hash=get_pin_hash(req.pin),
        primary_dialect=req.dialect,
        role=req.role,
        onboarding_step=1,
        is_onboarded=False,
        name="",
    )
    db.add(artisan)
    await db.commit()
    await db.refresh(artisan)

    session_token = create_access_token(subject=artisan.id, role=artisan.role)
    return OnboardingStep1Response(
        session_token=session_token,
        artisan_id=artisan.id,
        phone=artisan.phone,
        role=artisan.role,
        dialect=artisan.primary_dialect,
        next_step=2,
        message="Step 1 initiated successfully.",
    )


async def verify_onboarding_id(
    db: AsyncSession, req: OnboardingStep2Request, session_token: Optional[str] = None
) -> OnboardingStep2Response:
    """Step 2: Verify government credentials (Pehchan/TRIFED/e-Shram) with autofill or manual fallback."""
    stmt = select(Artisan).where(Artisan.id == req.artisan_id)
    res = await db.execute(stmt)
    artisan = res.scalar_one_or_none()
    if not artisan:
        raise AuthError("Artisan not found", 404)

    if artisan.is_onboarded:
        raise AuthError("Artisan is already onboarded. Please log in with PIN.", 400)

    token = session_token or req.session_token
    if token:
        payload = decode_access_token(token)
        if not payload or payload.get("sub") != req.artisan_id:
            raise AuthError("Invalid or expired session token for this artisan ID", 401)

    id_type = (
        req.id_type.value if hasattr(req.id_type, "value") else str(req.id_type).lower()
    )
    verified = False
    cluster_name = (
        req.manual_cluster or artisan.cluster_name or "Varanasi Handloom Cluster"
    )
    state = req.manual_state or artisan.state or "Uttar Pradesh"
    district = req.manual_district or artisan.district or "Varanasi"
    message = "Location details saved."

    if id_type == "pehchan":
        if not req.id_number or not req.id_number.strip():
            raise AuthError("Pehchan ID number is required", 400)
        clean_id = req.id_number.strip().upper()
        artisan.pehchan_id = cast(str, protect_pii(clean_id))
        if clean_id in MASTER_ARTISAN_REGISTRY:
            reg = MASTER_ARTISAN_REGISTRY[clean_id]
            verified = True
            cluster_name = reg["cluster_name"]
            state = reg["state"]
            district = reg["district"]
            message = f"Pehchan ID verified: {reg.get('gi_tag_name', 'GI Certified')}"
        else:
            verified = False
            message = "Pehchan ID not found in registry. Using manual location details."

    elif id_type == "trifed":
        if not req.id_number or not req.id_number.strip():
            raise AuthError("TRIFED ID number is required", 400)
        clean_id = req.id_number.strip().upper()
        artisan.trifed_id = cast(str, protect_pii(clean_id))
        if clean_id in MASTER_ARTISAN_REGISTRY:
            reg = MASTER_ARTISAN_REGISTRY[clean_id]
            verified = True
            cluster_name = reg["cluster_name"]
            state = reg["state"]
            district = reg["district"]
            message = f"TRIFED ID verified for {reg['artisan_name']}."
        else:
            verified = False
            message = "TRIFED ID not found in registry. Using manual location details."

    elif id_type == "eshram":
        if not req.id_number or not req.id_number.strip():
            raise AuthError("e-Shram UAN is required", 400)
        uan_clean = req.id_number.replace("-", "").replace(" ", "").strip()
        artisan.eshram_uan = cast(str, protect_pii(uan_clean))
        is_valid = len(uan_clean) == 12 and uan_clean.isdigit()
        raw_id = req.id_number.strip().upper()
        if not is_valid and raw_id not in MASTER_ARTISAN_REGISTRY:
            verified = False
            message = "Invalid e-Shram UAN format. Using manual location details."
        elif uan_clean in MASTER_ARTISAN_REGISTRY or raw_id in MASTER_ARTISAN_REGISTRY:
            reg = MASTER_ARTISAN_REGISTRY.get(uan_clean) or MASTER_ARTISAN_REGISTRY.get(raw_id)
            if reg:
                verified = True
                cluster_name = reg["cluster_name"]
                state = reg["state"]
                district = reg["district"]
                message = f"e-Shram verified: {reg.get('gi_tag_name', 'GI Certified')}"
        else:
            verified = False
            message = "e-Shram UAN format valid. Verification pending official registry match. Using manual location details."

    elif id_type == "none":
        verified = False
        message = "Manual location saved successfully."

    artisan.state = state
    artisan.district = district
    artisan.cluster_name = cluster_name
    artisan.is_verified = verified
    artisan.onboarding_step = max(artisan.onboarding_step, 2)
    await db.commit()
    await db.refresh(artisan)

    return OnboardingStep2Response(
        artisan_id=artisan.id,
        id_type=id_type,
        verified=verified,
        cluster_name=artisan.cluster_name,
        state=artisan.state,
        district=artisan.district,
        next_step=3,
        message=message,
    )


async def complete_onboarding(
    db: AsyncSession, req: OnboardingStep3Request, session_token: Optional[str] = None
) -> OnboardingCompleteResponse:
    """Step 3: Save artisan/leader name, craft/SHG info, finalize onboarding."""
    stmt = select(Artisan).where(Artisan.id == req.artisan_id)
    res = await db.execute(stmt)
    artisan = res.scalar_one_or_none()
    if not artisan:
        raise AuthError("Artisan not found", 404)

    if artisan.is_onboarded:
        raise AuthError("Artisan is already onboarded. Please log in with PIN.", 400)

    token = session_token or req.session_token
    if token:
        payload = decode_access_token(token)
        if not payload or payload.get("sub") != req.artisan_id:
            raise AuthError("Invalid or expired session token for this artisan ID", 401)

    artisan.name = req.name
    if req.shg_group_name:
        artisan.shg_group_name = req.shg_group_name
    if req.shg_member_count is not None:
        artisan.shg_member_count = req.shg_member_count
    if req.shg_group_name and artisan.role == "artisan":
        artisan.role = "shg_leader"

    artisan.onboarding_step = 3
    artisan.is_onboarded = True

    await db.commit()
    await db.refresh(artisan)

    access_token = create_access_token(subject=artisan.id, role=artisan.role)
    return OnboardingCompleteResponse(
        access_token=access_token,
        token_type="bearer",
        artisan_id=artisan.id,
        name=artisan.name,
        phone=artisan.phone,
        role=artisan.role,
        cluster_name=artisan.cluster_name,
        is_onboarded=True,
        message="Onboarding completed successfully.",
    )


async def sync_onboarding(
    db: AsyncSession, req: OnboardingSyncRequest
) -> OnboardingCompleteResponse:
    """1-Shot Offline/Draft Onboarding synchronization."""
    stmt = select(Artisan).where(Artisan.phone == req.phone)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing is not None:
        if existing.is_onboarded:
            raise AuthError(
                "Phone number is already registered. Please log in using your 4-digit PIN.",
                400,
            )
        # If continuing an unfinalized record, verify ownership via session_token or matching PIN
        authorized = False
        if req.session_token:
            payload = decode_access_token(req.session_token)
            if payload and payload.get("sub") == existing.id:
                authorized = True
        if not authorized and verify_pin(req.pin, existing.pin_hash):
            authorized = True
        if not authorized:
            raise AuthError("Unauthorized: matching session token or PIN required to complete registration", 401)
        artisan = existing
    else:
        artisan = Artisan(
            phone=req.phone,
            pin_hash=get_pin_hash(req.pin),
            name=req.name,
            primary_dialect=req.dialect or "hindi",
            role=req.role or "artisan",
            onboarding_step=3,
            is_onboarded=True,
        )
        db.add(artisan)

    artisan.name = req.name
    artisan.pin_hash = get_pin_hash(req.pin)
    artisan.primary_dialect = req.dialect or artisan.primary_dialect or "hindi"
    artisan.role = req.role or artisan.role or "artisan"

    # State / District / Cluster resolution
    cluster = (
        req.cluster_name
        or req.manual_cluster
        or artisan.cluster_name
        or "Varanasi Handloom Cluster"
    )
    state = req.state or req.manual_state or artisan.state or "Uttar Pradesh"
    district = req.district or req.manual_district or artisan.district or "Varanasi"

    # Government ID handling & PII protection
    verified = False
    id_type = (req.id_type or "none").strip().lower()
    if id_type == "pehchan" and req.id_number:
        clean_id = req.id_number.strip().upper()
        artisan.pehchan_id = cast(str, protect_pii(clean_id))
        if clean_id in MASTER_ARTISAN_REGISTRY:
            reg = MASTER_ARTISAN_REGISTRY[clean_id]
            verified = True
            if not req.cluster_name and not req.manual_cluster:
                cluster = reg["cluster_name"]
            if not req.state and not req.manual_state:
                state = reg["state"]
            if not req.district and not req.manual_district:
                district = reg["district"]
    elif id_type == "trifed" and req.id_number:
        clean_id = req.id_number.strip().upper()
        artisan.trifed_id = cast(str, protect_pii(clean_id))
        if clean_id in MASTER_ARTISAN_REGISTRY:
            reg = MASTER_ARTISAN_REGISTRY[clean_id]
            verified = True
            if not req.cluster_name and not req.manual_cluster:
                cluster = reg["cluster_name"]
            if not req.state and not req.manual_state:
                state = reg["state"]
            if not req.district and not req.manual_district:
                district = reg["district"]
    elif id_type == "eshram" and req.id_number:
        clean_uan = req.id_number.replace("-", "").replace(" ", "").strip()
        raw_id = req.id_number.strip().upper()
        artisan.eshram_uan = cast(str, protect_pii(clean_uan))
        if clean_uan in MASTER_ARTISAN_REGISTRY or raw_id in MASTER_ARTISAN_REGISTRY:
            reg = MASTER_ARTISAN_REGISTRY.get(clean_uan) or MASTER_ARTISAN_REGISTRY.get(raw_id)
            if reg:
                verified = True
                if not req.cluster_name and not req.manual_cluster:
                    cluster = reg["cluster_name"]
                if not req.state and not req.manual_state:
                    state = reg["state"]
                if not req.district and not req.manual_district:
                    district = reg["district"]
        else:
            verified = False

    artisan.cluster_name = cluster
    artisan.state = state
    artisan.district = district
    artisan.is_verified = verified

    # SHG details
    if req.shg_group_name:
        artisan.shg_group_name = req.shg_group_name
    if req.shg_member_count is not None:
        artisan.shg_member_count = req.shg_member_count
    if req.shg_group_name and artisan.role == "artisan":
        artisan.role = "shg_leader"

    artisan.onboarding_step = 3
    artisan.is_onboarded = True

    await db.commit()
    await db.refresh(artisan)

    access_token = create_access_token(subject=artisan.id, role=artisan.role)
    return OnboardingCompleteResponse(
        access_token=access_token,
        token_type="bearer",
        artisan_id=artisan.id,
        name=artisan.name,
        phone=artisan.phone,
        role=artisan.role,
        cluster_name=artisan.cluster_name,
        is_onboarded=True,
        message="Offline onboarding synced successfully.",
    )


# --- Legacy e-KYC Lookups (MoSJE / e-Shram / TRIFED) ---


async def verify_artisan_id(
    pehchan_id: str | None, trifed_id: str | None
) -> ArtisanIdVerifyResponse:
    data = await _safe_govt_call(
        settings.TRIFED_VERIFY_API_URL,
        {"pehchan_id": pehchan_id, "trifed_id": trifed_id},
    )
    if data:
        return ArtisanIdVerifyResponse(**data)
    # Check local master registry
    for candidate in (pehchan_id, trifed_id):
        if candidate and candidate.strip().upper() in MASTER_ARTISAN_REGISTRY:
            reg = MASTER_ARTISAN_REGISTRY[candidate.strip().upper()]
            return ArtisanIdVerifyResponse(
                is_valid=True,
                identifier_type="pehchan" if candidate == pehchan_id else "trifed",
                identifier_value=candidate.strip().upper(),
                artisan_name=reg["artisan_name"],
                craft_category=reg["craft_category"],
                cluster_name=reg["cluster_name"],
                gi_certified=reg["gi_certified"],
                gi_tag_name=reg.get("gi_tag_name"),
                state=reg["state"],
                district=reg["district"],
            )
    return ArtisanIdVerifyResponse(
        is_valid=False,
        identifier_type="pehchan" if pehchan_id else "trifed",
        identifier_value=pehchan_id or trifed_id or "",
        artisan_name=None,
        craft_category=None,
        cluster_name=None,
        gi_certified=False,
        gi_tag_name=None,
        state=None,
        district=None,
    )


async def mosje_verify(
    artisan_id: str, pehchan_id: str | None, eshram_uan: str | None
) -> MosjeVerifyResponse:
    data = await _safe_govt_call(
        settings.MOSJE_PMDAKSH_API_URL,
        {"artisan_id": artisan_id, "pehchan_id": pehchan_id, "eshram_uan": eshram_uan},
    )
    if data:
        return MosjeVerifyResponse(**data)
    digest = int(hashlib.sha256(artisan_id.encode()).hexdigest(), 16)
    level = ["L1", "L2", "L3"][digest % 3]
    return MosjeVerifyResponse(
        verified=True,
        scheme_type="PM-DAKSH",
        scheme_registration_number=f"DAKSH-{level}",
        beneficiary_name="Radha Devi",
        craft_cluster="Varanasi Handloom Cluster",
        state="Uttar Pradesh",
        skill_certification_level=f"Master Artisan {level}",
        stipend_eligible=True,
        details={
            "subsidy_eligible": True,
            "interest_subvention_pct": 5.0,
            "escrow_bank": "State Bank of India (Jan Dhan Account)",
            "pmsuraj_eligible": digest % 2 == 0,
        },
    )


async def pmsuraj_lookup(
    eshram_uan: str | None, pehchan_id: str | None
) -> PmSurajLookupResponse:
    data = await _safe_govt_call(
        settings.PMSURAJ_LOOKUP_API_URL,
        {"eshram_uan": eshram_uan, "pehchan_id": pehchan_id},
    )
    if data:
        return PmSurajLookupResponse(**data)
    key = eshram_uan or pehchan_id or ""
    digest = int(hashlib.sha256(key.encode()).hexdigest(), 16) if key else 0
    return PmSurajLookupResponse(
        verified=True,
        application_id=key or "APP-DEFAULT",
        beneficiary_name="Radha Devi",
        sanctioned_amount_inr=25000.0 if digest % 2 == 0 else 0.0,
        subsidy_percentage=35.0,
        credit_status="SANCTIONED_DISBURSED" if digest % 2 == 0 else "NONE",
        nodal_agency="National Scheduled Castes Finance & Development Corporation (NSFDC / MoSJE)",
    )


async def eshram_lookup(eshram_uan: str) -> EshramLookupResponse:
    data = await _safe_govt_call(
        settings.ESHRAM_LOOKUP_API_URL, {"eshram_uan": eshram_uan}
    )
    if data:
        return EshramLookupResponse(**data)
    return EshramLookupResponse(
        valid=True,
        uan_number=eshram_uan,
        worker_name="Radha Devi",
        primary_occupation="Handloom Silk Weaver & Artisan",
        sub_category="Weaving & Allied Craft Work",
        state="Uttar Pradesh",
        district="Varanasi",
        social_category="OBC / Recognized Artisan",
        pension_scheme_enrolled=True,
    )
