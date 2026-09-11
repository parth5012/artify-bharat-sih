from typing import Literal, Optional

from pydantic import BaseModel, Field


class JuryAssignRequest(BaseModel):
    product_id: str


class JuryAssignResponse(BaseModel):
    jury_ticket_id: str
    assigned_juror_ids: list[str]  # anonymized to buyer/artisan-facing clients elsewhere
    status: str


class JuryVoteRequest(BaseModel):
    jury_ticket_id: str
    juror_id: str
    vote: Literal["GENUINE_HANDMADE", "SUSPECTED_MACHINE_MADE"]
    craft_score: int = Field(..., ge=1, le=5)
    digital_signature: str


class JuryVoteResponse(BaseModel):
    jury_ticket_id: str
    votes_received: int
    quorum_reached: bool
    quorum_verdict: Optional[str] = None
    anomaly_score: Optional[float] = None
    status: str


class JuryStatusResponse(BaseModel):
    jury_ticket_id: str
    product_id: str
    status: str
    votes_received: int
    quorum_size: int
    quorum_verdict: Optional[str] = None
    average_craft_score: Optional[float] = None
    last_updated: str


class ReportFakeRequest(BaseModel):
    product_id: str
    reason: str = Field(..., min_length=3, max_length=200)
    evidence_photo_ref: Optional[str] = None


class ReportFakeResponse(BaseModel):
    report_id: str
    status: str
    escalated_to: str = "MoSJE District Magistrate Nodal Queue"
