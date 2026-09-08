# Context Map: ArtifyBharat (SIH PS 26090)

ArtifyBharat is structured across distinct bounded contexts:

## Bounded Contexts

| Context | Path | Core Responsibilities | Details |
|---|---|---|---|
| **System Core** | `/` | Ubiquitous language, overall architectural standards, cross-cutting models | [CONTEXT.md](./CONTEXT.md) |
| **Backend & AI Core Microservices** | `backend/` | FastAPI gateway, AuthService (Pehchan/TRIFED lookup), ImageAI (U²-Net CV studio), LangAI (Whisper, IndicTrans2, Mistral-7B, 'Ask Dadi'), PricingAI, QRService (SHA-256), Unified Export Adapter (GeM, ONDC, B2B) | [backend/CONTEXT.md](./backend/CONTEXT.md) |
| **Artisan Client Layer** | `android/` | Voice-first mobile application, Dashboard ('Naya Product' & 'My Inventory'), AI Smart Camera (1:1 crop), Voice Cataloging, Smart Pricing, Verify & Passport, One-Tap Export, 'Ask Dadi' voice help, SQLite OfflineDB | [android/CONTEXT.md](./android/CONTEXT.md) |
| **Buyer Verification Portal** | `web-portal/` | Public provenance verification, SHA-256 cryptographic check, Artisan Story with dialect voice stream, 0% middleman Fair Price Breakdown | [web-portal/CONTEXT.md](./web-portal/CONTEXT.md) |

## Context Relationships

```
+------------------------------------+
|       Artisan Client Layer         |
|   (Dashboard, Camera, Voice,       |
|    Price, Passport, Ask Dadi)      |
+-----------------+------------------+
                  |
                  | Upstream REST API Calls
                  v
+------------------------------------+       Public Hash Lookup       +------------------------------------+
|   Backend API Gateway & AI Core    | <----------------------------- |     Buyer Verification Portal      |
| (Auth, ImageAI, LangAI, PricingAI, |                                | (SHA-256 Check, Artisan Story,     |
|   QRService, Multi-Channel Export) |                                |  0% Middleman Price Breakdown)     |
+-----------------+------------------+                                +------------------------------------+
                  |
                  | Multi-Channel Catalog Export
                  v
+------------------------------------+
|  Target Channels (GeM, ONDC, B2B)  |
+------------------------------------+
```
