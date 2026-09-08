# ArtifyBharat API Specification (v1)

Base URL: `http://localhost:8000/api/v1`

---

## 1. Authentication & Verification Service (`/auth`)

### `POST /auth/register`
Registers a rural artisan via voice or manual details.

**Request Payload (`application/json`):**
```json
{
  "name": "Gauri Devi",
  "phone": "9876543210",
  "pin": "1234",
  "primary_dialect": "bhojpuri",
  "state": "Uttar Pradesh",
  "district": "Varanasi",
  "cluster_name": "Varanasi Handloom Cluster",
  "trifed_id": "TRIFED-UP-VNS-1049",
  "pehchan_id": "PEH-IND-88320",
  "geo_lat": 25.3176,
  "geo_lng": 82.9739
}
```

**Response (`201 Created`):**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "artisan_id": "93691689-dcfb-4a57-b2e1-a20c3a2f3001",
  "name": "Gauri Devi",
  "phone": "9876543210"
}
```

### `POST /auth/login`
Artisan 4-digit security PIN login.

**Request Payload:**
```json
{
  "phone": "9876543210",
  "pin": "1234"
}
```

### `POST /auth/verify-artisan-id` *(AuthService - Microservice Lookup)*
Validates government Pehchan Card or TRIFED registration ID against national master artisan registry.

**Request Payload:**
```json
{
  "identifier_type": "pehchan", 
  "identifier_value": "PEH-IND-88320"
}
```

**Response (`200 OK`):**
```json
{
  "is_valid": true,
  "identifier_type": "pehchan",
  "identifier_value": "PEH-IND-88320",
  "artisan_name": "Gauri Devi",
  "craft_category": "Handloom Textile",
  "cluster_name": "Varanasi Handloom Cluster",
  "gi_certified": true,
  "gi_tag_name": "Banarasi Brocade & Saree (GI Reg #39)",
  "state": "Uttar Pradesh",
  "district": "Varanasi",
  "verification_source": "National Handicrafts & Handlooms Database (Pehchan / TRIFED Registry)"
}
```

---

## 2. 'Ask Dadi' Multilingual Voice Assistant (`/assistant`)

### `POST /assistant/dadi` *(LangAI - Interactive AI Assistant)*
Processes rural artisan dialect queries regarding cataloging, photography, fair pricing, GI tags, and marketplace policies.

**Request Payload:**
```json
{
  "query_text": "हमार साड़ी के फोटो कैसन खींची जेकरा से GeM पर बढ़िया बिके?",
  "dialect": "bhojpuri",
  "product_category": "handloom"
}
```

**Response (`200 OK`):**
```json
{
  "answer_text": "बबुआ, साड़ी के हमेशा दिन के प्राकृतिक रोशनी में, साफ समतल जगह पर फैला के फोटो खींचा। कैमरा के 1:1 चौकोर फ्रेम में साड़ी के बीच में राखीं। आर्टिफाई भारत के AI अपने आप बैकग्राउंड हटा के बढ़िया उज्जर बैकग्राउंड बना दी।",
  "answer_english": "Dear child, always photograph the saree under natural daylight on a clean flat surface. Keep the saree centered inside the 1:1 square camera frame. Artify Bharat AI will automatically remove the background and give it a crisp white studio look.",
  "dialect": "bhojpuri",
  "audio_response_url": "media_storage/audio/dadi_advice_4812.mp3",
  "suggested_actions": [
    "Open AI Smart Camera (1:1 Crop)",
    "Check Smart Pricing Calculator",
    "View GI Tag Guidelines"
  ],
  "dadi_tip": "साड़ी के जरी बॉर्डर के पास से क्लोज-अप फोटो जरूर लीजियेगा!"
}
```

---

## 3. Camera Module & Studio Enhancement (`/studio`)

### `POST /studio/enhance` *(ImageAI - AI Image Studio)*
Uploads raw smartphone photo for salient background removal, CLAHE lighting equalization, and 1:1 auto-cropping.

**Request (`multipart/form-data`):**
- `artisan_id`: `"93691689-dcfb-4a57-b2e1-a20c3a2f3001"`
- `product_title`: `"Raw Saree Photo"`
- `craft_category`: `"handloom"`
- `image`: Binary file (`image/jpeg` or `image/png`)

**Response (`200 OK`):**
```json
{
  "product_id": "f8a70c32-bdfa-493e-8c31-92b67f139801",
  "raw_image_url": "media_storage/raw/raw_f8a70c32_photo.jpg",
  "enhanced_image_url": "media_storage/enhanced/enhanced_f8a70c32.png",
  "visual_complexity_score": 0.78,
  "auto_cropped_ratio": "1:1",
  "status": "enhanced",
  "message": "Image successfully enhanced to studio quality with background removed."
}
```

---

## 4. Multilingual Voice Auto-Cataloger & Inventory (`/catalog`)

### `POST /catalog/voice` *(LangAI)*
Processes voice description recording in regional dialect into structured metadata.

**Request (`multipart/form-data`):**
- `product_id`: `"f8a70c32-bdfa-493e-8c31-92b67f139801"`
- `dialect`: `"bhojpuri"`
- `audio`: Binary audio file (`audio/wav`, `audio/mp3`, `audio/m4a`)

**Response (`200 OK`):**
```json
{
  "product_id": "f8a70c32-bdfa-493e-8c31-92b67f139801",
  "transcript_regional": "ई हमार हाथ से बुनायल बनारसी सिल्क साड़ी हवे...",
  "transcript_english": "This is our handwoven Banarasi pure silk saree with authentic gold zari border...",
  "metadata": {
    "title": "Handwoven Banarasi Silk Saree with Pure Zari Work",
    "description": "Handcrafted in the historic Varanasi weaving cluster...",
    "craft_category": "Handloom Textile",
    "gi_tag_status": "Banarasi Brocade & Saree (GI Tagged)",
    "weave_technique": "Kadhwa Interlocking Pit Loom Technique",
    "estimated_days": 15.0,
    "seo_tags": [
      "Banarasi Silk",
      "GI Tagged Handloom",
      "Varanasi Weavers",
      "Pure Zari Saree"
    ]
  },
  "status": "cataloged"
}
```

### `GET /catalog/my-inventory` *(Client Layer Dashboard)*
Retrieves artisan's active inventory, listing statuses across GeM/ONDC/B2B, and draft items.

**Query Parameters:**
- `artisan_id`: `"93691689-dcfb-4a57-b2e1-a20c3a2f3001"`

**Response (`200 OK`):**
```json
{
  "total_items": 3,
  "active_listings_count": 2,
  "drafts_count": 1,
  "inventory": [
    {
      "product_id": "f8a70c32-bdfa-493e-8c31-92b67f139801",
      "title": "Handwoven Banarasi Silk Saree with Pure Zari Work",
      "craft_category": "Handloom Textile",
      "status": "published",
      "final_price": 10421.88,
      "passport_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "published_channels": ["GeM", "ONDC", "Direct_B2B"],
      "created_at": "2026-09-07T12:00:00Z"
    }
  ]
}
```

### `POST /catalog/drafts/sync` *(Offline SQLite Draft Sync)*
Batch uploads offline drafts created on the mobile client when reconnecting to network.

**Request Payload:**
```json
{
  "artisan_id": "93691689-dcfb-4a57-b2e1-a20c3a2f3001",
  "drafts": [
    {
      "local_draft_id": "draft_local_1001",
      "product_title": "Chanderi Cotton Saree",
      "craft_category": "handloom",
      "raw_cost": 400.0,
      "labor_days": 8.0,
      "dialect": "hindi"
    }
  ]
}
```

**Response (`200 OK`):**
```json
{
  "synced_count": 1,
  "synced_draft_ids": ["draft_local_1001"],
  "status": "success"
}
```

---

## 5. Dynamic Pricing Engine (`/pricing`)

### `POST /pricing/calculate` *(PricingAI)*
Calculates fair trade wage, complexity premium, and XGBoost recommended market window.

**Request Payload (`application/json`):**
```json
{
  "product_id": "f8a70c32-bdfa-493e-8c31-92b67f139801",
  "raw_material_cost": 500.0,
  "labor_days": 15.0,
  "daily_wage_rate": 450.0
}
```

**Response (`200 OK`):**
```json
{
  "product_id": "f8a70c32-bdfa-493e-8c31-92b67f139801",
  "benchmark_min_price": 8609.38,
  "benchmark_max_price": 12234.38,
  "recommended_price": 10421.88,
  "cost_breakdown": {
    "raw_material_cost": 500.0,
    "labor_days": 15.0,
    "daily_wage_rate": 450.0,
    "calculated_fair_wage": 6750.0,
    "artisan_net_profit": 3171.88,
    "total_suggested_price": 10421.88
  },
  "visual_complexity_factor": 0.78,
  "market_benchmark_source": "ArtifyBharat XGBoost Regression & Live GeM/ONDC Scraped Benchmarks"
}
```

---

## 6. Heritage Passport & Public Verification (`/passport`)

### `POST /passport/issue` *(QRService)*
Issues deterministic SHA-256 hash and QR code bound to product and artisan identity.

**Request Payload:**
```json
{
  "product_id": "f8a70c32-bdfa-493e-8c31-92b67f139801"
}
```

**Response (`200 OK`):**
```json
{
  "product_id": "f8a70c32-bdfa-493e-8c31-92b67f139801",
  "passport_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "qr_code_data_uri": "data:image/png;base64,iVBORw0KGgo...",
  "verification_url": "https://verify.artifybharat.in/passport/e3b0c442...",
  "issued_at": "2026-09-07T12:00:00Z"
}
```

### `GET /passport/verify/{passport_hash}` *(Buyer Verification Portal)*
Public verification endpoint for consumers and procurement officers.

**Response (`200 OK`):**
```json
{
  "passport_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "is_authentic": true,
  "product_title": "Handwoven Banarasi Silk Saree with Pure Zari Work",
  "craft_category": "Handloom Textile",
  "gi_tag_status": "Banarasi Brocade & Saree (GI Tagged)",
  "artisan_name": "Gauri Devi",
  "cluster_name": "Varanasi Handloom Cluster",
  "state": "Uttar Pradesh",
  "district": "Varanasi",
  "trifed_id": "TRIFED-UP-VNS-1049",
  "pehchan_id": "PEH-IND-88320",
  "geo_coordinates": {
    "latitude": 25.3176,
    "longitude": 82.9739
  },
  "enhanced_image_url": "media_storage/enhanced/enhanced_f8a70c32.png",
  "voice_story_url": "media_storage/audio/voice_f8a70c32.wav",
  "cost_breakdown": {
    "raw_material_cost": 500.0,
    "labor_days": 15.0,
    "daily_wage_rate": 450.0,
    "calculated_fair_wage": 6750.0,
    "artisan_net_profit": 3171.88,
    "total_suggested_price": 10421.88
  },
  "issued_at": "2026-09-07T12:00:00Z"
}
```

---

## 7. Multi-Channel Export Adapters (`/exports`)

### `POST /exports/sync` *(Unified Catalog Adapter)*
Exports catalog specification to GeM Portal (XML/CSV), ONDC (Beckn Protocol JSON), and Direct B2B Buyers (CSV/Email).

**Request Payload:**
```json
{
  "product_id": "f8a70c32-bdfa-493e-8c31-92b67f139801",
  "target_channels": ["GeM", "ONDC", "Direct_B2B"],
  "b2b_bulk_min_quantity": 10,
  "b2b_bulk_discount_percentage": 15.0
}
```

**Response (`200 OK`):**
```json
{
  "product_id": "f8a70c32-bdfa-493e-8c31-92b67f139801",
  "passport_hash": "e3b0c442...",
  "results": [
    {
      "channel": "GeM",
      "status": "synced",
      "external_reference_id": "GEM-A7B8C9D0",
      "format": "XML",
      "details": { "synced_records": 1, "target": "GeM" }
    },
    {
      "channel": "ONDC",
      "status": "synced",
      "external_reference_id": "ONDC-12345678",
      "format": "JSON_BECKN",
      "details": { "synced_records": 1, "target": "ONDC" }
    },
    {
      "channel": "Direct_B2B",
      "status": "synced",
      "external_reference_id": "B2B-EXP-5521",
      "format": "CSV_REPORT",
      "details": { "synced_records": 1, "target": "Direct_B2B" }
    }
  ],
  "message": "Successfully exported product to 3 external procurement channels."
}
```
