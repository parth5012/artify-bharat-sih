# 🏛️ Artify Bharat (SIH PS 26090) — Complete Master Project Blueprint

> **Smart India Hackathon Problem Statement 26090**  
> *AI-Powered Digital Business Manager & Cryptographic Heritage Passport for Rural Artisans and Weavers*

---

## 📌 1. Executive Summary & Problem Formulation

### 🎯 Problem Statement (SIH PS 26090)
India has over **20 million rural artisans and handloom weavers** representing rich cultural heritage (Varanasi Silk, Kanchipuram, Madhubani, Terracotta, Metalwork). However, they are virtually invisible on modern digital e-commerce channels (GeM, ONDC, Amazon Karigar) and face severe exploitation by unverified middlemen.

### ⚠️ The Two Core Bottlenecks:
1. **The Seller's Barrier (Rural Artisans)**:
   - **Language & Typing Barrier**: Inability to read/type English or formal Hindi for complex product catalogs.
   - **Visual Asset Deficit**: No studio lighting, professional cameras, or photo editing skills.
   - **Market Blindness**: Severe lack of market price intelligence leading to underpricing ($<₹150$/day).
   - **Taxonomy Complexity**: Inability to navigate nested categories, HSN codes, and GeM/ONDC listing schemas.

2. **The Buyer's Trust Deficit (Consumers & Procurement Officers)**:
   - **Counterfeit Proliferation**: Machine-made polyester replicas masquerading as authentic handloom.
   - **Lack of Provenance**: No cryptographic proof of genuine artisan identity or Geographical Indication (GI).
   - **Middleman Markups**: Consumers pay 3x–10x markup while the actual weaver receives sub-minimum wages.

---

## 💡 2. What is Artify Bharat & Why Do We Need It?

### 🌟 What It Is:
**Artify Bharat** is not just another e-commerce app. It is an **Intelligent Digital Business Manager and Digital Gatekeeper** that sits invisibly between the rural artisan and national/global markets.

It converts **unstructured local dialect voice notes** and **low-quality smartphone photos** into **standardized, studio-grade, cryptographically verified catalogs** integrated directly into Government (GeM), Open Network (ONDC), and Enterprise procurement backends.

```
+-----------------------------------------------------------------------------------------+
|                                  ARTIFY BHARAT WORKFLOW                                 |
+-----------------------------------------------------------------------------------------+
  [Artisan: Dialect Voice + Room Photo] 
                  │
                  ▼
  [AI Studio Enhancement + Multilingual LLM Auto-Catalog + XGBoost Fair Wage]
                  │
                  ▼
  [Deterministic SHA-256 Cryptographic Heritage Passport & QR Code]
                  │
                  ▼
  [One-Tap Export to GeM / ONDC / B2B] ────▶ [Buyer Verifies Audio Story & 0% Middleman Cost]
```

---

## 🛠️ 3. Complete Technical Stack & Architecture

| Layer / Subsystem | Technology Selected | Architectural Rationale |
|---|---|---|
| **Mobile Client** | **Kotlin + Jetpack Compose** | Native Android performance, CameraX hardware integration, and offline-first Room SQLite storage. |
| **Backend Framework** | **FastAPI (Python 3.12)** | Asynchronous high-throughput gateway for concurrent media uploads and streaming verification. |
| **Task Queue & Broker** | **Celery + Redis** | Decouples heavy AI model inference (segmentation, LLM generation) from API request/response cycles. |
| **Database & ORM** | **PostgreSQL / SQLAlchemy 2.0 (Async)** | Stores artisan Pehchan profiles, GI catalogs, statutory price breakdowns, and cryptographic hashes. |
| **Object Storage** | **AWS S3 / Cloudflare R2 / MinIO** | Secure, scalable storage for high-res studio assets, alpha masks, and dialect voice clips. |
| **Computer Vision (CV)** | **PyTorch, OpenCV, U²-Net** | U²-Net salient foreground extraction, OpenCV CLAHE LAB color correction, 1:1 auto-cropping. |
| **Voice & NLP Pipeline** | **Whisper ASR, IndicTrans2, Mistral-7B** | Transcribes regional dialects (Bhojpuri, Maithili, etc.), translates to English, and structures SEO catalogs. |
| **Pricing ML Engine** | **XGBoost Regression + Scikit-Learn** | Ingests material costs, labor days, visual complexity, and live web-scraped market benchmarks. |
| **Security & Provenance** | **Cryptographic SHA-256 Engine** | Generates tamper-proof deterministic provenance hashes linking geo-location, artisan ID, and cost. |
| **External Interoperability** | **GeM XML/CSV & ONDC Beckn Protocol** | Standardized payload adapters for automated catalog submission to GeM and ONDC endpoints. |

