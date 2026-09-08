# Artify Bharat (SIH PS 26090) — GitHub Issues & Execution Sequence

This document breaks down the entire Artify Bharat project into sequential, bite-sized GitHub Issues categorized across 4 execution milestones.

---

## 🗺️ Milestone Overview & Sequence

| # | Issue Title | Area | Dependency | Estimated Effort |
|---|---|---|---|---|
| **#1** | `[Infra] PostgreSQL Async Schema, Migrations & Redis Celery Broker` | Backend / Infra | None | 2 Days |
| **#2** | `[Auth] Voice-First Onboarding & PIN Authentication Service` | Backend / Auth | #1 | 2 Days |
| **#3** | `[Data] Automated E-Commerce Benchmark Price Scraper Cron` | Data / Worker | #1 | 2 Days |
| **#4** | `[AI/CV] U²-Net Salient Background Removal, CLAHE & 1:1 Studio Cropping` | AI / CV | #1 | 3 Days |
| **#5** | `[AI/NLP] Dialect ASR, IndicTrans2 Translation & Mistral-7B Cataloger` | AI / NLP | #1 | 3 Days |
| **#6** | `[AI/ML] Dynamic Fair-Wage Pricing Engine with XGBoost Regression` | AI / ML | #3, #4 | 3 Days |
| **#7** | `[Crypto] Deterministic SHA-256 Heritage Passport & QR Code Engine` | Backend / Security | #1, #6 | 2 Days |
| **#8** | `[Export] Multi-Channel Adapters for GeM XML/CSV, ONDC Beckn & B2B` | Backend / Integration | #7 | 2 Days |
| **#9** | `[Android] 7-Stage High-Contrast Jetpack Compose Presentation Flow` | Android / UI | #2, #4, #5, #6, #7, #8 | 4 Days |
| **#10** | `[Android] Room SQLite Offline Task Queue for Low-Bandwidth Areas` | Android / Data | #9 | 2 Days |
| **#11** | `[Web] Public Heritage Passport Verification Portal with Voice Stream` | Web Portal / Frontend | #7 | 2 Days |
| **#12** | `[Harness] Agent Action Space, Error Recovery Contracts & Benchmark Evaluator` | QA / Evaluation | #1-#11 | 2 Days |
| **#13** | `[DevOps] Complete Docker Compose Microservice Stack & CI Pipeline` | DevOps / CI | #1-#12 | 1 Day |

---

## 📋 Granular Issue Descriptions

### 🏗️ Milestone 1: Foundation & Data Infrastructure

---

#### Issue #1: `[Infra] PostgreSQL Async Schema, Migrations & Redis Celery Broker`
- **Labels**: `ready-for-agent`, `backend`, `infrastructure`
- **Milestone**: `Milestone 1: Foundation`
- **Description**:
  Scaffold the asynchronous database layer, Redis queue, and Alembic database migration environment.
- **Acceptance Criteria**:
  - [ ] Define SQLAlchemy 2.0 async models: `Artisan`, `Product`, `ProductPricing`, `HeritagePassport`, `ChannelExport`.
  - [ ] Configure async session factory (`async_sessionmaker`) with SQLite (dev) / PostgreSQL (prod).
  - [ ] Initialize Alembic async migration environment (`migrations/`, `alembic.ini`).
  - [ ] Setup Celery worker with Redis broker and result backend.
- **Target Files**:
  - `backend/app/models/`
  - `backend/app/core/database.py`
  - `backend/app/workers/celery_app.py`
  - `backend/migrations/`

---

#### Issue #2: `[Auth] Voice-First Onboarding & PIN Authentication Service`
- **Labels**: `ready-for-agent`, `backend`, `auth`
- **Milestone**: `Milestone 1: Foundation`
- **Description**:
  Implement Page 1 Voice-first artisan registration endpoint and secure 4-digit PIN authentication.
- **Acceptance Criteria**:
  - [ ] `POST /api/v1/auth/register-voice`: Accept audio recording + location, transcribe dialect name/cluster, generate unique artisan ID & JWT token.
  - [ ] `POST /api/v1/auth/login-pin`: Validate artisan ID / phone with 4-digit bcrypt-hashed PIN.
  - [ ] Add unit test verifying successful voice registration and login in `tests/test_auth_voice.py`.
