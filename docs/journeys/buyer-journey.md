# Buyer Provenance & Verification Journey (MoSJE — SIH PS 26090)

Executable step-by-step walkthrough of the **Buyer Verification Journey**. Every endpoint path, HTTP method, and payload matches `backend/app/api/v1/router.py` (verified via `app.openapi()`).

---

## Architecture Flow

```
[1. Buyer Scans QR Tag or Enters 6-Char Shortcode]
        │ (GET /api/v1/passport/code/{shortcode})
        ▼
[2. Verify by SHA-256 Hash (enterprise / audit)]
        │ (GET /api/v1/passport/verify/{passport_hash})
        ▼
[3. Inspect 4-Part Transparent Fair Price Breakdown]
        │ Confirms living wage was paid
        ▼
[4. (Optional) Report Fake / Counterfeit Item]
          (POST /api/v1/verify/report-fake)
          Triggers Zero-Trust Peer Jury investigation
```

---

## Step 1: Verification by 6-Character Shortcode

Resolver is hyphen/case tolerant (`A7X-9B2` == `a7x9b2` == `A7X9B2`).

- **Endpoint**: `GET /api/v1/passport/code/{shortcode}` → `PublicPassportVerification`

```bash
curl -X GET http://localhost:8000/api/v1/passport/code/A7X-9B2 \
  -H "Accept: application/json"
```

Expected `200 OK` (exact `PublicPassportVerification` keys — no `shortcode`, no `mosje_status`, no `wip_photo_url`):

```json
{
  "passport_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "is_authentic": true,
  "product_title": "Handwoven Banarasi Katan Silk Saree",
  "craft_category": "Handloom Silk Weaving",
  "gi_tag_status": "Banarasi Brocade & Saree (GI-39)",
  "artisan_name": "Radha Devi",
  "cluster_name": "Varanasi Handloom Cluster",
  "state": "Uttar Pradesh",
  "district": "Varanasi",
  "geo_coordinates": {"latitude": 25.3176, "longitude": 82.9739},
  "enhanced_image_url": "https://storage.artify.gov.in/studio/banarasi_final_01.png",
  "voice_story_url": "https://storage.artify.gov.in/audio/radha_devi_story.mp3",
  "cost_breakdown": {
    "raw_material_cost": 3200.0,
    "labor_days": 10.0,
    "daily_wage_rate": 480.0,
    "calculated_fair_wage": 4800.0,
    "packaging_overhead": 150.0,
    "artisan_net_profit": 1500.0,
    "total_suggested_price": 9800.0
  },
  "issued_at": "2026-09-12T12:30:00Z"
}
```

---

## Step 2: Verification by SHA-256 Provenance Hash

For enterprise / audit use. DPDP: Aadhaar / bank / phone never exposed.

- **Endpoint**: `GET /api/v1/passport/verify/{passport_hash}`

```bash
curl -X GET http://localhost:8000/api/v1/passport/verify/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 \
  -H "Accept: application/json"
```

Response shape is identical to Step 1 (`PublicPassportVerification`).

---

## Step 3: Transparent Fair Price Breakdown

From `cost_breakdown` (`CostBreakdown` schema):

1. **Raw Material Cost** (₹3,200): silk yarns, natural dyes, zari.
2. **Statutory Skilled-Wage Floor** (₹4,800): `labor_days (10) × daily_wage_rate (₹480)`.
3. **Direct Artisan Net Profit** (₹1,500): 100% retained, 0% middleman.
4. **Packaging Overhead** (₹150): thermal label + India Post logistics.

Total: **₹9,800.00** (`total_suggested_price`).

---

## Step 4: Anti-Fraud Feedback Loop ("Report Fake / Machine-Made")

- **Endpoint**: `POST /api/v1/verify/report-fake`
- **Schema**: `ReportFakeRequest(shortcode_or_hash*, reason*, reporter_phone?, evidence_image_base64?)` → `ReportFakeResponse(report_id, status, flagged_hash, action_taken, reported_at)`

```bash
curl -X POST http://localhost:8000/api/v1/verify/report-fake \
  -H "Content-Type: application/json" \
  -d '{
    "shortcode_or_hash": "A7X-9B2",
    "reason": "Machine-made powerloom weave without handloom selvedge; synthetic feel.",
    "reporter_phone": "9876543210"
  }'
```

Expected `200 OK`:

```json
{
  "report_id": "rep_9f8e7d6c",
  "status": "audit_triggered",
  "flagged_hash": "A7X-9B2",
  "action_taken": "Escalated to MoSJE Nodal Officer & Peer Review Jury queue; Escrow frozen.",
  "reported_at": "2026-09-12T13:00:00Z"
}
```

> Semantics note: `flagged_hash` echoes the request input unchanged (`verify_jury_service.report_counterfeit`), so a shortcode input returns the shortcode. The service also freezes escrow (`ESCROW_FROZEN_PENDING_INSPECTION`) and the extra `escrow_status` key is dropped by `ReportFakeResponse` serialization.
