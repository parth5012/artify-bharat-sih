# ArtifyBharat (SIH PS 26090)
## AI-Powered Digital Business Manager & Cryptographic Heritage Passport for Artisans & Weavers

Smart India Hackathon Problem Statement 26090 — Technical Implementation Architecture & Scaffolded Monorepo.

---

## 📌 Architectural Vision & Executive Overview
Artify Bharat operates as an intelligent Digital Business Manager and Digital Gatekeeper for rural artisans and weavers, systematically abstracting digital literacy barriers:
1. **Voice-First Interaction**: Dialect speech-to-text (Whisper/Google STT) translated via IndicTrans2 and auto-cataloged by fine-tuned Mistral-7B.
2. **Camera Studio Enhancement**: On-device / cloud salient object segmentation (U²-Net), lighting/gamma equalization (OpenCV CLAHE), and 1:1 square auto-cropping.
3. **Dynamic Regression Pricing Engine**: Correlates material costs, labor days, visual complexity, and live web-scraped market benchmarks to protect artisan fair wage margins.
4. **Cryptographic Heritage Passport**: Generates deterministic SHA-256 hashes binding artisan identity, TRIFED/Pehchan credentials, GI certification, and geo-location into high-contrast QR codes.
5. **One-Tap Multi-Channel Government Export**: Translates catalog specifications into GeM (XML/CSV), ONDC (Beckn Protocol JSON), and B2B procurement formats.

---

## 🗂️ Monorepo Structure

```
artify-bharat-sih/
├── backend/                        # FastAPI Async Backend & AI Services
│   ├── app/
│   │   ├── api/v1/                 # Endpoints: auth, studio, catalog, pricing, passport, exports
│   │   ├── core/                   # Security, DB sessions, Storage, SHA-256 Passport Crypto
│   │   ├── models/                 # SQLAlchemy 2.0 async models (Artisan, Product, Pricing, Passport)
│   │   ├── schemas/                # Pydantic v2 validation contracts
│   │   ├── services/               # Domain engines (CV, NLP, Pricing, Passport, Export Adapters)
│   │   ├── workers/                # Celery background tasks & daily market price scraper
│   │   └── main.py                 # FastAPI application factory & lifecycle
│   ├── tests/                      # 100% passing test suite across all 6 core modules
│   ├── migrations/                 # Alembic async database migration configurations
│   ├── pyproject.toml              # Modern uv project definition
│   └── Dockerfile                  # Production container definition
│
├── android/                        # Android Client (Kotlin + Jetpack Compose)
│   ├── app/
│   │   ├── src/main/java/in/artifybharat/app/
│   │   │   ├── domain/             # Pure Kotlin Domain Models, Repositories, UseCases
│   │   │   ├── data/               # Retrofit REST Service, Room Offline Queue, Repo Impls
│   │   │   └── presentation/       # Compose 7-stage Screens, Indian Heritage Theme, NavGraph
│   │   └── build.gradle.kts
│   └── gradle/libs.versions.toml   # Dependency Version Catalog
│
├── harness/                        # Agent Harness (Schema-First Actions & Benchmarking)
│   ├── action_space.py             # Typed action schemas (micro, medium, macro tools)
│   ├── observation.py              # Standardized observation envelope formatter
│   ├── recovery.py                 # Error recovery contracts with stop gates
│   ├── evaluator.py                # Pass@1, Pass@3, completion rate benchmarking
│   └── harness_config.json         # Agent action space & budget constraints
│
├── web-portal/                     # Public Heritage Passport Verification Portal
│   ├── index.html                  # Responsive provenance & cost transparency viewer
│   └── package.json                # Vite tooling configuration
│
├── docs/agents/                    # Matt Pocock Engineering Skills Configuration
│   ├── issue-tracker.md            # GitHub issue tracker conventions
│   ├── triage-labels.md            # Canonical five-role triage mapping
│   └── domain.md                   # Multi-context domain exploration rules
│
├── CONTEXT.md                      # Core ubiquitous language & domain concepts
├── CONTEXT-MAP.md                  # Monorepo bounded contexts map
├── AGENTS.md                       # Agent instructions & skill registry
├── docker-compose.yml              # Complete local stack (PostgreSQL, Redis, MinIO, Backend, Worker, Web)
├── .env.example                    # Environment variable configuration template
├── .gitignore                      # Ignore rules for Python, Android, Node, and Media
└── .github/workflows/ci.yml        # Continuous integration pipeline running pytest
```

---

## 🚀 Quickstart Guide

### 1. Backend & Agent Harness Tests
```bash
cd backend
uv sync --extra dev
uv run pytest -v
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive documentation: `http://localhost:8000/docs`

### 2. Android App (Kotlin + Jetpack Compose)
Open `android/` directory in Android Studio (Ladybug or later) and run on an Android Device or Emulator (API 24+):
```bash
cd android
./gradlew assembleDebug
```

### 3. Web Verification Portal
Open `web-portal/index.html` in your browser or run:
```bash
cd web-portal
npm install
npm run dev
```

### 4. Full Docker Stack
```bash
docker-compose up -d --build
```
