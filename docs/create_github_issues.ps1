# PowerShell Script to automatically create all Artify Bharat GitHub Issues via gh CLI
# Usage: Run in PowerShell after authenticating with `gh auth login`

# Auto-add GitHub CLI to PATH if not already in session
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Program Files\GitHub CLI\gh.exe") {
        $env:Path += ";C:\Program Files\GitHub CLI"
    }
}

Write-Host "Checking GitHub authentication..." -ForegroundColor Cyan
& gh auth status
if ($LASTEXITCODE -ne 0) {
    Write-Error "Please authenticate with 'gh auth login' first."
    exit 1
}

Write-Host "Creating required labels on GitHub repository..." -ForegroundColor Cyan
$labels = @(
  @{name="ready-for-agent"; color="0E8A16"; desc="Fully specified, ready for autonomous agent"},
  @{name="backend"; color="1D76DB"; desc="FastAPI and Python backend services"},
  @{name="infrastructure"; color="5319E7"; desc="Postgres, Redis, Storage and DB migrations"},
  @{name="auth"; color="FBCA04"; desc="Authentication and voice verification"},
  @{name="data-pipeline"; color="BFD4F2"; desc="Data ingestion and e-commerce scraping"},
  @{name="ai-cv"; color="D4C5F9"; desc="Computer vision, U2-Net, OpenCV CLAHE"},
  @{name="ai-nlp"; color="B60205"; desc="NLP, Whisper, IndicTrans2, Mistral-7B"},
  @{name="ai-ml"; color="006B75"; desc="Machine learning, XGBoost pricing regression"},
  @{name="security"; color="E99695"; desc="Security and verification"},
  @{name="crypto"; color="0052CC"; desc="Cryptographic SHA-256 provenance hashing"},
  @{name="integration"; color="C5DEF5"; desc="GeM and ONDC external API integrations"},
  @{name="android"; color="3DDC84"; desc="Native Android Kotlin + Jetpack Compose app"},
  @{name="ui"; color="F9D0C4"; desc="User interface and presentation layer"},
  @{name="offline-first"; color="1D76DB"; desc="Room SQLite offline sync and queueing"},
  @{name="frontend"; color="5319E7"; desc="Web portal user interface"},
  @{name="web-portal"; color="FBCA04"; desc="Public heritage passport verification portal"},
  @{name="qa"; color="D93F0B"; desc="Quality assurance and testing"},
  @{name="harness"; color="0E8A16"; desc="Agent action space and evaluation harness"},
  @{name="devops"; color="BFDADC"; desc="Docker, containers and deployment"},
  @{name="ci-cd"; color="2188FF"; desc="Continuous integration and automation"}
)

foreach ($l in $labels) {
    gh label create $l.name --color $l.color --description $l.desc --force 2>$null
}

Write-Host "Creating Artify Bharat GitHub Issues across all 4 Milestones..." -ForegroundColor Cyan

# Milestone 1: Foundation & Data Infrastructure
Write-Host "Creating Milestone 1 issues..." -ForegroundColor Yellow
gh issue create --title "[Infra] PostgreSQL Async Schema, Migrations & Redis Celery Broker" --body "Scaffold the asynchronous database layer, Redis queue, and Alembic database migration environment.

Acceptance Criteria:
- [x] SQLAlchemy 2.0 async models (Artisan, Product, Pricing, Passport, Export)
- [x] Async session factory with PostgreSQL / SQLite support
- [x] Redis broker + Celery worker background queue
- [x] Alembic migration configuration" --label "ready-for-agent,backend,infrastructure"

gh issue create --title "[Auth] Voice-First Onboarding & PIN Authentication Service" --body "Implement Page 1 Voice-first artisan registration endpoint and secure 4-digit PIN authentication.

Acceptance Criteria:
- [x] POST /api/v1/auth/register-voice dialect audio registration
- [x] POST /api/v1/auth/login-pin with bcrypt PIN validation
- [x] JWT access token authentication
- [x] 100% test coverage in test_auth_voice.py" --label "ready-for-agent,backend,auth"

gh issue create --title "[Data] Automated E-Commerce Benchmark Price Scraper Cron" --body "Build scheduled scraper worker to continuously aggregate market price points across handloom and handicraft portals (GeM, Amazon Karigar, ONDC).

Acceptance Criteria:
- [x] Celery beat 24h cron scraper
- [x] Price percentile normalization (P25, P50, P75)
- [x] Redis caching for dynamic pricing ML engine" --label "ready-for-agent,backend,data-pipeline"

# Milestone 2: Core AI Engines & Processing Pipelines
Write-Host "Creating Milestone 2 issues..." -ForegroundColor Yellow
gh issue create --title "[AI/CV] U²-Net Salient Background Removal, CLAHE & 1:1 Studio Cropping" --body "Implement Page 3 Computer Vision pipeline converting informal room photos into studio-grade 1:1 e-commerce assets.

Acceptance Criteria:
- [x] Salient foreground segmentation (U2-Net / GrabCut)
- [x] Lighting and gamma equalization via OpenCV CLAHE in LAB space
- [x] Centered 1:1 square auto-cropping with white backdrop
- [x] Visual complexity score metric (Canny edge density + channel variance)
- [x] POST /api/v1/studio/enhance endpoint" --label "ready-for-agent,ai-cv,backend"

gh issue create --title "[AI/NLP] Dialect ASR, IndicTrans2 Translation & Mistral-7B Cataloger" --body "Implement Page 4 Multilingual Voice Auto-Cataloger extracting standardized e-commerce metadata from dialect voice recordings.

