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
| `ONDC_SELLER_LISTING_URL` | `frontend/backend/ondc.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env | Seller publish endpoint (#193): POST target for the mapped on_search catalog envelope. Local sandbox demo: `http://localhost:3100/retail/1.1.0/search` (any POST-only mock-BPP route answers 200). Unset ⇒ grill-A1 mocked-publish fallback, audited as `ondc.listing_fallback`. |
| `ONDC_SELLER_TOKEN` | `frontend/backend/ondc.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env secret | Bearer authentication token for ONDC seller network API. |
| `ONDC_WEBHOOK_SECRET` | `frontend/app/api/ondc/webhook/route.ts` | Frontend Server Route | **Server-only** | *Unset* | Host env secret | Shared HMAC secret for verifying inbound ONDC webhook signatures. |
| `GEM_PORTAL_API_URL` | `frontend/backend/gem.ts` (`getGemEnv`, #204) | Frontend Server Route | **Server-only** | *Unset* | Host env | RESERVED for a future GeM-approved seller API (GeM exposes no public catalog-upload API — map #201). Packet generation needs neither value: unset ⇒ `getGemEnv()` returns `{configured:false, reason:'GEM_PORTAL_API_URL is not configured'}`, audited as `product.gem_packet`. |
| `GEM_SELLER_TOKEN` | `frontend/backend/gem.ts` (`getGemEnv`, #204) | Frontend Server Route | **Server-only** | *Unset* | Host env secret | RESERVED bearer token for a future GeM seller API. Never returned by `getGemEnv()` and never present in the packet response; client reads are blocked by the `GEM_*` needles in `frontend/tests/env-leak.test.ts`. |
| `ONDC_GATEWAY_URL` | `frontend/backend/ondc.ts` (`searchCatalogOnSandbox`, #193) | Frontend Server Route | **Server-only** | `http://localhost:3100` | Host env | Beckn Gateway base URL. Local default points at the `beckn_sandbox` sidecar in `docker-compose.yml`; switch to `https://staging.gateway.ondc.org` for staging. Code falls back to `http://localhost:3100` when unset. See section 4. |
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

---

## 4. Local ONDC Beckn Sandbox (Offline Judge Demo)

