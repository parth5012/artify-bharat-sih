# Learnings

> Key learnings, edge cases, and concepts worth remembering for this project.

## Pure Voice State Machine Extraction (`lib/voiceStates.ts`)

1. **Node-jest purity boundary**: jest runs with `testEnvironment:'node'` and `roots:['<rootDir>/tests']`, so everything extracted for unit tests (phase reducer, derived flags, mime pick, mic-error map, level math) must be DOM-free — React components and `useVoice` stay thin adapters over the pure module.
2. **Illegal action = no-op, never throw**: `transitionVoicePhase` returns the current phase for unmapped action/phase pairs. UI callers (timers racing user taps, double-taps on "Try sample speech") stay resilient without defensive try/catch.
3. **`processing + failed → idle` fixes the wedged spinner**: sample-speech and typed-text handlers previously `catch`ed API errors and logged only, leaving the screen stuck on "Understanding your voice…". Routing `failed` back to `idle` re-enables the mic path; recording-finish and file-upload keep their existing fallback-field review flow via `understood`.
4. **Submit-while-listening must stop the recorder**: sample/text/file buttons render during `listening` (controls are visible pre-review). Transitioning straight to `processing` without `v.stop()` leaked the MediaRecorder + rAF level loop. Stop first, then `submit`.
5. **One `getByteFrequencyData` per frame**: the old meter called it inside the per-bar `Array.from` callback (N times/frame). Read once, then `computeVoiceLevels(buf, N)` maps bars — same 4..60 range, cheaper.

## Save Profile + Product via Backend API (Map #147)

1. **No product_id without Studio upload**: frontend had no way to obtain a `product_id` to PATCH — solved by authenticated `POST /api/v1/catalog/drafts` creating `Product(status="draft")` before catalog save. PATCH alone cannot invent a row (404 detail is intentional Studio-enhancement guidance).
2. **Legacy fallback must use status, not message text**: `legacy/frontend_artifact` used `error.message.includes('400')`, but modern detail strings do not embed status codes. Attach `error.status` from the HTTP response and fall back to login only on 400.
3. **Backend register requires 4-digit PIN; frontend had no PIN field**: local component state only (never persisted to `artifact-artisan-draft-v1` store) — PIN is backend auth material, not draft profile data.
4. **Dual-session reality**: home page gates on Next.js local `/api/auth/me` while catalog PATCH needs FastAPI JWT in `artify-auth-token`. Profile submit must do local Next register/patch FIRST, then `registerOrLoginArtisan` — otherwise home bounces to onboarding even when backend register succeeded.
5. **Draft-first + error screen pattern**: store `set({product})` before any network; on save failure show record-page-style Try again / Continue without server save so rural offline flows never lose the transcript.
6. **`git stash pop` can pop an unrelated pre-existing stash**: path-limited `git stash push` failed silently under `2>/dev/null`, then `pop` hit an old main-branch stash → LOG.md conflict. Recover with `git checkout --ours` + verify `git stash list`; never drop the original stash entry.
7. **uv dev extra**: `pytest`/`ruff`/`black` live in `[project.optional-dependencies] dev` — plain `uv run pytest` fails with "Failed to spawn pytest"; use `uv run --extra dev pytest`.


