# ArtifyBharat Deployment & Operations Guide

## 1. Local Development Setup

### Backend
```bash
cd backend
uv sync --extra dev
uv run pytest -v
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Background Workers
In separate terminals:
```bash
# Celery worker
cd backend
uv run celery -A app.workers.celery_app worker --loglevel=info

# Celery beat scheduler
cd backend
uv run celery -A app.workers.celery_app beat --loglevel=info
```

### Web Verification Portal
```bash
cd web-portal
npm install
npm run dev
```

---

## 2. Docker Compose Production Deployment
The root `docker-compose.yml` orchestrates the entire container topology:

```bash
docker-compose up -d --build
```

### Services & Ports:
- **FastAPI Core Gateway**: `http://localhost:8000` (Docs at `/docs`)
- **Web Verification Portal**: `http://localhost:3000`
- **PostgreSQL Database**: `localhost:5432`
- **Redis Cache & Celery Broker**: `localhost:6379`
- **MinIO Object Storage Console**: `http://localhost:9001` (API at `9000`)

---

## 3. Environment Variables (`.env`)
Refer to `.env.example` for all configurable keys:
- `SECRET_KEY`: JWT signing secret
- `DATABASE_URL`: Async SQLAlchemy database connection string
- `REDIS_URL`: Broker URL for task queue
- `S3_ENDPOINT_URL`: Object storage endpoint (MinIO / S3 / Cloudflare R2)
- `USE_MOCK_AI`: Set to `False` in production with deployed PyTorch / vLLM inference nodes.
