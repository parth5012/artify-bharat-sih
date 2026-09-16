# TEST.md — Mock Test Accounts (Marketplace E2E)

> **Mock data only — never use in production.** All phones are fictitious
> (`98765xxxxx` test range), OTP is the dev mock `123456`. Works with
> `VITE_USE_MOCKS=true` (frontend mock mode) or against the real backend
> (`backend/app/models`, `backend/app/api/v1/marketplace.py`).

## 1. Artisan test account (seller)

| Field      | Value                  |
|------------|------------------------|
| Name       | Mohammad Rahim Ansari  |
| Phone      | `9876543202`           |
| PIN        | `2222`                 |
| Artisan ID | `artisan-002`          |
| Cluster    | Varanasi (Banarasi Brocade) |
| Owns       | `prod-001` / `prod-002` / `prod-003` (1-of-1 unique, listed, with images + passports — see §4) |

Log in via the app landing page (real API: phone + PIN `2222`), or — mock
mode only — inject the session directly in DevTools
(Application → Local Storage). The injected token below is **not** a real JWT
and works only with `VITE_USE_MOCKS=true`:

```json
{"access_token": "mock-token-artisan-002", "token_type": "bearer", "artisan_id": "artisan-002", "name": "Mohammad Rahim Ansari", "phone": "9876543202"}
```

Key: `artify-artisan-session`. (`ArtisanOrdersTab` reads `artisan_id` from it
and matches mock reservations by product `artisanId`.)

## 2. Customer test account (buyer)

| Field | Value          |
|-------|----------------|
| Name  | Test Buyer     |
| Phone | `9876543201`   |
| OTP   | `123456` (dev mock) |

Phone-only flow: browse as guest → reserve with name + 10-digit phone + OTP.
Buyer phone persists under localStorage key `artify-buyer-phone` (never
touches `artify-auth-token`).

## 3. One-click mock seed (frontend mock mode)

With `VITE_USE_MOCKS=true`, paste in DevTools Console for instant demo data
— one `pending` reservation on `prod-001` from the test buyer:

```js
localStorage.setItem('artify-buyer-phone', '9876543201');
localStorage.setItem('artify-mock-reservations', JSON.stringify([{
  id: 'resv-test-001',
  productId: 'prod-001',
  qty: 1,
  status: 'pending',
  expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
  pickupCode: 'PK-TST01',
  buyerName: 'Test Buyer'
}]));
```

Then: `/my-orders` (phone `9876543201`, OTP `123456`) shows the pending hold +
pickup code; Artisan **Orders** tab (session above) can Accept/Decline it.

## 4. Backend seed (real-API mode)

Run from `backend/` (honours `DATABASE_URL`, default sqlite
`./artify_bharat.db`; creates tables if missing; safe to re-run —
existing rows are reused, existing image files are cached):

```bash
uv run python scripts/seed_test_accounts.py
# seed: {'artisan': 'exists', 'customer': 'exists',
#        'product:prod-001': 'exists', 'image:prod-001': 'cached',
#        'pricing:prod-001': 'created', 'passport:prod-001': 'ABC-123', ...}
```

What one run creates (idempotent):

| Seed | Details |
|------|---------|
| Artisan | `artisan-002` / Mohammad Rahim Ansari / `9876543202` / PIN `2222` |
| Customer | Test Buyer / `9876543201` (phone_hash only, no plaintext) |
| Products | `prod-001` Banarasi saree, `prod-002` Madhubani dupatta, `prod-003` Pashmina shawl — `published` + `is_listed`, `stock_qty=1` unique |
| Images | Downloaded from the internet (stable keyed URLs) into `media_storage/raw|enhanced`, wired to `raw_image_path` / `enhanced_image_path`; Pillow 800×800 placeholder if offline |
| Pricing | Coherent `ProductPricing` per product (fair wage = days × rate, profit floored ≥ 0) |
| Passports | Real SHA-256 `HeritagePassport` rows pinned to shortcodes below |

Flags: `--no-images` (skip downloads), `--force-images` (re-download),
`--timeout SECONDS` (per-image, default 20), `--no-passports` (skip
passport + pricing issuance).

Buyer verify (real backend): the portal Quick Samples resolve to seeded
passports (hyphen-insensitive, any case):

| Sample | Shortcode | Product |
|--------|-----------|---------|
| ABC123 | `ABC-123` | Hand-woven Banarasi Zari Silk Saree |
| VRN456 | `VRN-456` | Madhubani Hand-Painted Tussar Silk Dupatta |
| MDB789 | `MDB-789` | Kashmiri Pashmina Handloom Shawl |

Equivalent inline snippet (same values the script writes for `prod-001`):

```python
from app.models.artisan import Artisan
from app.models.customer import Customer
from app.models.product import Product

artisan = Artisan(
    id="artisan-002",
    name="Mohammad Rahim Ansari", phone="9876543202",
    pin_hash=get_pin_hash("2222"), cluster_name="Varanasi Handloom Cluster",
    state="Uttar Pradesh", district="Varanasi",
    is_onboarded=True, onboarding_step=3,
)
customer = Customer(name="Test Buyer", phone_hash=Customer.hash_phone("9876543201"))
product = Product(
    id="prod-001", artisan_id="artisan-002",
    title="Hand-woven Banarasi Zari Silk Saree",
    status="published", is_listed=True, stock_qty=1, stock_type="unique",
    raw_image_path="media_storage/raw/prod-001_raw.jpg",
    enhanced_image_path="media_storage/enhanced/prod-001_enhanced.jpg",
)
# Then: ProductPricing row + passport_service.issue_passport pinned to "ABC-123".
# db.add_all([artisan, customer, product]); await db.commit()
# Plaintext phone never persists — only phone_hash + PII-vault token.
```

## 5. E2E walkthrough (5 min)

> Pick ONE setup path per run: either start clean at step 1 (no seed), or
> use the §3 seed and skip to step 2 — otherwise you get two pending holds
> (mock mode doesn't dedupe the seeded reservation against a new reserve).

1. `/market` → add `prod-001` to cart → **Reserve Now** as Test Buyer
   (`9876543201` / `123456`) → 7-day hold + pickup code shown.
2. `/my-orders` → phone lookup shows `pending` + pickup code.
3. Artisan **Orders** tab (session §1) → **Accept** → buyer view flips to
   `confirmed` (+ mock SMS note on artisan side).
4. Guardrails: reserving `prod-001` from the artisan session is blocked
   (own-product); 6th active hold on one phone is capped at 5; re-reserving
   the unique `prod-001` is rejected (oversell lock).

## 6. Cleanup

```js
['artify-buyer-phone','artify-mock-reservations','artify-cart','artify-artisan-session']
  .forEach(k => localStorage.removeItem(k));
```

Seed rows in a real DB: delete the `customers` / `artisans` test rows (or
reset the dev database).