The ONDC demo runs entirely on the laptop — no ONDC network-participant registration, no staging credentials, and no network dependency once images are built/pulled. The demo service is `beckn_sandbox` in `docker-compose.yml` (Wayfinder #191); the historical services above it are untouched and remain non-building.

### 4.1 Boot via the integrated compose file (recommended)

```bash
docker compose config -q        # validates the file without a docker daemon
docker compose up beckn_sandbox # offline judge demo
```

| Service | Role | Host ports | Image / source | Started by |
| :--- | :--- | :--- | :--- | :--- |
| `beckn_sandbox` | Mock BPP (canned Beckn Retail responses) | `3100 -> 3000` | build `github.com/beckn/beckn-sandbox` pinned to `644ccd1608ac69b1574af144878668d18719bff8` | `docker compose up beckn_sandbox` |
| `ondc_gateway` | Beckn Gateway (BG) | `4000`, `4030` | `fidedocker/gateway:multiarch@sha256:307f28f554f6910fdcdf34d126e3d73cf452465fe613c90246931545e1c3a72f` | `--profile ondc-gateway` only |
| `ondc_registry` | Beckn/ONDC Registry | `3200->3000`, `3030` | `fidedocker/registry:multiarch@sha256:d42b1367ca4ef6c7ec8c766b6852829af50c12464635dfdc4e98134b4cc3edab` | `--profile ondc-gateway` only |

Notes:
- Host port **3100** avoids 3000 (Next.js dev server and the historical `web_portal` mapping) and 8000/5432/6379/9000.
- `PORT=3000` is set explicitly: upstream `src/main.ts` calls `listen(process.env.PORT)` with no fallback, and upstream never ships a `.env`.
- The `beckn_sandbox` healthcheck is derived (any HTTP reply from the listener = healthy) because upstream registers **POST-only** routes and no GET health path.
- `ondc_gateway` / `ondc_registry` are digest-pinned images that Beckn publishes for its own `beckn/beckn-onix` `install/docker-compose-*.yml` files. They are **optional, profile-gated and were not booted while writing this ticket** (CI has no docker daemon); no gateway properties, signing keys or registry subscription are configured here. They are **not** required by the demo.

Smoke check once running:

```bash
docker compose ps beckn_sandbox                    # status: healthy
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3100/   # 404 => NestJS listener is up (root is POST-only)
```

The Mock BPP serves canned Beckn Retail 1.1.0 actions, e.g. `POST http://localhost:3100/retail/1.1.0/search` (also `/select`, `/init`, `/confirm`, `/status`, …) and `POST /dhp/search`.

### 4.2 Alternative: standalone clone (no compose)

```bash
git clone https://github.com/beckn/beckn-sandbox.git
cd beckn-sandbox
npm install
PORT=3000 npm run start:dev     # per its README: npm install && npm run start:dev
```

Per the upstream README, set the **BPP Client URL** and **Base URL** in a local `.env` only if you exercise the webhook-forwarding path. That file is git-ignored upstream — never commit it, and never copy real endpoints or tokens into this repository.

### 4.3 Signing (Ed25519) and registry lookup pointers

- **Ed25519 request signing / webhook verification**: [beckn/protocol-server](https://github.com/beckn/protocol-server) is the Beckn BAP/BPP protocol layer that performs signing and verification; its keys live in its own `config/default.yml`, never in this repository. ONDC HMAC verification of inbound webhooks stays behind `ONDC_WEBHOOK_SECRET` (server-only).
- **Registry lookup** (subscribers, key lookup): the local `ondc_registry` image is the stand-in for lookup during the demo; the authoritative specs are [ONDC-Official/ONDC-Registry-Specifications](https://github.com/ONDC-Official/ONDC-Registry-Specifications). No registry subscription is created locally.
- **Protocol contracts**: [ONDC-Official/ONDC-Protocol-Specs](https://github.com/ONDC-Official/ONDC-Protocol-Specs) (Retail `/search`, `/on_search`, `/select`, `/init`, `/confirm`).

### 4.4 What is not provided locally

| Piece | Status locally | Where to get it |
| :--- | :--- | :--- |
| Mock BPP | **Provided** (`beckn_sandbox`) | built from `beckn/beckn-sandbox` |
| Beckn Gateway (BG) | Optional image only (`ondc_gateway`), unconfigured | Beckn Gateway docs; onix wiring in `beckn/beckn-onix` `install/` |
| Registry | Optional image only (`ondc_registry`), no subscription | ONDC registry specs; onix `install/docker-compose-registry.yml` |
| Mock BAP | **Not provided** | no credible standalone public mock-BAP image exists; the Beckn BAP pair is `fidedocker/protocol-server` (bap-client/bap-network) in `beckn/beckn-onix`, which needs Ed25519 keys + a registry subscription first |
| Registered staging traffic | **Not provided** | `https://staging.gateway.ondc.org` requires ONDC network-participant registration |

**Env switch**: `ONDC_GATEWAY_URL` in `frontend/.env.example` defaults to `http://localhost:3100` (the local sidecar). Point it at `https://staging.gateway.ondc.org` only after registration exists; all `ONDC_*` variables remain server-only.

### 4.5 Spec vs upstream reality

The Wayfinder grill (Q2) and ticket #191 assumed that `github.com/beckn/beckn-sandbox` ships a compose topology with **BG + Mock BPP + Mock BAP + Registry** in one file. Upstream reality, verified against the repository (`main` @ `644ccd16`, last push 2025-07-22):

- `beckn-sandbox` is a **single NestJS app** named `sandbox-bpp` (port 3000, `pm2-runtime ecosystem.config.js`) with per-domain canned response packs. It contains **no compose file, no Gateway, no Registry and no Mock BAP**; its own `deploy-sandbox.sh` just runs `docker build` + `docker run --network host`.
- Therefore the four-service topology promised by the ticket cannot be sourced "from beckn-sandbox".
- What this repository does about it: `docker-compose.yml` builds the mock BPP from a commit-pinned `beckn-sandbox` ref (`beckn_sandbox`), adds the only Beckn-published, digest-pinnable **BG** and **Registry** images available (`fidedocker/gateway`, `fidedocker/registry`, from Beckn's own `beckn-onix` install compose) behind the opt-in `ondc-gateway` profile, and declares **no Mock BAP service** rather than inventing one. `ONDC_GATEWAY_URL` defaults to the local sidecar, with the staging switch documented above.

Also note: `docs/ondc-basics.md` (session note) still describes `beckn-sandbox` as booting "fake Gateway + fake seller + fake buyer + Registry with one command" — that statement is the same mistaken assumption and does not match upstream.
