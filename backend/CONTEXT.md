# Backend Bounded Context: ArtifyBharat (FastAPI / Node.js)

## Architecture Overview
The backend provides the API Gateway, AI Core Microservices, and DPI Adapters for the Artify Bharat platform under the **Ministry of Social Justice and Empowerment (MoSJE)** (SIH PS 26090).

## Microservices & Services Structure (`app/services/`)
1. **AuthService (`auth.py`)**:
   - Master Pehchan Card and TRIFED ID validation.
   - MoSJE scheme validation (**PM-SURAJ**, **PM-DAKSH**, **e-Shram** UAN lookup).
   - Voice-first registration and 4-digit PIN authentication.
2. **ImageAI (`cv_service.py`)**:
   - Salient object segmentation (`rembg U-2-Net`).
   - OpenCV CLAHE contrast and lighting enhancement in LAB space.
   - Fixed 1:1 auto-cropping and visual complexity analysis.
3. **LangAI (`nlp_service.py` & `assistant_service.py`)**:
   - Whisper regional dialect ASR & IndicTrans2 translation across 22 scheduled Indian languages.
   - Structured metadata extraction & conversational 'Ask Dadi' assistant.
4. **PricingAI (`pricing_service.py`)**:
   - Statutory Skilled-Wage Floor enforcement (`labor_days * daily_wage_benchmark`).
   - XGBoost dynamic pricing regression optimizer.
5. **VerifyService (`verify_jury_service.py`)**:
   - Zero-Trust randomized 3-artisan peer jury quorum assignment.
   - Quorum consensus scoring and AI rubber-stamp anomaly detection.
   - Anti-fraud buyer counterfeit reporting trigger and incident queue.
6. **QRService (`passport_service.py`)**:
   - Deterministic SHA-256 cryptographic provenance hashing.
   - Vector QR code SVG generation and 6-character shortcode resolver (`A7X-9B2`).
   - 58mm ESC/POS Bluetooth thermal printer byte protocol generator.
7. **LogisticsService (`logistics_service.py`)**:
   - India Post Speed Post and CSC Rural Logistics adapter.
   - PIN routing and Code-128 parcel barcode generator.
8. **PayoutService (`payout_service.py`)**:
   - Direct Jan Dhan bank transfer & UPI escrow settlement.
   - 100% middleman-free instant disbursement.
9. **NotifyService (`notify_service.py`)**:
   - SMS and Bhashini IVR voice call engine for offline rural artisans.
10. **AdminService (`admin_service.py`)**:
    - MoSJE Nodal Officer / DM Live District Economic Heatmaps.
    - Anti-Corruption Peer-Review Logs.
    - PM-DAKSH Skill Upskilling Analytics.
    - Predictive Demand AI for festival trend forecasting.
11. **ExportService (export_service.py)**:
    - Unified Bi-Directional Sync Adapter for GeM, ONDC Beckn v1.0, WhatsApp Commerce, and SHG/NGO Bulk Portals.
    - Multi-Channel Atomic Inventory Lock (lock_inventory_on_sale) with row-level pessimistic locking (with_for_update) preventing overselling of unique handcrafted items.
12. **PIIVault (pp/core/pii_vault.py)**:
    - DPDP Act compliant AES-256-GCM authenticated tokenization and reveal service.
    - Cryptographic tokenization for Aadhaar, Pehchan, TRIFED, e-Shram UAN, and Jan Dhan bank details.
    - Display masking preserving last 4 digits (or UPI routing domain).

## Storage & Compliance
- **PostgreSQL**: Relational storage for artisans, pricing logs, audit hashes, and jury queue.
- **MinIO / AWS S3**: Raw images, studio PNGs, audio streams, and QR SVGs.
- **Secure PII Vault**: Encrypted tokenization for e-Shram UANs and Jan Dhan bank details complying with the DPDP Act.