- **Target Files**:
  - `backend/app/api/v1/auth.py`
  - `backend/app/schemas/auth.py`
  - `backend/app/core/security.py`

---

#### Issue #3: `[Data] Automated E-Commerce Benchmark Price Scraper Cron`
- **Labels**: `ready-for-agent`, `backend`, `data-pipeline`
- **Milestone**: `Milestone 1: Foundation`
- **Description**:
  Build scheduled scraper worker to continuously aggregate market price points across handloom and handicraft portals (GeM, Amazon Karigar, ONDC).
- **Acceptance Criteria**:
  - [ ] Implement Celery Beat task `scrape_handicraft_benchmarks` in `app.workers.tasks_scraper` running on a 24-hour cron schedule.
  - [ ] Aggregate and normalize prices by craft category (Handloom, Pottery, Woodcraft, Metalwork).
  - [ ] Cache aggregated benchmark price percentiles (P25, P50, P75) in Redis for downstream pricing inference.
- **Target Files**:
  - `backend/app/workers/tasks_scraper.py`
  - `backend/app/services/pricing_service.py`

---

### 🧠 Milestone 2: Core AI Engines & Processing Pipelines

---

#### Issue #4: `[AI/CV] U²-Net Salient Background Removal, CLAHE & 1:1 Studio Cropping`
- **Labels**: `ready-for-agent`, `ai-cv`, `backend`
- **Milestone**: `Milestone 2: AI Engines`
- **Description**:
  Implement Page 3 Computer Vision pipeline converting informal room photos into studio-grade 1:1 e-commerce assets.
- **Acceptance Criteria**:
  - [ ] Salient foreground segmentation using U²-Net / GrabCut mask generation.
  - [ ] Lighting and gamma equalization via OpenCV CLAHE in LAB color space (preserves authentic dye tones).
  - [ ] Centered 1:1 square auto-cropping with pure white studio background.
  - [ ] Calculate visual complexity score ($$0.30 - 0.95$$) based on Canny edge density and color variance.
  - [ ] `POST /api/v1/studio/enhance`: Return enhanced PNG stream + complexity score metadata.
- **Target Files**:
  - `backend/app/services/cv_service.py`
  - `backend/app/api/v1/studio.py`
  - `backend/tests/test_cv_enhancement.py`

---

#### Issue #5: `[AI/NLP] Dialect ASR, IndicTrans2 Translation & Mistral-7B Cataloger`
- **Labels**: `ready-for-agent`, `ai-nlp`, `backend`
- **Milestone**: `Milestone 2: AI Engines`
- **Description**:
  Implement Page 4 Multilingual Voice Auto-Cataloger extracting standardized e-commerce metadata from dialect voice recordings.
- **Acceptance Criteria**:
  - [ ] Speech-to-Text: Dialect audio transcription (Hindi, Bhojpuri, Maithili, Tamil, Bengali).
  - [ ] Machine Translation: IndicTrans2 regional dialect-to-English translation pipeline.
  - [ ] LLM Structuring: Mistral-7B prompt parsing raw voice description into:
    - High-converting product title
    - GI heritage narrative & weave technique description
    - Estimated labor duration
    - SEO and taxonomy tags
  - [ ] `POST /api/v1/catalog/voice-description`: Return transcript + structured catalog specification.
- **Target Files**:
  - `backend/app/services/nlp_service.py`
  - `backend/app/api/v1/catalog.py`
  - `backend/tests/test_nlp_catalog.py`

---

#### Issue #6: `[AI/ML] Dynamic Fair-Wage Pricing Engine with XGBoost Regression`
- **Labels**: `ready-for-agent`, `ai-ml`, `backend`
- **Milestone**: `Milestone 2: AI Engines`
- **Description**:
  Implement Page 5 Dynamic Pricing Engine with statutory Fair Wage protection floor and market value recommendations.
