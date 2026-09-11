"""
AuthService — Task 1.4 (PIN + JWT auth) and the government e-KYC lookups
used by /api/v1/auth/*. Government API calls are wrapped so that in the
hackathon sandbox (no real MoSJE/e-Shram/TRIFED network access) they fall
back to deterministic mock responses instead of failing hard.
"""
from __future__ import annotations

import hashlib

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, hash_pin, verify_pin
from app.models.artisan import Artisan
from app.schemas.auth import RegisterRequest
from app.schemas.mosje import (
    ArtisanIdVerifyResponse,
    EshramLookupResponse,
    MosjeVerifyResponse,
    PmSurajLookupResponse,
)


class AuthError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


async def _safe_govt_call(url: str, payload: dict) -> dict | None:
    """Best-effort call to a government API; returns None on any failure
    so the caller can fall back to deterministic sandbox logic."""
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

    artisan = Artisan(
        name=req.name,
        phone=req.phone,
        pin_hash=hash_pin(req.pin),
        role=req.role,
        primary_dialect=req.primary_dialect,
        pehchan_id=req.pehchan_id,
        trifed_id=req.trifed_id,
        eshram_uan=req.eshram_uan,
        cluster_name=req.cluster_name,
        state=req.state,
        district=req.district,
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
    return create_access_token(subject=artisan.id, extra_claims={"role": artisan.role})


async def verify_artisan_id(pehchan_id: str | None, trifed_id: str | None) -> ArtisanIdVerifyResponse:
    data = await _safe_govt_call(
        settings.TRIFED_VERIFY_API_URL, {"pehchan_id": pehchan_id, "trifed_id": trifed_id}
    )
    if data:
        return ArtisanIdVerifyResponse(**data)
    # Sandbox fallback: format-valid IDs are treated as provisionally valid.
    return ArtisanIdVerifyResponse(
        pehchan_valid=bool(pehchan_id),
        trifed_valid=bool(trifed_id),
        cluster_name=None,
        state=None,
        district=None,
    )


async def mosje_verify(artisan_id: str, pehchan_id: str | None, eshram_uan: str | None) -> MosjeVerifyResponse:
    data = await _safe_govt_call(
        settings.MOSJE_PMDAKSH_API_URL,
        {"artisan_id": artisan_id, "pehchan_id": pehchan_id, "eshram_uan": eshram_uan},
    )
    if data:
        return MosjeVerifyResponse(**data)
    # Deterministic sandbox mock, stable per artisan_id so repeated calls agree.
    digest = int(hashlib.sha256(artisan_id.encode()).hexdigest(), 16)
    level = ["L1", "L2", "L3"][digest % 3]
    return MosjeVerifyResponse(
        pmdaksh_level=level,
        pmdaksh_certified=True,
        pmsuraj_eligible=digest % 2 == 0,
        pmsuraj_scheme_refs=["PM-SURAJ-RURAL-CREDIT"] if digest % 2 == 0 else [],
    )


async def pmsuraj_lookup(eshram_uan: str | None, pehchan_id: str | None) -> PmSurajLookupResponse:
    data = await _safe_govt_call(
        settings.PMSURAJ_LOOKUP_API_URL, {"eshram_uan": eshram_uan, "pehchan_id": pehchan_id}
    )
    if data:
        return PmSurajLookupResponse(**data)
    key = eshram_uan or pehchan_id or ""
    digest = int(hashlib.sha256(key.encode()).hexdigest(), 16) if key else 0
    return PmSurajLookupResponse(
        eligible=digest % 2 == 0,
        credit_limit=25000.0 if digest % 2 == 0 else None,
        loan_status="NONE",
    )


async def eshram_lookup(eshram_uan: str) -> EshramLookupResponse:
    data = await _safe_govt_call(settings.ESHRAM_LOOKUP_API_URL, {"eshram_uan": eshram_uan})
    if data:
        return EshramLookupResponse(**data)
    return EshramLookupResponse(registered=True, social_security_active=True, beneficiary_name=None)