Acceptance Criteria:
- [x] Whisper / Google STT regional speech transcription
- [x] IndicTrans2 dialect to English machine translation
- [x] Mistral-7B structured catalog specification (Title, Heritage Narrative, Weave, SEO tags)
- [x] POST /api/v1/catalog/voice-description endpoint" --label "ready-for-agent,ai-nlp,backend"

gh issue create --title "[AI/ML] Dynamic Fair-Wage Pricing Engine with XGBoost Regression" --body "Implement Page 5 Dynamic Pricing Engine with statutory Fair Wage protection floor and market value recommendations.

Acceptance Criteria:
- [x] Statutory Fair Wage floor (Labor Days * INR 450)
- [x] XGBoost regression feature model with market scrapers
- [x] Interactive price window (min, max, recommended)
- [x] Net profit margin calculation protecting artisan earnings
- [x] POST /api/v1/pricing/calculate endpoint" --label "ready-for-agent,ai-ml,backend"

gh issue create --title "[Crypto] Deterministic SHA-256 Heritage Passport & QR Code Engine" --body "Implement Page 6 Cryptographic Verification & Digital Artisan Passport QR Code generator.

Acceptance Criteria:
- [x] Deterministic SHA-256 provenance hash binding artisan ID, TRIFED/Pehchan ID, geo-coords, timestamp, cost
- [x] High-contrast Base64 QR code rendering for physical tags & digital listings
- [x] POST /api/v1/passport/issue/{product_id}
- [x] GET /api/v1/passport/verify/{hash} public verification endpoint" --label "ready-for-agent,security,crypto,backend"

# Milestone 3: Client Applications & Multi-Channel Integrations
Write-Host "Creating Milestone 3 issues..." -ForegroundColor Yellow
gh issue create --title "[Export] Multi-Channel Adapters for GeM XML/CSV, ONDC Beckn & B2B" --body "Implement Page 7 One-Tap Multi-Channel Export adapters for GeM, ONDC, and B2B institutional procurement.

Acceptance Criteria:
- [x] GeM XML/CSV government procurement schema
- [x] ONDC Beckn Protocol JSON schema (nic2004:52110)
- [x] Direct B2B tiered volume pricing adapter
- [x] POST /api/v1/exports/publish endpoint" --label "ready-for-agent,backend,integration"

gh issue create --title "[Android] 7-Stage High-Contrast Jetpack Compose Presentation Flow" --body "Build the native Android client using Kotlin + Jetpack Compose for all 7 Playbook screens with an Indian Heritage theme.

Acceptance Criteria:
- [x] Page1VoiceOnboardingScreen (Microphone + PIN)
- [x] Page2ZeroSkillDashboardScreen ('Naya Product Bechein')
- [x] Page3CameraStudioScreen (CameraX 1:1 preview)
- [x] Page4VoiceCatalogerScreen (Audio recording waveform)
- [x] Page5DynamicPricingScreen (Touchpads + Fair Wage slider)
- [x] Page6HeritagePassportScreen (SHA-256 provenance card)
- [x] Page7ChannelExportScreen (Batch GeM/ONDC/B2B export)" --label "ready-for-agent,android,ui"

gh issue create --title "[Android] Room SQLite Offline Task Queue for Low-Bandwidth Areas" --body "Implement local Room SQLite offline task queueing and WorkManager background synchronization for low-connectivity rural environments.

Acceptance Criteria:
- [x] OfflineTaskDao & OfflineTaskEntity in Room
- [x] Local action queueing when offline
- [x] Automatic retry on network reconnection" --label "ready-for-agent,android,offline-first"

gh issue create --title "[Web] Public Heritage Passport Verification Portal with Voice Stream" --body "Build the public web portal allowing buyers, consumers, and procurement officers to verify artisan provenance and cost breakdown.

Acceptance Criteria:
- [x] Responsive heritage UI (Terracotta, Silk, Trust Green)
- [x] Live SHA-256 hash lookup via /api/v1/passport/verify/{hash}
- [x] Verified artisan profile (TRIFED ID, Pehchan ID, GI tags)
- [x] Audio player streaming dialect voice recording
- [x] Transparent cost breakdown (Material + Fair Wage + Net Profit)" --label "ready-for-agent,frontend,web-portal"

# Milestone 4: Testing, Harness Benchmarking & Deployment
Write-Host "Creating Milestone 4 issues..." -ForegroundColor Yellow
gh issue create --title "[Harness] Agent Action Space, Error Recovery Contracts & Benchmark Evaluator" --body "Implement the Agent Harness for autonomous benchmarking, typed action spaces, and recovery contracts.

Acceptance Criteria:
- [x] Typed action schemas in action_space.py
- [x] Standardized observation envelopes in observation.py
- [x] Error recovery contracts in recovery.py
- [x] Benchmark evaluator in evaluator.py
- [x] 100% test pass in test_agent_harness.py" --label "ready-for-agent,qa,harness"

gh issue create --title "[DevOps] Complete Docker Compose Microservice Stack & CI Pipeline" --body "Containerize the full microservice topology and configure GitHub Actions CI for automated testing.

Acceptance Criteria:
- [x] docker-compose.yml with PostgreSQL, Redis, MinIO, Backend, Celery, Web Portal
- [x] GitHub Actions CI workflow running pytest
- [x] Production Dockerfile for FastAPI" --label "ready-for-agent,devops,ci-cd"

Write-Host "🎉 All 13 Artify Bharat GitHub Issues created successfully!" -ForegroundColor Green
