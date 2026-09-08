# ADR 0003: Responsive Web & PWA Architecture with Native Web APIs

## Status
Accepted (Supersedes native mobile approach)

## Context
Rural Indian handloom weavers and artisans require zero-barrier access without compulsory app store downloads or device storage limitations. Village coordinators and SHG leaders require instant multi-tenant management on mobile, tablet, and desktop browsers.

## Decision
Adopt a modern, responsive Web Application (React / Next.js / HTML5 / Tailwind CSS) utilizing browser-native APIs:
1. `MediaDevices API`: In-browser 1:1 camera crop and gyro leveling.
2. `Geolocation API`: GPS coordinates and UTC timestamp locking.
3. `Web Speech API & Bhashini`: Multilingual dialect voice processing.
4. `Web Bluetooth API`: Direct browser-to-printer bridge for 58mm ESC/POS thermal labels.
5. `IndexedDB` & `ServiceWorker`: Offline draft queue and auto-retry synchronization.

## Consequences
- **Positive**: Zero app-store friction, instant access across any connected smartphone or laptop, unified codebase.
- **Positive**: Hardware thermal printing supported directly from browser via Web Bluetooth.
