# Blockers

> Agent writes here when it cannot proceed. Human resolves and unblocks.

## Active Blockers

| ID | Date | Description | Attempted | Needs |
|----|------|-------------|-----------|-------|
| B-2026-09-14-01 | 2026-09-14 | Bhashini Dhruva inference rejects requests: HTTP 500 with default service IDs, HTTP 400 `Invalid Service Id` with alternates (narrowed 2026-09-25: **keys are valid** — auth probe without headers → 403 `Not authenticated`, with `frontend/.env.local` headers → passes auth to 422/400; `BHASHINI_USER_ID` + `BHASHINI_API_KEY` + `BHASHINI_INFERENCE_API_KEY` now live in `frontend/.env.local`; model-search discovery endpoints 404 from all known hosts) | Isolated curl matrix: auth/no-auth control, 4 serviceId variants, pipelineId-style config, 4 model-search URL variants, ULCA `authenticate-key` path; consistent 500 on retry — not transient | **Parth (manual, deferred):** log into Bhashini/Dhruva portal, subscribe the account to one ASR + one translation model, copy their `serviceId`s into `frontend/.env.local` as `BHASHINI_ASR_SERVICE_ID` / `BHASHINI_TRANSLATION_SERVICE_ID`, re-run a live `/api/voice` probe. E2E #150 unaffected (browser `clientTranscript` path bypasses Dhruva). |
| B-2026-09-23-01 | 2026-09-23 | Production OTP delivery: adapter (`backend/otp.ts`), rate limiting, and session recovery are code-complete and tested; live SMS cannot be sent from development | Set `OTP_PROVIDER_URL`, `OTP_PROVIDER_TOKEN`, `OTP_PROVIDER_TEMPLATE` in the deployment environment (Yash/Parth: provider account needed) |
| B-2026-09-23-02 | 2026-09-23 | ONDC network certification + confirmation-call voice templates: seller listing, checkout redirect, signed webhook with idempotency, settlement attribution, and regional confirmation calls are code-complete and tested; certification is an external process | Complete ONDC buyer/seller certification and configure `CONFIRMATION_CALL_URL`/`TOKEN` plus voice templates with the call provider (team decision, external) |

## Resolved Blockers

_None yet._

| ID | Date Resolved | Description | Resolution |
|----|---------------|-------------|------------|
| —  | —             | —           | —          |
