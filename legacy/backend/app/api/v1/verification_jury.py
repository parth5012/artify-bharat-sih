"""Deprecated proxy (Wayfinder #100).

Superseded by app.api.v1.verify (DB-backed). Kept for backward-compatible
imports only — router.py wires verify.py. All handlers below persist via
app.services.jury_db_service (NOT the legacy in-memory singleton), so no
report is lost on restart even if this router is mounted somewhere.
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.verify import (
    jury_assign as _jury_assign,
    jury_status as _jury_status,
    jury_vote as _jury_vote,
    report_fake as _report_fake,
)
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

router = APIRouter(
    prefix="/verify", tags=["Zero-Trust Verification Engine & Peer Jury"]
)


@router.post(
    "/jury/assign", response_model=JuryAssignResponse, deprecated=True, status_code=201
)
async def assign_peer_jury(
    payload: JuryAssignRequest, db: AsyncSession = Depends(get_db)
):
    """Deprecated: use POST /api/v1/verify/jury/assign (verify.py, DB-backed)."""
    return await _jury_assign(payload, db)


@router.post("/jury/vote", response_model=JuryVoteResponse, deprecated=True)
async def submit_jury_vote(
    payload: JuryVoteRequest,
    db: AsyncSession = Depends(get_db),
    redis: Any = Depends(get_redis),
):
    """Deprecated: use POST /api/v1/verify/jury/vote (verify.py, DB-backed)."""
    try:
        return await _jury_vote(payload, db, redis)
    except HTTPException:
        raise


@router.get("/jury/status/{jury_ticket_id}", deprecated=True)
async def get_jury_ticket_status(
    jury_ticket_id: str, db: AsyncSession = Depends(get_db)
):
    """Deprecated: use GET /api/v1/verify/jury/status/{id} (verify.py)."""
    resp: JuryStatusResponse = await _jury_status(jury_ticket_id, db)
    jurors = resp.assigned_juror_ids or []
    return {
        "jury_ticket_id": resp.jury_ticket_id,
        "product_id": resp.product_id,
        "cluster_id": None,
        "assigned_jurors": jurors,
        "quorum_required": 2,
        "votes": {},
        "status": resp.status,
        "anomaly_score": 0.02,
    }


@router.post(
    "/report-fake", response_model=ReportFakeResponse, deprecated=True, status_code=201
)
async def report_counterfeit_item(
    payload: ReportFakeRequest, db: AsyncSession = Depends(get_db)
):
    """Deprecated: use POST /api/v1/verify/report-fake (verify.py, DB-backed)."""
    return await _report_fake(payload, db)
