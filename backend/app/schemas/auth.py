from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    phone: str = Field(..., min_length=10, max_length=15)
    pin: str = Field(..., min_length=4, max_length=4, description="4-digit PIN")
    primary_dialect: str
    role: Literal["artisan", "shg_leader"] = "artisan"
    pehchan_id: Optional[str] = None
    trifed_id: Optional[str] = None
    eshram_uan: Optional[str] = None
    cluster_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None

    @field_validator("pin")
    @classmethod
    def pin_must_be_digits(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("PIN must be exactly 4 digits")
        return v

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        v = v.strip().replace(" ", "")
        if not v.startswith("+"):
            v = "+91" + v.lstrip("0") if not v.startswith("91") else "+" + v
        return v


class RegisterResponse(BaseModel):
    artisan_id: str
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    phone: str
    pin: str = Field(..., min_length=4, max_length=4)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    artisan_id: str
    name: str
    is_verified: bool