- **Acceptance Criteria**:
  - [ ] Statutory Fair Wage Floor: Enforce $$\text{Fair Wage} = \text{Labor Days} \times \text{Daily Wage Rate}$$ (₹450 baseline).
  - [ ] XGBoost Regression model: Ingest material cost, labor days, visual complexity score, and category market benchmarks.
  - [ ] Interactive price window: Output benchmark min, benchmark max, and recommended price.
  - [ ] Net profit calculation: Guarantee artisan direct net profit after materials and labor.
  - [ ] `POST /api/v1/pricing/calculate`: Return full price breakdown object.
- **Target Files**:
  - `backend/app/services/pricing_service.py`
  - `backend/app/api/v1/pricing.py`
  - `backend/tests/test_pricing_engine.py`

---

#### Issue #7: `[Crypto] Deterministic SHA-256 Heritage Passport & QR Code Engine`
- **Labels**: `ready-for-agent`, `security`, `crypto`, `backend`
- **Milestone**: `Milestone 2: AI Engines`
- **Description**:
  Implement Page 6 Cryptographic Verification & Digital Artisan Passport QR Code generator.
- **Acceptance Criteria**:
  - [ ] Generate deterministic SHA-256 hash binding: `artisan_id`, `trifed_id`, `geo_coords`, `product_title`, `timestamp`, `raw_material_cost`, and `labor_days`.
  - [ ] Preserve immutable first-issuance timestamp when hashing an existing passport so previously issued QR tags are not invalidated on reissue.
  - [ ] Render high-contrast Base64 QR code encoding the public verification URL.
  - [ ] `POST /api/v1/passport/issue/{product_id}`: Store snapshot and issue passport.
  - [ ] `GET /api/v1/passport/verify/{passport_hash}`: Public REST verification endpoint.
- **Target Files**:
  - `backend/app/core/passport.py`
  - `backend/app/services/passport_service.py`
  - `backend/app/api/v1/passport.py`
  - `backend/tests/test_passport_crypto.py`

---

### 🌐 Milestone 3: Client Applications & Multi-Channel Integrations

---

#### Issue #8: `[Export] Multi-Channel Adapters for GeM XML/CSV, ONDC Beckn & B2B`
- **Labels**: `ready-for-agent`, `backend`, `integration`
- **Milestone**: `Milestone 3: Integrations`
- **Description**:
  Implement Page 7 One-Tap Multi-Channel Export adapters for GeM, ONDC, and B2B institutional procurement.
- **Acceptance Criteria**:
  - [ ] GeM Adapter: Transform product record to GeM XML/CSV procurement specification with HSN code and TRIFED ID.
  - [ ] ONDC Adapter: Transform product to Beckn Protocol JSON catalog schema (`nic2004:52110`).
  - [ ] Direct B2B Adapter: Volume pricing calculator with tiered MOQ discounts and lead time estimation.
  - [ ] `POST /api/v1/exports/publish`: Publish catalog payload to selected external channels.
- **Target Files**:
  - `backend/app/services/export_service.py`
  - `backend/app/api/v1/exports.py`
  - `backend/tests/test_export_adapters.py`

---

#### Issue #9: `[Android] 7-Stage High-Contrast Jetpack Compose Presentation Flow`
- **Labels**: `ready-for-agent`, `android`, `ui`
- **Milestone**: `Milestone 3: Clients`
- **Description**:
  Build the native Android client using Kotlin + Jetpack Compose for all 7 Playbook screens with an Indian Heritage theme.
- **Acceptance Criteria**:
  - [ ] `Page1VoiceOnboardingScreen`: Microphone CTA + 4-digit PIN setup.
  - [ ] `Page2ZeroSkillDashboardScreen`: High-contrast single primary CTA *"नया प्रोडक्ट बेचें"*.
  - [ ] `Page3CameraStudioScreen`: CameraX capture with on-device Before vs After studio preview.
  - [ ] `Page4VoiceCatalogerScreen`: Audio recording waveform + Mistral-7B metadata review.
  - [ ] `Page5DynamicPricingScreen`: Large touch keypads + Fair Wage slider.
  - [ ] `Page6HeritagePassportScreen`: SHA-256 provenance card & QR code display.
  - [ ] `Page7ChannelExportScreen`: One-tap batch selector for GeM, ONDC, and B2B.
