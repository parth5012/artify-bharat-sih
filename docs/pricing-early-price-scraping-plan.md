# PricingAI Early-Price Scraping Plan (Retrieval v1)

Status: Planned — no code yet
Session: `.tmp/sessions/2026-09-18-pricing-scrape/context.md`
Date: 2026-09-18

## 1. Goal
Suggest early prices from sanctioned snapshots as comp bands above the Fair Wage Floor.
No list-price regressor in v1. `final = max(floor, band_pick)`.

Grill locks (2026-09-18, see `docs/decisions.md`):
- Q1: v1 mandatory fields = material, technique, size, labor_hours, state, GI yes/no
- Q2: strict retail/B2B split, both floored
- Q3: snapshot now; weekly panel for 200 SKUs deferred to v2
- Q4: proof-only comps; tag-only flagged, never trained as clears
- Q5: win = artisan accepts + sells within 30 days above floor

## 2. What exists today
- `backend/app/services/pricing_service.py`: bottom-up floor + GI/festive/category multipliers, 3 tiers. No market fetch.
- `backend/app/workers/tasks_scraper.py`: stub returning 3 hardcoded clusters. To replace with real collectors.
- `backend/app/services/export_service.py`: GeM/ONDC formatters (existing Beckn shapes to reuse for ingest parsing).
- Stack has `httpx`, Celery+Redis, XGBoost/sklearn (NOT used in v1).

## 3. Sources (sanctioned only)
No proxies, no stealth, no DataDome/Cloudflare defeat. Amazon/Flipkart/Instagram out of v1.

### 3.1 Shopify D2C — first working collector
- Endpoint: `GET https://{store}/products.json?limit=250` (public AJAX, first-party).
- Caps: default 30, max 250, NO pagination, no Link header. Per-store cap acceptable (250 x N stores).
- Discovery (the real work): build list of ~2000 artisan storefronts via Common Crawl, Shopify directories, govt handicraft registries, craft council lists. iTokri/GoCoop/AuthIndia belong here, not custom scrapers.
- Fields: products[] -> title, body_html, vendor, product_type, tags, variants[] (price, compare_at_price, sku, grams, option1-3), images.
- Demand proxy: none -> `proof=tag-only`.

### 3.2 ONDC Beckn — best artisan density
- Flow: BAP `POST /search {context, message.intent}` -> gateway broadcast -> sellers ACK -> `POST /on_search {catalog}` callbacks.
- Access: register as Buyer Network Participant OR partner with existing Buyer App / tech provider. White-label ref: `ONDC-Official/ondc-sdk`, staging `https://ref-app-buyer-staging-v2.ondc.org`.
- v1 without NP status: partner feed or staging replay parser. Store category codes as canonical taxonomy seed.
- Panel v2: weekly recrawl of 200 IDs, stable IDs, diff storage.

### 3.3 Etsy API v3 — only sales proof in v1
- Base `https://openapi.etsy.com`. Register app -> API key + secret. Personal access default (own shops); commercial access on request + trademark notice. No screen-scraping per terms.
- Limits: ~10 QPS / ~10k QPD sliding window; headers `x-limit-per-second`, `x-remaining-today`; 429 + `retry-after`.
- Endpoints: `/v3/application/buyer-taxonomy/nodes`, `/nodes/{id}/properties`, `/v3/application/listings/{id}?includes=Images,Shop,Inventory,Shipping`, reviews.
- Gives taxonomy + materials + sales counter -> `proof=sales-counter`.

### 3.4 Ground truth (worth more than all above)
One craft co-op / D2C brand sales export (transaction prices). Pursue in parallel; small CSV beats 500k scraped rows for eval.

## 4. Canonical comp row (one row per variant)
```
source (shopify|ondc|etsy|coop) | source_id | observed_at | currency | fx_date
title | description_raw | material | technique | size | labor_hours_est | state | gi_tag
craft_category | taxonomy_canonical | taxonomy_source
channel (retail|b2b) | price_sell | price_mrp | coupon_price | gst_inclusive bool
shipping_bundled bool | shipping_cost
proof (sales-counter|bought-badge|review-velocity|coop-bill|tag-only)
sales_count | review_count | listing_age_days
product_url | image_url
```

Price rules: variant-level rows; MRP vs sell vs coupon kept distinct; GST flag; shipping split; currency + observation date stored.

## 5. CompLookup (how early suggest works)
1. Compute floor via `pricing_service` (never undercut).
2. Filter comps: same craft_category + material + size band, channel=retail for retail screen (bulk screen uses channel=b2b only).
3. Rank: proof-first (sales-counter > bought-badge > review-velocity > coop-bill > tag-only), then attribute closeness.
4. Show band (e.g. ₹1,800–2,600) + up to 12 cards with proof badges; tag-only cards labeled "tag only, no sale proof".
5. Artisan picks; log accept + sell-through (via ExportService inventory lock + Digital Heritage Passport) to grow demand-response data for v2.

## 6. Build batches
- Batch 1 (blocks all): canonical spec as SQLAlchemy model + Alembic migration + mapper stubs. Files: `app/models/comp.py`, migration, `app/services/canonical_mapper.py`.
- Batch 2 (parallel): Shopify collector; Etsy collector; ONDC ingest parser. Files: `app/services/collectors/shopify.py`, `collectors/etsy.py`, `collectors/ondc.py`; Celery beat wiring in `tasks_scraper.py` (polite cadence, cache headers).
- Batch 3: CompLookup + pricing flow hook. Files: `app/services/comp_lookup.py`, pricing API band fields.
- Batch 4: tests + lint. Tests: `tests/test_canonical_mapper.py`, `test_collectors_snapshot.py` (recorded fixtures, no live hits), `test_comp_lookup_floor.py` (band never below floor, B2B never leaks to retail).

## 7. Verification
- `uv run pytest -v -m "not slow"` from `backend/` green
- `uv run ruff check backend/app backend/tests`; `uv run black --check backend/app`
- Collectors use fixtures in CI; live runs manual with keys in env, never committed
- E2E spot check: artisan catalog -> pricing band above floor -> shortcode passport

## 8. Risks
- Shopify 250/store cap -> accepted; breadth over depth in v1.
- ONDC NP friction -> partner-first; staging parser unblocks schema work.
- Etsy quota -> cache taxonomy, prioritize proof candidates.
- Attribute extraction (transliterated Hindi, free text) is ~60% of work -> LangAI + ImageAI complexity, budgeted in Batch 1 mapper.
- Taxonomy drift -> canonical first, per-source mappers after; never recollect 500k rows.

## 9. Explicitly deferred (v2)
Weekly panel pipeline (stable IDs, dedup, diff, festival tracking) for 200 SKUs; XGBoost regressor on proxied clears only after accept/sell logs exist.
