# 📋 Artify Bharat: Complete Technical Roadmap & Execution Checklist
> **Ministry of Social Justice and Empowerment (MoSJE) — SIH PS 26090**  
> Complete End-to-End Task Matrix, Required Tech Stack, APIs, AI Pipelines, and Implementation Checklist.

---

## 🛠️ 1. Complete Technology Stack & Tooling

```
+---------------------------------------------------------------------------------------------------+
|                                      FULL-STACK TECHNOLOGY MATRIX                                 |
+-------------------+-------------------------------------------------------------------------------+
| Layer             | Technologies & Frameworks                                                     |
+-------------------+-------------------------------------------------------------------------------+
| Client Layer      | Responsive Web / PWA (React 18 / Next.js 14 / HTML5 / Tailwind CSS)           |
| Browser Web APIs  | MediaDevices API (1:1 Camera), W3C Geolocation API, Web Speech API / Bhashini |
|                   | Web Bluetooth API (58mm ESC/POS Thermal), IndexedDB, ServiceWorker Background |
+-------------------+-------------------------------------------------------------------------------+
| Backend Gateway   | Python 3.12+, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0 Async, Alembic     |
| Async Task Worker | Celery 5.4, Redis 7 (Broker & Result Backend), AsyncIO Task Queues            |
+-------------------+-------------------------------------------------------------------------------+
| AI / Vision Studio| rembg (U²-Net non-generative background isolation), OpenCV CLAHE (LAB space)  |
+-------------------+-------------------------------------------------------------------------------+
| Multilingual NLP  | Bhashini Voice APIs, Whisper ASR (regional dialects), IndicTrans2, Mistral-7B |
+-------------------+-------------------------------------------------------------------------------+
| Dynamic Pricing   | XGBoost Regression Engine, State Minimum Skilled-Wage Database Benchmarks     |
+-------------------+-------------------------------------------------------------------------------+
| Cryptography & Tag| SHA-256 Digest Engine, qrcode[pil] / SVG Vector Generator, ESC/POS Byte Stream |
+-------------------+-------------------------------------------------------------------------------+
| Databases & Store | PostgreSQL 16 (Relational DB), AWS S3 / MinIO (Object Storage), PII Vault     |
+-------------------+-------------------------------------------------------------------------------+
| DPI Integrations  | GeM Portal (B2G XML/CSV), ONDC Beckn Protocol (B2C), WhatsApp Cloud API,      |
|                   | India Post / CSC First-Mile Logistics Adapter, Direct Jan Dhan / UPI Escrow   |
+-------------------+-------------------------------------------------------------------------------+
| DevOps & Testing  | Docker Compose, GitHub Actions CI, Pytest, Playwright E2E Test Suite          |
+-------------------+-------------------------------------------------------------------------------+
```

---

## 🌐 2. Comprehensive REST & WebSocket API Directory

### 🪪 A. Authentication & MoSJE DPI Service (`/api/v1/auth`)
- `POST /auth/register` — Voice-first registration with 4-digit security PIN and dialect selection.
- `POST /auth/login` — 4-digit PIN authentication returning JWT bearer token.
- `POST /auth/verify-artisan-id` — Master Pehchan Card and TRIFED ID registry validation.
- `POST /auth/mosje-verify` — MoSJE PM-DAKSH training certification & PM-SURAJ credit lookup.
- `POST /auth/eshram-lookup` — 12-digit e-Shram Universal Account Number (UAN) lookup.
- `POST /auth/pmsuraj-lookup` — Concessional credit and subsidy sanction status lookup.

### 🖼️ B. AI Image Studio Service (`/api/v1/studio`)
- `POST /studio/enhance` — U²-Net background clutter isolation, OpenCV CLAHE illumination equalization in LAB space, 1:1 auto-crop, and visual complexity scoring.

### 🗣️ C. Multilingual NLP & Assistant Service (`/api/v1/catalog`, `/api/v1/assistant`)
- `POST /catalog/voice` — Whisper ASR dialect transcription, IndicTrans2 translation across 22 languages, and Mistral-7B structured catalog JSON extraction.
- `POST /assistant/dadi` — 'Ask Dadi' conversational dialect assistant providing photography tips, pricing math, and PM-DAKSH skill training nudges.

