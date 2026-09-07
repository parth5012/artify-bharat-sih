# ArtifyBharat Android Application (Kotlin + Jetpack Compose)

Voice-First, Zero-Skill Android Client for Rural Artisans & Handloom Weavers (SIH PS 26090).

## Architecture & Technology Stack
- **Language**: Kotlin 2.0
- **UI Framework**: Jetpack Compose with Material 3 (Indian Heritage Terracotta & Silk theme)
- **Architecture Pattern**: Android Clean Architecture (Domain, Data, Presentation)
- **Networking**: Retrofit 2 + OkHttp 4 + Coroutines Flow
- **Local Persistence**: Room Database for offline queueing & low-bandwidth sync (Task 4.1)
- **Camera & Vision**: CameraX 1:1 auto-crop & on-device TFLite background extraction preview

## 7-Stage Flow (Mapped to Implementation Playbook)
1. **`Page1VoiceOnboardingScreen`**: Voice-first microphone registration ("बोलकर खाता बनाएं") & 4-digit PIN.
2. **`Page2ZeroSkillDashboardScreen`**: High-contrast massive CTA "नया प्रोडक्ट बेचें" (Sell New Product).
3. **`Page3CameraStudioScreen`**: CameraX 1:1 square capture & on-device Before vs After studio preview.
4. **`Page4VoiceCatalogerScreen`**: Dialect speech recording & Mistral-7B metadata extraction card.
5. **`Page5DynamicPricingScreen`**: Touchpad numeric inputs with Fair Wage protection floor and market value slider.
6. **`Page6HeritagePassportScreen`**: Cryptographic SHA-256 provenance card & QR code.
7. **`Page7ChannelExportScreen`**: One-tap multi-channel batch export to GeM, ONDC, and B2B procurement channels.

## Project Structure
```
android/
├── app/
│   ├── src/main/java/in/artifybharat/app/
│   │   ├── domain/               # Pure Kotlin Domain Models, Repositories, UseCases
│   │   ├── data/                 # Retrofit API service, Room DB, Repository implementations
│   │   ├── presentation/         # Jetpack Compose Theme, Navigation, 7 Feature Screens
│   │   └── core/                 # Result sealed interface & network utilities
│   └── build.gradle.kts
├── gradle/libs.versions.toml     # Version catalog
└── settings.gradle.kts
```

## Build & Run
Open the `android/` directory in Android Studio (Ladybug or later) and run on an Android Device or Emulator (API 24+).
```bash
./gradlew assembleDebug
```
