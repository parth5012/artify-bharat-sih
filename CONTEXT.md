# Core Ubiquitous Language & Domain Concepts (SIH PS 26090 - MoSJE)

## Problem Statement Domain
- **SIH PS 26090**: Digital Business Manager & Digital Gatekeeper for rural weavers and handicraft artisans under the **Ministry of Social Justice and Empowerment (MoSJE)**.
- **Artisan / Weaver**: Primary creator producing GI-certified or traditional handloom/handicraft goods.
- **Craft Cluster**: Recognized regional cluster (e.g., Varanasi Handloom Cluster, Kashmir Pashmina Cluster, Madhubani Art Cluster, Kutch Embroidery Cluster).
- **MoSJE / DPI Credentials**: Official government artisan identification credentials including **Pehchan ID**, **TRIFED ID**, **e-Shram**, **PM-SURAJ**, and **PM-DAKSH**.
- **Geographical Indication (GI)**: Government certification of authenticity and geographic origin (e.g., Banarasi Brocade & Saree GI Reg #39).

## Client Layer Domain Concepts (Responsive Web - React / Next.js / HTML5)
- **Dual-Role Access Engine**: Instant switching between **Artisan Direct Mode** (single-user browser portal) and **Aggregator / SHG Leader Mode** (multi-tenant coordinator hub managing up to 50 artisans).
- **UI_Dash (Smart Web Dashboard)**: Primary zero-skill entry point with prominent **'Naya Product'** CTA and live multi-channel inventory sync.
- **UI_Capture (Web Media Capture)**: In-browser camera capture via `MediaDevices API` with strict **1:1 square crop**, real-time **gyro leveling**, and dual-phase **Work-In-Progress (WIP) + Final** capture.
- **UI_GPS (Geolocation API & Timestamp Lock)**: Live W3C Geolocation coordinates (`lat/lng`) and tamper-proof UTC timestamp binding.
- **UI_Voice (Zero-Literacy Audio Engine)**: Browser `Web Speech API` and Bhashini dialect voice AI with spoken UI cues and auditory audio feedback.
- **UI_Price (Fair Wage & Dynamic Pricing)**: Statutory skilled-wage floor calculator with 3-tier interactive slider (Floor, Recommended Market, Premium).
- **UI_Verify (Verification & Tagging)**: Synthesizes cryptographic SHA-256 Digital Passport and human-readable 6-character shortcode (`A7X-9B2`).
- **ThermalPrinter (Web Bluetooth API 58mm ESC/POS Bridge)**: Browser-to-printer Bluetooth stream for printing instant adhesive QR code labels and packaging tags.
- **UI_Export (One-Tap Multi-Channel Publish)**: Dispatches listings simultaneously to GeM, ONDC, and WhatsApp Web.
- **UI_Help ('Ask Dadi' Voice Assistant)**: Interactive grandmotherly voice assistant providing craft advice and **PM-DAKSH** training nudges.
- **OfflineDB (Browser IndexedDB)**: Client-side storage caching product drafts, audio blobs, and shortcodes.
- **SyncEngine (Service Worker Sync)**: Background sync queue with exponential auto-retry batch uploading to the API Gateway.

## Backend & AI Core Microservices (FastAPI)
- **AuthService**: MoSJE e-Shram Auth validating PM-SURAJ, PM-DAKSH, e-Shram, Pehchan ID, TRIFED credentials.
- **PIIVault**: DPDP Act-compliant AES-256-GCM tokenization vault for protecting sensitive artisan identifiers (Aadhaar, e-Shram UAN, bank accounts).
- **ImageAI (Image Studio Engine)**: Salient object segmentation (rembg U-2-Net or OpenCV GrabCut fallback), OpenCV CLAHE contrast enhancement, 1:1 auto-cropping.
- **LangAI (Multilingual Voice NLP)**: Whisper ASR regional dialects, IndicTrans2 neural translation across 22 scheduled Indian languages, 'Ask Dadi' voice assistant.
- **PricingAI (Dynamic Pricing Engine)**: Dynamic price optimizer enforcing statutory daily wage floors and XGBoost market regression.
- **VerifyService (Zero-Trust Verification Engine)**: Random 3-artisan peer jury orchestration, rubber-stamp anomaly detection, anti-fraud counterfeit report resolution.
- **QRService (Digital Passport Service)**: SHA-256 hash generator, vector code engine, 6-character shortcode resolver (A7X-9B2), ESC/POS 58mm thermal generator.
- **LogisticsService (First-Mile Logistics Adapter)**: India Post CSC drop-off barcode generator and PIN-to-PIN routing engine.
- **PayoutService (Direct Jan Dhan / UPI Payout)**: Middleman-free escrow account settlement and direct UPI/Jan Dhan disbursement.
- **NotifyService (SMS & IVR Engine)**: Automated SMS and IVR voice alerts in native dialect informing offline artisans of new orders and payouts.
- **ExportService (Multi-Channel Export Sync)**: Bi-directional catalog generator and atomic inventory lock for GeM B2G, ONDC Beckn v1.0, WhatsApp Cloud API, and SHG bulk wholesale.
- **AdminService (MoSJE Monitoring Dashboard)**: Aggregations for District Economic Heatmap, audit trail logs, PM-DAKSH training metrics, and predictive demand forecasts.

## Multi-Channel Export & Sync Adapters
- **GeM Portal**: B2G government procurement XML/CSV integration with bi-directional order sync.
- **ONDC Beckn Node**: B2C retail integration with real-time stock deduction webhooks.
- **WhatsApp Commerce Bot**: Direct consumer catalog generator with UPI payment links.
- **SHG / NGO Bulk Portal**: B2B wholesale catalog with tiered volume pricing.

## Buyer Verification Portal
- **Scan & 6-Char Shortcode**: Public verification portal (`/verify/{shortcode_or_hash}`).
- **Verified Artisan Origin**: MoSJE badge, WIP photos proving handcrafting, and native dialect audio story.
- **Fair Price Breakdown**: 4-part transparent cost disclosure (Raw Materials + Fair Labor Wages + Direct Artisan Profit + Packaging).
- **Anti-Fraud Feedback Loop**: Consumer **"🚩 Report Fake / Machine-Made"** trigger flagging items to `VerifyService`.

## Ministry & Admin Dashboard
- **MoSJE Nodal Officer / DM Dashboard**: Executive analytics portal.
- **Live District Economic Heatmap**: Real-time geospatial monitoring of wages disbursed and active artisans.
- **Anti-Corruption & Peer-Review Logs**: Immutable audit trails of peer jury verdicts and counterfeit flags.
- **Skill Upskilling Analytics (PM-DAKSH)**: PM-DAKSH training completions, certification milestones, and wage multiplier analytics.
- **Predictive Demand AI (DemandForecast)**: AI forecast models predicting festive demand surges (Diwali, Durga Puja, Pushkar Mela).
