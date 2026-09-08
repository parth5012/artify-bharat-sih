# Artify Bharat (SIH PS 26090 - MoSJE) — GitHub Issues & Execution Sequence

This document breaks down the entire Artify Bharat project into sequential GitHub Issues categorized across 4 execution milestones for the **Ministry of Social Justice and Empowerment (MoSJE)**.

---

## 🗺️ Milestone Overview & Sequence

| # | Issue Title | Area | Dependency | Estimated Effort |
|---|---|---|---|---|
| **#1** | `[Infra] PostgreSQL Async Schema, Migrations & Redis Celery Broker` | Backend / Infra | None | 2 Days |
| **#2** | `[Auth] MoSJE & e-Shram DPI Auth (PM-SURAJ / PM-DAKSH / Pehchan / TRIFED)` | Backend / Auth | #1 | 2 Days |
| **#3** | `[AI/CV] U²-Net Salient Background Removal, CLAHE & 1:1 Studio Cropping` | AI / CV | #1 | 3 Days |
| **#4** | `[AI/NLP] Dialect ASR, IndicTrans2 Translation & Bhashini Voice NLP` | AI / NLP | #1 | 3 Days |
| **#5** | `[AI/ML] Dynamic Fair-Wage Pricing Engine & Statutory Wage Floor` | AI / ML | #1 | 3 Days |
| **#6** | `[Verify] Zero-Trust 3-Artisan Peer Jury Quorum & Rubber-Stamp Anomaly Check` | Backend / Security | #1 | 2 Days |
| **#7** | `[Crypto] Deterministic SHA-256 Heritage Passport & 6-Char Shortcode Resolver` | Backend / Security | #1, #5, #6 | 2 Days |
| **#8** | `[Logistics & Payouts] India Post First-Mile Slip & Jan Dhan Direct Escrow Payouts` | Backend / FinTech | #7 | 2 Days |
| **#9** | `[Export] Multi-Channel Adapters for GeM, ONDC Beckn, WhatsApp & SHG Bulk` | Backend / Integration | #7 | 2 Days |
| **#10** | `[Notify] SMS & IVR Bhashini Voice Alert Engine for Offline Artisans` | Backend / Notification | #8 | 1 Day |
| **#11** | `[Web Client] Responsive Web Hub (Dual-Role, Camera 1:1, GPS Lock & Bluetooth 58mm Printer)` | Web / UI | #2-#10 | 4 Days |
| **#12** | `[Web Buyer] Public Heritage Passport Portal with Audio & Anti-Fraud Trigger` | Web / Verification | #7 | 2 Days |
| **#13** | `[Web Admin] MoSJE Nodal Officer Dashboard with District Heatmap & Demand AI` | Web / Admin | #6, #8 | 3 Days |
| **#14** | `[DevOps] Complete Docker Compose Microservice Stack & CI Pipeline` | DevOps / CI | #1-#13 | 1 Day |

---

## 📋 Granular Issue Descriptions

### 🏗️ Milestone 1: Foundation & Data Infrastructure

#### Issue #1: `[Infra] PostgreSQL Async Schema, Migrations & Redis Celery Broker`
- **Labels**: `ready-for-agent`, `backend`, `infrastructure`
- **Milestone**: `Milestone 1: Foundation`
- **Acceptance Criteria**:
  - [ ] Define SQLAlchemy 2.0 async models: `Artisan`, `Product`, `ProductPricing`, `HeritagePassport`, `ChannelExport`.
  - [ ] Configure async session factory (`async_sessionmaker`) with PostgreSQL.
  - [ ] Setup Celery worker with Redis broker and result backend.

#### Issue #2: `[Auth] MoSJE & e-Shram DPI Auth (PM-SURAJ / PM-DAKSH / Pehchan / TRIFED)`
- **Labels**: `ready-for-agent`, `backend`, `auth`
- **Milestone**: `Milestone 1: Foundation`
- **Acceptance Criteria**:
  - [ ] `POST /api/v1/auth/mosje-verify`: Validate PM-DAKSH, PM-SURAJ scheme enrollments.
  - [ ] `POST /api/v1/auth/eshram-lookup`: Validate 12-digit UAN numbers.
  - [ ] `POST /api/v1/auth/verify-artisan-id`: Pehchan ID & TRIFED registry lookup.

---

### 🧠 Milestone 2: AI Core Services & Cryptographic Provenance

#### Issue #3: `[AI/CV] U²-Net Salient Background Removal, CLAHE & 1:1 Studio Cropping`
- **Acceptance Criteria**:
  - [ ] Salient object segmentation (`rembg U-2-Net`).
  - [ ] CLAHE lighting auto-equalization in LAB color space.

