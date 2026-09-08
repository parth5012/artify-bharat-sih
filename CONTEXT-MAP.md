# Context Map: ArtifyBharat (SIH PS 26090 - MoSJE)

ArtifyBharat is structured across distinct bounded contexts:

## Bounded Contexts

| Context | Path | Core Responsibilities | Details |
|---|---|---|---|
| **System Core** | `/` | Ubiquitous language, overall architectural standards, cross-cutting models | [CONTEXT.md](./CONTEXT.md) |
| **Backend & AI Core Microservices** | `backend/` | FastAPI gateway, AuthService (MoSJE/e-Shram/Pehchan/TRIFED/PM-DAKSH), ImageAI (U²-Net CV studio), LangAI (Whisper, IndicTrans2, 'Ask Dadi'), PricingAI, VerifyService (Zero-Trust Peer Jury & Anomaly Check), QRService (SHA-256 & 6-Char Shortcode), LogisticsService (India Post), PayoutService (Jan Dhan Direct), NotifyService (SMS/IVR), Multi-Channel Adapters (GeM, ONDC, WhatsApp, SHG Bulk), Admin Dashboard Aggregators | [backend/CONTEXT.md](./backend/CONTEXT.md) |
| **Responsive Web Client & Portals** | `web-portal/` | Dual-Role Access (Artisan Direct & SHG Leader Hub), Browser Media Capture (1:1 aspect ratio), Geolocation & Timestamp Lock, Web Speech Voice NLP, 3-Tier Price Slider, 6-Char Digital Passport, Web Bluetooth 58mm ESC/POS Thermal Printer, IndexedDB Offline Drafts & ServiceWorker Sync, Buyer Verification Portal, MoSJE Admin Dashboard | [web-portal/CONTEXT.md](./web-portal/CONTEXT.md) |

## Context Relationships

```
+-----------------------------------------------------------+
|          Artisan & SHG Leader Web Client (HTML5/React)    |
|  - Dual-Role Access (Artisan / SHG Leader Hub)            |
|  - Web MediaDevices (1:1 Crop + WIP + GPS Lock)           |
|  - 3-Tier Price Slider & Web Bluetooth 58mm Thermal Print |
|  - 'Ask Dadi' PM-DAKSH & IndexedDB Offline Sync           |
+-----------------------------+-----------------------------+
                              |
                              | Upstream REST APIs & WebSockets / Batch Sync
                              v
+-----------------------------------------------------------+      Public Shortcode Lookup & Fraud Reports      +-----------------------------------------+
|             Backend API Gateway & DPI Microservices       | <------------------------------------------------ |        Buyer Verification Portal        |
|  - AuthService (MoSJE / e-Shram / PM-SURAJ / PM-DAKSH)    |                                                   |  - 6-Char Shortcode / QR Resolver       |
|  - ImageAI (rembg U-2-Net + CLAHE) & LangAI (Whisper/TTS) |                                                   |  - Verified MoSJE Origin + WIP Photos   |
|  - PricingAI (Fair Wage Floor) & QRService (Shortcode)    |                                                   |  - 4-Part Transparent Price Breakdown   |
|  - VerifyService (Zero-Trust Peer Jury & Anomaly Check)   |                                                   |  - Anti-Fraud 'Report Fake' Trigger     |
|  - LogisticsService (India Post) & PayoutService (Jan Dhan|                                                   +-----------------------------------------+
|  - NotifyService (SMS & Bhashini Voice Alerts)            |
+-----------------------------+-----------------------------+
                              |
       +----------------------+----------------------+
       |                                             |
       v Multi-Channel Adapters                      v Admin Analytics Feed
+------------------------------------+      +-----------------------------------------+
| Multi-Channel Marketplaces         |      |  Ministry & Admin Dashboard (MoSJE DM)  |
| - GeM Portal (B2G Bulk Orders)     |      |  - Live District Economic Heatmap       |
| - ONDC Beckn Node (B2C Retail)     |      |  - Anti-Corruption & Peer-Review Logs   |
| - WhatsApp Commerce Bot            |      |  - PM-DAKSH Upskilling Analytics        |
| - SHG / NGO Bulk Wholesale Portal  |      |  - Predictive Demand AI (Diwali Surge)  |
+------------------------------------+      +-----------------------------------------+
```
