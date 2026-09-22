"""Marketplace expiry cron worker (7-day hold release)."""

from __future__ import annotations

import asyncio

from app.workers.celery_app import celery_app


def _run_release() -> int:
    from app.core.database import AsyncSessionLocal
    from app.services.reserve_service import release_expired

    async def _go() -> int:
        async with AsyncSessionLocal() as db:
            return await release_expired(db)

    return asyncio.run(_go())


@celery_app.task(name="app.workers.tasks_marketplace.release_expired_reservations")
def release_expired_reservations() -> dict:
    """Celery beat stub: expire pending holds past ``expires_at``."""
    released = _run_release()
    return {"status": "success", "released": released}
