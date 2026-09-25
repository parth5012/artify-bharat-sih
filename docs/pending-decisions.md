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

## Related deferred items (tracked on the map, not here)

- Retirement of the regex fallback path after LLM output is field-proven.
- Streaming partial fields if end-to-end extraction latency proves too slow.
- Re-pinning provider model IDs as free-tier catalogs churn (OpenRouter deprecations).

These live in the **Out of scope / fog** sections of the active wayfinder map for LLM form extraction rather than in this file, because they hang on that map's outcome.
