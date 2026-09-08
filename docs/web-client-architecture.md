# Web Client Clean Architecture Guide (MoSJE)

## 1. Architectural Layers

The Artify Bharat Web Client is built using modern responsive web architecture (React / Next.js / HTML5 / Tailwind CSS) with unidirectional state management and standard browser APIs.

```
+-------------------------------------------------------------+
|                     Presentation Layer                      |
|  - Responsive Web & Mobile Browser Views                    |
|  - Indian Heritage Design System (Terracotta & Silk)        |
|  - Dual-Role Access (Artisan Direct vs SHG Coordinator Hub) |
+------------------------------+------------------------------+
                               |
                               | Calls Services / Handlers
                               v
+-------------------------------------------------------------+
|                        Domain & Web API Layer               |
|  - MediaDevices API (1:1 Aspect Ratio + Gyro Leveling)      |
|  - W3C Geolocation API & Timestamp Locking                 |
|  - Web Speech API & Bhashini Regional Dialect NLP           |
|  - Web Bluetooth API (58mm ESC/POS Thermal Printing)        |
|  - Dynamic 3-Tier Fair Wage Calculation Engine              |
+------------------------------+------------------------------+
                               ^
                               |
                               |
+-------------------------------------------------------------+
|                         Data & Offline Layer                |
|  - Remote: Fetch / Axios API Gateway Client                 |
|  - Local: Browser IndexedDB (Offline Drafts & Audio Blobs)  |
|  - Background Sync: ServiceWorker Auto-Retry Queue          |
|  - Digital Passport SHA-256 Crypto & Shortcode Resolver     |
+-------------------------------------------------------------+
```

## 2. Low-Bandwidth & Offline Sync
Rural handicraft clusters often operate under intermittent 2G/3G connectivity.
- `IndexedDB` records pending photo uploads, voice notes, and export actions locally in the browser.
- `ServiceWorker` Background Sync dequeues pending actions sequentially without data loss or duplicate transactions when network connectivity is re-established.

## 3. Browser-Native Hardware Integrations
- **MediaDevices API**: Enforces strict 1:1 square aspect ratio crop viewfinder in the browser canvas.
- **Web Bluetooth API**: Connects directly to portable 58mm ESC/POS thermal printers to print adhesive physical labels and packaging QR tags.
- **Web Speech & MediaRecorder API**: Captures high-fidelity regional dialect audio clips streamed to the backend Bhashini AI engine.
