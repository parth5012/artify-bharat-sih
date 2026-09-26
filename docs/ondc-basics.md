# ONDC Basics (plain words)

> For SIH PS26090 ArtifyBharat. No jargon wall. Read this first before touching any ONDC code.

## ONDC in 30 seconds

ONDC is not an app like Amazon. It is UPI for shopping.

- UPI lets any bank app pay any other bank app.
- ONDC lets any buyer app (Paytm, Mystore, Pincode) buy from any seller app (us) because all speak the same language.

That language is called Beckn. Four words only:

1. `search` — buyer looks for something
2. `select` — buyer picks an item
3. `init` — delivery + payment starts
4. `confirm` — order is done

## Three roles (who does what)

- **BAP (buyer side app)** — shows listings to shoppers. Example: Paytm, Mystore. We do NOT build this.
- **BPP (seller side)** — that is us, ArtifyBharat. We list artisan sarees, pots, paintings so others can buy them.
- **Gateway + Registry** — post office + phonebook. Gateway routes `search` to all sellers. Registry checks IDs and message signatures.

Flow: buyer app -> gateway broadcasts `search` -> sellers reply later with `on_search` -> buyer `select` -> seller `on_select` -> `init` -> `confirm` -> webhook says `paid`.

It is async (replies come later as callbacks), not one simple request-response.

## The sandbox repos (what each gives you)

- `beckn/beckn-sandbox` — fake full market on your laptop via Docker. Boots fake Gateway + fake seller + fake buyer + Registry with one command. For offline judge demos, no real registration needed.
- `beckn/beckn-onix` — same fake market but newer, heavier box. Ignore for SIH, too big.
- `beckn/protocol-server` — translator that signs messages (Ed25519) and forwards webhooks. You use it, you do not rebuild it.
- `ONDC-Official/reference-buyer-app` — sample buyer app to check your listing shows up, like a demo Paytm.
- `ONDC-Official/ondc-sdk` — ready code to talk Beckn, do not hand-write JSON.
- `ONDC-Protocol-Specs` — rulebook with exact field names for retail (`/search`, `/on_search`, `/select`, etc.).
- `developer-docs` — how-to manual.

## What SIH PS26090 wants us to build

Not a new ONDC. Just this:

Artisan taps Publish in ArtifyBharat -> product appears in the network -> any buyer app can search and buy -> our app gets a `paid` webhook -> product auto marks sold so no double-sell.

Today the Publish button is fake (5-second animation in `PublishingFlow`). Judges want real network-shape proof that runs offline.

## Why not just a few sample API endpoints?

You can fake it, and that is what the code does today (`frontend/backend/ondc.ts` returns `listed:true`, checkout makes a local intent). Enough for UI demo.

Not enough for protocol proof, because:

- Real ONDC is broadcast + callbacks + signatures + registry, not 2 endpoints. Hand-building that means rebuilding the post office yourself.
- Judges ask: will this work on real `staging.gateway.ondc.org` with real buyer apps? With hand-faked APIs you cannot prove it.
- Sandbox gives the post office free: same code points at local gateway today, staging gateway tomorrow via env switch (`ONDC_GATEWAY_URL`).

Rule: fake APIs for speed, sandbox for proof. SIH finals need proof.

## What our backend must do (the Beckn-speaking part)

When hosted, our backend must:

1. Publish catalog in Beckn shape (name, price, images, plus Heritage Passport in `tags`: parentHash, childHash, shortcode like `A7X-9B2`, GI, cluster).
2. Answer `search` / `select` / `init` / `confirm` callbacks.
3. Accept `paid` / `failed` webhooks with replay safety (same message twice = no double action).
4. Lock inventory on sale so a 1-of-1 handmade piece cannot sell twice.
5. Keep all `ONDC_*` secrets server-only (never in browser code).

Code home: `frontend/backend/ondc.ts` + `frontend/app/api/ondc/*` (server routes). Verified by `frontend/tests/env-leak.test.ts` + `npx tsc --noEmit` + `npm test`.

Buyer trust portal (`/verify/{shortcode}` with WIP photo, price breakup, Report Fake) stays separate and does not speak Beckn.
