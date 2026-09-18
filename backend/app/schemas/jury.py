"""Canonical Zero-Trust Peer Jury contracts (Wayfinder #100).

Single source of truth for /api/v1/verify/* request/response shapes.
Accepts BOTH the legacy backend fields (shortcode_or_hash, reporter_phone,
verdict, craft_authenticity_score, vote, craft_score) and the frontend
ReportFake contract (shortcode, reason, description, reporterContact), so
buyer clients keep working while persistence moves to the DB.
"""

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

# ---------------------------------------------------------------------------
# Jury assign
# ---------------------------------------------------------------------------


class JuryAssignRequest(BaseModel):
    product_id: str
    cluster_id: Optional[str] = Field(
        default="Varanasi Handloom Cluster",
        description="Artisan craft cluster location",
    )
    craft_type: Optional[str] = Field(
        default="Handloom Weaving", description="Craft discipline"
    )
    artisan_id: Optional[str] = None
    shg_id: Optional[str] = None


class JuryAssignResponse(BaseModel):
    jury_ticket_id: str
    product_id: Optional[str] = None
    cluster_id: Optional[str] = None
    assigned_juror_ids: list[str]
    # Legacy alias (in-memory verification_jury contract)
    assigned_jurors: Optional[list[str]] = None
    quorum_required: int = 2
    quorum_size: int = 3
    status: str

    @model_validator(mode="after")
    def _mirror_jurors(self):
        if self.assigned_jurors is None:
            self.assigned_jurors = list(self.assigned_juror_ids)
        return self


# ---------------------------------------------------------------------------
# Jury vote (accepts legacy verdict/score shapes, normalizes to DB enums)
# ---------------------------------------------------------------------------

_LEGACY_VERDICT_MAP = {
    "authentic": "GENUINE_HANDMADE",
    "genuine": "GENUINE_HANDMADE",
    "genuine_handmade": "GENUINE_HANDMADE",
    "rejected": "SUSPECTED_MACHINE_MADE",
    "suspected": "SUSPECTED_MACHINE_MADE",
    "suspected_machine_made": "SUSPECTED_MACHINE_MADE",
    "counterfeit": "SUSPECTED_MACHINE_MADE",
}