## Non-Generative Studio Enhancement & Color Fidelity (MoSJE SIH PS 26090)
1. **Zero Color Distortion Guarantee**: Traditional handloom & handicraft verification strictly prohibits generative recoloring, synthetic AI inpainting, or CSS saturation filters (`saturate(...)`). Dyes must retain their exact authentic wavelength and weave texture.
2. **Client-Side Studio Compositing**: Removing cluttered backgrounds via perimeter boundary sampling, perceptual color clustering, and alpha feathering isolates the craft cleanly. Placing the isolated craft onto a standardized Raw Silk studio canvas (#FDFBF7) with a soft ground contact shadow provides an instant e-commerce studio look without altering a single foreground pixel.
3. **Next.js Webpack Compatibility**: Heavy neural packages with ES module `import.meta` bundles (such as raw onnxruntime-web bundles) cause Terser parse errors during `next build`. Lightweight, self-contained CV segmentation runs with zero network overhead and 100% offline reliability.
4. **rembg U²-Net Python IPC with Next.js**: Using a dedicated Python 3.12 worker in `frontend/backend/studio` running `rembg` (U²-Net ONNX) and OpenCV delivers pixel-perfect salient object segmentation without altering craft dyes or colors. To avoid Windows child process 64KB pipe buffer limits on high-resolution camera photos, file-backed I/O (`os.tmpdir()`) ensures reliable IPC between the Next.js API route `/api/studio/enhance` and the Python worker.
5. **Canvas DataURL Base64 & PIL Truncation Safety**: Browser `canvas.toDataURL()` payloads often contain URL-encoding, whitespaces, or truncated progressive stream buffers on mobile devices. In Python, pairing `urllib.parse.unquote`, base64 padding normalization, and setting `PIL.ImageFile.LOAD_TRUNCATED_IMAGES = True` prevents `cv2.imdecode` `Inconsistent progression sequence` failures and `OSError` crashes.
6. **@imgly/background-removal CDN publicPath**: Models are NOT distributed on unpkg — `resources.json` is empty (`{}`). The library's built-in default CDN is `https://staticimgly.com/@imgly/background-removal-data/{version}/dist/`. Never override `publicPath` with unpkg. `onnxruntime-web` must be installed as a peer dep at the exact version specified in `peerDependencies`.
7. **OpenCV Channel Swap & Red/Blue Inversion Gotcha**: In OpenCV, arrays are native BGR. If a canvas array is already constructed in BGR order, calling `cv2.cvtColor(studio_rgba, cv2.COLOR_RGB2BGR)` inverts Red and Blue channels. This swapped natural cool-white ceramics and vibrant green dyes into sickly yellow-browns and mud-tones. Never convert if channels are already in BGR format before `imencode`.
8. **Bounding-Box Grounding for Contact Shadows**: When removing backgrounds with U²-Net, transparent margins must be trimmed via alpha thresholding (`alpha > 20`) to obtain the tight bounding box of the physical product before scaling onto the studio canvas. Otherwise, the object floats high above while the contact shadow drops onto the empty transparent margins far below.
9. **Single-Pass Studio Integration**: The frontend studio handler must directly consume the server Python pipeline output (`data.studioSrc`) when available, rather than applying a second client-side contrast-stretch pass or re-compositing onto a nested canvas. Studio backdrops must use clean neutral white light (`#FFFFFF` apex down to `#F7F7F7` softbox edges) without warm yellow/cream tints.

## Voice-to-Form Entity Extraction & Confirmation Synchronization (Map #135)

1. **Zero Demo Values Invariant**: Real speech extraction must return `null` and explicit `missing` flags rather than injecting synthetic sample profiles (e.g. "Ramesh Kumar" or "Dhokra Elephant"). This ensures an honest reflection of speech recognition accuracy and allows users to manually fill in missing fields without having to delete fake data.
2. **Warn + Allow Manual Fill (Option 1)**: For rural artisans and SHG facilitators, soft visual warning indicators (amber badges) and direct inline tap-to-edit fields prevent drop-offs compared to hard blocking or frustrating sequential voice re-prompt loops.
3. **Local State vs Parent Handoff Synchronization**: In multi-step confirmation screens (`VoiceScreen.tsx`), inline corrections made to presentation items (`fieldItems`) must be explicitly synced into the `heard` and `onResult` callback payload; otherwise, parent pages (like `onboarding` and `describe`) continue saving stale pre-edit transcripts.

## Bhashini Server-Side Voice & Translation Pipeline (Map #1 #139)

1. **Server-Side Credential Isolation**: Keeping Bhashini API keys (`BHASHINI_API_KEY`, `BHASHINI_USER_ID`, `BHASHINI_INFERENCE_API_KEY`) strictly in server-side Next.js route handlers (`app/api/voice/route.ts` and `backend/bhashini.ts`) guarantees zero exposure in client bundles or network responses.
2. **Missing ASR Confidence & Accept-with-Flag**: Bhashini Dhruva ASR does not return confidence scores for transcribed regional speech. Instead of failing or guessing, setting `confidence: null` with `lowConfidence: true`, `flag: 'confidence_missing'`, and `acceptedWithFlag: true` allows the voice UI to present transcripts for artisan confirmation without blocking the flow.
3. **Retry Exhaustion Graceful Degradation**: When network retries (up to 3 attempts with <=60s timeouts) are exhausted, returning an accept-with-flag result rather than an HTTP 500 error enables resilient UI handling in intermittent rural 2G/3G connectivity.
4. **Dhruva Single Compute Pipeline**: Sending combined ASR + translation tasks in a single POST request to `/services/inference/pipeline` minimizes round trips over high-latency networks.


## Voice-First Progressive Onboarding Stack (Map #108)

1. **Stacked PR Discipline with CodeRabbit**: When babysitting a multi-PR stack (#115 through #120), review bots review each diff relative to its base. Fixing a review comment on an upper branch (e.g. #120) preserves the integrity of earlier PRs without requiring interactive rebases and force-push cascades that trigger multiple rounds of CI.
2. **Cluster Auto-Suggest GI Preservation**: Auto-suggest resolution must copy over both `isGiCertified` and `giTagName` into UiState when suggestion is applied, ensuring verified cluster heritage isn't lost during 1-tap confirmation.
3. **56dp Minimum Targets in Jetpack Compose**: For rural artisans with limited digital literacy or working hands, interactive text/links like "बदलें (Badlein)" must use `.defaultMinSize(minWidth = 56.dp, minHeight = 56.dp)` to satisfy accessibility scanners and prevent mis-taps.

## Marketplace E2E Reserve Flow (Map #86 T6)

- **Single-test full chain beats scattered asserts**: one async test driving browse ->
  reserve -> confirm -> my-reservations -> `/expiry/run` over HTTP catches link bugs
  (e.g. pickup_code lost after confirm, cron releasing confirmed holds) that isolated
  unit tests miss. Confirmed holds must survive `release_expired` (only `pending`
  released) — assert `reserved_qty` stays 1 after cron run.
- **Force-expiry pattern**: set `row.expires_at = now - 1h`, commit, then POST the real
  cron endpoint — tests the HTTP gate + service in one shot without waiting 7 days.
- **Quantity-type product for E2E**: `stock_qty=2, stock_type="quantity"` lets one test
  hold a confirmed lock AND an expirable pending hold on the same product; unique
  1-of-1 items can't do both.
- **Map audit without map access**: issues #86/#92 returned 404 via anonymous web fetch
  (private repo) — audit against the ticket-quoted Destination + decisions and record
  the substitution honestly.

## E2E Onboarding Flow Verification & Resilient Government Fallback (US-ONB-01)
1. **Master Registry Normalization**: Pehchan and TRIFED card IDs must be strictly stripped and uppercased (PEH-IND-88320) before querying the national master registry; case mismatch silently drops artisans into manual fallback.
2. **Graceful Fallback for Unregistered Cards**: In field onboarding, newly registered rural artisans often possess freshly issued physical Pehchan cards not yet indexed in the central registry. By capturing manual_state, manual_district, and manual_cluster when verified=False, the backend ensures zero drop-off while marking verification status honestly.
3. **Offline Sync Idempotence & Fast Login**: The /api/v1/auth/onboarding/sync endpoint enables composite draft submission directly upon network recovery. Synchronized records instantly become eligible for standard 4-digit PIN authentication via /api/v1/auth/login, bypassing repeated OTPs.

## Web Speech API & Regional Dialect Fallback (US-ONB-01)
Browser window.speechSynthesis provides zero-install, zero-cost text-to-speech for rural craftspeople in Hindi (hi-IN), Bengali (bn-IN), and Marathi (mr-IN). In environments where audio permissions or native voices are missing, pairing useAskDadi with a persistent visual Devanagari/English dialog modal ensures zero degradation for non-verbal or hearing-impaired artisans (WCAG 2.2 AA).

## Offline Draft Resilience (US-ONB-01)
In rural 2G/3G connectivity contexts, debouncing onboarding state mutations into localStorage (artify_onboarding_draft) with a visible DraftRestoreBanner prevents catastrophic form loss without requiring server sessions or unverified phone SMS handshakes.

## Dual-Role Onboarding Synchronization (US-ONB-01)
Passing query params (?role=artisan vs ?role=shg) from public web portals (web-portal/index.html) to the Next.js onboarding suite (frontend/app/onboarding/page.tsx) requires wrapping client search params in React <Suspense> boundaries to avoid Next.js static prerendering de-optimizations.

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

**Native Android Kotlin App (Wayfinder Map #49)**: Scaffolding complete offline-first Android application in android/ using MinSDK 24, Target 34, Jetpack Compose Material3, Room with SQLCipher AES-256 at-rest encryption, Android KeyStore MasterKey for DPDP-compliant auth tokens (zero raw Aadhaar), CameraX, WorkManager background synchronization with split-revision DRAFT_V2 conflict branching, and SPP ESC/POS thermal printing.

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
- **Shared AsyncSession in API tests**: the `client` fixture reuses the test `db_session`; capture ORM ids (`pid = product.id`) before HTTP calls and never call sync `expire_all()` in async context — both trigger `MissingGreenlet` on later attribute access.
- **Endpoint auth changes must update every caller test**: adding `get_current_artisan` to an endpoint (studio enhance) breaks all tests calling it bare with 401s. When changing auth, grep all test call sites, not just the feature's own test file.
- **Verify-page blank = API/frontend shape mismatch**: real `/passport/code/{x}` returns PublicPassportVerification (snake_case, flat cost_breakdown, no `pricing`) while BuyerPortalPage renders CraftProduct (`title`, `pricing.breakdown.*`). Undefined `pricing` throws during render → blank page. Fix at the boundary: typed `toCraftProduct` mapper in passportApi (same pattern as marketplaceApi.toProduct) with full defaults + passthrough, and expose additive `shortcode` on the backend schema. Seed coherent pricing first (wage=days*rate, profit floored) since the passport hash and breakdown embed it — defaults (500/15d→6750 wage vs 4500 retail) render >100% wage bars.
- **Seeded passports must pin frontend sample codes**: buyer Quick Samples (ABC123/VRN456/MDB789, mock mode via MOCK_PRODUCTS) 404'd against the real backend because seeded products had no HeritagePassport rows and the server's in-memory index only knows A7X-9B2/M3B-77L/K9P-12M. Fix: seed issues real passports via `passport_service.issue_passport` then pins `shortcode` to ABC-123/VRN-456/MDB-789 (hyphen-insensitive resolve handles the rest). Keep products published+listed after issue (issue flips to passport_issued). Clash-check the pinned code before overwriting to respect the unique constraint.
- **Seed images via picsum + Pillow fallback**: Picsum `/seed/{id}/800` gives stable keyed 1:1 JPEGs with no API key (matches UI_Capture square crop); httpx must enforce image/* content-type + 1KB–20MB guards or a soft-404 HTML page gets saved as .jpg. Offline fallback via Pillow-generated JPEG keeps seeding green without internet; `--force-images` + cached-path check keeps re-runs idempotent.
- **SQLite naive datetimes**: `expires_at` round-trips naive via aiosqlite; tests must attach `timezone.utc` when `fromisoformat` yields naive before subtracting.
- **Wayfinder Map #97 passport fixes (2026-09-18)**: hash[:6] fallbacks never resolve via variant lookup — always route through generate_shortcode; report-fake returns AntiFraudReport id (rep_*) which is NOT a JuryTicket id for /jury/status (separate assign call needed); _shortcode_variants cannot recover original mixed-case hyphenation from lowercased input — case-insensitive resolve lives in the DB func.lower/replace layer, not the variant list; frontend .tsx type-argument lists with nested => choke the TSX parser — hoist named interfaces; two alembic heads fail `upgrade head` — merge migration with tuple down_revision.
- **Wayfinder gh maps without sub-issues (2026-09-23 Parth voice #134-137)**: sub-issues endpoint 404 on this repo, native issue dependencies POST works (blocked_by rendered in UI); always use Part-of + Tickets checklist fallback in map body so frontier readable without sub-issues; missing labels (wayfinder:prototype/grilling, ready-for-human) must be created before gh issue create or creation fails; wire blocking second-pass after numbers known via db id (.id not number).
- **Studio venv & CameraView play rejection (2026-09-24)**: `frontend/backend/studio` expects an isolated Python venv with OpenCV + rembg (U²-Net) + onnxruntime. If missing, `/api/studio/enhance` returns 503. Initialized with `uv venv --python 3.12` and installed `requirements.txt`. In Next.js routes, check candidate paths across both frontend and root cwd. In `CameraView`, `HTMLVideoElement.play()` returns a Promise that rejects with `DOMException: The fetching process for the media resource was aborted by the user agent at the user's request` when stream is stopped or unmounted (e.g. clicking Retake); guard with active/mounted flag and `.catch(() => {})`.
- **Research-backed pricing contract (2026-09-24)**: The market quote route must reject missing product image/description/making time and must not use local material/labour tables when Gemini research is unavailable. Research status, source links, comparable range, material/labour estimates, and optional GPS/raw-material image inputs must remain visible across the API boundary; unavailable live research returns 503 instead of a fabricated final price.

- **Wayfinder #147 review fixes (2026-09-24)**: FastAPI 422 `detail` is typed `string` in OpenAPI but is actually an array of `{loc,msg,type}` objects at runtime — frontend error mappers must join `msg` fields or users see `[object Object],[object Object]`; persist server draft ids (catalogProductId) to the client store IMMEDIATELY after create succeeds, before the follow-up PATCH, otherwise a failed PATCH + retry creates orphaned duplicate draft rows; `npx tsc --noEmit` rewrites `frontend/tsconfig.tsbuildinfo` — restore it with `git checkout --` AFTER running typecheck, not before; repo-wide `black --check app` fails 47 files at HEAD (pre-existing) so verify touched-file sets vs HEAD instead of expecting a green whole-app run.
