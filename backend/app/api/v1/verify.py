"""
/api/v1/verify — Zero-Trust Peer Jury endpoints (Tasks 3.5-3.8).
"""
from fastapi import APIRouter, Depends, HTTPException
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_redis
from app.services import verify_jury_service as jury
from app.schemas.jury import (
    JuryAssignRequest,
    JuryAssignResponse,
    JuryStatusResponse,
    JuryVoteRequest,
    JuryVoteResponse,
    ReportFakeRequest,
    ReportFakeResponse,
)

router = APIRouter(prefix="/verify", tags=["verify"])


@router.post("/jury/assign", response_model=JuryAssignResponse, status_code=201)
async def jury_assign(req: JuryAssignRequest, db: AsyncSession = Depends(get_db)):
    try:
        ticket = await jury.assign_jury(db, req.product_id)
    except jury.JuryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return JuryAssignResponse(
        jury_ticket_id=ticket.id,
        assigned_juror_ids=ticket.assigned_juror_ids.split(","),
        status=ticket.status,
    )


@router.post("/jury/vote", response_model=JuryVoteResponse)
async def jury_vote(
    req: JuryVoteRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    try:
        ticket = await jury.submit_vote(
            db,
            redis,
            req.jury_ticket_id,
            req.juror_id,
            req.vote,
            req.craft_score,
            req.digital_signature,
        )
    except jury.JuryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    _, votes_count = await jury.get_jury_status(db, req.jury_ticket_id)
    quorum_reached = ticket.status in ("QUORUM_GENUINE", "QUORUM_SUSPECTED", "FLAGGED_VELOCITY_ANOMALY")
    return JuryVoteResponse(
        jury_ticket_id=ticket.id,
        votes_received=votes_count,
        quorum_reached=quorum_reached,
        quorum_verdict=ticket.quorum_verdict,
        anomaly_score=ticket.anomaly_score,
        status=ticket.status,
    )


@router.get("/jury/status/{jury_ticket_id}", response_model=JuryStatusResponse)
async def jury_status(jury_ticket_id: str, db: AsyncSession = Depends(get_db)):
    try:
        ticket, votes_count = await jury.get_jury_status(db, jury_ticket_id)
    except jury.JuryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    from app.core.config import settings

    return JuryStatusResponse(
        jury_ticket_id=ticket.id,
        product_id=ticket.product_id,
        status=ticket.status,
        votes_received=votes_count,
        quorum_size=settings.JURY_QUORUM_SIZE,
        quorum_verdict=ticket.quorum_verdict,
        average_craft_score=ticket.average_craft_score,
        last_updated=ticket.updated_at.isoformat(),
    )


@router.post("/report-fake", response_model=ReportFakeResponse, status_code=201)
async def report_fake(req: ReportFakeRequest, db: AsyncSession = Depends(get_db)):
    try:
        report = await jury.report_fake(db, req.product_id, req.reason, req.evidence_photo_ref)
    except jury.JuryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return ReportFakeResponse(report_id=report.id, status=report.status)
