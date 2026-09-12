# Artisan & SHG Leader End-to-End Journey (MoSJE — SIH PS 26090)

Executable step-by-step walkthrough of the **Artisan & SHG Leader Journey** against the ArtifyBharat backend. Every endpoint path, HTTP method, and payload matches `backend/app/api/v1/router.py` (verified via `app.openapi()`).

---

## Architecture Flow

```
[1. Register Artisan]
        │ (POST /api/v1/auth/register)
        ▼
[2. Enhance Studio Photo]
        │ (POST /api/v1/studio/enhance)
        ▼
[3. Calculate Fair Wage Pricing]
        │ (POST /api/v1/pricing/calculate)
        ▼
[4. Issue Digital Heritage Passport]
        │ (POST /api/v1/passport/issue)
        │  + thermal ESC/POS bytes embedded in payload_snapshot
        ▼
[5. Print 58mm Thermal Tag]
        │ (decode thermal_escpos_payload_base64 → Web Bluetooth)
        ▼
[6. Export to GeM, ONDC, WhatsApp & SHG]
        │ (POST /api/v1/exports/sync)
        ▼
[7. First-Mile Logistics Dispatch]
        │ (POST /api/v1/logistics/india-post/dispatch)
        ▼
[8. Direct Payout (PFMS DBT / UPI)]
          (POST /api/v1/payouts/direct-transfer)
```

---

## Step 1: Voice-First Registration & Onboarding

Register with phone + 4-digit PIN + cluster + govt IDs. Sensitive IDs are tokenized via DPDP-compliant **PII Vault** (`AES-256-GCM`).

- **Endpoint**: `POST /api/v1/auth/register`
- **Schema**: `VoiceRegisterRequest` → `TokenResponse`

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Radha Devi",
    "phone": "9812345678",
    "pin": "1234",
    "primary_dialect": "bhojpuri",
    "state": "Uttar Pradesh",
    "district": "Varanasi",
    "cluster_name": "Varanasi Handloom Cluster",
    "pehchan_id": "PEH-IND-88320",
    "trifed_id": "TRIFED-UP-VNS-1049",
    "geo_lat": 25.3176,
    "geo_lng": 82.9739
  }'
```

Expected `201 Created` (`TokenResponse` — only these 5 keys):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "artisan_id": "art_9b8a7c6d",
  "name": "Radha Devi",
  "phone": "9812345678"
}
```

---

## Step 2: Authenticity-Preserving Studio Enhancement

Non-generative CV pipeline: Canny complexity → CLAHE (LAB) → background isolation (`rembg U-2-Net`, GrabCut CPU fallback when `USE_MOCK_AI=True`) → 1:1 `#FDFBF7` canvas.

- **Endpoint**: `POST /api/v1/studio/enhance`
- **Schema**: form fields `artisan_id*, product_title, craft_category, image*` → `StudioEnhanceResponse`

```bash
curl -X POST http://localhost:8000/api/v1/studio/enhance \
  -F "image=@/path/to/raw_craft_photo.jpg;type=image/jpeg" \
  -F "artisan_id=art_9b8a7c6d" \
  -F "product_title=Handwoven Banarasi Katan Silk Saree" \
  -F "craft_category=handloom"
```

Expected `200 OK`:

```json
{
  "product_id": "prod_1a2b3c4d",
  "raw_image_url": "./media_storage/raw/raw_prod_1a2b3c4d.jpg",
  "enhanced_image_url": "./media_storage/studio/enhanced_prod_1a2b3c4d.png",
  "visual_complexity_score": 0.85,
  "auto_cropped_ratio": "1:1",
  "status": "enhanced",
  "message": "Image successfully enhanced to studio quality with background removed."
}
```

---

## Step 3: Fair Wage Floor & Dynamic Pricing Engine

`PricingCalculateRequest` = `product_id, raw_material_cost, labor_days, daily_wage_rate` (no `craft_category`).

- **Endpoint**: `POST /api/v1/pricing/calculate`

```bash
curl -X POST http://localhost:8000/api/v1/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_1a2b3c4d",
    "raw_material_cost": 3200.0,
    "labor_days": 10.0,
    "daily_wage_rate": 480.0
  }'
```

Expected `200 OK` (`PricingCalculateResponse`):

```json
{
  "product_id": "prod_1a2b3c4d",
  "recommended_price": 9800.0,
  "benchmark_min_price": 8500.0,
  "benchmark_max_price": 12000.0,
  "cost_breakdown": {
    "raw_material_cost": 3200.0,
    "labor_days": 10.0,
    "daily_wage_rate": 480.0,
    "calculated_fair_wage": 4800.0,
    "packaging_overhead": 150.0,
    "artisan_net_profit": 1500.0,
    "total_suggested_price": 9800.0
  },
  "visual_complexity_factor": 0.85,
  "market_benchmark_source": "GeM + ONDC benchmark scrape"
}
```

---

## Step 4: Digital Heritage Passport Issuance

SHA-256 provenance hash locking artisan + GPS + timestamp + pricing. Returns `HeritagePassportResponse` (no `shortcode` field — parse it from `verification_url`).

- **Endpoint**: `POST /api/v1/passport/issue`

