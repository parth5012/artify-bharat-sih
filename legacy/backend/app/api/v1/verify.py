"""/api/v1/verify — Zero-Trust Peer Jury endpoints (DB-backed, Wayfinder #100).

Canonical router for jury assign/vote/status + Report Fake.
Persistence source: app.services.jury_db_service (JuryTicket/JuryVote/
AntiFraudReport tables). Contracts: app.schemas.jury (single ReportFake
in/out accepting both frontend and legacy backend fields).
"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings as jury_settings
from app.core.database import get_db
from app.core.security import get_redis
from app.schemas.jury import (
    JuryAssignRequest,
    JuryAssignResponse,
    JuryStatusResponse,
    JuryVoteRequest,
    JuryVoteResponse,
    ReportFakeRequest,
    ReportFakeResponse,
)
from app.services import jury_db_service as jury

router = APIRouter(prefix="/verify", tags=["verify"])

_QUORUM_SIZE = getattr(jury_settings, "JURY_QUORUM_SIZE", 3)
_QUORUM_THRESHOLD = getattr(jury_settings, "JURY_QUORUM_THRESHOLD", 2)


def _juror_list(ticket) -> list[str]:
    return [j for j in (ticket.assigned_juror_ids or "").split(",") if j]


@router.post("/jury/assign", response_model=JuryAssignResponse, status_code=201)
async def jury_assign(req: JuryAssignRequest, db: AsyncSession = Depends(get_db)):
    ticket = await jury.assign_jury(
        db,
        req.product_id,
        cluster_id=req.cluster_id or "Varanasi Handloom Cluster",
        artisan_id=req.artisan_id,
        shg_id=req.shg_id,
    )
    jurors = _juror_list(ticket)
    return JuryAssignResponse(
        jury_ticket_id=ticket.id,
        product_id=ticket.product_id,
        cluster_id=req.cluster_id,
        assigned_juror_ids=jurors,
        assigned_jurors=jurors,
        quorum_required=_QUORUM_THRESHOLD,
        quorum_size=_QUORUM_SIZE,
        status=ticket.status,
    )


@router.post("/jury/vote", response_model=JuryVoteResponse)
async def jury_vote(
    req: JuryVoteRequest,
    db: AsyncSession = Depends(get_db),
    redis: Any = Depends(get_redis),
):
    try:
        ticket = await jury.submit_vote(
            db,
            redis,
            req.jury_ticket_id,
            req.juror_id,
            req.vote or "GENUINE_HANDMADE",
            req.craft_score or 3,
            req.digital_signature or f"sig_{req.juror_id}_{req.jury_ticket_id}",
        )
    except jury.JuryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    _, votes_count = await jury.get_jury_status(db, req.jury_ticket_id)
    quorum_reached = ticket.status in (
        "QUORUM_GENUINE",
        "QUORUM_SUSPECTED",
        "FLAGGED_VELOCITY_ANOMALY",
    )
    verdict = ticket.quorum_verdict if quorum_reached else None
    consensus = (
        "HIGH_CONFIDENCE"
        if ticket.status == "QUORUM_GENUINE"
        else (
            "FLAGGED_ANOMALY"
            if ticket.status == "QUORUM_SUSPECTED"
            else (
                "SUSPECTED_RUBBER_STAMP"
                if ticket.status == "FLAGGED_VELOCITY_ANOMALY"
                else "PENDING_QUORUM"
            )
        )
    )
    return JuryVoteResponse(
        jury_ticket_id=ticket.id,
        juror_id=req.juror_id,
        vote_recorded=True,
        votes_received=votes_count,
        quorum_reached=quorum_reached,
        quorum_verdict=verdict,
        final_verdict=verdict,
        average_craft_score=ticket.average_craft_score,
        average_authenticity_score=ticket.average_craft_score,
        consensus_level=consensus,
        anomaly_score=ticket.anomaly_score,
        velocity_flag=ticket.status == "FLAGGED_VELOCITY_ANOMALY",
        status=ticket.status,
    )


@router.get("/jury/status/{jury_ticket_id}", response_model=JuryStatusResponse)
async def jury_status(jury_ticket_id: str, db: AsyncSession = Depends(get_db)):
    try:
        ticket, votes_count = await jury.get_jury_status(db, jury_ticket_id)
    except jury.JuryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    jurors = _juror_list(ticket)
    updated: Optional[str] = None
    try:
        updated = ticket.updated_at.isoformat() if ticket.updated_at else None
    except Exception:
        updated = None
    return JuryStatusResponse(
        jury_ticket_id=ticket.id,
        product_id=ticket.product_id,
        status=ticket.status,
        votes_received=votes_count,
        quorum_size=_QUORUM_SIZE,
        quorum_verdict=ticket.quorum_verdict,
        average_craft_score=ticket.average_craft_score,
        last_updated=updated or "",
        assigned_juror_ids=jurors,
        assigned_jurors=jurors,
    )


@router.post("/report-fake", response_model=ReportFakeResponse, status_code=201)
async def report_fake(req: ReportFakeRequest, db: AsyncSession = Depends(get_db)):
    identifier = req.identifier()
    report = await jury.report_fake(
        db,
        product_id=req.product_id,
        shortcode_or_hash=req.shortcode_or_hash or req.shortcode,
        reason=req.full_reason(),
        reporter_phone=req.contact(),
        evidence_photo_ref=req.evidence_ref(),
    )
    flagged = req.shortcode_or_hash or req.shortcode or req.product_id or identifier
    return ReportFakeResponse(
        report_id=report.id,
        ticketId=report.id,
        success=True,
        status=report.status,
        flagged_hash=flagged,
        action_taken=(
            "Escalated to MoSJE Nodal Officer & Peer Review Jury queue; "
            "Escrow frozen."
        ),
    )
