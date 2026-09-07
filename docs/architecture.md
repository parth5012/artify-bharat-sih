# ArtifyBharat Architecture Specification

## 1. System Context & Overview (SIH PS 26090)
Artify Bharat is an AI-powered Digital Business Manager and Digital Gatekeeper bridging rural Indian artisans with national procurement portals (GeM, ONDC, Amazon Karigar, Direct B2B). The platform resolves two critical bottlenecks:
- **Artisan's Barrier**: Illiteracy, lack of English fluency, absence of photography equipment, unfair middleman pricing, and listing complexity.
- **Buyer's Trust Deficit**: Inability to verify authentic handloom craftsmanship against counterfeit machine-made items.

```
+-----------------------------------------------------------------------------------+
|                           ArtifyBharat System Topology                            |
+-----------------------------------------------------------------------------------+

   +------------------------------------+       +---------------------------------+
   |      Android Kotlin App            |       |     Web Verification Portal     |
   |   (Artisan / Weaver Client)        |       |   (Consumer / GeM Buyer View)   |
   |                                    |       |                                 |
   |  - Voice-First Onboarding (P1)     |       |  - SHA-256 Provenance Lookup    |
   |  - Zero-Skill Camera Studio (P3)   |       |  - Voice Story Audio Stream     |
   |  - Multilingual Auto-Catalog (P4)  |       |  - GI Tag Certification Record  |
   |  - Fair Wage Pricing Slider (P5)   |       |  - Transparent Cost Breakdown   |
   |  - Digital Heritage Passport (P6)  |       |                                 |
   |  - Multi-Channel Sync (P7)         |       |                                 |
   +-----------------+------------------+       +----------------+----------------+
                     |                                           |
                     | REST API (JSON / Multipart)               | Public Verification
                     v                                           v
   +------------------------------------------------------------------------------+
   |                        FastAPI Gateway & Core API                            |
   |                                                                              |
   |  /api/v1/auth     /api/v1/studio    /api/v1/catalog    /api/v1/pricing       |
   |  /api/v1/passport /api/v1/exports                                            |
   +-----------------------+-----------------------------+------------------------+
                           |                             |
              Async Tasks  |                             | Sync Queries
                           v                             v
   +-------------------------------+             +--------------------------------+
   |        Celery & Redis         |             |      PostgreSQL / SQLite       |
   |                               |             |                                |
   |  - U²-Net Salient Removal     |             |  - Artisans & TRIFED ID        |
   |  - OpenCV CLAHE Correction    |             |  - Products & Metadata         |
   |  - Whisper Regional ASR       |             |  - Heritage Passports & Hashes |
   |  - IndicTrans2 Translation    |             |  - Fair Wage Pricing Records   |
   |  - Mistral-7B LLM Extraction  |             |  - Multi-Channel Sync Status   |
   |  - Daily Market Price Scraper |             +--------------------------------+
   +---------------+---------------+
                   |
                   v
   +------------------------------------+
   |   MinIO / AWS S3 Object Storage    |
   |   (Raw/Studio Media, Voice Audio)  |
   +------------------------------------+
```

## 2. Multi-Stage Pipeline Breakdown

### Stage 1: Voice-First Onboarding
- Artisan taps prominent microphone icon.
- Local voice dialect audio stream captured.
- Speech-to-Text transcribes speech and registers record with a 4-digit security PIN.

### Stage 2: Zero-Skill Dashboard
- High-contrast, single primary CTA: "Naya Product Bechein" (Sell New Product) with camera iconography.
- Eliminates nested navigation hierarchies for low-literacy artisans.

### Stage 3: Camera Module & Studio Enhancement
- Artisan photographs craft under ambient room lighting.
- On-device TFLite model creates salient segmentation mask for instantaneous Before vs After preview.
- Cloud pipeline applies U²-Net salient object segmentation, OpenCV CLAHE lighting/gamma equalization, and centered 1:1 auto-cropping on a white studio canvas.
- Visual complexity score is calculated via edge density and color variance.

### Stage 4: Multilingual Voice Auto-Cataloger
- Artisan records 30–60 seconds in native dialect (e.g., Bhojpuri, Maithili, Hindi).
- Whisper ASR transcribes regional speech; IndicTrans2 translates into English.
- Fine-tuned Mistral-7B LLM extracts structured title, weave technique, duration, and SEO tags.

### Stage 5: Dynamic Pricing Engine
- Artisan inputs Raw Material Cost and Labor Days on large touch keypads.
- System enforces a statutory Fair Wage floor (`labor_days * daily_wage_benchmark`).
- XGBoost regression correlates material cost, labor investment, visual complexity score, and live scraped market prices to generate a recommended market price range.

### Stage 6: Cryptographic Heritage Passport Generation
- System binds artisan identity, TRIFED/Pehchan credentials, GI certification, GPS coordinates, and product cost into a deterministic SHA-256 hash.
- High-contrast QR code is generated for physical tag printing and digital attachment.

### Stage 7: One-Tap Multi-Channel Government Export
- Automated adapter layer transforms product catalog into compliant formats:
  - **GeM**: XML / CSV Government procurement schema with HSN codes and artisan verification IDs.
  - **ONDC**: Beckn Protocol JSON catalog schema.
  - **Direct B2B**: Bulk institutional procurement pricing with quantity tiers.
