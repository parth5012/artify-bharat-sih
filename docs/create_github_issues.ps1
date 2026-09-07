# PowerShell Script to automatically create all Artify Bharat GitHub Issues via gh CLI
# Usage: Run in PowerShell after authenticating with `gh auth login`

Write-Host "Creating Artify Bharat GitHub Issues..." -ForegroundColor Cyan

# Milestone 1
gh issue create --title "[Infra] PostgreSQL Async Schema, Migrations & Redis Celery Broker" --body "Scaffold the asynchronous database layer, Redis queue, and Alembic database migration environment.
- SQLAlchemy 2.0 async models
- Redis broker + Celery worker
- Alembic async migration environment" --label "ready-for-agent,backend,infrastructure"

gh issue create --title "[Auth] Voice-First Onboarding & PIN Authentication Service" --body "Implement Page 1 Voice-first artisan registration endpoint and secure 4-digit PIN authentication.
- POST /api/v1/auth/register-voice
- POST /api/v1/auth/login-pin
- JWT auth tokens + bcrypt password hashing" --label "ready-for-agent,backend,auth"

gh issue create --title "[Data] Automated E-Commerce Benchmark Price Scraper Cron" --body "Build scheduled scraper worker to continuously aggregate market price points across handloom and handicraft portals (GeM, Amazon Karigar, ONDC).
- Celery beat 24h cron
- Percentile price aggregations
- Redis caching for pricing ML" --label "ready-for-agent,backend,data-pipeline"

# Milestone 2
gh issue create --title "[AI/CV] U²-Net Salient Background Removal, CLAHE & 1:1 Studio Cropping" --body "Implement Page 3 Computer Vision pipeline converting informal room photos into studio-grade 1:1 e-commerce assets.
- U2-Net / GrabCut foreground segmentation
- OpenCV CLAHE gamma correction in LAB space
- Centered 1:1 square auto-cropping on white backdrop
- Visual complexity score metric" --label "ready-for-agent,ai-cv,backend"

gh issue create --title "[AI/NLP] Dialect ASR, IndicTrans2 Translation & Mistral-7B Cataloger" --body "Implement Page 4 Multilingual Voice Auto-Cataloger extracting standardized e-commerce metadata from dialect voice recordings.
- Whisper/Google STT regional transcription
- IndicTrans2 dialect to English translation
- Mistral-7B structured catalog specification (Title, Description, Weave, SEO tags)" --label "ready-for-agent,ai-nlp,backend"

gh issue create --title "[AI/ML] Dynamic Fair-Wage Pricing Engine with XGBoost Regression" --body "Implement Page 5 Dynamic Pricing Engine with statutory Fair Wage protection floor and market value recommendations.
- Statutory Fair Wage floor (Labor Days * INR 450)
- XGBoost regression feature model
- Recommended pricing window with artisan profit protection" --label "ready-for-agent,ai-ml,backend"

gh issue create --title "[Crypto] Deterministic SHA-256 Heritage Passport & QR Code Engine" --body "Implement Page 6 Cryptographic Verification & Digital Artisan Passport QR Code generator.
- Deterministic SHA-256 provenance hash binding artisan ID, TRIFED ID, geo-coords, timestamp, cost
- Base64 QR code rendering for physical tags & digital listings
- Public REST verification endpoint GET /api/v1/passport/verify/{hash}" --label "ready-for-agent,security,crypto,backend"

# Milestone 3
gh issue create --title "[Export] Multi-Channel Adapters for GeM XML/CSV, ONDC Beckn & B2B" --body "Implement Page 7 One-Tap Multi-Channel Export adapters for GeM, ONDC, and B2B institutional procurement.
- GeM XML/CSV government procurement schema
- ONDC Beckn Protocol JSON schema (nic2004:52110)
- Direct B2B tiered volume pricing adapter" --label "ready-for-agent,backend,integration"

gh issue create --title "[Android] 7-Stage High-Contrast Jetpack Compose Presentation Flow" --body "Build the native Android client using Kotlin + Jetpack Compose for all 7 Playbook screens with an Indian Heritage theme.
- Page 1 to Page 7 high-contrast screens
- Clean architecture domain, data, presentation separation" --label "ready-for-agent,android,ui"

gh issue create --title "[Android] Room SQLite Offline Task Queue for Low-Bandwidth Areas" --body "Implement local Room SQLite offline task queueing and WorkManager background synchronization for low-connectivity rural environments.
- OfflineTaskDao & OfflineTaskEntity in Room
- Automatic retry on network reconnection" --label "ready-for-agent,android,offline-first"

gh issue create --title "[Web] Public Heritage Passport Verification Portal with Voice Stream" --body "Build the public web portal allowing buyers, consumers, and procurement officers to verify artisan provenance and cost breakdown.
- Responsive heritage UI (Terracotta, Silk, Trust Green)
- Live SHA-256 hash lookup
- Audio player streaming dialect voice recording
- Transparent cost breakdown (Material + Fair Wage + Net Profit)" --label "ready-for-agent,frontend,web-portal"

# Milestone 4
gh issue create --title "[Harness] Agent Action Space, Error Recovery Contracts & Benchmark Evaluator" --body "Implement the Agent Harness for autonomous benchmarking, typed action spaces, and recovery contracts.
- Typed action schemas in action_space.py
- Standardized observation envelopes in observation.py
- Error recovery contracts in recovery.py
- Benchmark evaluator in evaluator.py" --label "ready-for-agent,qa,harness"

gh issue create --title "[DevOps] Complete Docker Compose Microservice Stack & CI Pipeline" --body "Containerize the full microservice topology and configure GitHub Actions CI for automated testing.
- docker-compose.yml with PostgreSQL, Redis, MinIO, Backend, Celery, Web Portal
- GitHub Actions CI workflow" --label "ready-for-agent,devops,ci-cd"

Write-Host "All 13 GitHub Issues created successfully!" -ForegroundColor Green
