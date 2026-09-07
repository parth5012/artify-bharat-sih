# Backend Bounded Context: ArtifyBharat

## Responsibilities
- High-throughput asynchronous API gateway (`FastAPI`).
- Background worker task dispatch and cron scheduling (`Celery`, `Redis`).
- Computer Vision pipeline: U²-Net salient object segmentation, OpenCV CLAHE color correction, 1:1 auto-cropping (`app/services/cv_service.py`).
- Multilingual voice auto-cataloging: Whisper STT, IndicTrans2 translation, fine-tuned Mistral-7B metadata extraction (`app/services/nlp_service.py`).
- Dynamic regression pricing engine: XGBoost model with Fair Wage protection floor (`app/services/pricing_service.py`).
- Cryptographic provenance generation: deterministic SHA-256 hash computation and QR generation (`app/core/passport.py`, `app/services/passport_service.py`).
- Government & external marketplace adapters: GeM, ONDC, Amazon Karigar, B2B (`app/services/export_service.py`).

## Invariants
- `calculated_fair_wage` cannot be lower than `labor_days * 450.0` (cluster daily wage benchmark).
- Heritage Passport SHA-256 hash must be computed from canonically sorted JSON keys.
- Celery workers decouple long-running inference jobs from API request/response cycles.
