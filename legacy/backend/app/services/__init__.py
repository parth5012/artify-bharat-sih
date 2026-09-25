"""
AI Core Microservices:
- ImageAI (cv_service): Salient background segmentation & CLAHE lighting fix.
- LangAI (nlp_service, assistant_service): Multilingual Whisper ASR, IndicTrans2 MT, Mistral-7B, and 'Ask Dadi' Voice Assistant.
- PricingAI (pricing_service): XGBoost regression & statutory Fair Wage Floor.
- QRService (passport_service): Deterministic SHA-256 cryptographic provenance & QR code generator.
- Multi-Channel Adapters (export_adapter_service): Unified catalog transformations to GeM, ONDC, and B2B channels.
"""

from app.services.cv_service import cv_service
from app.services.nlp_service import nlp_service
from app.services.assistant_service import assistant_service
from app.services.pricing_service import pricing_service
from app.services.market_pricing import market_pricing_service
from app.services.passport_service import passport_service
from app.services.export_service import export_adapter_service, ExportAdapterService
from app.services import auth_service
from app.services.logistics_service import logistics_service
from app.services.notify_service import notify_service
from app.services.payout_service import payout_service
from app.services.verify_jury_service import verify_jury_service

export_service = export_adapter_service

__all__ = [
    "cv_service",
    "nlp_service",
    "assistant_service",
    "pricing_service",
    "market_pricing_service",
    "passport_service",
    "export_adapter_service",
    "export_service",
    "ExportAdapterService",
    "auth_service",
    "logistics_service",
    "notify_service",
    "payout_service",
    "verify_jury_service",
]
