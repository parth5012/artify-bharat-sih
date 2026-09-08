# Core Ubiquitous Language & Domain Concepts (SIH PS 26090)

## Problem Statement Domain
- **SIH PS 26090**: Digital Business Manager & Digital Gatekeeper for rural weavers and handicraft artisans.
- **Artisan / Weaver**: The primary creator producing GI-certified or traditional handloom goods.
- **Craft Cluster**: Recognized regional cluster (e.g., Varanasi Handloom Cluster, Kashmir Pashmina Cluster, Madhubani Art Cluster).
- **TRIFED / Pehchan ID**: Official Indian government artisan identification credentials.
- **Geographical Indication (GI)**: Government certification of authenticity and geographic origin (e.g., Banarasi Brocade & Saree GI Reg #39).

## Client Layer Domain Concepts
- **UI_Dash (Dashboard)**: Zero-skill home screen with primary 'Naya Product' CTA and 'My Inventory' tracking active listings & draft sync.
- **UI_Capture (AI Smart Camera)**: High-precision camera viewfinder with 1:1 square crop constraint and real-time auto-enhance preview.
- **UI_Voice (Voice Cataloging)**: Speak in dialect; AI writes structured title and description.
- **UI_Price (Smart Pricing)**: Enter raw material cost & labor days; AI suggests market range & enforces statutory Fair Wage Floor.
- **UI_Verify (Verify & Passport)**: Review AI output and generate deterministic SHA-256 Digital Passport & QR code.
- **UI_Export (One-Tap Publish)**: Select target channels (GeM / ONDC / B2B) and export with one tap.
- **UI_Help ('Ask Dadi' Assistant)**: Interactive multilingual voice assistant answering rural artisan questions in native dialect.
- **OfflineDB (Local SQLite)**: Persistent offline draft queue and media cache for intermittent rural connectivity.

## Backend & AI Core Microservices
- **AuthService (Verification Service)**: Pehchan Card and TRIFED ID database validation against national artisan registries.
- **ImageAI (AI Image Studio)**: Salient object segmentation (U²-Net), background removal, OpenCV CLAHE lighting/gamma auto-fix, centered 1:1 auto-cropping.
- **LangAI (Multilingual NLP & Assistant)**: Whisper regional dialect ASR, IndicTrans2 translation, Mistral-7B metadata extraction, and 'Ask Dadi' conversational engine.
- **PricingAI (Dynamic Pricing & Profit Optimizer)**: XGBoost regression engine calculating recommended market price range and Fair Wage Floor (`labor_days * daily_wage_benchmark`).
- **QRService (Digital Passport Engine)**: Deterministic SHA-256 hash computation from canonical JSON keys and high-contrast QR code generator.
- **Unified Catalog Adapter**: Multi-channel transformation for GeM (XML/CSV), ONDC (Beckn Protocol JSON), and B2B (CSV/Email).
- **Buyer Verification Portal (Part B)**: Public provenance verification (`/verify/{hash}`), verified Artisan Story with native dialect audio player, and 0% Middleman Fair Price Breakdown.