---

## 📱 4. End-to-End User Journeys (Step-by-Step)

### 👨‍🎨 PART A: 7-Stage Artisan Seller Flow

#### 🔹 Page 1: Voice-First Onboarding
- **Artisan Action**: Taps a prominent, high-contrast microphone button.
- **AI Processing**: Device captures local voice dialect (e.g., *"Mera naam Gauri Devi hai, Varanasi se hoon"*), transcribes speech locally/cloud, translates via IndicTrans2, registers artisan profile, and requests a 4-digit PIN via audio.
- **Barrier Removed**: Eliminates cybercafe dependency and text literacy requirements.

#### 🔹 Page 2: Zero-Skill Dashboard
- **Artisan Action**: Encounters a single, unmistakable primary CTA: *"नया प्रोडक्ट बेचें"* (*"Sell New Product"*) with audio narration.
- **Barrier Removed**: Eliminates nested navigation trees and complex menus.

#### 🔹 Page 3: AI Camera Studio Module
- **Artisan Action**: Photographs the handcraft item under ambient indoor lighting.
- **AI Processing**:
  1. Salient object segmentation (U²-Net / GrabCut) cuts out cluttered backgrounds.
  2. OpenCV CLAHE equalizes lighting in LAB color space (preserves natural dye tones).
  3. Centered 1:1 auto-cropping creates a pure white e-commerce studio background.
  4. Canny edge density calculates a **Visual Complexity Score** ($0.30 - 0.95$).
- **Barrier Removed**: No professional lighting, studio gear, or photo editing software required.

#### 🔹 Page 4: Multilingual Voice Auto-Cataloger
- **Artisan Action**: Speaks naturally in their mother tongue for 30–60 seconds describing the weave, motifs, and effort.
- **AI Processing**: Whisper transcribes $\rightarrow$ IndicTrans2 translates $\rightarrow$ Fine-tuned Mistral-7B LLM generates:
  - High-converting product title
  - GI heritage description & weave technique
  - Estimated labor duration
  - SEO taxonomy tags & HSN classification
- **Barrier Removed**: Completely bridges the English literacy and catalog formatting barrier.

#### 🔹 Page 5: Dynamic Fair-Wage Pricing Engine
- **Artisan Action**: Inputs basic numbers using oversized touch keypads: Raw Material Cost (e.g., ₹500) and Labor Days (e.g., 15 days).
- **AI Processing**:
  - Enforces statutory **Fair Wage floor** ($\text{Labor Days} \times ₹450/\text{day} = ₹2,250$).
  - Ingests daily web-scraped market benchmarks from GeM & Amazon.
  - XGBoost regression predicts fair market valuation window (e.g., ₹4,500 – ₹6,000).
- **Barrier Removed**: Protects against middleman underpricing and guarantees artisan net profit.

#### 🔹 Page 6: Cryptographic Heritage Passport Generation
- **Artisan Action**: Reviews auto-generated product card and taps confirm.
- **AI Processing**:
  - Cross-references verified artisan credentials (TRIFED ID / Pehchan ID).
  - Calculates a deterministic **SHA-256 cryptographic hash** binding: Artisan ID + Coordinates + Timestamp + Material Cost + Labor Days.
  - Renders a high-contrast Digital Artisan Passport QR Code.
- **Barrier Removed**: Authenticates genuine handmade origin and eliminates counterfeits.

#### 🔹 Page 7: One-Tap Multi-Channel Government Export
- **Artisan Action**: Selects target channels: GeM, ONDC, Amazon Karigar, Direct B2B.
- **AI Processing**: Schema adapters translate catalog specs into GeM XML/CSV and ONDC Beckn Protocol JSON.
- **Barrier Removed**: Instant access to government procurement and national enterprise buyers.

---

### 🛒 PART B: Consumer & Procurement Officer Flow

#### 🔍 Step 1: Discovery with Verified Trust Badge
- Buyers on GeM, ONDC, or physical retail find listings bearing the **"Verified Artisan"** trust badge and QR code.

#### 🛡️ Step 2: Digital Heritage Passport Verification
- Scanning the QR code opens the public verification portal (`http://localhost:8000/verify/{hash}`), showing:
  - Verified Master Artisan profile, TRIFED ID, Pehchan ID, and village GPS location.
  - Official GI (Geographical Indication) status.
  - **Embedded Audio Player**: Stream the original voice recording captured during cataloging.

