# ArtifyBharat Deployment & Operations Guide

> **Important**: This guide documents the current deployment policy, environment variable specifications, and intended hosting runbook for ArtifyBharat.
>
> **Not in scope / historical note**:
> - `legacy/` is excluded from the active codebase and CI pipelines.
> - `web-portal/` was permanently deleted in commit `b0cece4` (its Heritage Passport buyer verification and artisan hub flows are integrated into Next.js under `frontend/`).

---

## 1. Merge & Credentials Governance Rules

Because this repository is hosted under a GitHub Free plan, branch protection rules and automated secret scanning push protections are not natively enforceable by GitHub settings. Enforcing code quality, security, and credentials hygiene relies on CI automation, CODEOWNERS, and team discipline:

1. **Merge Gate Required**: Merges into `main` require a passing green `merge-gate` status check. The `merge-gate` job evaluates both `frontend-ci` (typechecking, Jest test suites, and Next.js production build) and `secret-scan` (Gitleaks fail-closed scan).
2. **Authorized Mergers**: Merges into `main` may only be executed by **`@parth5012`** and **`@yashitchugh`**. Other collaborators may open pull requests but must not merge.
3. **Merge Method**: **Merge commit only — NO squash**. This preserves discrete commit histories across feature branches.
4. **No Direct Pushes to `main`**: All changes must arrive via pull request so that `merge-gate` cannot be bypassed.
5. **Delete Branch on Merge**: Branches must be deleted automatically upon merge (`delete_branch_on_merge: true`).
6. **Tiered CODEOWNERS**:
   - General codebase (`*`): `@parth5012` and `@yashitchugh`.
   - Credentials & security surface (`.env*`, `docker-compose.yml`, `.github/workflows/`, `frontend/backend/bhashini.ts`, `frontend/tests/env-leak.test.ts`, `.gitleaks.toml`): **`@parth5012` only**. Any modification touching credentials or leak-guard invariants requires Parth's explicit approval.

---

## 2. Environment Variables Matrix

Every environment variable defined across `.env.example` (root) and `frontend/.env.example` is classified below.
Each key's consumer in the active codebase has been verified with ripgrep.

