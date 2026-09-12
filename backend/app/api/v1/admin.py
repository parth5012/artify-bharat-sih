from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.admin import (
    DistrictHeatmapResponse,
    AuditLogsResponse,
    PMDakshMetricsResponse,
    DemandForecastResponse
)
from app.services.admin_service import admin_service

router = APIRouter(prefix="/admin", tags=["Ministry of Social Justice & Empowerment (MoSJE) Admin Dashboard"])


@router.get("/district-heatmap", response_model=DistrictHeatmapResponse)
async def get_district_heatmap(db: AsyncSession = Depends(get_db)):
    """
    MoSJE Nodal Officer / Dashboard:
    Real-time economic heatmap tracking wages disbursed, active artisans, cluster protection.
    """
    res = await admin_service.get_district_heatmap(db)
    return DistrictHeatmapResponse(**res)


@router.get("/audit-logs", response_model=AuditLogsResponse)
async def get_anti_corruption_audit_logs(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200, description="Max audit logs to return (1-200)"),
):
    """
    Anti-Corruption Peer-Review Logs:
    Immutable verification digests, jury quorum records, flagged anomaly reports.
    """
    res = await admin_service.get_audit_logs(db, limit=limit)
    return AuditLogsResponse(**res)


@router.get("/pmdaksh-metrics", response_model=PMDakshMetricsResponse)
async def get_pmdaksh_upskilling_metrics(db: AsyncSession = Depends(get_db)):
    """
    PM-DAKSH Skill Upskilling Analytics:
    Measures training certifications artisan wage increase correlations.
    """
    res = await admin_service.get_pmdaksh_metrics(db)
    return PMDakshMetricsResponse(**res)


@router.get("/demand-forecast", response_model=DemandForecastResponse)
async def get_festival_demand_forecast(cluster: str = Query("Varanasi Handloom Cluster", description="Craft cluster name")):
    """
    Predictive Demand AI:
    Forecasts festival surges (Diwali, Durga Puja, Pushkar Mela) for proactive cluster inventory planning.
    """
    res = admin_service.get_demand_forecast(cluster=cluster)
    return DemandForecastResponse(**res)