#### Issue #4: `[AI/NLP] Dialect ASR, IndicTrans2 Translation & Bhashini Voice NLP`
- **Acceptance Criteria**:
  - [ ] Whisper regional dialect transcription (Bhojpuri, Maithili, Hindi, etc.).
  - [ ] 'Ask Dadi' conversational assistant with PM-DAKSH training scheme guidance.

#### Issue #5: `[AI/ML] Dynamic Fair-Wage Pricing Engine & Statutory Wage Floor`
- **Acceptance Criteria**:
  - [ ] Statutory skilled wage floor calculation (`labor_days * daily_wage_benchmark`).
  - [ ] 3-tier price range suggestion (Floor, Recommended Market, Premium Collector).

#### Issue #6: `[Verify] Zero-Trust 3-Artisan Peer Jury Quorum & Rubber-Stamp Anomaly Check`
- **Acceptance Criteria**:
  - [ ] `POST /api/v1/verify/jury/assign`: Randomized 3-artisan cluster jury assignment.
  - [ ] `POST /api/v1/verify/jury/vote`: Quorum consensus calculation.
  - [ ] `POST /api/v1/verify/report-fake`: Anti-fraud buyer feedback trigger.

#### Issue #7: `[Crypto] Deterministic SHA-256 Heritage Passport & 6-Char Shortcode Resolver`
- **Acceptance Criteria**:
  - [ ] SHA-256 canonical digest generation.
  - [ ] 6-character shortcode resolver (`GET /api/v1/passport/code/{shortcode}`).
  - [ ] 58mm ESC/POS Bluetooth thermal printer byte protocol generator.

---

### 🌐 Milestone 3: Multi-Channel Exports, Logistics & FinTech

#### Issue #8: `[Logistics & Payouts] India Post First-Mile Slip & Jan Dhan Direct Escrow Payouts`
- **Acceptance Criteria**:
  - [ ] India Post Speed Post / CSC PIN routing and Code-128 barcode generation.
  - [ ] 100% middleman-free Jan Dhan direct escrow settlements.

#### Issue #9: `[Export] Multi-Channel Adapters for GeM, ONDC Beckn, WhatsApp & SHG Bulk`
- **Acceptance Criteria**:
  - [ ] GeM B2G XML/CSV catalog exporter.
  - [ ] ONDC Beckn Protocol JSON catalog with stock deduction webhooks.
  - [ ] WhatsApp Commerce interactive cards with UPI payment links.
  - [ ] SHG / NGO Bulk wholesale tiered pricing catalogs.

#### Issue #10: `[Notify] SMS & IVR Bhashini Voice Alert Engine for Offline Artisans`
- **Acceptance Criteria**:
  - [ ] Dialect voice IVR telephone alerts informing offline artisans about new orders and payouts.

---

### 💻 Milestone 4: Responsive Web Client, Buyer & Admin Portals

#### Issue #11: `[Web Client] Responsive Web Hub (Dual-Role, Camera 1:1, GPS Lock & Bluetooth 58mm Printer)`
- **Acceptance Criteria**:
  - [ ] Dual-Role switcher (Artisan Direct vs SHG Coordinator Hub).
  - [ ] MediaDevices 1:1 camera stream + Gyro leveling.
  - [ ] W3C Geolocation API & UTC timestamp lock.
  - [ ] Web Bluetooth API 58mm ESC/POS thermal printer bridge.
  - [ ] IndexedDB offline drafts and ServiceWorker background sync.

#### Issue #12: `[Web Buyer] Public Heritage Passport Portal with Audio & Anti-Fraud Trigger`
- **Acceptance Criteria**:
  - [ ] 6-character shortcode search & QR scanner.
  - [ ] MoSJE Verified status, WIP photos, dialect voice narration.
  - [ ] 4-part transparent price breakdown & Anti-Fraud counterfeit reporting.

#### Issue #13: `[Web Admin] MoSJE Nodal Officer Dashboard with District Heatmap & Demand AI`
- **Acceptance Criteria**:
  - [ ] Live District Economic Heatmaps across national craft clusters.
  - [ ] Zero-Trust Peer Jury anti-corruption audit trails.
  - [ ] PM-DAKSH skill upskilling metrics and Festive Demand AI forecasting.

#### Issue #14: `[DevOps] Complete Docker Compose Microservice Stack & CI Pipeline`
- **Acceptance Criteria**:
  - [ ] Docker Compose orchestration with PostgreSQL, Redis, FastAPI, Celery, and Web Portal.
  - [ ] GitHub Actions CI verifying unit tests and linting.