```bash
curl -X POST http://localhost:8000/api/v1/passport/issue \
  -H "Content-Type: application/json" \
  -d '{ "product_id": "prod_1a2b3c4d" }'
```

Expected `200 OK`:

```json
{
  "product_id": "prod_1a2b3c4d",
  "passport_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "qr_code_data_uri": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "verification_url": "https://verify.artifybharat.in/passport/A7X-9B2",
  "issued_at": "2026-09-12T12:30:00Z"
}
```

Shortcode `A7X-9B2` = last path segment of `verification_url`.

---

## Step 5: Physical 58mm Thermal Tag Printing (ESC/POS)

There is **no** `POST /api/v1/passport/thermal-tag` endpoint. Thermal bytes are generated server-side by `generate_escpos_thermal_bytes()` (`backend/app/services/passport_service.py:85`) during issuance and stored in the passport row `payload_snapshot.thermal_escpos_payload_base64` (+ `qr_svg_data_uri`). Decode and stream over Web Bluetooth to a 58mm POS printer:

```python
import base64
# payload_snapshot["thermal_escpos_payload_base64"] from DB / issue flow
raw = base64.b64decode(payload_snapshot["thermal_escpos_payload_base64"])
assert raw[:2] == b"\x1b\x40"  # ESC @ init
assert raw[-4:] == b"\x1d\x56\x41\x00"  # GS V A cut
# raw contains b"CODE: A7X-9B2", b"verify.artifybharat.in", b"Rs. 9800"
# every text line <= 32 cols (58mm Font A)
```

---

## Step 6: One-Tap Multi-Channel Government Export Sync

- **Endpoint**: `POST /api/v1/exports/sync`
- **Schema**: `ExportChannelRequest(product_id, target_channels, b2b_bulk_min_quantity, b2b_bulk_discount_percentage)` → `ExportChannelResponse(product_id, passport_hash, results, message)`

```bash
curl -X POST http://localhost:8000/api/v1/exports/sync \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_1a2b3c4d",
    "target_channels": ["GeM", "ONDC", "WhatsApp", "SHG"],
    "b2b_bulk_min_quantity": 10,
    "b2b_bulk_discount_percentage": 15.0
  }'
```

Expected `200 OK`:

```json
{
  "product_id": "prod_1a2b3c4d",
  "passport_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "results": [
    {"channel": "GeM", "status": "published", "external_reference_id": "gem_cat_1a2b3c4d", "format": "XML", "details": {"synced_records": 1}},
    {"channel": "ONDC", "status": "published", "external_reference_id": "ondc_item_1a2b3c4d", "format": "JSON_BECKN", "details": {"synced_records": 1}},
    {"channel": "WhatsApp", "status": "published", "external_reference_id": "wa_item_1a2b3c4d", "format": "WHATSAPP_INTERACTIVE", "details": {"synced_records": 1}},
    {"channel": "SHG", "status": "published", "external_reference_id": "shg_bulk_1a2b3c4d", "format": "CSV", "details": {"synced_records": 1}}
  ],
  "message": "Successfully exported product to 4 external procurement channels."
}
```

---

## Step 7: First-Mile Logistics Dispatch (India Post / CSC)

- **Endpoint**: `POST /api/v1/logistics/india-post/dispatch`
- **Schema**: `IndiaPostDispatchRequest(order_id, artisan_id, pickup_pincode, delivery_pincode, weight_grams, ...)` → `IndiaPostDispatchResponse`

```bash
curl -X POST http://localhost:8000/api/v1/logistics/india-post/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ord_sih_2026_001",
    "artisan_id": "art_9b8a7c6d",
    "pickup_pincode": "221001",
    "delivery_pincode": "110001",
    "weight_grams": 750
  }'
```

Expected `200 OK`:

```json
{
  "tracking_id": "IP2026091212001IN",
  "order_id": "ord_sih_2026_001",
  "barcode_data": "IP2026091212001IN",
  "pickup_hub": "Varanasi RMS Hub",
  "estimated_delivery_days": 3,
  "service_type": "Speed Post / CSC Rural Logistics",
  "dispatch_slip_url": "./media_storage/dispatch/IP2026091212001IN.png",
  "created_at": "2026-09-12T12:35:00Z"
}
```

---

## Step 8: Direct Payout (PFMS DBT / UPI, 0% Middleman Fee)

- **Endpoint**: `POST /api/v1/payouts/direct-transfer`
- **Schema**: `DirectTransferRequest(artisan_id, order_id, product_id?, amount, channel: PFMS_DBT|UPI)` → `DirectTransferResponse`

```bash
curl -X POST http://localhost:8000/api/v1/payouts/direct-transfer \
  -H "Content-Type: application/json" \
  -d '{
    "artisan_id": "art_9b8a7c6d",
    "order_id": "ord_sih_2026_001",
    "product_id": "prod_1a2b3c4d",
    "amount": 9800.0,
    "channel": "PFMS_DBT"
  }'
```

Expected `201 Created`:

```json
{
  "payout_id": "pay_5a4b3c2d",
  "utr_number": "PFMS20260912987654321",
  "amount": 9800.0,
  "platform_fee_pct": 0.0,
  "net_amount": 9800.0,
  "status": "processed"
}
```