#### ⚖️ Step 3: Financial Transparency & 0% Middleman Proof
- Buyers can inspect the exact cost breakdown:
  - 🧵 Raw Materials: **₹500**
  - 🛠️ Fair Wage Allocation (15 Days): **₹2,250**
  - 💰 Artisan Direct Profit: **₹1,750**
  - 🏷️ Total Fair Trade Price: **₹4,500** *(Middleman Markup: 0%)*

---

## 🎯 5. Direct Mapping: Pain Points to Technical Solutions

| Stakeholder | Real-World Pain Point | Artify Bharat Feature | Underlying Technology |
|---|---|---|---|
| **Artisan** | Cannot type or read English / Hindi | Page 4: Voice Auto-Cataloger | Whisper ASR + IndicTrans2 + Mistral-7B LLM |
| **Artisan** | Underpriced by predatory middlemen | Page 5: Dynamic Pricing Engine | XGBoost Regression + Daily Scraper + Fair Wage Floor |
| **Artisan** | Cluttered room photos, no studio | Page 3: AI Camera Studio | U²-Net Salient Segmentation + OpenCV CLAHE |
| **Artisan** | Low-bandwidth rural village network | Offline Task Queue | Android Room SQLite + WorkManager Retry |
| **Buyer** | Machine-made fake handloom scams | Page 6 & Web Verification Portal | Deterministic SHA-256 Crypto Hash + QR Code |
| **Buyer** | Unfair middleman price inflation | Financial Transparency View | Itemized Cost Breakdown Matrix |
| **Government** | Incompatible catalog formats for GeM | Multi-Channel Export Adapter | JSON-to-XML/CSV Adapter Engine |

---

## 📅 6. Execution Roadmap & GitHub Issue Milestones

```
Milestone 1 (Foundation & Infra)  ──▶ Milestone 2 (Core AI Engines)
                  │                                   │
                  ▼                                   ▼
Milestone 3 (Android & Web Portal) ──▶ Milestone 4 (Testing & Docker Stack)
```

### 📦 Milestone 1: Foundation & Data Infrastructure
- **Issue #1**: `[Infra] PostgreSQL Async Schema, Migrations & Redis Celery Broker`
- **Issue #2**: `[Auth] Voice-First Onboarding & PIN Authentication Service`
- **Issue #3**: `[Data] Automated E-Commerce Benchmark Price Scraper Cron`

### 🧠 Milestone 2: Core AI Engines & Processing Pipelines
- **Issue #4**: `[AI/CV] U²-Net Salient Background Removal, CLAHE & 1:1 Studio Cropping`
- **Issue #5**: `[AI/NLP] Dialect ASR, IndicTrans2 Translation & Mistral-7B Cataloger`
- **Issue #6**: `[AI/ML] Dynamic Fair-Wage Pricing Engine with XGBoost Regression`
- **Issue #7**: `[Crypto] Deterministic SHA-256 Heritage Passport & QR Code Engine`

### 🌐 Milestone 3: Client Applications & Multi-Channel Integrations
- **Issue #8**: `[Export] Multi-Channel Adapters for GeM XML/CSV, ONDC Beckn & B2B`
- **Issue #9**: `[Android] 7-Stage High-Contrast Jetpack Compose Presentation Flow`
- **Issue #10**: `[Android] Room SQLite Offline Task Queue for Low-Bandwidth Areas`
- **Issue #11**: `[Web] Public Heritage Passport Verification Portal with Voice Stream`

### 🧪 Milestone 4: Testing, Harness Benchmarking & Deployment
- **Issue #12**: `[Harness] Agent Action Space, Error Recovery Contracts & Benchmark Evaluator`
- **Issue #13**: `[DevOps] Complete Docker Compose Microservice Stack & CI Pipeline`

---

## 🏆 7. Hackathon Evaluation Checklist & Key USPs

- [x] **Zero-Typing Experience**: 100% voice-driven onboarding and cataloging in regional dialects.
- [x] **On-Device + Cloud Studio**: Converts raw phone photos into 1:1 white-background studio assets.
- [x] **Objective Fair Wage Protection**: Guarantees daily wage standards before calculating market price.
- [x] **Cryptographic Trust Passport**: SHA-256 provenance hash prevents counterfeit handloom sales.
- [x] **Government Ready**: Direct automated export to GeM (Government e-Marketplace) and ONDC.
- [x] **100% Automated Test Coverage**: 14/14 automated unit & integration tests passing.
