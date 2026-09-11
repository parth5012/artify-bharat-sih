# Artify Bharat — Backend Core & Business Logic

Mayank's backend module for **Artify Bharat** (SIH PS 26090): FastAPI +
PostgreSQL + Redis, covering Phase 1 (Foundation/e-KYC), Phase 3 partial
(Zero-Trust Peer Jury), and Phase 5 (Logistics & Direct Payouts).

## Quickstart

```bash
cp .env.example .env          # edit values (or leave sandbox defaults)
pip install -r requirements.txt
alembic upgrade head           # requires a running Postgres at DATABASE_URL
uvicorn app.main:app --reload
```

Or via Docker (coordinate with Parth's `docker-compose.yml` for Postgres/Redis):

```bash
docker build -t artify-backend .
docker run -p 8000:8000 --env-file .env artify-backend
```

Interactive API docs: `http://localhost:8000/docs`

## Running tests

Tests run against an on-disk SQLite file (via `aiosqlite`) and `fakeredis`,
so the full suite runs with **no live Postgres/Redis required**:

```bash
pytest -v
```

41 tests total across the project; this module owns:
- `tests/test_mosje_eshram_auth.py` — e-KYC, e-Shram UAN, PM-SURAJ validation
- `tests/test_zero_trust_jury.py` — 2/3 quorum, velocity check, anti-fraud
  report, stale juror reassignment (shared with Yash)
- `tests/test_logistics_payout.py` — India Post dispatch, 0% middleman Jan
  Dhan payout, IVR voice alerts

## What's implemented

**Phase 1 — Foundation, Schemas & e-KYC**
- SQLAlchemy 2.0 async models: `Artisan`, `Product`, `ProductPricing`,
  `HeritagePassport`, `ChannelExport`, `JuryTicket`, `JuryVote`,
  `AntiFraudReport`, `PayoutTransaction` (+ supporting `LogisticsDispatch`)
- Async Alembic environment + hand-authored initial migration (`0001`)
- MoSJE / e-Shram / Pehchan-TRIFED Pydantic v2 schemas
- 4-digit PIN + JWT bearer auth (`/api/v1/auth/*`)

**Phase 3 (partial) — Zero-Trust Peer Review Jury**
- Randomized 3-peer juror assignment, excluding the product owner
  (anti-collusion guard)
- 2/3 quorum consensus math; per-vote craft score averaging
- Redis-backed juror velocity counter (`>20 approvals/hr` → auto-flag)
- Skin-in-the-Game: every vote's digital signature is FK-linked to the
  juror's e-KYC `Artisan` record
- Buyer `POST /verify/report-fake` → escalates to MoSJE DM queue; a confirmed
  collusion finding can slash juror trust scores and freeze welfare access
- Stale-juror (>24h inactive) auto-reassignment engine

**Phase 5 — Logistics & Direct Payouts**
- India Post Speed Post dispatch: tracking ID + Code-128 barcode generation,
  milestone timeline (`LABEL_CREATED → CSC_VLE_ACCEPTED → IN_TRANSIT →
  OUT_FOR_DELIVERY → DELIVERED`)
- Direct Jan Dhan escrow payout via PFMS/DBT/UPI at a hard-coded **0%**
  platform fee, UTR generation, full disbursement ledger
- Bhashini TTS IVR dispatch stub for order-dispatch / payment-credited
  notifications, with a sandbox-safe fallback when the real Bhashini
  endpoint isn't reachable

## Known gaps / next steps for the team

- **Task 1.5 (DPDP PII tokenization)** is Parth's — the `Artisan` model
  reserves `aadhaar_token` / `bank_account_token` / `jan_dhan_account_token`
  columns for his vault service to write into; this module never handles
  raw Aadhaar/bank data.
- Government API calls (MoSJE, e-Shram, TRIFED, PM-SURAJ, Bhashini) have a
  best-effort `httpx` call that **falls back to a deterministic sandbox mock**
  whenever the real endpoint is unreachable (expected in this offline build
  environment) — swap in real credentials in `.env` for integration testing.
  UTR/tracking-ID generation is similarly a sandbox stand-in for the real
  PFMS/India Post responses.
- Celery task queue is declared in `requirements.txt` but the IVR dispatch
  currently calls `notify_service` synchronously from the API route; wiring
  an actual Celery worker/broker for retry-on-failure is a follow-up.
- `test_auth_voice.py`, `test_artisan_verification.py`, and
  `test_inventory_drafts.py` are referenced in the roadmap's 41-test count
  but weren't assigned to Mayank's task list explicitly — worth checking
  with the team whether they overlap with `auth.py` / `verify_jury_service.py`
  or belong to another owner.
- No live Postgres/Redis in this build environment, so tests substitute
  SQLite + fakeredis; run against real infra before the hackathon demo to
  catch any Postgres-specific SQL dialect issues (e.g. `Numeric` precision).
