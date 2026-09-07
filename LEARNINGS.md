# Project Learnings & Decision Rationale

## Project: ArtifyBharat (SIH Problem Statement 26090)

### 1. Deterministic Cryptographic Hashes for Heritage Passports
- **Decision**: Used canonical JSON sorting (`json.dumps(..., sort_keys=True, separators=(',', ':'))`) before computing the SHA-256 digest.
- **Rationale**: Any minor variation in key ordering or whitespace between services could invalidate the cryptographic passport hash. Canonical encoding guarantees tamper-evident validation for consumers scanning QR codes on physical handloom items.

### 2. Fair Wage Protection in Pricing Engine
- **Decision**: Hardened the pricing formula such that `calculated_fair_wage = labor_days * daily_wage_benchmark` is treated as a non-negotiable floor before applying visual complexity premiums or market benchmarks.
- **Rationale**: Rural handloom weavers frequently suffer from distress selling and middleman markups. Hardcoding statutory fair wage baselines ensures the artisan's labor investment is preserved in the recommended retail and institutional procurement price points.

### 3. Dual-Layer AI Execution (On-Device + Celery Cloud)
- **Decision**: Supported both immediate local previews (TFLite U²-Net preview on mobile, simulated in `cv_service.py`) and asynchronous background processing via Celery for heavy cloud inferences.
- **Rationale**: Rural artisans often operate in intermittent 2G/3G connectivity zones. Decoupling fast on-device feedback from asynchronous cloud background workers prevents UI stalls and accommodates low-bandwidth queues.

### 4. Pydantic v2 & Hatchling Packaging Conventions
- **Decision**: Set explicit `tool.hatch.build.targets.wheel.packages = ["app"]` in `backend/pyproject.toml` when project name differs from the top-level package directory. Replaced deprecated Pydantic v1 `example` fields with v2 compliant schema attributes.
