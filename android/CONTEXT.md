# Android Mobile Bounded Context: ArtifyBharat (SIH PS 26090)

## Responsibilities
- Voice-first, zero-skill user interface built in native Kotlin with Jetpack Compose.
- Complete workflow mapped to SIH 26090 Architecture:
  1. `Page1VoiceOnboardingScreen`: Microphone-first registration & PIN setup.
  2. `Page2ZeroSkillDashboardScreen`: Primary CTA "Naya Product", cluster badge, and quick access to "My Inventory" and "Ask Dadi".
  3. `Page3CameraStudioScreen`: AI Smart Camera with 1:1 square crop & on-device Before/After auto-enhance preview.
  4. `Page4VoiceCatalogerScreen`: Speech recording in native dialect & AI metadata card.
  5. `Page5DynamicPricingScreen`: Cost + labor keypad inputs with AI market range slider & Fair Wage floor.
  6. `Page6HeritagePassportScreen`: Cryptographic SHA-256 provenance card & QR preview.
  7. `Page7ChannelExportScreen`: One-tap publish to GeM, ONDC, and B2B channels.
  8. `Page8AskDadiScreen`: Interactive voice assistant ('Ask Dadi' - दादी से पूछो) for dialect guidance.
  9. `Page9MyInventoryScreen`: Active inventory listings, sync status, and QR passport view.
- Offline task queue (`AppDatabase`, `OfflineTaskDao`, `OfflineTaskEntity`) using Room/SQLite for offline drafts & caching.

## Invariants
- UI must remain operable without typing in English.
- Camera viewfinder must be constrained to 1:1 square aspect ratio at sensor capture time.
- Pure Kotlin domain layer must not depend on Android framework dependencies or data layer implementations.
