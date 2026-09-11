from fastapi import APIRouter

from app.api.v1 import auth, logistics, notify, payouts, verify

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(verify.router)
api_router.include_router(logistics.router)
api_router.include_router(payouts.router)
api_router.include_router(notify.router)
