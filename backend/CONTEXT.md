# Backend Bounded Context: ArtifyBharat (SIH PS 26090)

## Responsibilities
- **API Gateway**: High-throughput asynchronous REST gateway (`FastAPI`) managing auth, rate limiting, and multipart uploads.
- **AuthService**: Verification service for Pehchan Card and TRIFED ID database validation (`app/api/v1/auth.py`, `app/services/passport_service.py`).
- **ImageAI (AI Image Studio)**: Salient object segmentation (U²-Net), OpenCV CLAHE color/lighting auto-fix, centered 1:1 auto-cropping (`app/services/cv_service.py`).
- **LangAI (Multilingual NLP & Assistant)**: Whisper dialect ASR, IndicTrans2 translation, fine-tuned Mistral-7B metadata extraction, and conversational dialect assistant **'Ask Dadi'** (`app/services/nlp_service.py`, `app/services/assistant_service.py`).
- **PricingAI (Dynamic Pricing Engine)**: XGBoost regression model with Fair Wage protection floor (`app/services/pricing_service.py`).
- **QRService (Digital Passport)**: Deterministic canonical SHA-256 hash computation and QR code generation (`app/core/passport.py`, `app/services/passport_service.py`).
- **Unified Catalog Adapter**: Automated channel transforms for GeM Portal (XML/CSV), ONDC Network (Beckn Protocol JSON), and Direct B2B Buyers (`app/services/export_service.py`).

## Invariants
- `calculated_fair_wage` cannot be lower than `labor_days * 450.0` (cluster daily wage benchmark).
- Heritage Passport SHA-256 hash must be computed from canonically sorted JSON keys.
- Celery workers decouple long-running inference jobs from API request/response cycles.