### 📊 D. Dynamic Pricing & Fair Wage Engine (`/api/v1/pricing`)
- `POST /pricing/calculate` — Bottom-up base costing enforcing statutory skilled wage floors ($\text{Base Cost} = C_{\text{mat}} + T_{\text{labor}} \times W_{\text{skill}} + C_{\text{overhead}}$) and generating 3-tier price outputs (Floor, Retail, Bulk).

### 🔐 E. Zero-Trust Verification & Peer Jury (`/api/v1/verify`)
- `POST /verify/jury/assign` — Assigns 3 randomized anonymized peer jurors from the cluster craft pool.
- `POST /verify/jury/vote` — Records juror verdict, craft authenticity score, and computes 2/3 quorum consensus.
- `GET /verify/jury/status/{jury_ticket_id}` — Retrieves jury progress and status.
- `POST /verify/report-fake` — Buyer anti-fraud feedback trigger reporting suspected counterfeit or machine-made goods.

### 🏷️ F. Digital Passport & Physical Printing (`/api/v1/passport`)
- `POST /passport/issue` — Generates deterministic SHA-256 hash, vector QR code, 6-character shortcode (`A7X-9B2`), and base64 ESC/POS 58mm thermal print byte stream.
- `GET /passport/verify/{passport_hash}` — Public verification portal lookup using SHA-256 hash.
- `GET /passport/code/{shortcode}` — Instant shortcode resolution (e.g., `A7X-9B2`) for web and mobile browsers.

### 📦 G. Multi-Channel Exports & Logistics (`/api/v1/exports`, `/api/v1/logistics`)
- `POST /exports/sync` — Unified Bi-Directional export to GeM XML, ONDC Beckn, WhatsApp Commerce, and SHG Bulk Portals.
- `POST /logistics/india-post/dispatch` — Generates India Post / CSC parcel dispatch slip and Code-128 routing barcode.
- `GET /logistics/india-post/track/{tracking_id}` — Real-time tracking timeline for parcel transit.

### 💳 H. Direct Jan Dhan Payouts & IVR Alerts (`/api/v1/payouts`, `/api/v1/notify`)
- `POST /payouts/direct-transfer` — Direct middleman-free Jan Dhan escrow settlement to artisan bank accounts.
- `POST /notify/send` — Automated Bhashini IVR dialect telephone voice call alerts informing offline artisans about orders and payouts.

### 📈 I. Ministry & Admin Dashboard (`/api/v1/admin`)
- `GET /admin/district-heatmap` — Live district economic heatmap tracking wages disbursed, active artisans, and cluster GI protection.
- `GET /admin/audit-logs` — Immutable audit logs of peer jury consensus and counterfeit anomaly checks.
- `GET /admin/pmdaksh-metrics` — PM-DAKSH skill training progress and wage multiplier analytics.
- `GET /admin/demand-forecast` — Predictive Demand AI forecasting festive surges (Diwali 3.8x surge).

---

## 📋 3. Complete Phased Execution To-Do Checklist

---

### 🏗️ Phase 1: Core Foundation & Government e-KYC Auth Layer
- [x] **Task 1.1: Database Schema & Migrations**
  - **Tech**: PostgreSQL 16, SQLAlchemy 2.0 Async, Alembic.
  - **Files**: `backend/app/models/` (`Artisan`, `Product`, `ProductPricing`, `HeritagePassport`, `ChannelExport`, `JuryTicket`).
  - **Done Criteria**: `alembic upgrade head` runs cleanly creating all relational tables.
- [x] **Task 1.2: MoSJE, e-Shram & Pehchan DPI Verification**
  - **Tech**: FastAPI, Pydantic v2, Python `hashlib` / `bcrypt`.
  - **Files**: `backend/app/schemas/mosje.py`, `backend/app/api/v1/auth.py`.
  - **Done Criteria**: Unit tests in `tests/test_mosje_eshram_auth.py` pass 100%.
- [x] **Task 1.3: Secure PII Vault & DPDP Compliance**
  - **Tech**: AES-256 tokenization for e-Shram UANs and bank account numbers.
  - **Done Criteria**: No raw Aadhaar or unmasked bank account numbers logged in plain text.

---

### 🧠 Phase 2: AI Vision Studio & Multilingual Voice NLP Pipeline
- [x] **Task 2.1: Non-Generative Image Studio Engine**
  - **Tech**: `rembg U²-Net`, `OpenCV (CLAHE LAB space)`, `NumPy`.
  - **Files**: `backend/app/services/cv_service.py`, `backend/app/api/v1/studio.py`.
  - **Constraint**: Strict ban on generative AI (no Stable Diffusion room hallucinations or texture smoothing).
  - **Done Criteria**: `tests/test_cv_enhancement.py` passes 100%.
