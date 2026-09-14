# Learnings

> Key learnings, edge cases, and concepts worth remembering for this project.

## - Onboarding Session Gating in Jetpack Compose: Condition `startDestination` on a dedicated `Screen.Splash` rather than dynamic NavHost recreation. `SplashScreen` reads `isOnboardedFlow` and executes `popUpTo(Screen.Splash.route) { inclusive = true }` into `Onboarding` or `VoiceCatalog`, eliminating recomposition flickers and preventing back-press escape.
- Android Runtime Permission Launcher Flow: Compose's `rememberLauncherForActivityResult(RequestPermission())` combined with custom state handling enables clean JIT rationale dialogs with `Settings.ACTION_APPLICATION_DETAILS_SETTINGS` fallbacks for permanently denied permissions.
- Honest Offline State Architecture: Rather than swallowing network exceptions and substituting fake mock data in ViewModels, expose explicit `isOffline` and `errorMessage` UI flags. In offline situations, offer explicit "डेमो मोड (Demo Mode)" or save drafts to Room sync queue with clear user communication.

Project-Specific Learnings

- Keep generated catalog metadata fields intact when adapting backend voice responses to frontend naming: dropping `metadata.description` makes extraction appear incomplete even when NLP succeeded. Pair the request with visible lifecycle stages so slow ASR/translation work is understandable.
- Voice catalog extraction must accept a draft before a persisted Product exists: the camera flow only saves a local draft, so requiring `product_id` at upload time prevents real voice processing. Keep extraction completion separate from navigation so catalog fields can be reviewed before pricing.

- Cryptographic Provenance EXIF order: write EXIF metadata and GPS coordinates *prior* to computing SHA-256 file hashes; otherwise exif.saveAttributes() alters JPEG bitstreams on disk.
- ESC/POS Thermal Printing: enforce pure US-ASCII in receipt byte builders to avoid unprintable replacement characters on 58mm/80mm micro-controllers.
- ADR 0004 Statutory Wage Floor: enforce floor validation directly inside ViewModel mutation methods (lockPrice()) and disable UI buttons to prevent distress-sale sub-floor locking.
- Pure JVM Unit Testing: android.graphics.Bitmap.createBitmap requires Robolectric or device runtime; test ZXing BitMatrix directly in pure unit tests.

_None yet — populate as the agent discovers patterns, edge cases, and gotchas._

- Canonical JSON (`sort_keys=True, separators=(',',':')`) before SHA-256 for Digital Heritage Passport (see ADR-0002).
- Fair Wage Floor is non-negotiable floor before premiums (see ADR-0004).
- Dual-layer AI: on-device preview + Celery cloud workers for 2G/3G zones.
- Hatchling: `packages=["app"]` when project name differs from package dir; Pydantic v2 schema (no `example`).
- Restored from backup 2026-09-12: prior learnings archived in `.tmp/harness-backup-2026-09-12/LEARNINGS.md.bak`.

## Decision Log

**Native Android Kotlin App (Wayfinder Map #49)**: Scaffolding complete offline-first Android application in ndroid/ using MinSDK 24, Target 34, Jetpack Compose Material3, Room with SQLCipher AES-256 at-rest encryption, Android KeyStore MasterKey for DPDP-compliant auth tokens (zero raw Aadhaar), CameraX, WorkManager background synchronization with split-revision DRAFT_V2 conflict branching, and SPP ESC/POS thermal printing.

> Why decisions were made, alternatives considered, and consequences.

- **Multi-Channel Export Adapters (Phase 5)**: Implemented XML ElementTree generation for GeM B2G HSN-50072010 specifications, Beckn v1.0 schema validator for ONDC on_search catalog, WhatsApp Cloud API CTA card with NPCI-standard UPI deep-link and shortcode, and SHG tiered volume discount CSV generator. All adapters carry cryptographic Digital Heritage Passport hash.
- **Admin Backend DB Aggregations (Phase 8, Map #22)**: Replaced mock admin endpoints (/district-heatmap, /audit-logs, /pmdaksh-metrics) with real SQLAlchemy database aggregations. Kept response schemas backward-compatible, added fallback to seed data when database tables are empty, and bounded query limits to prevent resource exhaustion.

## Edge Cases

> Known edge cases, gotchas, and non-obvious behaviors discovered during work.

- **Mocking CV enhance in export tests**: Rembg U2-Net model downloads over network (~170MB) if not cached locally, which stalls unit test suites. Fast export adapter suites mock enhance_image so tests run deterministically in <0.5s.
- **Deep copy for nested schema validation tests**: In Python, dict(payload) creates a shallow copy; mutating nested dictionary fields modifies the source object. Use copy.deepcopy when constructing negative schema test variants.
- **SQLAlchemy model back_populates mismatch**: When adding two-way relationships in declarative models (e.g. Artisan.payouts and Product.jury_tickets), both sides of the relationship must be defined in the models before registry.configure() is triggered during query execution.
- **District grain vs cluster multiplicity**: In geospatial heatmaps, grouping by district and state while taking the dominant craft cluster avoids row duplication and multiple counting of district wage payouts.
- **Web Speech DOM typing**: TypeScript's DOM lib exposes `SpeechRecognitionEvent` but not a constructable `SpeechRecognition`; keep a small local interface for browser-prefixed recognition adapters.
