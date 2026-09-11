"""
Task 1.3 — Pydantic v2 schemas for MoSJE, e-Shram, and Pehchan/TRIFED
government verification integrations.
"""
import re
from typing import Optional

from pydantic import BaseModel, Field, field_validator

PEHCHAN_ID_RE = re.compile(r"^[A-Z]{2}-[A-Z]{3}-\d{6}$")  # e.g. UP-VAR-102938


# ---- Pehchan / TRIFED artisan-identity verification -------------------------

class ArtisanIdVerifyRequest(BaseModel):
    pehchan_id: Optional[str] = Field(None, description="DC Handicrafts Pehchan Card Number")
    trifed_id: Optional[str] = Field(None, description="TRIFED ID")

    @field_validator("pehchan_id")
    @classmethod
    def validate_pehchan_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not PEHCHAN_ID_RE.match(v):
            raise ValueError("Pehchan ID must match format XX-XXX-NNNNNN, e.g. UP-VAR-102938")
        return v


class ArtisanIdVerifyResponse(BaseModel):
    pehchan_valid: bool
    trifed_valid: bool
    cluster_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None


# ---- MoSJE / PM-DAKSH / PM-SURAJ --------------------------------------------

class MosjeVerifyRequest(BaseModel):
    artisan_id: str
    pehchan_id: Optional[str] = None
    eshram_uan: Optional[str] = None


class MosjeVerifyResponse(BaseModel):
    pmdaksh_level: Optional[str] = Field(None, description="Skill certification tier, e.g. 'L2'")
    pmdaksh_certified: bool
    pmsuraj_eligible: bool
    pmsuraj_scheme_refs: list[str] = Field(default_factory=list)


class PmSurajLookupRequest(BaseModel):
    eshram_uan: Optional[str] = None
    pehchan_id: Optional[str] = None


class PmSurajLookupResponse(BaseModel):
    eligible: bool
    credit_limit: Optional[float] = None
    loan_status: Optional[str] = None  # e.g. "NONE" | "PENDING" | "DISBURSED"


# ---- e-Shram -----------------------------------------------------------------

class EshramLookupRequest(BaseModel):
    eshram_uan: str = Field(..., min_length=12, max_length=12, description="12-digit e-Shram UAN")

    @field_validator("eshram_uan")
    @classmethod
    def validate_uan(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("e-Shram UAN must be exactly 12 digits")
        return v


class EshramLookupResponse(BaseModel):
    registered: bool
    social_security_active: bool
    beneficiary_name: Optional[str] = None
