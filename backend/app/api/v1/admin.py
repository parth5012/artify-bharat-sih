from fastapi import APIRouter, Query
from app.schemas.admin import (
    DistrictHeatmapResponse,
    AuditLogsResponse,
    PMDakshMetricsResponse,
    DemandForecastResponse
)
from app.services.admin_service import admin_service

router = APIRouter(prefix="/admin", tags=["Ministry of Social Justice & Empowerment (MoSJE) Admin Dashboard"])


@router.get("/district-heatmap", response_model=DistrictHeatmapResponse)
async def get_district_heatmap():
    """
    MoSJE Nodal Officer / DM Dashboard:
    Real-time economic heatmap tracking wages disbursed, active artisans, and cluster GI protection.
    """
    res = admin_service.get_district_heatmap()
    return DistrictHeatmapResponse(**res)


@router.get("/audit-logs", response_model=AuditLogsResponse)
async def get_anti_corruption_audit_logs():
    """
    Anti-Corruption & Peer-Review Logs:
    Immutable verification digests, jury quorum records, and flagged anomaly reports.
    """
    res = admin_service.get_audit_logs()
    return AuditLogsResponse(**res)


@router.get("/pmdaksh-metrics", response_model=PMDakshMetricsResponse)
async def get_pmdaksh_upskilling_metrics():
    """
    PM-DAKSH Skill Upskilling Analytics:
    Measures training certifications and artisan wage increase correlations.
    """
    res = admin_service.get_pmdaksh_metrics()
    return PMDakshMetricsResponse(**res)


@router.get("/demand-forecast", response_model=DemandForecastResponse)
async def get_festival_demand_forecast(cluster: str = Query("Varanasi Handloom Cluster", description="Craft cluster name")):
    """
    Predictive Demand AI:
    Forecasts festival surges (Diwali, Durga Puja, Pushkar Mela) for proactive cluster inventory planning.
    """
    res = admin_service.get_demand_forecast(cluster=cluster)
    return DemandForecastResponse(**res)