- **Target Files**:
  - `android/app/src/main/java/in/artifybharat/app/presentation/screens/`
  - `android/app/src/main/java/in/artifybharat/app/presentation/theme/`

---

#### Issue #10: `[Android] Room SQLite Offline Task Queue for Low-Bandwidth Areas`
- **Labels**: `ready-for-agent`, `android`, `offline-first`
- **Milestone**: `Milestone 3: Clients`
- **Description**:
  Implement local Room SQLite offline task queueing and WorkManager background synchronization for low-connectivity rural environments.
- **Acceptance Criteria**:
  - [ ] Setup `OfflineTaskEntity` and `OfflineTaskDao` in Room database.
  - [ ] Intercept photo uploads, voice recordings, and export actions when offline and queue locally.
  - [ ] Implement exponential backoff retry worker uploading queued tasks upon network restoration.
- **Target Files**:
  - `android/app/src/main/java/in/artifybharat/app/data/local/`
  - `android/app/src/main/java/in/artifybharat/app/data/repository/`

---

#### Issue #11: `[Web] Public Heritage Passport Verification Portal with Voice Stream`
- **Labels**: `ready-for-agent`, `frontend`, `web-portal`
- **Milestone**: `Milestone 3: Clients`
- **Description**:
  Build the public web portal allowing buyers, consumers, and procurement officers to verify artisan provenance and cost breakdown.
- **Acceptance Criteria**:
  - [ ] Responsive heritage design (Terracotta, Silk Cream, Trust Green).
  - [ ] Live SHA-256 hash lookup communicating with `GET /api/v1/passport/verify/{hash}`.
  - [ ] Verified artisan profile display: TRIFED ID, Pehchan ID, GI tag status, and cluster location.
  - [ ] Native audio player streaming the original dialect voice story.
  - [ ] Financial transparency breakdown: Material + Fair Wage + Artisan Net Profit with 0% middleman markup.
- **Target Files**:
  - `web-portal/index.html`
  - `web-portal/package.json`

---

### 🧪 Milestone 4: Testing, Harness Benchmarking & Deployment

---

#### Issue #12: `[Harness] Agent Action Space, Error Recovery Contracts & Benchmark Evaluator`
- **Labels**: `ready-for-agent`, `qa`, `harness`
- **Milestone**: `Milestone 4: Testing & Deployment`
- **Description**:
  Implement the Agent Harness for autonomous benchmarking, typed action spaces, and recovery contracts.
- **Acceptance Criteria**:
  - [ ] Typed action schemas in `action_space.py` with micro/medium/macro granularity rules.
  - [ ] Standardized observation envelope in `observation.py`.
  - [ ] Error recovery contract in `recovery.py` with stop gates on repeated failures.
  - [ ] Benchmark evaluator in `evaluator.py` computing Pass@1, Pass@3, and completion rates.
  - [ ] 100% passing tests in `tests/test_agent_harness.py`.
- **Target Files**:
  - `harness/action_space.py`
  - `harness/observation.py`
  - `harness/recovery.py`
  - `harness/evaluator.py`
  - `backend/tests/test_agent_harness.py`

---

#### Issue #13: `[DevOps] Complete Docker Compose Microservice Stack & CI Pipeline`
- **Labels**: `ready-for-agent`, `devops`, `ci-cd`
- **Milestone**: `Milestone 4: Testing & Deployment`
- **Description**:
  Containerize the full microservice topology and configure GitHub Actions CI for automated testing.
- **Acceptance Criteria**:
  - [ ] `docker-compose.yml` orchestrating PostgreSQL, Redis, MinIO (S3), FastAPI Backend, Celery Worker, Celery Beat Scraper, and Web Portal.
  - [ ] GitHub Actions CI workflow (`.github/workflows/ci.yml`) running linting and `pytest`.
  - [ ] Production-ready Dockerfile for FastAPI backend.
- **Target Files**:
  - `docker-compose.yml`
  - `.github/workflows/ci.yml`
  - `backend/Dockerfile`
