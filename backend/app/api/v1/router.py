from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.studio import router as studio_router
from app.api.v1.catalog import router as catalog_router
from app.api.v1.pricing import router as pricing_router
from app.api.v1.passport import router as passport_router
from app.api.v1.exports import router as exports_router
from app.api.v1.assistant import router as assistant_router
from app.api.v1.verify import router as jury_router
from app.api.v1.logistics_payout import router as logistics_payout_router
from app.api.v1.admin import router as admin_router
from app.api.v1.notify import router as notify_router
from app.api.v1.whatsapp import router as whatsapp_router
from app.api.v1.mock_sandbox import router as mock_router
from app.api.v1.marketplace import router as marketplace_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(studio_router)
api_v1_router.include_router(catalog_router)
api_v1_router.include_router(pricing_router)
api_v1_router.include_router(passport_router)
api_v1_router.include_router(exports_router)
api_v1_router.include_router(assistant_router)
api_v1_router.include_router(jury_router)
api_v1_router.include_router(logistics_payout_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(notify_router)
api_v1_router.include_router(whatsapp_router)
api_v1_router.include_router(mock_router)
api_v1_router.include_router(marketplace_router)
