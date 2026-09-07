# Android Mobile Bounded Context: ArtifyBharat

## Responsibilities
- Voice-first, zero-skill user interface built in native Kotlin with Jetpack Compose.
- 7-stage workflow mapped to SIH 26090 Playbook:
  1. `Page1VoiceOnboardingScreen`: Microphone-first registration & PIN setup.
  2. `Page2ZeroSkillDashboardScreen`: High-contrast single primary CTA "Naya Product Bechein".
  3. `Page3CameraStudioScreen`: CameraX 1:1 square capture & on-device Before/After preview.
  4. `Page4VoiceCatalogerScreen`: Speech recording & Mistral-7B metadata extraction card.
  5. `Page5DynamicPricingScreen`: Touchpad inputs with Fair Wage protection floor and market slider.
  6. `Page6HeritagePassportScreen`: Cryptographic SHA-256 provenance card & QR preview.
  7. `Page7ChannelExportScreen`: One-tap batch export to GeM, ONDC, and B2B channels.
- Offline task queue (`AppDatabase`, `OfflineTaskDao`, `OfflineTaskEntity`) using Room for intermittent rural connectivity.

## Invariants
- UI must remain operable without typing in English.
- Camera viewfinder must be constrained to 1:1 square aspect ratio at sensor capture time.
- Pure Kotlin domain layer must not depend on Android framework dependencies or data layer implementations.