| Variable Name | Consumer in Code | Component Access | Scope & Prefix | Dev Default | Production Source | Purpose & Invariants |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | `frontend/lib/catalogApi.ts` | Frontend Client & Server | **Public** (`NEXT_PUBLIC_`) | `http://127.0.0.1:8000` | Host env / build config | Backend API gateway URL used by the browser catalog client. Safe for client-bundle exposure. |
| `DATABASE_URL` | `frontend/backend/db.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env (PostgreSQL / Supabase) | Postgres connection string. When unset, falls back to local file database in `data/artify.json`. Never expose to client. |
| `ONDC_CHECKOUT_URL` | `frontend/app/api/ondc/checkout/route.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env | ONDC buyer redirect checkout URL. Returns 503 if called when unset. |
| `ONDC_SELLER_LISTING_URL` | `frontend/backend/ondc.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env | ONDC seller network listing endpoint URL. |
| `ONDC_SELLER_TOKEN` | `frontend/backend/ondc.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env secret | Bearer authentication token for ONDC seller network API. |
| `ONDC_WEBHOOK_SECRET` | `frontend/app/api/ondc/webhook/route.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env secret | Shared HMAC secret for verifying inbound ONDC webhook signatures. |
| `CONFIRMATION_CALL_URL` | `frontend/backend/notifications.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env | Telephony / IVR gateway endpoint for vernacular payment confirmation calls. |
| `CONFIRMATION_CALL_TOKEN` | `frontend/backend/notifications.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env secret | Bearer auth token for confirmation call service. |
| `OTP_PROVIDER_URL` | `frontend/backend/otp.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env | SMS gateway endpoint for artisan mobile OTP delivery. |
| `OTP_PROVIDER_TOKEN` | `frontend/backend/otp.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env secret | Authentication token for SMS OTP gateway. |
| `OTP_PROVIDER_TEMPLATE` | `frontend/backend/otp.ts` | Frontend Server Route | **Server-only** | `'artifact-login'` | Host env | SMS message template ID used by OTP provider. |
| `STUDIO_SERVICE_URL` | Reserved (remote worker) | None (server worker) | **Server-only** | *Unset* | Host env | Remote OpenCV / rembg processing worker URL (local runs via child process). |
| `STUDIO_SERVICE_TOKEN` | Reserved (remote worker) | None (server worker) | **Server-only** | *Unset* | Host env secret | Auth token for remote studio processing service. |
| `GEMINI_API_KEY` | `legacy/backend/` (root template) | Server-side only | **Server-only** | *Unset* | Host env secret | Google Gemini API key for fair wage market pricing research. Never expose to client. |
| `GEMINI_MODEL` | `legacy/backend/` (root template) | Server-side only | **Server-only** | `gemini-2.0-flash` | Host env | Model identifier for Gemini AI market research queries. |
| `BHASHINI_API_KEY` | `frontend/backend/bhashini.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env secret | Bhashini / ULCA authentication key. **CRITICAL**: Never prefix with `NEXT_PUBLIC_`. Guarded by `env-leak.test.ts`. |
| `BHASHINI_USER_ID` | `frontend/backend/bhashini.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env | Bhashini user ID header. Server-side only; never expose to client bundle. |
| `BHASHINI_TRANSLATION_SERVICE_ID` | `frontend/backend/bhashini.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env | Bhashini pipeline translation service ID. Server-side only. |
| `BHASHINI_INFERENCE_URL` | `frontend/backend/bhashini.ts` | Frontend Server Route | **Server-only** | `https://dhruva-api.bhashini.gov.in/services/inference/pipeline` | Host env | Bhashini Dhruva pipeline inference endpoint. Server-side only. |
| `BHASHINI_INFERENCE_API_KEY` | `frontend/backend/bhashini.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env secret | Bhashini compute inference API key. **CRITICAL**: Never prefix with `NEXT_PUBLIC_`. Guarded by `env-leak.test.ts`. |

### Client-Bundle Leak Protection Invariant

The project enforces an automated leak guard in `frontend/tests/env-leak.test.ts`:
- **Server-only credentials** must NEVER be prefixed with `NEXT_PUBLIC_`.
- Server modules (such as `frontend/backend/bhashini.ts`) must never be value-imported by client components (`frontend/lib/`, `frontend/components/`, `frontend/app/` outside `/api/`).
- Real secret strings must never be hardcoded into tracked repository files or built Next.js static client chunks.
- `.env.example` templates must contain only placeholder definitions.

---

## 3. Intended-Target Runbook

> ### **TARGET TBD — no production infrastructure exists yet**
> Today, no production deployment target exists:
> - There is no root `Dockerfile`.
> - `docker-compose.yml` points at `./backend` (which moved to `legacy/backend/`) and mounts `web-portal/index.html` (deleted in commit `b0cece4`). It cannot build in the current tree.
> - CI contains no deploy job.
> - No configuration exists for Vercel, Render, Fly.io, AWS ECS, or Procfile-based hosting.
>
> Do not attempt automated deploy execution until infrastructure is provisioned in #154. Deployment execution remains restricted to **`@parth5012` only**.

### Intended Deployment Topology (Specification)

When production hosting is selected, the application will be hosted as follows:

1. **Hosting Target**: A Node.js 20+ runtime container or managed Next.js hosting platform running the `frontend/` application.
2. **Database**: Managed PostgreSQL instance (Supabase / RDS) connected via `DATABASE_URL` with SSL mode enabled.
3. **Storage / Object Store**: S3-compatible bucket (or Cloudflare R2) for artisan product media and generated thermal receipts.
4. **AI / Voice Microservices**:
   - Bhashini Dhruva pipeline access configured through server-side environment variables.
   - Background Python processing worker for OpenCV / rembg studio enhancements.

### Runbook for Deploy Execution (Parth Only — Deferred to #154)

When infrastructure is provisioned, the deploy sequence will follow these steps:

1. **Verify Prerequisites**:
   - Ensure the commit on `main` has passed all items in `docs/release-checklist.md`.
   - Confirm all production environment variables from the matrix above are set in the host secrets manager.
2. **Build and Validate Locally**:
   ```bash
   cd frontend
   npm ci
   npx tsc --noEmit
   npm test
   npm run build
   ```
3. **Deploy Application Artifact**:
   - Build container or trigger hosting platform deployment from the verified release tag `vX.Y.Z`.
   - Inject server-only environment variables via host environment (never check in `.env.production`).
4. **Post-Deploy Smoke Test**:
   - Exercise buyer verification: `/verify/{shortcode}`.
   - Exercise artisan login and registration OTP flows.
   - Exercise voice translation / ASR endpoint `/api/voice`.
5. **Rollback Plan**:
   - If smoke tests fail, immediately revert deployment traffic to the previous known-good tag.