- [x] **Task 2.2: Multilingual Voice NLP & 'Ask Dadi' Companion**
  - **Tech**: Whisper ASR, IndicTrans2, Mistral-7B, Bhashini Voice APIs.
  - **Files**: `backend/app/services/nlp_service.py`, `backend/app/services/assistant_service.py`.
  - **Done Criteria**: Bhojpuri audio input generates structured catalog JSON with GI tag status.

---

### 💰 Phase 3: Dynamic Pricing & Zero-Trust Peer Review Engine
- [x] **Task 3.1: Statutory Fair-Wage Engine & 3-Tier Pricing Slider**
  - **Tech**: XGBoost Regression, State Minimum Wage Benchmarks from PostgreSQL.
  - **Formula**: $\text{Base Cost} = C_{\text{mat}} + (T_{\text{labor}} \times W_{\text{skill}}) + C_{\text{overhead}}$.
  - **Files**: `backend/app/services/pricing_service.py`, `backend/app/api/v1/pricing.py`.
  - **Done Criteria**: `tests/test_pricing_engine.py` validates statutory wage floor invariant.
- [x] **Task 3.2: Zero-Trust Peer Jury & Anti-Corruption DPI**
  - **Tech**: Redis velocity counter (`approvals_per_hour`), Randomized 3-Artisan Quorum.
  - **Files**: `backend/app/services/verify_jury_service.py`, `backend/app/api/v1/verification_jury.py`.
  - **Done Criteria**: `tests/test_zero_trust_jury.py` validates 2/3 consensus and anti-fraud reporting.

---

### 🏷️ Phase 4: Cryptographic Passport, 6-Char Shortcode & 58mm Thermal Printing
- [x] **Task 4.1: Deterministic SHA-256 Digital Passport & 6-Char Shortcode Generator**
  - **Tech**: Python `hashlib.sha256`, `qrcode[pil]`, shortcode indexer.
  - **Files**: `backend/app/services/passport_service.py`, `backend/app/api/v1/passport.py`.
  - **Done Criteria**: `tests/test_shortcode_passport.py` resolves shortcode `A7X-9B2` in <35ms.
- [x] **Task 4.2: Web Bluetooth 58mm ESC/POS Binary Thermal Stream Generator**
  - **Tech**: ESC/POS byte protocol generator (`\x1b\x40`, `\x1b\x61\x01`, `\x1b\x45\x01`).
  - **Files**: `backend/app/services/passport_service.py`, `web-portal/index.html`.
  - **Done Criteria**: Generates base64 ESC/POS stream for NRLM Bank Sakhi portable thermal printers.

---

### 🌐 Phase 5: Multi-Channel Export Adapters & Logistics
- [x] **Task 5.1: Unified Multi-Channel Catalog Sync**
  - **Tech**: GeM XML Schema, ONDC Beckn Protocol JSON, WhatsApp Cloud API Interactive Cards, SHG Bulk Wholesale CSV.
  - **Files**: `backend/app/services/export_service.py`, `backend/app/api/v1/exports.py`.
  - **Done Criteria**: `tests/test_export_adapters.py` passes 100%.
- [x] **Task 5.2: First-Mile Logistics & Jan Dhan Direct Escrow Settlement**
  - **Tech**: India Post Speed Post / CSC PIN routing, Code-128 Barcode generation, Direct Bank Escrow API.
  - **Files**: `backend/app/services/logistics_service.py`, `backend/app/services/payout_service.py`.
  - **Done Criteria**: `tests/test_logistics_payout.py` executes 0% middleman escrow settlement.
- [x] **Task 5.3: Bhashini Automated IVR Voice Alerts**
  - **Tech**: Bhashini TTS voice call dispatcher in regional dialects.
  - **Files**: `backend/app/services/notify_service.py`, `backend/app/api/v1/notify.py`.
  - **Done Criteria**: Automated IVR telephony payload generated for offline rural weavers.

---

### 📱 Phase 6: Responsive Web Client & PWA Hub (`web-portal/`)
- [x] **Task 6.1: Dual-Role Access Engine (Artisan Direct vs SHG Leader Hub)**
  - **Tech**: Responsive HTML5, JavaScript, CSS3 Design System, Material Terracotta Palette.
  - **Done Criteria**: 1-click toggle switches seamlessly between solo artisan and 50-artisan aggregator hub.
