# Free-tier provider comparison: OpenRouter vs Groq for structured extraction

- **Ticket:** #167 (child of Wayfinder map #166 — `POST /api/extract` via Vercel AI SDK `generateObject` + Zod)
- **Branch:** `research/free-tier-providers`
- **Research date / all sources accessed:** 2026-09-25
- **Scope:** Which provider is PRIMARY vs FALLBACK for free-tier structured extraction, and which model IDs to pin. Research only — no code changes.

## TL;DR recommendation

**PRIMARY = Groq → FALLBACK = OpenRouter.**

- **Primary (Groq):** `openai/gpt-oss-20b` → `openai/gpt-oss-120b` → `qwen/qwen3.8-27b` (all three support **strict constrained-decoding structured outputs** on Groq today; published per-model free limits; official `@ai-sdk/groq` provider).
- **Fallback (OpenRouter):** `qwen/qwen3.8-27b:free` → `google/gemma-4-31b-it:free` → `nvidia/nemotron-3-super-120b-a12b:free`, with `openrouter/free` only as a last-resort dynamic escape hatch (random model selection).

Why Groq first: deterministic pinned IDs, guaranteed-strict schema compliance, ~1000 RPD free quota (vs OpenRouter's 50 RPD for accounts with no purchased credits), and an official AI SDK provider. OpenRouter's free catalog churns weekly and its structured-output support is per-endpoint, not per-model.

---

## 1. OpenRouter facts

### 1.1 Free tier (`:free` variants)

- **Rate limits (primary, docs source constants):** `FREE_MODEL_RATE_LIMIT_RPM = 20`, `FREE_MODEL_NO_CREDITS_RPD = 50`, `FREE_MODEL_HAS_CREDITS_RPD = 1000`, `FREE_MODEL_CREDITS_THRESHOLD = 10` — i.e. **20 requests/min, 50 requests/day until you have purchased ≥ $10 of lifetime credits, then 1000 requests/day**. Source: <https://openrouter.ai/docs/api_reference/limits.md> and FAQ "How are rate limits calculated?" <https://openrouter.ai/docs/faq.md> (accessed 2026-09-25).
  - *Conflict:* third-party trackers state 200 req/day (costgoat.com, accessed 2026-09-25) — could not resolve without an authenticated account Limits page; the docs constants are treated as authoritative.
- **Free models are priced at 0** and do not consume credits; paid variants of the same model are billed per token (e.g. `openai/gpt-oss-20b` = $0.018/$0.09 per 1M in/out on OpenRouter; `qwen/qwen3.8-27b` = $0.42/$3.00). Source: live `GET https://openrouter.ai/api/v1/models` (accessed 2026-09-25).
- **Current live free list (18 models, accessed 2026-09-25):** `cohere/north-mini-code:free`, `dots-studio/dots-3-note-preview:free`, `google/gemma-4-26b-a4b-it:free`, `google/gemma-4-31b-it:free`, `inclusionai/ling-3.0-flash-fin:free`, `inclusionai/ling-3.0-flash-sante:free`, `liquid/lfm-2.5-2.6b:free`, `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `nvidia/nemotron-3-ultra-550b-a55b:free`, `nvidia/nemotron-3.5-content-safety:free`, `nvidia/nemotron-3.5-lightning:free`, `poolside/laguna-s-2.1:free`, `poolside/laguna-xs-2.1:free`, `qwen/qwen3.8-27b:free`, `thinkingmachines/inkling-small:free`, `thinkingmachines/inkling:free`, `z-ai/glm-5.2:free`.
- **Notably absent today:** `openai/gpt-oss-20b:free` / `openai/gpt-oss-120b:free` — they were free as recently as 2026-08-01 (third-party monitor dxs1256/OpenRouter README, updated 2026-08-01) and are now paid-only. Free slots are provider-sponsored and revocable.

### 1.2 Deprecation / churn evidence

- Automated tracker `cyclez2000/openrouter-free-models` files dated change issues: **2026-04-08** (29 free models; removed `qwen/qwen3.6-plus:free`, added Gemma 4 pair) and **2026-04-18** (removed `meta-llama/llama-guard-4-12b:free`). <https://github.com/cyclez2000/openrouter-free-models/issues/14>, <https://github.com/cyclez2000/openrouter-free-models/issues/19> (accessed 2026-09-25).
- **Catalog shrink:** 29 free models (Apr 2026) → ~20 (Aug 2026, costgoat) → **18 (live API, 2026-09-25)**.
- **No deprecation grace period:** models.dev issue #3295 (2026-07-16) requests OpenRouter mark removed free models deprecated instead of deleting them instantly; declined as policy. <https://github.com/anomalyco/models.dev/issues/3295> (accessed 2026-09-25).
- Official docs warn: "Free model availability changes frequently" — Free Models Router page, <https://openrouter.ai/docs/guides/routing/routers/free-router.md> (accessed 2026-09-25).

### 1.3 `openrouter/free` router

- Selects a **random** free model after analyzing the request and filtering by required capabilities (vision, tool calling, **structured outputs**). You cannot pin the model; the response `model` field reveals what was used. Source: <https://openrouter.ai/docs/guides/routing/routers/free-router.md> (accessed 2026-09-25).
- Docs position it for "experimentation, learning, and low-volume use cases"; limitations list: lower rate limits, variable availability, higher latency, **no control over model selection**.
- Useful as an availability escape hatch, but non-deterministic output quality makes it unsuitable as the pinned primary path for form-filling extraction.

### 1.4 Structured-output support on OpenRouter

- Feature: `response_format: { type: "json_schema", json_schema: { name, strict, schema } }`. **Support is per-endpoint, not per-model** and "can change over time"; recommended mitigation is `provider.preferences.require_parameters: true` + including `response_format` in required params so the router only picks endpoints that advertise it. Source: <https://openrouter.ai/docs/guides/features/structured-outputs.md> (accessed 2026-09-25).
- **Free models advertising structured-output params today** (live `supported_parameters`, 2026-09-25):
  | Model | `response_format` | `structured_outputs` |
  |---|---|---|
  | `dots-studio/dots-3-note-preview:free` | ✅ | ✅ |
  | `google/gemma-4-26b-a4b-it:free` | ✅ | — |
  | `google/gemma-4-31b-it:free` | ✅ | — |
  | `liquid/lfm-2.5-2.6b:free` | ✅ | ✅ |
  | `nvidia/nemotron-3-super-120b-a12b:free` | ✅ | ✅ |
  | `qwen/qwen3.8-27b:free` | — | ✅ |
  | (others incl. `openrouter/free` pool members like inkling, ling, poolside, nemotron-ultra) | ❌ | ❌ |

### 1.5 `@ai-sdk/*` package maturity

- **`@ai-sdk/openrouter` does not exist on npm (HTTP 404, checked 2026-09-25).** The AI SDK provider for OpenRouter is the community/OpenRouter-maintained **`@openrouter/ai-sdk-provider` v3.1.0** (npm modified 2026-09-19); peer deps: `ai ^7.0.0`, `zod ^3.25.76 || ^4.1.8`; README states the v3 line requires **Node.js ≥ 22 and is ESM-only** (legacy `2.9.1` for AI SDK v6, `1.5.4` for v5). <https://www.npmjs.com/package/@openrouter/ai-sdk-provider>
- Provider README documents `generateObject`/`streamObject` usage and a **"Response Healing" plugin** that auto-repairs malformed JSON for `generateObject` (useful safety net for best-effort schemas). <https://www.npmjs.com/package/@openrouter/ai-sdk-provider> (readme accessed 2026-09-25).
- Current `ai` package on npm: **7.0.114** (modified 2026-09-24).

### 1.6 What happens when the free tier is exceeded

- HTTP **429** (`retry-after` semantics per OpenRouter limits docs); the upgrade path is buying prepaid credits (no subscription) — $10 lifetime credit purchase raises free-model daily quota 50 → 1000 RPD; beyond that, paid model variants are billed per token. Sources: <https://openrouter.ai/docs/api_reference/limits.md>, <https://openrouter.ai/docs/faq.md> (accessed 2026-09-25).

### 1.7 Hindi + English evidence (OpenRouter free candidates)

- **Qwen family (covers `qwen/qwen3.8-27b:free` by lineage):** Qwen3 announcement — **119 languages and dialects**, explicitly including **Hindi**, Gujarati, Marathi, Bhojpuri etc., 36T-token pretraining corpus. <https://qwen.ai/blog?id=qwen3> and <https://qwenlm.github.io/blog/qwen3> (accessed 2026-09-25). *Caveat:* no separate public language list found for the Qwen3.8 generation itself.
- **Gemma 4 (covers `google/gemma-4-31b-it:free`):** "multilingual support in over 140 languages" pretraining; "out-of-the-box support for 35+ languages". Hindi is **not explicitly named** in the model-card language list I could retrieve. <https://ai.google.dev/gemma/docs/core/model_card_4>, <https://huggingface.co/google/gemma-4-31B> (accessed 2026-09-25).
- Nemotron / others: no vendor Hindi-specific claim located.

---

## 2. Groq facts

### 2.1 Free-plan rate limits (per model, organization-level)

Primary source: <https://console.groq.com/docs/rate-limits> (Free Plan Limits table, accessed 2026-09-25):

| Model ID | RPM | RPD | TPM | TPD |
|---|---|---|---|---|
| `openai/gpt-oss-120b` | 30 | 1,000 | 8K | 200K |
| `openai/gpt-oss-20b` | 30 | 1,000 | 8K | 200K |
| `openai/gpt-oss-safeguard-20b` | 30 | 1,000 | 8K | 200K |
| `qwen/qwen3.8-27b` | 30 | 1,000 | 8K | 200K |
| `meta-llama/llama-prompt-guard-2-22m` / `-86m` | 30 | 14.4K | 15K | 500K |
| `whisper-large-v3` / `-turbo` | 20 | 2K | — | 7.2K ASH / 28.8K ASD |

- **No credit card required** for the Free Plan; limits are per-organization and the account Limits page is authoritative.
- `llama-3.1-8b-instant` and `llama-3.3-70b-versatile` are now listed as **"Enterprise — Contact Sales"** on the models page (i.e. no longer free/dev self-serve) — Groq has also retired models from the free pool: tokenmix.ai noted `llama-3.3-70b-versatile` still on the Free Plan as of 2026-06-04. <https://console.groq.com/docs/models> (accessed 2026-09-25).
- **Model-ID churn on Groq too:** an independent review dated 2026-08-22 lists free-model ID `qwen/qwen3.6-27b`, whereas Groq's own docs on 2026-09-25 list `qwen/qwen3.8-27b` — the free Qwen slot was renamed/succeeded within a month. <https://xyzs996.github.io/free-llm-api/provider/groq.html> vs <https://console.groq.com/docs/rate-limits>.

### 2.2 Structured outputs

Primary source: <https://console.groq.com/docs/structured-outputs> (accessed 2026-09-25):

- **Strict mode (`strict: true`)** — constrained decoding, "never errors or produces invalid JSON", 100% schema adherence. Requirements: all fields `required`, `additionalProperties: false`. Supported on: **`openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`** (all three are on the Free Plan table above).
- **Best-effort mode (`strict: false`, default)** — same three plus `openai/gpt-oss-safeguard-20b`; may return schema-invalid JSON or 400.
- **All other models → JSON Object Mode only** (valid JSON, no schema guarantee).
- Structured Outputs **does not support streaming or tool use** concurrently (docs note).
- Vendor recommendation: "Use Strict Mode when available for production applications."

### 2.3 `@ai-sdk/groq` maturity

- **`@ai-sdk/groq` v4.0.48** on npm (modified 2026-09-23) — official Vercel-maintained provider, ships with the AI SDK provider family; peers `zod ^3.25.76 || ^4.1.8`; deps `@ai-sdk/provider 4.0.18`. <https://www.npmjs.com/package/@ai-sdk/groq>
- AI SDK Groq docs expose model options **`structuredOutputs` (default `true` → uses `json_schema` format instead of `json_object`)** and **`strictJsonSchema` (constrained decoding, default `true`)** — i.e. `generateObject` maps onto Groq's strict mode natively. <https://sdk.vercel.ai/providers/ai-sdk-providers/groq> (accessed 2026-09-25).

### 2.4 What happens when the free tier is exceeded

- HTTP **429** with `retry-after` header plus `x-ratelimit-*` headers; upgrade path = **Developer plan** (pay-as-you-go, higher limits, Batch/Flex). Sources: <https://console.groq.com/docs/rate-limits>, <https://apis.io/plans/groq/groq-plans-pricing> (mirror of groq.com/pricing, accessed 2026-09-25).
- Paid (Developer) prices if free is exceeded: `openai/gpt-oss-20b` **$0.075 / $0.30** per 1M in/out; `openai/gpt-oss-120b` **$0.15 / $0.60**; `qwen/qwen3.8-27b` **$0.80 / $4.00**; batch = 50% off. Sources: <https://console.groq.com/docs/models>, apis.io pricing mirror (accessed 2026-09-25).

### 2.5 Hindi + English evidence (Groq candidates)

- **GPT-OSS (primary, first-party):** OpenAI's gpt-oss model card reports **MMMLU (14 human-translated languages) including Hindi**: `gpt-oss-120b` high = **82.2**, `gpt-oss-20b` high = **78.8** (English MMLU 90.0 / 85.3 respectively). <https://arxiv.org/abs/2508.10925> §2.6.3 (accessed 2026-09-25).
- **GPT-OSS caveats (both first-party and independent):** OpenAI states the models were "trained on a mostly English, text-only dataset" (<https://openai.com/index/introducing-gpt-oss>); an independent evaluation finds GPT-OSS "severe weakness in multilingual evaluation (C-Eval), below 30%". <https://arxiv.org/abs/2508.12461> (accessed 2026-09-25). Hindi MMMLU is solid, but multilingual robustness is not GPT-OSS's headline strength.
- **Qwen3.8-27B:** Qwen family claims 119 languages incl. Hindi (see §1.7). No independent Hindi benchmark for the 3.8 generation located.

---

## 3. Comparison table

| Dimension | **Groq (Free Plan)** | **OpenRouter (Free tier)** |
|---|---|---|
| Key requirement | No card | No card |
| Daily request quota | **1,000 RPD / 30 RPM per model** | **50 RPD / 20 RPM** (1,000 RPD only after $10 lifetime credits) |
| Token quota | 8K TPM / 200K TPD per model | Not separately published for free models (request-based) |
| Pinned model IDs | **Yes** — stable IDs published in docs | Weak — `:free` slots appear/disappear without grace period |
| Catalog churn | Moderate (Llama retired to Enterprise; qwen3.6→qwen3.8 rename) | **High** — 29 → 18 free models Apr→Sep 2026; gpt-oss:free removed |
| Strict structured output | **✅ constrained decoding on gpt-oss-20b/120b + qwen3.8-27b** | ❌ best-effort; support per-endpoint, must set `require_parameters` |
| Best-effort / JSON mode | ✅ (all structured-output models) | ✅ (`response_format` on 6 free models today) |
| `generateObject` path | Official `@ai-sdk/groq` (v4.0.48), `structuredOutputs` + `strictJsonSchema` | `@openrouter/ai-sdk-provider` (v3.1.0, needs ai@7, Node 22, ESM) — `@ai-sdk/openrouter` **does not exist** |
| Hindi evidence | gpt-oss MMMLU Hindi 82.2/78.8 (first-party); Qwen 119-lang claim incl. Hindi | Qwen3 119-lang claim incl. Hindi; Gemma 4 "140+ languages" (Hindi not explicitly listed) |
| English evidence | MMLU 90.0 (120b) / 85.3 (20b) — first-party | Same Qwen/Gemma families (English is their core) |
| Over-limit behavior | 429 + `retry-after`; pay-as-you-go upgrade (gpt-oss-20b $0.075/$0.30) | 429; buy $10 credits for 1000 RPD, else paid model variants |
| Non-determinism | None — model ID fixed | `openrouter/free` router picks a **random** capable model |
| Repo constraint fit | ✅ no `openai`/`anthropic` package imported (model slug `openai/gpt-oss-*` is a Groq-served ID, not the `openai` module — `_check_banned_imports` checks `sys.modules`) | ✅ same |
| CI (no LLM keys) | ✅ tests mock; env `GROQ_API_KEY` | ✅ tests mock; env `OPENROUTER_API_KEY` |

---

## 4. Risks

1. **OpenRouter free-catalog churn (high):** 50+ model removals since April with no deprecation grace period; `openai/gpt-oss-20b:free` vanished between 2026-08-01 and 2026-09-25. A pinned `:free` ID can hard-fail with "model not found" overnight. *Mitigation:* pin ≥2 OpenRouter candidates and treat the free list as a weekly re-check (or CI smoke test hitting `/api/v1/models`).
2. **OpenRouter quota ceiling (high):** 50 RPD without purchased credits is likely below even demo traffic; Groq's 1,000 RPD is 20× that.
3. **Structured-output gap on OpenRouter (medium-high):** support is per-endpoint and mutable; without `require_parameters: true` requests may route to endpoints that ignore `response_format`, silently degrading `generateObject` to prompt-only JSON. Strictness is not guaranteed even with `strict: true`.
4. **Groq rate-limit tightness (medium):** 8K TPM ≈ one 4K-token extraction in-flight at a time; 200K TPD ≈ ~40–60 transcript extractions/day. Bursty artisan usage will 429 (retryable with backoff).
5. **Groq model churn (medium):** free-pool models have been retired before (Llama 3.x → "Contact Sales") and the free Qwen ID was renamed qwen3.6→qwen3.8 within a month. Same re-check discipline needed, lower observed velocity than OpenRouter.
6. **Strict-mode schema constraints (medium):** Groq strict mode requires all fields `required` + `additionalProperties: false` — Zod schemas must be authored accordingly (`.optional()` fields become a problem; use unions/defaults instead). Also strict mode is incompatible with streaming/tool-use in the same call.
7. **Toolchain (medium):** OpenRouter provider requires Node ≥ 22 + ESM + `ai@7`; Groq's official provider avoids the third-party-package risk but still implies adopting AI SDK v7 for both slots.
8. **Hindi quality risk (medium):** no benchmark isolates *field extraction from noisy Hindi+English code-mixed transcripts* for any candidate; MMMLU/Qwen language lists are proxies. A small golden-set eval (10 transcripts) should gate rollout.

---

## 5. Recommendation — primary order + pinned model IDs

### PRIMARY: Groq
| Order | Model ID | Why |
|---|---|---|
| 1 | **`openai/gpt-oss-20b`** | Strict structured outputs (constrained decoding ⇒ `generateObject` never sees invalid JSON), fastest (1,000 tok/s), cheapest to scale up ($0.075/$0.30), Hindi MMMLU 78.8, full free limits 30 RPM/1 K RPD/8 K TPM/200 K TPD |
| 2 | **`openai/gpt-oss-120b`** | Same strict guarantee, stronger reasoning + Hindi MMMLU 82.2 — used when 20B mis-extracts; 500 tok/s |
| 3 | **`qwen/qwen3.8-27b`** | Also strict-mode on Groq; best-in-class multilingual lineage (Hindi in Qwen's 119-language list); keep as last resort — only 16,384 max output tokens and priciest paid fallback ($0.80/$4.00) |

Config notes: AI SDK `structuredOutputs: true`, `strictJsonSchema: true`; schema must satisfy strict-mode requirements; on 429 honor `retry-after` and fall through to fallback.

### FALLBACK: OpenRouter
| Order | Model ID | Why |
|---|---|---|
| 1 | **`qwen/qwen3.8-27b:free`** | Same model family as Groq slot 3 (consistent behavior), advertises `structured_outputs`, free today |
| 2 | **`google/gemma-4-31b-it:free`** | Advertises `response_format`; 140+ language pretraining; Google-sponsored free slot (historically longer-lived) |
| 3 | **`nvidia/nemotron-3-super-120b-a12b:free`** | Advertises `response_format` + `structured_outputs`, 120B-class backup |
| (last resort) | **`openrouter/free`** | Router auto-filters for structured-output-capable free models; use only after all pinned IDs 404, and log the `model` field for observability |

Always send `provider: { preferences: { require_parameters: true } }` (or provider options equivalent in `@openrouter/ai-sdk-provider`) so routing never lands on an endpoint that cannot honor `response_format`.

**One-line:** *Primary = Groq (`openai/gpt-oss-20b` → `openai/gpt-oss-120b` → `qwen/qwen3.8-27b`) for strict structured outputs at 1 K free RPD; fallback = OpenRouter (`qwen/qwen3.8-27b:free` → `google/gemma-4-31b-it:free` → `nvidia/nemotron-3-super-120b-a12b:free`, router last) because its free catalog churns and quotas sit at 50 RPD.*

---

## 6. Could not determine

- **OpenRouter free RPD truth:** docs source constants say 50/1000; third-party trackers say 200. Needs an authenticated account Limits page to confirm.
- **Hindi out-of-the-box list for Gemma 4's "35+ supported languages"** (Hindi not explicitly named; only 140+ pretraining claim retrieved).
- **Qwen3.8-specific language list** — only the Qwen3-family 119-language (incl. Hindi) claim was found; no separate Qwen3.8 multilingual announcement.
- **Whether either free tier's terms/quotas will change** — no published deprecation notices for Groq Free Plan or OpenRouter free tier as of 2026-09-25.
- **No live quota testing** — CI/repo has no LLM keys (all tests mock), so rate-limit and strict-mode behavior are from vendor docs only; a 10-transcript golden-set smoke test should follow implementation.

## 7. Sources (all accessed 2026-09-25)

1. Groq Rate Limits — https://console.groq.com/docs/rate-limits
2. Groq Structured Outputs — https://console.groq.com/docs/structured-outputs
3. Groq Supported Models — https://console.groq.com/docs/models
4. Groq pricing (mirror) — https://apis.io/plans/groq/groq-plans-pricing (source: groq.com/pricing, console.groq.com/docs)
5. OpenRouter Limits (source constants) — https://openrouter.ai/docs/api_reference/limits.md
6. OpenRouter FAQ (free rate limits) — https://openrouter.ai/docs/faq.md
7. OpenRouter Free Models Router — https://openrouter.ai/docs/guides/routing/routers/free-router.md
8. OpenRouter `:free` variant — https://openrouter.ai/docs/guides/routing/model-variants/free.md
9. OpenRouter Structured Outputs — https://openrouter.ai/docs/guides/features/structured-outputs.md
10. OpenRouter live models API — https://openrouter.ai/api/v1/models
11. Free-model churn (automated tracker) — https://github.com/cyclez2000/openrouter-free-models/issues/14 , /19
12. No deprecation grace period — https://github.com/anomalyco/models.dev/issues/3295
13. Groq free-tier independent review (qwen3.6 era) — https://xyzs996.github.io/free-llm-api/provider/groq.html
14. npm packages — `@ai-sdk/groq@4.0.48`, `@openrouter/ai-sdk-provider@3.1.0`, `ai@7.0.114`; `@ai-sdk/openrouter` → 404
15. AI SDK Groq provider docs — https://sdk.vercel.ai/providers/ai-sdk-providers/groq
16. gpt-oss model card (MMMLU incl. Hindi) — https://arxiv.org/abs/2508.10925
17. Introducing gpt-oss (mostly-English training) — https://openai.com/index/introducing-gpt-oss
18. Independent GPT-OSS evaluation (multilingual weakness) — https://arxiv.org/abs/2508.12461
19. Qwen3 multilingual (119 langs incl. Hindi) — https://qwen.ai/blog?id=qwen3 , https://qwenlm.github.io/blog/qwen3
20. Gemma 4 model card (140+ languages) — https://ai.google.dev/gemma/docs/core/model_card_4
