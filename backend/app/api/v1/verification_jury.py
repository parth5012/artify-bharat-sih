from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from app.schemas.verification_jury import (
    PeerJuryAssignRequest,
    PeerJuryAssignResponse,
    PeerJuryVoteRequest,
    PeerJuryVoteResponse,
    ReportFakeRequest,
    ReportFakeResponse,
)
from app.services.verify_jury_service import verify_jury_service

router = APIRouter(prefix="/verify", tags=["Zero-Trust Verification Engine & Peer Jury"])


@router.post("/jury/assign", response_model=PeerJuryAssignResponse)
async def assign_peer_jury(payload: PeerJuryAssignRequest):
    """
    Zero-Trust Verification Engine:
    Assigns 3 randomized peer jury artisans from the cluster for craft verification.
    """
    ticket = verify_jury_service.assign_jury(
        product_id=payload.product_id,
        cluster_id=payload.cluster_id,
        craft_type=payload.craft_type or "Handloom Weaving"
    )
    return PeerJuryAssignResponse(
        jury_ticket_id=ticket["jury_ticket_id"],
        product_id=ticket["product_id"],
        cluster_id=ticket["cluster_id"],
        assigned_jurors=ticket["assigned_jurors"],
        quorum_required=ticket["quorum_required"],
        status=ticket["status"]
    )


@router.post("/jury/vote", response_model=PeerJuryVoteResponse)
async def submit_jury_vote(payload: PeerJuryVoteRequest):
    """
    Records a peer juror's vote and computes consensus score.
    """
    res = verify_jury_service.cast_vote(
        jury_ticket_id=payload.jury_ticket_id,
        juror_id=payload.juror_id,
        verdict=payload.verdict,
        craft_authenticity_score=payload.craft_authenticity_score,
        comments=payload.comments
    )
    return PeerJuryVoteResponse(**res)


@router.get("/jury/status/{jury_ticket_id}")
async def get_jury_ticket_status(jury_ticket_id: str):
    """
    Retrieves verification status and voting progress for a jury ticket.
    """
    ticket = verify_jury_service.get_jury_status(jury_ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Jury ticket {jury_ticket_id} not found."
        )
    return ticket


@router.post("/report-fake", response_model=ReportFakeResponse)
async def report_counterfeit_item(payload: ReportFakeRequest):
    """
    Buyer Anti-Fraud Feedback Loop:
    Flags suspected counterfeit or machine-made craft and triggers an audit investigation.
    """
    res = verify_jury_service.report_counterfeit(
        shortcode_or_hash=payload.shortcode_or_hash,
        reason=payload.reason,
        reporter_phone=payload.reporter_phone,
        evidence_base64=payload.evidence_image_base64
    )
    return ReportFakeResponse(**res)