def normalize_vote(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    key = value.strip().upper()
    if key in ("GENUINE_HANDMADE", "SUSPECTED_MACHINE_MADE"):
        return key
    return _LEGACY_VERDICT_MAP.get(value.strip().lower(), key)


def normalize_craft_score(
    craft_score: Optional[int],
    craft_authenticity_score: Optional[float],
) -> int:
    """Normalize 0.0-1.0 authenticity score to 1-5 craft score."""
    if craft_score is not None:
        return max(1, min(5, int(craft_score)))
    if craft_authenticity_score is not None:
        return max(1, min(5, round(float(craft_authenticity_score) * 5)))
    raise ValueError("Provide craft_score (1-5) or craft_authenticity_score (0-1)")


class JuryVoteRequest(BaseModel):
    jury_ticket_id: str
    juror_id: str
    vote: Optional[Literal["GENUINE_HANDMADE", "SUSPECTED_MACHINE_MADE"]] = None
    # Legacy in-memory alias
    verdict: Optional[str] = None
    craft_score: Optional[int] = Field(default=None, ge=1, le=5)
    # Legacy in-memory alias (0.0-1.0)
    craft_authenticity_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    digital_signature: Optional[str] = None
    comments: Optional[str] = None

    @model_validator(mode="after")
    def _require_vote_and_score(self):
        if self.vote is None and self.verdict is None:
            raise ValueError("Provide vote or verdict")
        if self.craft_score is None and self.craft_authenticity_score is None:
            raise ValueError("Provide craft_score or craft_authenticity_score")
        normalized = normalize_vote(self.vote or self.verdict)
        if normalized not in ("GENUINE_HANDMADE", "SUSPECTED_MACHINE_MADE"):
            raise ValueError(f"Unknown vote/verdict: {self.vote or self.verdict}")
        object.__setattr__(self, "vote", normalized)
        object.__setattr__(
            self,
            "craft_score",
            normalize_craft_score(self.craft_score, self.craft_authenticity_score),
        )
        if not self.digital_signature:
            object.__setattr__(
                self, "digital_signature", f"sig_{self.juror_id}_{self.jury_ticket_id}"
            )
        return self


class JuryVoteResponse(BaseModel):
    jury_ticket_id: str
    juror_id: Optional[str] = None
    vote_recorded: bool = True
    votes_received: int
    quorum_reached: bool
    quorum_verdict: Optional[str] = None
    # Legacy alias
    final_verdict: Optional[str] = None
    average_craft_score: Optional[float] = None
    # Legacy alias (0-5 scale mirror)
    average_authenticity_score: Optional[float] = None
    consensus_level: Optional[str] = None
    anomaly_score: Optional[float] = None
    velocity_flag: bool = False
    status: str

    @model_validator(mode="after")
    def _mirror_verdict(self):
        if self.final_verdict is None:
            self.final_verdict = self.quorum_verdict
        if self.average_authenticity_score is None:
            self.average_authenticity_score = self.average_craft_score
        return self


class JuryStatusResponse(BaseModel):
    jury_ticket_id: str
    product_id: str
    status: str
    votes_received: int
    quorum_size: int
    quorum_verdict: Optional[str] = None
    average_craft_score: Optional[float] = None
    last_updated: str
    assigned_juror_ids: Optional[list[str]] = None
    # Legacy alias
    assigned_jurors: Optional[list[str]] = None


# ---------------------------------------------------------------------------
# Report Fake — single in/out contract (frontend <-> backend mapping)
#
# Frontend (verifyApi.ts) sends:
#   {shortcode, reason, description, reporterContact}
# Legacy backend (verification_jury) sent:
#   {shortcode_or_hash, reason, reporter_phone, evidence_image_base64}
# DB layer (jury.py) sent:
#   {product_id, reason, evidence_photo_ref}
# All three are accepted here and normalized.
# ---------------------------------------------------------------------------


class ReportFakeRequest(BaseModel):
    # Identifier aliases — at least one required
    product_id: Optional[str] = None
    shortcode: Optional[str] = None
    shortcode_or_hash: Optional[str] = None
    # Reason / detail aliases
    reason: str = Field(..., min_length=3, max_length=500)
    description: Optional[str] = None
    # Reporter aliases
    reporterContact: Optional[str] = None
    reporter_phone: Optional[str] = None
    # Evidence aliases
    evidence_photo_ref: Optional[str] = None
    evidence_image_base64: Optional[str] = None

    @model_validator(mode="after")
    def _require_identifier(self):
        if not (self.product_id or self.shortcode or self.shortcode_or_hash):
            raise ValueError("Provide product_id, shortcode, or shortcode_or_hash")
        return self

    # -- normalized accessors (backend uses these) --
    def identifier(self) -> str:
        """Preferred product lookup key: shortcode/hash first, then product_id."""
        return self.shortcode_or_hash or self.shortcode or self.product_id or ""

    def contact(self) -> Optional[str]:
        return self.reporter_phone or self.reporterContact

    def full_reason(self) -> str:
        if self.description and self.description not in self.reason:
            return f"{self.reason}: {self.description}"
        return self.reason

    def evidence_ref(self) -> Optional[str]:
        return self.evidence_photo_ref or self.evidence_image_base64


class ReportFakeResponse(BaseModel):
    report_id: str
    # Frontend alias: ticketId maps 1:1 to report_id
    ticketId: Optional[str] = None
    success: bool = True
    status: str
    flagged_hash: Optional[str] = None
    escalated_to: str = "MoSJE District Magistrate Nodal Queue"
    action_taken: Optional[str] = None
    reported_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode="after")
    def _mirror_ticket(self):
        if self.ticketId is None:
            self.ticketId = self.report_id
        return self
