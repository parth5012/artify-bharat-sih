# ArtifyBharat Backend (SIH PS 26090)

High-throughput, asynchronous backend system serving as the intelligent **Digital Business Manager** and **Cryptographic Heritage Passport Gatekeeper** for rural artisans and weavers.

## Architecture Highlights
- **FastAPI**: Asynchronous REST API layer with OpenAPI specs
- **Computer Vision Pipeline**: U²-Net salient object segmentation, OpenCV CLAHE lighting/gamma equalization, 1:1 square canvas auto-crop
- **Voice NLP Auto-Cataloger**: Whisper ASR regional dialect speech-to-text, IndicTrans2 dialect-to-English translation, fine-tuned Mistral-7B metadata extraction
- **Dynamic Pricing Engine**: XGBoost regression model correlating material cost, labor investment, and visual complexity with live web-scraped market benchmarks
- **Cryptographic Heritage Passport**: Deterministic SHA-256 hash generation, high-contrast QR code issuance, and tamper-evident provenance validation
- **Multi-Channel Adapters**: Automatic transformation to GeM (XML/CSV), ONDC (Beckn Protocol JSON), and B2B procurement schemas
- **Celery & Redis**: Asynchronous decoupled background queue for heavy AI/ML inferences

## Getting Started

### Prerequisites
- Python >= 3.11
- `uv` package manager (recommended)
- Redis server (for Celery async workers)

### Installation
```bash
cd backend
uv sync --extra dev
```

### Running the API Server
```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Running Background Celery Worker
```bash
uv run celery -A app.workers.celery_app worker --loglevel=info
```

### Running Scraper Beat Scheduler
```bash
uv run celery -A app.workers.celery_app beat --loglevel=info
```

### Running Tests
```bash
uv run pytest -v
```
