# Context Map: ArtifyBharat (SIH PS 26090)

ArtifyBharat is organized as a multi-context system with three distinct bounded contexts:

## Bounded Contexts

| Context | Path | Core Responsibilities | Details |
|---|---|---|---|
| **System Core** | `/` | Ubiquitous language, overall architectural standards, cross-cutting ADRs | [CONTEXT.md](./CONTEXT.md) |
| **Backend & AI Pipeline** | `backend/` | FastAPI REST gateway, Celery task queue, U²-Net CV, Whisper/IndicTrans2 NLP, XGBoost pricing, GeM/ONDC adapters | [backend/CONTEXT.md](./backend/CONTEXT.md) |
| **Artisan Mobile Client** | `android/` | Voice-first Android application, Clean Architecture, Jetpack Compose 7-stage workflow, Room offline queue | [android/CONTEXT.md](./android/CONTEXT.md) |
| **Public Verification Portal** | `web-portal/` | Consumer / procurement officer interface, SHA-256 provenance verification, financial transparency breakdown | [web-portal/CONTEXT.md](./web-portal/CONTEXT.md) |

## Context Relationships

```
+------------------------------------+
|       Artisan Mobile Client        |
|            (`android/`)            |
+-----------------+------------------+
                  |
                  | Upstream REST API Calls
                  v
+------------------------------------+       Public Hash Lookup       +------------------------------------+
|       Backend & AI Pipeline        | <----------------------------- |     Public Verification Portal     |
|            (`backend/`)            |                                |           (`web-portal/`)          |
+-----------------+------------------+                                +------------------------------------+
                  |
                  | Multi-Channel Catalog Export
                  v
+------------------------------------+
|  External Platforms (GeM / ONDC)   |
+------------------------------------+
```