- [x] **Task 6.2: Browser MediaDevices 1:1 Camera Studio with Gyro Leveling**
  - **Tech**: HTML5 `MediaDevices API`, `DeviceOrientationEvent` gyroscope listener, 1:1 square canvas.
  - **Done Criteria**: Gallery uploads blocked; camera guides user with green spirit level when tilt ≤ 1.5°.
- [x] **Task 6.3: W3C Geolocation & UTC Timestamp Locking**
  - **Tech**: `navigator.geolocation.getCurrentPosition()`, cluster geofence validator.
  - **Done Criteria**: Automatically locks live coordinates (`25.3176° N, 82.9739° E`) to photo payload.
- [x] **Task 6.4: Bhashini Voice Recording & 3-Tier Interactive Price Slider**
  - **Tech**: Web Speech API / MediaRecorder, HTML5 Range input with real-time cost breakdown calculation.
  - **Done Criteria**: Real-time slider updates statutory floor, fair retail, and bulk wholesale tiers.
- [x] **Task 6.5: IndexedDB Offline Queue & Service Worker Sync**
  - **Tech**: Browser IndexedDB API, ServiceWorker Background Sync auto-retry queue.
  - **Done Criteria**: Zero-network weaver pit drafts saved locally and auto-synced upon reconnecting.

---

### 🔍 Phase 7: Public Buyer Verification Portal & Anti-Fraud Feedback Loop
- [x] **Task 7.1: 6-Character Shortcode & QR Code Search**
  - **Tech**: Responsive verification UI, camera QR scanner, fast shortcode input (`A7X-9B2`).
  - **Done Criteria**: Resolves sample passports for Banarasi Saree, Madhubani Painting, and Kashmir Pashmina.
- [x] **Task 7.2: Dual-View Proof of Creation & Native Audio Story**
  - **Tech**: WIP Loom stage photo vs Clean Studio portrait, streaming HTML5 audio player.
  - **Done Criteria**: Displays raw loom warp photo with GPS badge and plays Radha Devi's Bhojpuri narrative.
- [x] **Task 7.3: Itemized Fair Price Breakdown (0% Middleman)**
  - **Tech**: Transparent cost disclosure card (Raw Materials, Fair Labor Wages, Direct Profit, Packaging).
  - **Done Criteria**: Shows buyer exact 80%+ direct realization to artisan.
- [x] **Task 7.4: Post-Market Anti-Fraud Audit Trigger ("🚩 Report Fake")**
  - **Tech**: Interactive reporting modal connected to `POST /api/v1/verify/report-fake`.
  - **Done Criteria**: Submitting fake report escalates ticket to MoSJE DM queue and notifies user.

---

### 📊 Phase 8: MoSJE Admin & District Magistrate Dashboard
- [x] **Task 8.1: Live District Economic Heatmaps**
  - **Tech**: Geospatial cluster aggregator across Varanasi, Madhubani, Kashmir, Kutch, and Pochampally.
  - **Done Criteria**: Real-time monitoring of wages disbursed (₹3.19 Cr) and active artisans (4,900).
- [x] **Task 8.2: Zero-Trust Anti-Corruption Audit Logs**
  - **Tech**: Immutable table tracking peer review consensus, anomaly scores, and verifier digital signatures.
  - **Done Criteria**: Live audit feed displaying approved and flagged audit records.
- [x] **Task 8.3: Predictive Demand AI (Festival Forecasting)**
  - **Tech**: Prophet time-series model forecasting Q4 Diwali surges (3.8x multiplier).
  - **Done Criteria**: Generates actionable cluster yarn stockpiling advisory.

---

### 🚀 Phase 9: Quality Assurance, Automated Testing & Verification
- [x] **Task 9.1: Automated Backend Test Suite**
  - **Tech**: Pytest, Pytest-Asyncio, HTTPX AsyncClient.
  - **Execution**: `uv run pytest -v`.
  - **Result**: **38 test cases passing 100% cleanly in 1.26s**.
- [x] **Task 9.2: Documentation Integrity & Judge Winning Pitches**
  - **Files**: `docs/artisan-end-to-end-flow.md`, `docs/buyer-end-to-end-flow.md`, `docs/architecture.md`, `docs/architecture-mermaid.mmd`, `README.md`.
  - **Done Criteria**: Complete pitch defenses prepared for bribery, thermal printer feasibility, and AI synthetic concerns.
