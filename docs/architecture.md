# ArtifyBharat Architecture Specification (SIH PS 26090)

## 1. System Context & Overview
Artify Bharat is an AI-powered Digital Business Manager & Digital Gatekeeper empowering rural Indian weavers and handicraft artisans to catalog, price, verify, and publish their heritage products to national channels (GeM, ONDC, B2B) while eliminating counterfeit market competition through cryptographic provenance.

```mermaid
flowchart TD
    %% ==========================================
    %% OPTIMIZED ARTIFY BHARAT - SIH PS 26090
    %% ==========================================

    subgraph Client["📱 CLIENT LAYER (Flutter - iOS/Android)"]
        direction TB
        UI_Dash["🏠 Dashboard: 'Naya Product' Button<br>+ My Inventory"]
        UI_Capture["📸 AI Smart Camera<br>(1:1 Crop + Auto-Enhance Preview)"]
        UI_Voice["🎙️ Voice Cataloging<br>(Speak in Dialect, AI Writes Description)"]
        UI_Price["💰 Smart Pricing<br>(Enter Cost + Labor, AI suggests Market Range)"]
        UI_Verify["✅ Verify & Passport<br>(Review AI Output + Generate QR)"]
        UI_Export["🚀 One-Tap Publish<br>(Select GeM / ONDC / B2B)"]
        UI_Help["💬 Voice Assistant<br>('Ask Dadi' - Interactive Help)"]
        
        OfflineDB[("📂 Local SQLite<br>(Offline Drafts & Cache)")]
        
        UI_Dash --> UI_Capture --> UI_Voice --> UI_Price --> UI_Verify --> UI_Export
        UI_Capture -.-> OfflineDB
        UI_Voice -.-> OfflineDB
        UI_Verify -.-> OfflineDB
        UI_Dash --> UI_Help
    end

    subgraph Backend["⚡ BACKEND API GATEWAY (FastAPI / Node.js)"]
        direction TB
        Gateway["🌐 API Router<br>(Auth, Rate Limiting, File Upload)"]
        
        subgraph CoreServices["🧠 AI CORE SERVICES (Microservices)"]
            AuthService["🪪 Verification Service<br>(Pehchan Card / TRIFED ID Lookup)"]
            ImageAI["🖼️ AI Image Studio<br>(Background Removal + Lighting Fix)"]
            LangAI["🗣️ Multilingual NLP<br>(ASR + IndicTrans2 + Title Generation)"]
            PricingAI["📊 Dynamic Pricing<br>(Market Comparison + Profit Optimizer)"]
            QRService["🔐 Digital Passport<br>(SHA-256 Hash + QR Code Generator)"]
        end
        
        Gateway --> AuthService
        Gateway --> ImageAI
        Gateway --> LangAI
        Gateway --> PricingAI
        Gateway --> QRService
    end

    subgraph Storage["🗄️ DATA & OBJECT STORAGE"]
        SQL_DB[("🐘 PostgreSQL<br>Artisans, Products, Prices, Hashes")]
        Media_DB[("☁️ AWS S3 / MinIO<br>Images, Audio Clips, QR Codes")]
    end

    subgraph Exports["🌐 MULTI-CHANNEL EXPORT ADAPTERS"]
        Adapter["🔄 Unified Catalog Adapter"]
        GeM["🏛️ GeM Portal<br>(Government Bulk Procure)"]
        ONDC["🛍️ ONDC Network<br>(Retail & Resellers)"]
        B2B["🏢 Direct B2B Buyers<br>(CSV / Email Reports)"]
        
        Adapter --> GeM
        Adapter --> ONDC
        Adapter --> B2B
    end

    subgraph Buyer["🔍 PART B: BUYER VERIFICATION PORTAL"]
        Scan["📷 Scan QR Code<br>(On Product / Listing)"]
        Portal["🌐 Public Verification Page"]
        Story["👤 Artisan Story<br>(TRIFED ID + Native Audio Clip)"]
        Cost["⚖️ Fair Price Breakdown<br>(Materials + Labor + Direct Profit)"]
        
        Scan --> Portal --> Story
        Portal --> Cost
    end

    %% ========== CONNECTIONS ==========
    Client <-->|REST APIs| Gateway
    CoreServices <--> Storage
    Adapter <--> CoreServices
    Adapter --> Exports
    
    Exports -.->|QR Passport on Listing| Scan
    Portal -.->|Verification API| Gateway
    
    %% ========== STYLING ==========
    classDef mobile fill:#FFF7ED,stroke:#EA580C,stroke-width:2px,color:#9A3412;
    classDef backend fill:#EFF6FF,stroke:#2563EB,stroke-width:2px,color:#1E40AF;
    classDef ai fill:#FAF5FF,stroke:#9333EA,stroke-width:2px,color:#6B21A8;
    classDef data fill:#F0FDF4,stroke:#16A34A,stroke-width:2px,color:#166534;
    classDef export fill:#FEFCE8,stroke:#CA8A04,stroke-width:2px,color:#854D0E;
    classDef buyer fill:#F8FAFC,stroke:#0F172A,stroke-width:2px,color:#0F172A;

    class UI_Dash,UI_Capture,UI_Voice,UI_Price,UI_Verify,UI_Export,UI_Help,OfflineDB mobile;
    class Gateway,AuthService,ImageAI,LangAI,PricingAI,QRService backend;
    class SQL_DB,Media_DB data;
    class Adapter,GeM,ONDC,B2B export;
    class Scan,Portal,Story,Cost buyer;
```

