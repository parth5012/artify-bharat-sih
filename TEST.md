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
| Owns       | `prod-001` (1-of-1 unique, listed) |

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
`./artify_bharat.db`; creates tables if missing; safe to re-run):

```bash
uv run python scripts/seed_test_accounts.py
# seed: {'artisan': 'created', 'customer': 'created', 'product': 'created'}
```

Equivalent inline snippet (same values the script writes):

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
)
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
