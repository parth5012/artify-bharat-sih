# Pending Decisions

> Deferred decisions that are **in the product but not yet on any active wayfinder map**. Each entry: context, options, status. Promote to a map/ticket when picked up; delete the entry when decided (and record the outcome in `docs/decisions.md`).

## 2026-09-25: Voice-login PIN/phone extraction (regex → LLM?)

- **Status**: Pending — deferred from the LLM form-extraction map (scope decision, charted 2026-09-25)
- **Context**: Voice login parses phone `/([6-9]\d{9})/` and PIN `/(?:pin|पिन)?\s*(?:is|hai)?\s*(\d{4})/i` from the transcript via raw regex in `frontend/app/(artisan)/login/page.tsx:47-48`, then calls `attemptLogin()`. The LLM migration map (`/api/extract`, raw fetch + Zod) explicitly excluded this: it is a high-precision, low-ambiguity parse where regex does the job with zero cost/latency, and routing a 4-digit PIN through an LLM adds failure modes to a login path.
- **Options**:
  1. Keep regex permanently (PIN/phone are structured, well-delimited inputs).
  2. Migrate to the `/api/extract` LLM path for parity with the form flows (handles Hindi phrasing variants better).
  3. Hybrid: regex first, LLM only when regex misses.
- **Open questions**: Do real Hindi/English login utterances ever defeat the current regex? What is the cost/benefit on a security-relevant path (PIN hallucination risk)?

## 2026-09-25: Numeric price / making-days parsing (regex → LLM?)

- **Status**: Pending — deferred from the LLM form-extraction map (scope decision, charted 2026-09-25)
- **Context**: Two call sites scrape digits with `match(/(\d+(?:\.\d+)?)/)`:
  - `frontend/app/(artisan)/(protected)/describe/page.tsx:35` — price / days from free text
  - `frontend/app/(artisan)/(protected)/review/page.tsx:48` — `making_days`
  These sit outside the transcript extraction functions and were left as regex alongside voice login.
- **Options**:
  1. Keep regex (numeric extraction from short phrases is low-ambiguity).
  2. Include number+unit extraction in the `/api/extract` product schema (the product schema already carries `timeRequired`, so this may be a natural extension rather than a separate migration).
  3. Zod-coerce at the form boundary only — LLM returns the phrase, form layer parses the number.
- **Open questions**: Does `timeRequired` extraction in the product path already subsume `describe`/`review` input, making this redundant once the LLM path ships?

## 2026-09-25: Admission controls for `POST /api/extract` (rate / concurrency / size)

- **Status**: Pending — raised by PR #173 review of `docs/extract-api-spec.md`; not decided on map #166
- **Context**: The spec bounds a *single* request (8s/attempt, 26s total, 4,000-char input → 413) but bounds neither how many requests a caller may fire nor how many may run concurrently. Each accepted request can consume up to 3 provider calls against a free quota of 1,000 req/day (Groq) and 50 req/day (OpenRouter), so unauthenticated volume can exhaust the quota for every artisan sharing the instance. The route is server-side and currently has no auth requirement of its own.
- **Options**:
  1. Do nothing for local/dev; rely on deployment-level controls (reverse-proxy rate limit) before any shared exposure.
  2. In-process token bucket per instance (e.g. 10 req/min, 429 + `Retry-After`) — cheap, but per-instance only and resets on deploy.
  3. Require the existing artisan session/identity on the route (reject 401 without) — strongest, but couples extraction to auth and may break typed/sample keyless paths.
  4. Static daily request counter per instance (cheap quota guard: stop calling providers once N/day is spent, fall through to regex).
- **Open questions**: Is this route ever exposed without a reverse proxy? Must keyless/typed demo paths stay anonymous? Who owns the quota-failure UX (silent regex degradation vs explicit notice)?

## 2026-09-25: Third-party transcript disclosure (Groq / OpenRouter) under DPDP

- **Status**: Pending — raised by PR #173 review of `docs/extract-api-spec.md`; not decided on map #166
- **Context**: With provider keys configured, `/api/extract` forwards the artisan's raw `translation || transcript` — identity data including name, phone and location — to Groq and OpenRouter, third-party processors outside the MoSJE perimeter. The spec's PII-free `[extract]` log protects the logging sink only; it does not address this egress. ArtifyBharat is positioned as DPDP-compliant (PII Vault / AES-256-GCM tokenization exist for stored data).
- **Options**:
  1. Send as-is (transcripts are short-lived, not stored); document the vendors in the DPDP data inventory.
  2. Redact before egress: strip/mask phone, artisan ID and PIN from the text handed to the provider, and recover those fields from regex only (they are high-precision regex targets anyway).
  3. Vendor allowlist / region constraint: pick a provider with an India data-residency or DPA commitment; drop the other.
  4. Keep `kind: 'product'` (non-identity) going to LLMs but restrict `kind: 'identity'` to regex until a policy lands.
- **Open questions**: Does the vendor DPA/residency position satisfy the MoSJE/DPDP posture? Is translation (already produced by Bhashini) considered less sensitive than the raw Hindi transcript? Who signs off — ministry or project?

## Related deferred items (tracked on the map, not here)

- Retirement of the regex fallback path after LLM output is field-proven.
- Streaming partial fields if end-to-end extraction latency proves too slow.
- Re-pinning provider model IDs as free-tier catalogs churn (OpenRouter deprecations).

These live in the **Out of scope / fog** sections of the active wayfinder map for LLM form extraction rather than in this file, because they hang on that map's outcome.
