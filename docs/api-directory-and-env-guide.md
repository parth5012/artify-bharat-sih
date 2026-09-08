# 🔌 Artify Bharat: Complete API Directory & Environment Setup Guide
> **Ministry of Social Justice and Empowerment (MoSJE) — SIH PS 26090**  
> Comprehensive Reference Guide for External Government DPI APIs, Browser Web APIs, Internal REST Microservices, and `.env` Configuration.

---

## 📑 Table of Contents
1. [External Government DPI & Cloud Services](#1-external-government-dpi--cloud-services)
2. [Native Browser Web APIs Directory](#2-native-browser-web-apis-directory)
3. [Internal REST Microservice Endpoints](#3-internal-rest-microservice-endpoints)
4. [Environment Configuration Template (.env)](#4-environment-configuration-template-env)
5. [Standalone Sandbox Fallback Strategy](#5-standalone-sandbox-fallback-strategy)

---

## 🏛️ 1. External Government DPI & Cloud Services

| API Service | Authority / Agency | Function in Platform | Documentation / Portal |
| :--- | :--- | :--- | :--- |
| **Bhashini AI Pipeline** | MeitY (National Language Mission) | Automatic Speech Recognition (ASR), Text-to-Speech (TTS), and Neural Machine Translation (NMT) across 22 Scheduled Indian Languages. | [bhashini.gov.in](https://bhashini.gov.in) |
| **e-Shram Portal API** | Ministry of Labour & Employment | Verifies unorganized rural artisan identity via 12-digit e-Shram Universal Account Number (UAN). | [eshram.gov.in](https://eshram.gov.in) |
| **DC Handicrafts Pehchan & TRIFED** | Ministry of Textiles / MoTA | Validates official Artisan Pehchan Card Number and Scheduled Tribe artisan registry. | [handicrafts.nic.in](http://handicrafts.nic.in) |
| **MoSJE PM-DAKSH & PM-SURAJ** | Ministry of Social Justice & Empowerment | Looks up artisan skill certification levels (Level 1-4) and concessional credit subsidy sanctions. | [pmdaksh.dosje.gov.in](https://pmdaksh.dosje.gov.in) |
| **ONDC Beckn Gateway** | Open Network for Digital Commerce (DPIIT) | Publishes catalog items to ONDC network buyer applications (Paytm, Mystore, Pincode) using Beckn Protocol v1.0. | [ondc.org](https://ondc.org) |
| **GeM (Government e-Marketplace)** | Ministry of Commerce & Industry | B2G XML/CSV catalog upload for bulk government department and PSU procurement. | [gem.gov.in](https://gem.gov.in) |
| **WhatsApp Business Cloud API** | Meta Graph API v20.0 | Sends interactive catalog cards, order updates, and UPI payment links directly to buyers. | [developers.facebook.com](https://developers.facebook.com) |
| **India Post / CSC Rural Logistics** | Department of Posts / MeitY CSC | Generates Speed Post dispatch slips, Code-128 tracking barcodes, and real-time transit milestones. | [indiapost.gov.in](https://www.indiapost.gov.in) |
| **PFMS / DBT Direct Bank Payout** | NPCI / Ministry of Finance | Instant middleman-free escrow release directly into artisan Pradhan Mantri Jan Dhan Yojana (PMJDY) bank accounts. | [pfms.nic.in](https://pfms.nic.in) |

---

## 🌐 2. Native Browser Web APIs Directory

| Browser API | Standard Interface | Purpose in Artify Bharat | Fallback Strategy |
| :--- | :--- | :--- | :--- |
| **MediaDevices Camera API** | `navigator.mediaDevices.getUserMedia()` | Live in-browser 1:1 camera capture studio. Native file pickers are locked out to prevent stock photo fraud. | Prompts user for camera permission. |
| **DeviceOrientation API** | `window.addEventListener('deviceorientation')` | Gyroscope spirit level. Enforces tilt $\le 1.5^\circ$ before enabling camera shutter button. | Manual bypass toggle after 3 failed attempts. |
| **W3C Geolocation API** | `navigator.geolocation.getCurrentPosition()` | Captures high-precision GPS coordinates (`lat`, `lng`) to lock tamper-proof provenance to the craft. | Cluster PIN code fallback with SHG leader sign-off. |
| **Web Speech / MediaRecorder API** | `window.SpeechRecognition` & `MediaRecorder` | Records dialect audio stories and streams uncompressed audio to Bhashini/Whisper. | Text input or SHG leader voice dictation. |
| **Web Bluetooth API** | `navigator.bluetooth.requestDevice()` | Connects browser directly to ₹1,500 58mm portable thermal printers over BLE. | Zero-cost 6-character shortcode on cardboard tag (`A7X-9B2`). |
| **IndexedDB API** | `window.indexedDB.open('artify_offline_db')` | Saves offline product drafts, captured image blobs, and jury votes in remote zero-network weaver pits. | Automatically persists up to 500MB locally. |
| **Service Worker Sync API** | `navigator.serviceWorker.ready` | Background sync API that auto-dispatches queued products when 4G/WiFi reconnects. | Periodic polling check every 60 seconds. |
| **Canvas 2D API** | `canvas.getContext('2d')` | Performs client-side image downscaling, EXIF sanitization, and watermark embedding. | Pure JavaScript canvas fallback. |

---

## ⚡ 3. Internal REST Microservice Endpoints (`/api/v1/`)

```
========================================================================================================
                              INTERNAL REST API DIRECTORY (FastAPI Backend)
========================================================================================================
```

### 🪪 A. Authentication & e-KYC Service (`/api/v1/auth`)
* `POST /auth/register` — Register artisan with Phone, 4-digit PIN, Dialect, and Role (`artisan` / `shg_leader`).
* `POST /auth/login` — 4-digit PIN authentication returning JWT Bearer Token.
* `POST /auth/verify-artisan-id` — Validates Pehchan Card and TRIFED ID registry.
* `POST /auth/mosje-verify` — MoSJE PM-DAKSH skill certification and PM-SURAJ credit lookup.
* `POST /auth/eshram-lookup` — 12-digit e-Shram Universal Account Number (UAN) verification.
* `POST /auth/pmsuraj-lookup` — Concessional credit sanction and subsidy status lookup.

### 🖼️ B. Non-Generative AI Vision Studio (`/api/v1/studio`)
* `POST /studio/enhance` — Applies `rembg U²-Net` background clutter removal, OpenCV CLAHE contrast enhancement in LAB space, 1:1 auto-crop, and complexity scoring.

### 🗣️ C. Multilingual Catalog & Voice Assistant (`/api/v1/catalog`, `/api/v1/assistant`)
* `POST /catalog/voice` — Ingests dialect audio, runs Whisper ASR + IndicTrans2 + Mistral-7B to extract structured JSON catalog.
* `POST /assistant/dadi` — 'Ask Dadi' conversational dialect assistant providing pricing advice and PM-DAKSH upskilling nudges.

### 💰 D. Dynamic Fair-Wage Pricing Engine (`/api/v1/pricing`)
* `POST /pricing/calculate` — Enforces statutory skilled wage floor ($\text{Base Cost} = C_{\text{mat}} + T_{\text{labor}} \times W_{\text{skill}} + C_{\text{overhead}}$) and outputs 3 tiers: **Statutory Floor**, **Recommended Retail**, and **Bulk Wholesale**.

### 👥 E. Zero-Trust Peer Review Jury (`/api/v1/verify`)
* `POST /verify/jury/assign` — Assigns 3 randomized peer jurors from adjacent craft villages (excluding product creator & same SHG).
* `POST /verify/jury/vote` — Juror casts authenticity vote with digital signature and calculates 2/3 quorum consensus.
* `GET /verify/jury/status/{jury_ticket_id}` — Checks jury progress and consensus status.
* `POST /verify/report-fake` — Buyer anti-fraud feedback trigger that automatically **freezes Jan Dhan escrow** and alerts the MoSJE District Magistrate.

### 🏷️ F. Digital Passport & Shortcode Resolver (`/api/v1/passport`)
* `POST /passport/issue` — Generates deterministic SHA-256 hash, vector QR code, 6-char shortcode (`A7X-9B2`), and base64 ESC/POS 58mm thermal print stream.
* `GET /passport/verify/{passport_hash}` — Public provenance lookup by 64-character hash.
* `GET /passport/code/{shortcode}` — Instant shortcode resolution (e.g. `A7X-9B2`, `M3B-77L`, `K9P-12M`) for low-bandwidth mobile browsers ($<35\text{ms}$).

### 📦 G. Multi-Channel Export Adapters (`/api/v1/exports`)
* `POST /exports/sync` — Dispatches catalog to **GeM (B2G XML)**, **ONDC (Beckn JSON)**, **WhatsApp Cloud**, and **SHG Bulk CSV**.

### 🚚 H. First-Mile Logistics & Jan Dhan Payouts (`/api/v1/logistics`, `/api/v1/payouts`)
* `POST /logistics/india-post/dispatch` — Generates India Post Speed Post / CSC parcel dispatch slip and Code-128 barcode.
* `GET /logistics/india-post/track/{tracking_id}` — Returns real-time parcel tracking milestones.
* `POST /payouts/direct-transfer` — Direct Jan Dhan escrow settlement to artisan bank accounts with 0% middleman deduction.

### 📢 I. Automated Bhashini IVR Voice Calls (`/api/v1/notify`)
* `POST /notify/send` — Triggers automated Bhashini Text-to-Speech IVR phone calls in regional dialects informing offline artisans of new orders and payment credits.

### 📈 J. MoSJE Admin & District Magistrate Dashboard (`/api/v1/admin`)
* `GET /admin/district-heatmap` — Live district economic heatmap tracking wages disbursed across craft clusters.
* `GET /admin/audit-logs` — Immutable audit trail of peer jury votes, velocity anomalies, and counterfeit reports.
* `GET /admin/pmdaksh-metrics` — Skill progression metrics tracking income multiplier before vs after PM-DAKSH upskilling.
* `GET /admin/demand-forecast` — Predictive Demand AI forecasting festive surges (e.g., Diwali 3.8x yarn stockpiling advisory).

---

## ⚙️ 4. Environment Configuration Template (`backend/.env`)

```env
# ==============================================================================
# ARTIFY BHARAT BACKEND ENVIRONMENT CONFIGURATION (SIH PS 26090)
# ==============================================================================

# Core Application & Security
APP_NAME=ArtifyBharat
ENVIRONMENT=development
SECRET_KEY=artify_bharat_super_secret_jwt_key_2026_sih
PASSPORT_VERIFICATION_BASE_URL=https://artify.gov.in/verify

# Database & Cache
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/artify_bharat
REDIS_URL=redis://localhost:6379/0

# Object Storage (WIP photos, enhanced studio cutouts, audio narratives)
AWS_ACCESS_KEY_ID=your_s3_or_minio_access_key
AWS_SECRET_ACCESS_KEY=your_s3_or_minio_secret_key
AWS_STORAGE_BUCKET_NAME=artify-heritage-media
S3_ENDPOINT_URL=http://localhost:9000

# Bhashini AI (Speech-to-Text & Text-to-Speech)
BHASHINI_API_KEY=your_bhashini_api_key_here
BHASHINI_USER_ID=your_bhashini_user_id
BHASHINI_PIPELINE_ID=64392f96daac500b55c543d6

# Government e-KYC & MoSJE Sandbox Endpoints
MOSJE_PMDAKSH_API_URL=https://pmdaksh.dosje.gov.in/api/v1/verify
ESHRAM_LOOKUP_API_URL=https://eshram.gov.in/api/v1/lookup
TRIFED_VERIFY_API_URL=https://trifed.tribal.gov.in/api/verify

# Multi-Channel Commerce Endpoints
ONDC_GATEWAY_URL=https://staging.gateway.ondc.org
GEM_PORTAL_API_URL=https://api.gem.gov.in/v2/catalog
WHATSAPP_CLOUD_API_TOKEN=your_meta_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id

# Logistics & Direct Benefit Transfer (DBT)
INDIA_POST_API_KEY=your_india_post_sandbox_key
PFMS_DBT_MERCHANT_KEY=your_pfms_dbt_escrow_key
```

---

## 🛡️ 5. Standalone Sandbox Fallback Strategy

All external government integrations (Bhashini, e-Shram, GeM, ONDC, India Post, Jan Dhan) are built with **fault-tolerant simulated adapters**:
* If external government APIs are unreachable or lack credentials during hackathon evaluations, the backend automatically switches to simulated verification mode with high-fidelity responses.
* Zero external downtime risks during live jury presentations.