---

## 2. Layer-by-Layer Architectural Breakdown

### 📱 Client Layer (Mobile: Android / Flutter & Interactive Client App)
- **UI_Dash (Dashboard)**: Primary zero-skill entry point featuring prominent **"Naya Product"** button, craft cluster status, and **"My Inventory"** management for active listings and draft synchronization.
- **UI_Capture (AI Smart Camera)**: High-precision camera viewfinder with strict **1:1 square crop** constraint and real-time on-device auto-enhance preview.
- **UI_Voice (Voice Cataloging)**: Audio recorder capturing native rural dialects (Bhojpuri, Maithili, Hindi, etc.) parsed into structured titles and descriptions.
- **UI_Price (Smart Pricing)**: Touch keypad to enter material cost and labor days, with AI market range calculation and Fair Wage Floor protection.
- **UI_Verify (Verify & Passport)**: Preview synthesized studio images, verified metadata, and live generation of the cryptographic SHA-256 Digital Passport & QR code.
- **UI_Export (One-Tap Publish)**: Select one or more target channels (GeM, ONDC, B2B) and publish with one touch.
- **UI_Help ('Ask Dadi' Voice Assistant)**: Interactive multilingual AI voice assistant guiding artisans through cataloging, photography, fair pricing, and government schemes.
- **OfflineDB (Local SQLite)**: Persistent offline draft queue and local media cache enabling full catalog creation in low-bandwidth rural conditions with background auto-sync.

### ⚡ Backend API Gateway (FastAPI / Node.js)
- Central gateway providing JWT authentication, rate limiting, request validation, multipart file uploads, and asynchronous worker orchestration.

### 🧠 AI Core Services (Microservices Architecture)
1. **AuthService (Verification Service)**:
   - Real-time lookup and validation of government **Pehchan Card** numbers, **TRIFED Artisan IDs**, GI registry credentials, and PM Vishwakarma registrations.
2. **ImageAI (AI Image Studio)**:
   - Salient object segmentation (U²-Net), background removal, OpenCV CLAHE LAB color and lighting auto-fix, centered 1:1 auto-cropping, and visual complexity scoring.
3. **LangAI (Multilingual NLP & Voice Assistant)**:
   - Automatic Speech Recognition (Whisper) for regional dialects, neural translation via IndicTrans2, LLM metadata extraction (Mistral-7B), and **'Ask Dadi'** conversational dialect assistant.
4. **PricingAI (Dynamic Pricing & Profit Optimizer)**:
   - XGBoost regression engine calculating recommended market price ranges based on raw material cost, labor days, visual complexity, and live marketplace benchmark data while guaranteeing statutory Fair Wage floors.
5. **QRService (Digital Passport Engine)**:
   - Cryptographic engine computing canonical SHA-256 provenance hashes over artisan identity, product credentials, geolocation, and cost breakdown, paired with high-contrast QR code generation.

### 🗄️ Data & Object Storage
- **PostgreSQL**: Relational storage for artisan profiles, Pehchan/TRIFED records, product catalogs, statutory price logs, and SHA-256 verification digests.
- **AWS S3 / MinIO**: Object storage for raw photos, 1:1 enhanced studio PNGs, native dialect voice clips, and generated QR passport assets.

### 🌐 Multi-Channel Export Adapters
- **Unified Catalog Adapter**:
  - **GeM Portal**: Formats data to Government e-Marketplace XML/CSV schema with HSN compliance and artisan registration IDs for institutional bulk procurement.
  - **ONDC Network**: Generates Beckn Protocol JSON catalog specifications for open retail and reseller networks.
  - **Direct B2B Buyers**: Formats enterprise bulk procurement invoices, tiered volume pricing, and CSV/PDF export reports.

### 🔍 Part B: Buyer Verification Portal
- **Scan**: Scan printed product tag or e-commerce listing QR code.
- **Public Verification Page**: High-trust web portal (`/verify/{hash}`) validating cryptographic SHA-256 authenticity.
- **Artisan Story**: Displays verified artisan profile, TRIFED/Pehchan ID, cluster location, and embedded audio player for native dialect story.
- **Fair Price Breakdown**: 0% middleman transparent cost card detailing Raw Materials, Fair Labor Wages, and Direct Artisan Profit.
