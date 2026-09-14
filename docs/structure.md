# Structure — ArtifyBharat File Layout (harness overview)

> Harness file-structure overview (ex-backend/frontend/web-portal layout). Canonical system spec lives in `docs/architecture.md` (restored 2026-09-12). Generated 2026-09-12 via harness-setup.

## Project Structure

```
/
├── backend/               # FastAPI + Celery AI core (Python, uv, hatchling packages=["app"])
│   ├── app/{api,core,models,schemas,services,workers}/
│   ├── tests/ (21 files), alembic/, migrations/, Dockerfile, pyproject.toml
│   └── CONTEXT.md
├── frontend/              # Next.js 14.2 + React 18.3 + TS 5.5 + Tailwind 3.4 (components/hooks/utils)
├── web-portal/            # Vite 5.4 vanilla: index.html Heritage Passport portal + artisan hub
├── harness/               # Python agent-eval harness (action_space/observation/evaluator — unrelated to agent harness files)
├── docs/adr/ (0001-0004), docs/api-specification.md, docs/agents/
├── CONTEXT.md, CONTEXT-MAP.md, docker-compose.yml, .github/workflows/ci.yml
└── graphify-out/ (to be built)
```

## Key Modules & Responsibilities

- **AuthService** (`backend/app/`): MoSJE/e-Shram/Pehchan/TRIFED/PM-SURAJ/PM-DAKSH verify (`/api/v1/auth/*`).
- **ImageAI:** rembg U-2-Net + OpenCV CLAHE studio enhancement.
- **LangAI:** Whisper ASR + IndicTrans2 + Bhashini TTS + 'Ask Dadi' assistant (`/api/v1/assistant/dadi`).
- **PricingAI:** Fair Wage Floor + XGBoost.
- **VerifyService:** Zero-Trust 3-artisan peer jury + Report Fake (`/api/v1/verify/*`).
- **QRService:** SHA-256 passport + 6-char shortcode (`/api/v1/passport/code/{shortcode}`) + 58mm ESC/POS bytes.
- **Logistics/Payout/Notify:** India Post dispatch, Jan Dhan/UPI transfer, SMS/IVR.
- **Exports:** GeM/ONDC/WhatsApp/SHG bulk adapters (bi-directional sync + webhooks).
- **Web Client:** Dual-role (Artisan Direct / SHG Leader), MediaDevices 1:1 + GPS lock, 3-tier price slider, Web Bluetooth print, IndexedDB + ServiceWorker sync.
- **Buyer Portal:** `/verify/{shortcode}` — origin + WIP + 4-part cost + Report Fake.
- **Admin:** District Heatmap + audit logs + PM-DAKSH + DemandForecast (`/api/v1/admin/*`).

## Data Flow

`Capture (photo/GPS/audio) → IndexedDB → ServiceWorker sync → Gateway (JWT/rate-limit) → AI core (Image/Lang/Pricing) → Verify (peer jury) → QRService (SHA-256+shortcode) → Export (GeM/ONDC/WA/SHG) → Buyer verify → Admin heatmap/audit`

## External Dependencies

PostgreSQL (asyncpg) + aiosqlite, S3/MinIO media, PII Vault (DPDP), Redis + Celery workers, India Post, UPI/Jan Dhan, Bhashini, GeM/ONDC/WhatsApp APIs.

## Entry Points

- Backend: `backend/app` (FastAPI), `uvicorn`, Celery workers, `alembic`.
- Frontend: `frontend/` (`npm run dev/build`), Web Portal: `web-portal/index.html` (`vite dev/build`).
- API base: `http://localhost:8000/api/v1` (see `docs/api-specification.md`).
- Tests: `backend/tests/test_*.py` (`asyncio_mode=auto`, `-m "not slow"` for fast suite).

## Graphify

No graph yet. Build: `graphify .` → `graphify-out/graph.json`, `graph.html`, `GRAPH_REPORT.md`. Query thereafter via `graphify query "<q>"`.
