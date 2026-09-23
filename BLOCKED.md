# Blockers

> Agent writes here when it cannot proceed. Human resolves and unblocks.

## Active Blockers

| ID | Date | Description | Attempted | Needs |
|----|------|-------------|-----------|-------|
| B-2026-09-14-01 | 2026-09-14 | Bhashini discovery still returns HTTP 500 with the selected model IDs | Added direct model configuration, separate UDYAT/inference headers, and correct `pipelineRequestConfig`; mock test, lint, build, and diagnostics pass | Add the full UDYAT key as `BHASHINI_ULCA_API_KEY` and confirm a valid pipeline ID permitted for this account |
| B-2026-09-23-01 | 2026-09-23 | Production OTP delivery: adapter (`backend/otp.ts`), rate limiting, and session recovery are code-complete and tested; live SMS cannot be sent from development | Set `OTP_PROVIDER_URL`, `OTP_PROVIDER_TOKEN`, `OTP_PROVIDER_TEMPLATE` in the deployment environment (Yash/Parth: provider account needed) |
| B-2026-09-23-02 | 2026-09-23 | ONDC network certification + confirmation-call voice templates: seller listing, checkout redirect, signed webhook with idempotency, settlement attribution, and regional confirmation calls are code-complete and tested; certification is an external process | Complete ONDC buyer/seller certification and configure `CONFIRMATION_CALL_URL`/`TOKEN` plus voice templates with the call provider (team decision, external) |

## Resolved Blockers

_None yet._

| ID | Date Resolved | Description | Resolution |
|----|---------------|-------------|------------|
| —  | —             | —           | —          |
