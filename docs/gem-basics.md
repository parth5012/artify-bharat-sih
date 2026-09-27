# GeM Basics (plain words)

> For SIH PS26090 ArtifyBharat. Sibling of `docs/ondc-basics.md`. A judge with zero GeM knowledge should understand our design after reading this.

## GeM in 30 seconds

GeM = **Government e-Marketplace** (gem.gov.in). India's online shop **for the government**.

- A district hospital needs 200 sarees for a uniform. Instead of calling vendors, the officer opens GeM and buys like on any e-commerce site.
- Sellers are registered artisans, SHGs, MSMEs and companies. Buyers are government departments, PSUs, hospitals, schools.
- Money, contracts and receipts all stay inside the government's procurement record — that is the whole point.

## B2G vs ONDC-B2C (the two lanes we publish to)

| | GeM | ONDC |
|---|---|---|
| Who buys | Government departments (one buyer side) | Any shopper in any buyer app (Paytm, Pincode…) |
| Shape | One portal, one seller dashboard | A network of apps talking one language (Beckn) |
| Proof we show | Approval-ready **packet** (manual upload) | Live sandbox `on_search` + source badge |
| Docs in this repo | `docs/gem-basics.md` (this file) | `docs/ondc-basics.md` |

We do both because the artisan's product must reach **shoppers AND government buyers**.

## The real 5-stage dashboard trail

GeM's seller dashboard makes you fill a catalogue form in five stages, then a GeM Admin approves it:

1. **General** — seller name, TRIFED/artisan id, state, cluster
2. **Category** — GeM category code + golden parameters
3. **Price** — HSN code, SKU, MRP, offer price, stock, lead time
4. **Specification** — title, description, make/model, certifications, country of origin
5. **Media** — exactly **3 image slots**

Then: **GeM Admin approval — 3-day TAT** (turnaround time).

Our packet mirrors this 1:1: `buildGemManifest()` in `frontend/backend/gem-mapper.ts` returns `stage1_general … stage5_media`, so the artisan pastes each block into the matching stage. Nothing is invented for a stage GeM controls — stage 2 carries `goldenParamsMustFillInDashboard` (always non-empty on purpose).

## The artisan lane: Quadrant 5 + vocalforlocal

- **SHG Quadrant 5**: GeM's reseller/artisan lane — a product can be uploaded by a seller who is not the OEM (no factory paperwork needed). This is where handloom, handicraft and SHG-made goods sit.
- **vocalforlocal**: the government's local-procurement push that gives these listings visibility.
- Our four craft clusters map into real GeM category codes through the locked **G2 table** (`GEM_CRAFT_RULES`): Varanasi `HANDLOOM_SAREE_7210` / HSN `50072010`, Pashmina `HANDLOOM_SHAWL_6214` / `621410`, Madhubani `MADHUBANI_PAINTING_9701` / `970190`, Kutch `HANDICRAFT_EMBROIDERY_5805` / `580500`. Unmapped crafts fall back to the Varanasi row (`GEM_DEFAULT_CRAFT_RULE`), never to a blank.

## Why we build a packet and NOT a live push

This is the design's core honesty:

- Official GeM documentation (`assets-bg.gem.gov.in`) shows **no public seller catalog-upload API**. Seller listing happens **inside the dashboard form trail** above.
- GeM's documented REST/SOAP APIs are **buyer-side** (CPSU/ERP procurement integration) — they let a buyer department pull orders into its own systems. They do not let a third-party app push a seller's catalogue.
- So any code claiming "we pushed your product to GeM" would be a **fabricated listing**. That is exactly what the map forbids (grill **G5**: no `gem.gov.in/product/{id}` links anywhere).

What we do instead (grill **G1**): generate an **approval-ready packet** —

- `gem-catalog.xml` — bulk-upload shape for wherever the dashboard accepts a file
- `gem-catalog.csv` — same rows as CSV (`GEM_CSV_HEADERS`)
- `gem-manifest-*.json` — the human checklist: 5 stages + Heritage Passport (shortcode, hashes, GI tag, verify URL)

The artisan downloads it from the success card (**Download GeM packet**) and pastes/uploads it on gem.gov.in. The UI badge says **`Packet ready (manual upload)`** (grill **G4**) — never "Listed".

## The price rule (G3) — why MRP is derived

GeM requires the offer to sit **at least 10% below MRP**. So the artisan chooses only the fair-wage **offer price**; MRP is derived:

```
MRP = ceil(offer / 0.9)          // e.g. offer 1000 → MRP 1112 (10.07% off)
```

Edge case that forced `ceil`: `round(1000 / 0.9) = 1111` gives only 9.99% off — under the 10% floor, rejected at the dashboard. `validateGemPricePair()` re-checks the pair before the packet is built.

## What runs where (server-only invariant)

- Pure mapping: `frontend/backend/gem-mapper.ts` (`mapProductToGemCatalog/Xml/Csv`, `buildGemManifest`)
- Packet assembly + env verdict: `frontend/backend/gem.ts` (`buildGemPacket`, `getGemEnv`)
- HTTP lane: `frontend/app/api/gem/packet/route.ts` (session auth, ownership check, 10/hour per-user rate limit, `product.gem_packet` audit)
- UI truth: `frontend/lib/publishing.ts` + `frontend/components/PublishingFlow.tsx` (step completes only on a packet result)
- `GEM_PORTAL_API_URL` / `GEM_SELLER_TOKEN` are **RESERVED** for a future GeM-granted seller API (grill **G6**). Unset today ⇒ `getGemEnv()` returns `{configured:false, reason:…}` and the packet still builds. `GEM_*` is read only under `frontend/app/api/**` and `frontend/backend/**`, guarded by `frontend/tests/env-leak.test.ts`.

## What we never claim

- No "Listed on GeM", no `gem.gov.in/product/...` links (grep guard in `frontend/tests/publishing.test.ts`)
- No GeM order flow (grill **G7 deferred** — no seller order API exists)
- No secrets in the browser; no live GeM credentials in this effort

## Verify it yourself

```bash
cd frontend
npm ci && npx tsc --noEmit && npm test && npm run build
npx jest gem-mapper gem-packet env-leak publishing --ci
rg 'gem\.gov\.in/product' frontend/   # → zero matches
```

Code home: `frontend/backend/gem-mapper.ts`, `frontend/backend/gem.ts`, `frontend/app/api/gem/packet/route.ts`. Decision record: `docs/decisions.md` pointer (ADR draft **Proposed, not accepted**).
