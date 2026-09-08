from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

class PeerJuryAssignRequest(BaseModel):
    product_id: str = Field(..., description="Unique product identifier requiring verification")
    cluster_id: str = Field(..., description="Artisan craft cluster location")
    craft_type: Optional[str] = Field("Handloom Weaving", description="Craft discipline")

class PeerJuryAssignResponse(BaseModel):
    jury_ticket_id: str
    product_id: str
    cluster_id: str
    assigned_jurors: List[str]
    quorum_required: int = 2
    status: str = "in_review"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PeerJuryVoteRequest(BaseModel):
    jury_ticket_id: str
    juror_id: str
    verdict: str = Field(..., description="'authentic' or 'rejected'")
    craft_authenticity_score: float = Field(..., ge=0.0, le=1.0, description="Score between 0.0 and 1.0")
    comments: Optional[str] = None

class PeerJuryVoteResponse(BaseModel):
    jury_ticket_id: str
    juror_id: str
    vote_recorded: bool
    votes_received: int
    quorum_reached: bool
    final_verdict: Optional[str]
    average_authenticity_score: float
    consensus_level: str

class ReportFakeRequest(BaseModel):
    shortcode_or_hash: str = Field(..., description="6-character shortcode (e.g. A7X-9B2) or SHA-256 hash")
    reporter_phone: Optional[str] = None
    reason: str = Field(..., description="Reason for reporting fake or machine-made craft")
    evidence_image_base64: Optional[str] = None

class ReportFakeResponse(BaseModel):
    report_id: str
    status: str = "audit_triggered"
    flagged_hash: str
    action_taken: str
    reported_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

