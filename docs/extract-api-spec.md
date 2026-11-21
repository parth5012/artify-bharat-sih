# Extract API Specification — LLM Form Extraction (`POST /api/extract`)

> Implementation-ready spec for the transcript → structured-field extraction feature (map #166).
> Single source of truth: closed decision tickets **#168** (providers, models, env), **#169** (Zod schema & prompt),
> **#170** (fallback semantics, incl. the per-field enrichment AMENDMENT), **#171** (test plan).
> A coder session implements exactly this file; no open questions remain.

---

## 1. Purpose & scope

The voice flow (UI_Voice / Zero-Literacy Audio Engine, `CONTEXT.md:15`) currently derives structured form
fields from transcripts with regex only (`frontend/lib/nlp.ts`). This feature adds a server route that runs a
bounded LLM provider chain to fill those fields under strict anti-hallucination rules, keeps the existing regex
path as both a last-resort fallback and a per-field enrichment floor, and returns the **unchanged** result
contracts (`ExtractedField` / `ArtisanExtractionResult` / `ProductExtractionResult`, `frontend/lib/nlp.ts:9-36`).
There is no `source` field in the response — per-field `flag` values encode provenance (#170 §3).

Identity fields feed artisan onboarding (`frontend/app/(artisan)/onboarding/page.tsx:305`); product fields feed
the describe step (`frontend/app/(artisan)/(protected)/describe/page.tsx:82`), after which the flow proceeds to
pricing (Fair Wage Floor) and Digital Heritage Passport issuance (`docs/frontend-artisan-product-workflow.md:11,175`).
The "No demo values" invariant (`frontend/lib/nlp.ts:5-6`) holds everywhere: absent fields are `null` with
flag `missing` and confidence `0`, never canned values.

### In scope

| # | Item | Decided by |
|---|---|---|
| 1 | `POST /api/extract` route: request/response contract, status codes, `x-request-id`, `runtime = 'nodejs'` | map #166, #170 §5 |
| 2 | 3-attempt provider chain (Groq ×2 → OpenRouter ×1) then regex, raw `fetch` + `zod` only | #168 |
| 3 | Server-only env vars + pinned model constants + `.env.example` + `env-leak.test.ts` extension | #168 |
| 4 | Zod schemas for `kind:'identity'` / `kind:'product'`, adapter normalization, confidence/flags, enrichment merge | #169, #170 §4a |
| 5 | System prompt (8 rules, field list, vocab hints) + user-message shape + output-language policy | #169 |
| 6 | Failure classes, 8s/26s/30s budgets, no-key → 200 regex-only, PII-free `[extract]` log | #170 |
| 7 | Test plan: 9 mocked cases + PII guard, 12 golden fixtures (both lanes), gated live test, `lib/nlp.test.ts` port + delete, `test:live` script | #171 |
| 8 | Client wiring: `processExtract()` with a 30s `AbortSignal` in `frontend/lib/voice.ts` + `VoiceScreen` call sites (client budget row of #170 §2) | #170 §2 |

### Out of scope

Voice-login PIN/phone regex and numeric price/making-days parsing (§9); retirement of the regex path, streaming
partial fields, ASR/Bhashini pipeline changes, Python backend changes (§10); prompt iteration / few-shot examples
and Hindi-quality eval thresholds (map #166 "Not yet specified" — post-spec work).

---

## 2. Route design

| Property | Value |
|---|---|
| Method / path | `POST /api/extract` |
| File | `frontend/app/api/extract/route.ts` |
| Runtime | `export const runtime = 'nodejs';` (house pattern: `frontend/app/api/voice/route.ts:5`) |
| Request content-type | `application/json` |
| Response body | The result object directly (no envelope) — `ArtisanExtractionResult` or `ProductExtractionResult`, unchanged |
| Success status | **200** whenever the body is valid — LLM, enriched, regex-only, keyless, or all-missing results |
| Validation status | **400** for malformed JSON / non-object body / missing or wrong-typed `text` or `kind` (via `jsonError`, `frontend/backend/http.ts:2`) |
| Never | **503** for missing keys or provider failure (#170 §3). Defensive `500` only for unexpected exceptions (matches the `/api/voice` catch-all, `frontend/app/api/voice/route.ts:118-123`) |
| Headers | `x-request-id: <crypto.randomUUID()>` on **every** response (200/400/500); value is echoed as `reqId` in the `[extract]` log line |

### Request

```ts
export type ExtractKind = 'identity' | 'product';

export interface ExtractRequest {
  text: string;   // raw `translation || transcript` string, sent verbatim by the client
  kind: ExtractKind;
}
```

Validated with `z.object({text: z.string(), kind: z.enum(['identity','product'])})` (default strip, not
`.strict()`). Rules:

- `text` not a string / `kind` missing or invalid / body not JSON-parseable → **400** `{error: string}`.
- `text` is `""` or whitespace-only → **200** with the all-missing result (regex handles empty input at
  `frontend/lib/nlp.ts:85`); the provider chain is skipped entirely (`attempts: []`, `served: 'none'`).
- `text.length > 4_000` → **413** `{error: string}`. Spec default (not a human decision): bounds the token
  cost of a single request and keeps a hostile payload from consuming the 26s budget. Raise only with a
  measured transcript-length ceiling. The client needs no change — real transcripts are far below this.

### Response types

```ts
// Result contracts are imported unchanged from @/lib/nlp (frontend/lib/nlp.ts:15-36).
type ExtractResponse<K extends ExtractKind> =
  K extends 'identity' ? ArtisanExtractionResult : ProductExtractionResult;
```

Example (identity, LLM-served with one regex-filled field — mixed flags are correct, #170 §4a):

```json
{
  "name":       {"value": "Ramesh Kumar", "confidence": 0.9,  "flag": "verified"},
  "phone":      {"value": "9876543210",   "confidence": 0.9,  "flag": "verified"},
  "artisanId":  {"value": null,           "confidence": 0,    "flag": "missing"},
  "location":   {"value": "Bastar",       "confidence": 0.85, "flag": "low_confidence"},
  "craft":      {"value": null,           "confidence": 0,    "flag": "missing"},
  "pin":        {"value": null,           "confidence": 0,    "flag": "missing"},
  "rawTranscript": "…the input text…",
  "overallConfidence": 0.88
}
```

### Handler skeleton

```ts
export const runtime = 'nodejs';
export async function POST(request: Request): Promise<Response> {
  const reqId = crypto.randomUUID();                 // -> x-request-id on every exit path
  const body = await request.json().catch(() => null);
  const parsed = ExtractRequestSchema.safeParse(body);
  if (!parsed.success) return withId(jsonError('…400…'), reqId);

  const {text, kind} = parsed.data;
  const deadlineAt = Date.now() + REQUEST_BUDGET_MS;  // 26_000, set once, here
  const regex = runRegex(kind, text);                // ALWAYS runs first (#170 §4a step 1)
  const attempts = buildAttempts();                  // env-filtered, pinned IDs — only place env is read
  const {llm, attempts: attemptLog} = text.trim()
    ? await runExtractionChain({text, kind, attempts, deadlineAt})
    : {llm: null, attempts: []};
  const result = buildResult(kind, text, llm, regex); // normalize + merge + overallConfidence (§4)
  const logEntry = buildLogEntry({reqId, kind, inputChars: text.length, attemptLog, result});
  // ^ pass the LENGTH, never `text` (§6 never-log list) — keeps the PII rule structural, not a convention
  console.info('[extract]', JSON.stringify(logEntry));
  return withId(NextResponse.json(result), reqId);    // 200
}
```

**Env-access rule (hard constraint from the `env-leak.test.ts` extension, §3):** `process.env.GROQ_*` /
`process.env.OPENROUTER_*` may be read **only** inside `frontend/app/api/**` (that tree is excluded from the
client-source scan at `frontend/tests/env-leak.test.ts:107`). `frontend/lib/extract.ts` receives resolved
values (API keys, model IDs) as parameters and must not contain the env-var name literals at all.

### Client side (wiring included, #170 §2 budget row)

Add to `frontend/lib/voice.ts`, next to `processVoiceAudio` (`frontend/lib/voice.ts:15`):

```ts
export const EXTRACT_TIMEOUT_MS = 30_000;
export async function processExtract<K extends ExtractKind>(text: string, kind: K):
  Promise<ExtractResponse<K>> {   // generic — a union return would not narrow at the call sites
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({text, kind}),
    signal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),   // client abort: 30s (#170 §2)
  });
  if (!res.ok) throw new Error('Extraction failed.');
  return res.json();
}
```

In `frontend/components/VoiceScreen.tsx`, `extractEntitiesForKind` (line 48) becomes `async` and calls
`await processExtract(text, kind)` instead of the local regex, mapping the result to the existing
`VoiceFieldItem[]` labels/flags unchanged (lines 52-58, 63-67). Four call sites become `await`:
`VoiceScreen.tsx:89,118,154,195`. On a thrown client error (network / 30s abort), do
`setPhase(p => transitionVoicePhase(p, 'failed'))` and return — `processing → failed → idle` already exists
(`frontend/lib/voiceStates.ts:48`), giving the existing retry path. Server 200 (including keyless regex-only)
never hits this branch, so typed/sample paths keep working keyless (#170 §3).

Deliberately untouched: `frontend/app/(artisan)/onboarding/page.tsx:308` and
`frontend/app/(artisan)/(protected)/describe/page.tsx:87` keep their local regex as a last-resort backstop for
fields the server returned empty (minimal-change rule; a later cleanup can drop them).

### Admission controls & third-party disclosure — **OPEN, human decision** (raised on PR #173 review)

Two design gaps were flagged in review of this spec. Neither was decided on map #166, so neither is
implemented below; both are recorded in `docs/pending-decisions.md` and must be settled **before** the route
is reachable in any shared environment.

1. **Caller / rate controls.** The timeouts in §6 bound a *single* request (8s attempts, 26s budget); nothing
   bounds *how many* requests a caller may fire, nor how many may run concurrently. The 413 input-size bound
   above caps per-request cost but not aggregate cost — each accepted request can burn up to 3 provider calls
   against a 1,000 req/day (Groq) / 50 req/day (OpenRouter) free quota, so an unauthenticated flooder can
   exhaust the quota for every artisan on the instance. Options and trade-offs live in the pending-decisions
   entry; the spec deliberately does **not** pick one.
2. **Transcript disclosure to external providers.** With keys configured, the route forwards the artisan's
   raw `translation || transcript` (identity data: name, phone, location) to **Groq** and **OpenRouter** —
   third-party processors outside the MoSJE perimeter. The PII-free `[extract]` log (§6) protects the
   *logging* sink only; it says nothing about this disclosure. A data-minimization / vendor-disclosure
   position (DPDP posture, what is redacted before egress, whether the identity kind may be sent at all)
   is likewise a human/policy decision, pending-decisions entry 2.

**Coder-session rule:** implement §2–§7 as written, do **not** invent rate limiting or redaction, and treat
both items as blocking gates for any deployment beyond local/dev — surface them in the rollout note.

---

## 3. Provider chain

### Attempts

| # | Provider | Base URL (chat completions) | Pinned model ID | Key env var | Timeout |
|---|---|---|---|---|---|
| 1 | Groq | `https://api.groq.com/openai/v1/chat/completions` | `openai/gpt-oss-20b` (TS constant) | `GROQ_API_KEY` | `min(8s, remaining)` |
| 2 | Groq | same | `openai/gpt-oss-120b` (TS constant) | `GROQ_API_KEY` | `min(8s, remaining)` |
| 3 | OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | `qwen/qwen3.8-27b:free` (TS default; `OPENROUTER_MODEL` overrides) | `OPENROUTER_API_KEY` | `min(8s, remaining)` |
| 4 | — | — | existing regex (`extractArtisanFromTranscript` / `extractProductFromTranscript`) | — | synchronous |

Dropped on purpose (#168): the 3rd Groq slot, the 2nd/3rd OpenRouter slots, and the `openrouter/free` random
router (non-deterministic selection defeats "which model served" observability). Model IDs for attempts 1-2 are
**pinned TS constants exported from the route module**, never env. Only attempt 3 is env-overridable (its
`:free` catalog can churn overnight).

**HTTP client: raw `fetch` + `zod` only — NO AI SDK.** `ai@7` / `@ai-sdk/groq@4` /
`@openrouter/ai-sdk-provider@3` all require Node ≥ 22 while CI is Node 20 (`.github/workflows/ci.yml:30`).
`zod` is absent from `frontend/package.json` and must be added (any current stable major — this spec uses only
`z.object` / `z.string` / `z.array` / `z.enum` / `.nullable()` / `.max()`, stable across v3/v4).

Attempt request body (identical for both providers):

```json
{
  "model": "<pinned or OPENROUTER_MODEL override>",
  "messages": [
    {"role": "system", "content": "<system prompt, §5>"},
    {"role": "user",   "content": "<raw text: translation || transcript, verbatim>"}
  ],
  "response_format": {"type": "json_schema", "json_schema": {"name": "extraction", "strict": true, "schema": "<§4 JSON Schema>"}}
}
```

Headers: `Content-Type: application/json`, `Authorization: Bearer <key>`. No `temperature` override (provider
default; nothing in #168-#171 pins it, and a rejected value would waste an attempt on HTTP 400).
Success path: HTTP 2xx → `JSON.parse(choices[0].message.content)` → Zod `safeParse` of the kind schema (§4) →
attempt succeeded; any failure → advance (§6).

### Environment variables (server-only)

| Var | Purpose | Default when empty/absent |
|---|---|---|
| `GROQ_API_KEY` | attempts 1-2 | attempts 1-2 skipped |
| `OPENROUTER_API_KEY` | attempt 3 | attempt 3 skipped |
| `OPENROUTER_MODEL` | override of attempt-3 model ID | pinned constant `qwen/qwen3.8-27b:free` |

### `.env.example` additions (`frontend/.env.example`, append)

```bash
# LLM form-extraction providers (server-only — never expose with a NEXT_PUBLIC_ prefix)
GROQ_API_KEY=
OPENROUTER_API_KEY=
# Optional override of the pinned attempt-3 model (empty = qwen/qwen3.8-27b:free)
OPENROUTER_MODEL=
```

### `frontend/tests/env-leak.test.ts` extension (#168)

Needles assembled by concatenation (the existing fail-closed pattern, `frontend/tests/env-leak.test.ts:20`):

```ts
const NEXT_PUBLIC_NEEDLES = [
  ['NEXT_PUBLIC', 'BHASHINI'].join('_'),
  ['NEXT_PUBLIC', 'GROQ'].join('_'),
  ['NEXT_PUBLIC', 'OPENROUTER'].join('_'),
];                                  // each: expect(scanTracked(needle)).toEqual([])

const CLIENT_ENV_PREFIXES = ['BHASHINI', 'GROQ', 'OPENROUTER'] as const;
// Build the existing three pattern shapes (process.env dot/bracket access, quoted key
// literal, bare destructuring — frontend/tests/env-leak.test.ts:27-31) per prefix via
// new RegExp, and run the existing client-source scan for every prefix.

const SECRET_NAMES = [
  'BHASHINI_API_KEY', 'BHASHINI_USER_ID', 'BHASHINI_INFERENCE_API_KEY',
  'GROQ_API_KEY', 'OPENROUTER_API_KEY',
];                                  // extends the .env.local value-leak + chunk-prefix scans
```

No `NEXT_PUBLIC_` prefix may ever carry these vars; no assertion is removed. Consequences the implementation
must respect (already encoded in §2): provider env reads live only under `frontend/app/api/`, and golden
fixtures under `frontend/tests/__fixtures__/` are scanned by the client-source patterns
(`frontend/tests/env-leak.test.ts:110`), so no fixture may contain `GROQ`/`OPENROUTER` env-name literals.

---

## 4. Zod schemas & adapter

### Schema constraints

- Groq strict structured outputs require **every** property in `required` and `additionalProperties: false` →
  all keys are **present-but-nullable**, never optional. A key the model omits is a contract breach → Zod fails
  → attempt outcome `validation` → advance (§6).
- **No vocab enums.** `craft` / `craftCategory` / `materials[]` are free text; the `CRAFT_TYPES` /
  `MATERIALS_DICTIONARY` vocab is injected into the prompt as hints only (#169 §1) — an enum would force a
  silently-wrong nearest label for real craft names outside the 9 labels (`determineCraftSlug`,
  `frontend/app/(artisan)/(protected)/describe/page.tsx:11`).
- Zod itself is deliberately loose on content: it checks types only; the **adapter** normalizes and can null a
  field. Rationale: a strict `^\d{10}$` Zod pattern would fail the whole object on `+91-98765 43210` and burn a
  chain attempt on a formatting nit (#169 §2a).
- `rawTranscript` and `overallConfidence` are **not** in the LLM schema — adapter-derived (#169 §2b).

### Provider JSON Schema (hand-written literal, sent as `response_format`; kept in parity with Zod by the key-set assertion in §7)

`kind: 'identity'`:

```json
{"type": "object", "additionalProperties": false,
 "required": ["name", "phone", "artisanId", "location", "craft", "pin"],
 "properties": {
   "name":     {"type": ["string", "null"]},
   "phone":    {"type": ["string", "null"]},
   "artisanId":{"type": ["string", "null"]},
   "location": {"type": ["string", "null"]},
   "craft":    {"type": ["string", "null"]},
   "pin":      {"type": ["string", "null"]}}}
```

`kind: 'product'`:

```json
{"type": "object", "additionalProperties": false,
 "required": ["productName", "materials", "makingProcess", "usage",
              "timeRequired", "craftCategory", "description"],
 "properties": {
   "productName":  {"type": ["string", "null"]},
   "materials":    {"type": ["array", "null"], "maxItems": 12, "items": {"type": "string"}},
   "makingProcess":{"type": ["string", "null"]},
   "usage":        {"type": ["string", "null"]},
   "timeRequired": {"type": ["string", "null"]},
   "craftCategory":{"type": ["string", "null"]},
   "description":  {"type": ["string", "null"]}}}
```

```ts
// Zod mirror (frontend/lib/extract.ts) — types only, content validated by the adapter
const identityLlmSchema = z.object({
  name: z.string().nullable(), phone: z.string().nullable(), artisanId: z.string().nullable(),
  location: z.string().nullable(), craft: z.string().nullable(), pin: z.string().nullable(),
});
const productLlmSchema = z.object({
  productName: z.string().nullable(),
  materials: z.array(z.string()).max(12).nullable(),   // maxItems 12 (#169 §2b)
  makingProcess: z.string().nullable(), usage: z.string().nullable(),
  timeRequired: z.string().nullable(), craftCategory: z.string().nullable(),
  description: z.string().nullable(),
});
```

### Field-by-field: `kind: 'identity'`

| Field | Zod type | Normalization in adapter | Failure behavior |
|---|---|---|---|
| `name` | `string \| null` | trim; drop empty | `""`/whitespace → `null` → `missing`, else regex fill |
| `phone` | `string \| null` | strip non-digits; if 12 digits starting `91`, drop the leading `91`; valid iff exactly 10 digits with first digit `6-9` | invalid → `null` → `missing`, else regex fill (`'+91 98765 43210'` → `'9876543210'`; `'12345'` → `null`) |
| `artisanId` | `string \| null` | trim; drop empty (no case rewriting) | empty → `null` → `missing`, else regex fill |
| `location` | `string \| null` | trim; drop empty | empty → `null` → `missing`, else regex fill |
| `craft` | `string \| null` | trim; drop empty — **no mapping to the 9 labels** | empty → `null` → `missing`, else regex fill |
| `pin` | `string \| null` | strip non-digits; valid iff exactly **6 digits** (Indian postal PIN, #169 §2a) | invalid → `null` → `missing`, else regex fill |

> **Call-out (encoded deliberately, do not "fix" in implementation):** #169 §2a fixes the LLM-lane `pin` validity
> at 6 digits, while the current product flow collects a 4-digit login PIN (onboarding spoken prompt,
> `frontend/app/(artisan)/onboarding/page.tsx:305`; regex capture at `frontend/lib/nlp.ts:207`). Under the merge,
> a 4-digit LLM PIN is nulled by the adapter and re-filled by the regex path with flag `low_confidence` — the
> artisan still gets the value, flagged "Check". Changing the rule to 4 digits (or accepting both) is a
> one-line adapter change and requires a new decision; the coordinator flagged this at spec review.

### Field-by-field: `kind: 'product'`

| Field | Zod type | Normalization in adapter | Failure behavior |
|---|---|---|---|
| `productName` | `string \| null` | trim; drop empty | empty → `null` → `missing`, else regex fill |
| `materials` | `string[] \| null` | trim each entry; drop empties; case-insensitive dedupe (keep first); **`[]` → `null`** (never emitted — `describe` prices `materials?.length \|\| 1`) | length > 12 → Zod reject → attempt `validation` → advance; `null` → `missing`, else regex fill |
| `makingProcess` | `string \| null` | trim; drop empty | empty → `null` → `missing`, else regex fill |
| `usage` | `string \| null` | trim; drop empty | empty → `null` → `missing`, else regex fill |
| `timeRequired` | `string \| null` | trim; drop empty; no unit conversion (prompt rule 7) | empty → `null` → `missing`, else regex fill |
| `craftCategory` | `string \| null` | trim; drop empty — no label mapping | empty → `null` → `missing`, else regex fill |
| `description` | `string \| null` | trim; drop empty | empty → `null` → `missing`, else regex fill |

### Adapter: Zod output → result (pseudo-code)

```ts
function runRegex(kind, text) {
  const r = kind === 'identity' ? extractArtisanFromTranscript(text)
                                : extractProductFromTranscript(text);
  // Regex must NEVER masquerade as LLM-verified: force populated flags to low_confidence
  // (overrides makeField()'s `confidence >= 0.7 -> verified` at frontend/lib/nlp.ts:76).
  return mapFields(r, f => f.value !== null ? {...f, flag: 'low_confidence'} : f);
  // confidences are untouched -> r.overallConfidence (frontend/lib/nlp.ts:229 / :427) stands.
}

function buildResult(kind, text, llm /* validated schema output | null */, regex) {
  const fieldNames = kind === 'identity'
    ? ['name','phone','artisanId','location','craft','pin']
    : ['productName','materials','makingProcess','usage','timeRequired','craftCategory','description'];

  const out = {};
  let fromLLM = 0, fromRegex = 0;
  for (const f of fieldNames) {
    const v = llm ? normalize(f, llm[f]) : null;          // per-field table above; null if invalid
    if (v !== null)      { out[f] = {value: v, confidence: 0.9, flag: 'verified'}; fromLLM++; }
    else if (regex[f].value !== null) { out[f] = regex[f];                          fromRegex++; } // low_confidence + regex's own confidence (0.95/0.90/0.88/0.85/0.80/0.75/…)
    else                 { out[f] = {value: null, confidence: 0, flag: 'missing'}; }
  }
  return {...out, rawTranscript: text, overallConfidence: overall(kind, out, fromRegex)};
}

function overall(kind, out, fromRegex) {
  // Product score set excludes `description` — parity with nlp's checkFields (frontend/lib/nlp.ts:425);
  // identity scores all 6 fields (frontend/lib/nlp.ts:227).
  const scored = kind === 'identity' ? ALL_6 : PRODUCT_6_EXCL_DESCRIPTION;
  const pop = scored.filter(f => out[f].value !== null);
  if (pop.length === 0) return 0;
  if (fromRegex > 0)    // any field sourced from regex (fill or whole result) -> blended mean,
    return Number((pop.reduce((a,f) => a + out[f].confidence, 0) / pop.length).toFixed(2)); // = nlp.ts:229/427 formula
  return Number((0.9 * pop.length / scored.length).toFixed(2));                            // pure-LLM coverage (#169 §4a)
}
```

> **Fixture caution (goldens 11 `product-partial` and 12 `product-mixed-hien`):** `description` is a
> `fieldNames` entry but is **excluded** from `scored` (`PRODUCT_6_EXCL_DESCRIPTION`). A regex-only
> `description` fill still increments `fromRegex`, which flips `overall()` to the **blended mean** for the
> whole result — even though `description` itself never enters the average. Derive those two goldens from
> the `fromRegex > 0` branch, not the coverage branch.

### Confidence rules (must read identically in §6)

| Situation | Per-field confidence | `overallConfidence` |
|---|---|---|
| LLM-sourced non-null field | `0.9` (constant — model self-report is uncalibrated and would make goldens nondeterministic, #169 §4a) | — |
| Regex-sourced field (fill or keyless lane) | regex's own numeric confidence (0.95 / 0.90 / 0.88 / 0.85 / 0.80 / 0.75 / …), flag forced `low_confidence` | — |
| Missing field | `0`, flag `missing` | — |
| Pure-LLM result (no regex field contributed, `fromRegex === 0`) | — | `round(0.9 × populated / total, 2)` with `total` = 6 for both kinds (product excludes `description`) |
| Any regex field contributed (fills, keyless, all-regex) | — | mean of the populated scored fields' confidences, 2 dp — same formula as `frontend/lib/nlp.ts:229` |
| Nothing populated | — | `0` |

Worked check (identity, 6 fields): LLM fills `name`+`phone`, regex fills `location` (0.85) →
`fromRegex > 0` → `overall = round((0.9+0.9+0.85)/3, 2) = 0.88`. Same input if regex had filled nothing →
pure-LLM → `round(0.9 × 2/6, 2) = 0.30`. Flags in a merged result are intentionally mixed — each badge tells
the artisan which fields to re-check (#170 §4a).

---

## 5. Prompt contract

Structure (#169 §4b): **one system message per request** (shared rules + kind-specific field list + vocab
hints) and **one user message** = the raw `translation || transcript` string, verbatim, no wrapper/labels.
**No few-shot examples in v1** — prompt iteration is post-spec work; Groq free tier is 200K tokens/day.
Vocab constants `CRAFT_TYPES` (`frontend/lib/nlp.ts:57-67`) and `MATERIALS_DICTIONARY`
(`frontend/lib/nlp.ts:254-266`) are module-private today → **export them from `frontend/lib/nlp.ts`** (single
source of truth; do not duplicate the labels).

### System prompt — shared block (both kinds, verbatim text)

```text
You extract structured form fields from a rural Indian artisan's spoken voice note, which may have been
machine-translated. Reply with a single JSON object and nothing else.

Rules — follow all eight:
1. Extract only what is explicitly stated in the user message. If a field is not stated, return null.
   Never infer, guess, complete, or bring in outside information.
2. Copy digits exactly as stated. Never invent digits, never complete a partial number, and never derive
   one field from another (for example, do not invent a PIN or build a phone number from fragments).
3. Use no knowledge from outside the user message — no common-sense completion, no world knowledge.
4. If two readings of the same words are equally plausible, return null.
5. Return the value only, trimmed: no honorifics (Shri, Smt., ji, Devi), no trailing punctuation, no
   quotation marks, no explanation inside the value.
6. materials: only named raw materials (for example silk, brass, river clay) — never colors, never
   techniques, never uses.
7. timeRequired: keep the number and its unit exactly as stated (for example "15 days", "3 hours") —
   never convert between days and hours.
8. Output language (see below).
```

**Rule 8 (output-language policy, #169 §3) — append the following policy as prose:**

| Fields | Policy |
|---|---|
| `name`, `location`, `productName`, `description`, `makingProcess`, `usage` | mirror the input language — the artisan's own words |
| `craft`, `craftCategory`, `materials[]` | prefer the English vocab label **on a close match** (keeps `determineCraftSlug` working); otherwise mirror the input language |
| `phone`, `artisanId`, `pin`, `timeRequired` | language-neutral (digits / IDs / number + unit as stated) |

### Vocab hint block (appended to both kinds)

```text
Preferred terms — use one only on a close match, otherwise use your own words; if the field is not
stated, return null:
Craft / craft category labels: Handloom & Weaving · Banarasi Silk & Zari Weaving · Pashmina & Wool
Weaving · Dhokra Brass & Bell Metal Craft · Terracotta & Pottery · Traditional Painting · Wood Carving ·
Traditional Embroidery · Textile Printing & Dyeing
Material labels: Silk · Zari · Brass · Beeswax · River clay · Pashmina wool · Cotton · Wood · Bell metal · Jute · Bamboo
```

(Label lists must be built from the exported `CRAFT_TYPES` / `MATERIALS_DICTIONARY` at build time of the
prompt string, not retyped.)

### Field list block — `kind: 'identity'`

```text
Return these keys, all present (null when not stated):
- name: the artisan's own name as stated.
- phone: the phone number as stated (any formatting; it is normalized later).
- artisanId: the artisan ID / Pehchan ID exactly as stated (for example ART-2041).
- location: place, cluster or state as stated.
- craft: the craft they practice (prefer a craft label from the list above on a close match).
- pin: the 6-digit Indian postal PIN code as stated; if no postal PIN is stated, return null.
```

### Field list block — `kind: 'product'`

```text
Return these keys, all present (null when not stated):
- productName: what the speaker calls the piece.
- materials: raw materials they name (prefer material labels from the list above on a close match).
- makingProcess: how it is made, as stated.
- usage: what it is used for, as stated.
- timeRequired: the time to make it — number and unit exactly as stated.
- craftCategory: the craft category (prefer a craft label from the list above on a close match).
- description: the speaker's description of the piece in their own words, condensed to what they stated.
```

Closing line for both kinds: `Remember: one JSON object, every key present, null for anything not stated.`

**User message:** `text` exactly as received (`translation || transcript` chosen by the caller —
`frontend/components/VoiceScreen.tsx:153,194`). Nothing else.

---

## 6. Fallback chain semantics

### Attempt failure: uniform advance, classify for logs only (#170 §1)

Any condition below fails the attempt → **advance immediately, no in-attempt retry, no corrective re-ask**.
`outcome` lives only in the log; 429 and 5xx get identical control flow (attempt 2 already *is* the rate-limit
retry on a fresh request; an in-attempt retry burns the next provider's budget).

| Condition | `outcome` |
|---|---|
| attempt abort (8s deadline reached) | `timeout` |
| network error / DNS / connection reset | `network` |
| HTTP 429 | `rate_limited` |
| HTTP 5xx | `server_error` |
| HTTP 401 / 403 / 404 (bad key, retired model ID) | `config` |
| HTTP 400 | `bad_request` |
| 2xx but unparseable JSON / missing `choices[0].message.content` | `bad_response` |
| JSON parsed but Zod rejects | `validation` |
| 2xx + JSON + Zod accepts | `ok` (attempt succeeded; chain stops) |

`outcome: 'config'` additionally emits a `console.warn` (a retired model ID must be loud).

### Timeouts / budgets

| Budget | Value | Mechanism |
|---|---|---|
| Per attempt | **8 s** | `ATTEMPT_TIMEOUT_MS = 8_000`; each attempt gets `min(8_000, deadlineAt - Date.now())`; the fetch is aborted through an `AbortController` whose abort is scheduled with the **global `setTimeout`** (cleared when the attempt settles) |
| Whole request | **26 s** | `deadlineAt = Date.now() + 26_000` set in the route before the chain; if remaining `< 1_000`, skip straight to the merge (regex is already computed) |
| Client → `/api/extract` | **30 s** | `AbortSignal.timeout(30000)` in `processExtract` (§2); client 30 s > server 26 s so the server's regex fallback always wins the race |
| End-to-end ceiling incl. ASR | ≤ 60 s (Bhashini, `frontend/backend/bhashini.ts:84`, decision #141) + 26 s extract | — |

> Implementation note (verified empirically on this repo's toolchain): **Node's `AbortSignal.timeout` is NOT
> driven by Jest fake timers**, but the per-attempt timeout must be (#171 case 7 advances timers to abort an
> attempt). The `AbortController` + global `setTimeout` form above has identical observable behavior (fetch
> sees an aborted signal at the deadline) and is fake-timer controllable. Do not use `AbortSignal.timeout`
> for the server-side attempt budget. The client-side 30 s abort may use `AbortSignal.timeout`.

### No key configured → 200 + regex-only, never 503 (#170 §3)

| Keys present | Behavior |
|---|---|
| no `GROQ_API_KEY`, no `OPENROUTER_API_KEY` | attempts 1-3 all skipped → chain not called → **zero `fetch` calls** → regex result |
| only `GROQ_API_KEY` | attempts 1-2 run; attempt 3 skipped |
| only `OPENROUTER_API_KEY` | attempts 1-2 skipped; attempt 3 runs |

Regex-served results have **all populated flags forced to `low_confidence`**, overriding
`frontend/lib/nlp.ts:76` — regex must never masquerade as LLM-verified. Regex also empty → every field
`missing`, `overallConfidence: 0` (No-demo-values invariant holds). Typed/sample VoiceScreen paths and the
whole CI suite run keyless; a 503 would strand the artisan with no feedback.

### Per-field enrichment (AMENDMENT, #170 §4a — overrides charting's "never mix sources")

1. Run regex on the input first (cheap, synchronous), then attempt the provider chain.
2. Merge order: LLM non-null wins (`verified`, `0.9`) → LLM `null` + regex hit → regex value
   (`low_confidence`, regex's own confidence) → neither → `missing` (`0`).
3. Flags are per-field source-derived; mixed flags in one result are correct.
4. `overallConfidence` per the §4 confidence table (blended mean once any regex field contributed).
5. Accepted trade-off: a regex false positive the model deliberately nulled can re-enter — today's behavior,
   a floor, not a regression.

### Observability — one `[extract]` line per request (#170 §5)

```ts
console.info('[extract]', JSON.stringify({
  reqId,                       // = x-request-id header
  kind,                        // 'identity' | 'product'
  inputChars,                  // text.length — length only
  attempts: [{provider, model, outcome, ms}],   // executed attempts only; [] when keyless/skipped
  served,                      // 'llm' | 'regex' | 'none'
  fromLLM, fromRegex, missing, // per-field provenance counts
  overallConfidence,
}));
```

`served`: `'llm'` if any attempt returned a Zod-valid payload; otherwise `'regex'` if ≥ 1 field is populated;
otherwise `'none'`.

**Never log these (PII / secrets):** the `text` input (transcript or translation) or any substring of it;
any extracted field **value** (name, phone, location, craft, pin, product fields); the request body or the
provider request/response bodies; API keys; full Zod error payloads (log `issue.path` + `issue.code` only).
The `[extract]` line is asserted PII-free by test case below (§7).

---

## 7. Test plan

All tests are Jest under `frontend/tests/` (`roots: ['<rootDir>/tests']`, `testTimeout: 15000`,
`frontend/jest.config.js:5-6`). Route handlers are invoked directly in-process — `NextResponse` + `Request`
work under ts-jest's node environment (verified). Each mocked test starts from
`delete process.env.GROQ_API_KEY / OPENROUTER_API_KEY / OPENROUTER_MODEL` in `beforeEach` and re-adds only the
keys it wants, so results are identical on a developer machine with real keys.

### Golden fixtures — `frontend/tests/__fixtures__/extract/golden/<id>.json`

Fixture file shape (`<id>.json` — sketch with comments, not literal JSON):

```text
{
  "id": "identity-en-full",
  "kind": "identity",
  "input": "…verbatim input…",
  "inputSource": "transcript",          // metadata: which upstream string was sent; does not alter behavior
  "llm": { …strict-schema-valid canned provider payload… },
  "expected": {
    "llm":     { …full ArtisanExtractionResult… },
    "keyless": { …full ArtisanExtractionResult… }
  }
}
```

Deep equality (`toEqual`) on the **entire** result — deliberately not `toMatchSnapshot` (snapshots drift
silently); exact equality is safe because confidences are constants (0.9, fixed regex numbers, 2-dp means).
`expected.llm` is the §4 merge of `llm` + regex; `expected.keyless` is the regex result with populated flags
forced to `low_confidence` (and unchanged `overallConfidence`). Authoring procedure: hand-compute both
expectations from the §4 rules, then run the suite once to confirm — any mismatch is a spec-understanding bug
to resolve before committing, not something to paste in blindly.

The fixture shape in #171 sketched a single `expected`; because every fixture must deep-equal in **both**
lanes, expectations are nested per lane (`expected.llm` / `expected.keyless`). `llm: null` is supported by the
harness (skips the LLM lane) but unused by this corpus.

### The 12-case corpus

| # | `id` | kind | input (verbatim) | `inputSource` | canned `llm` payload (sketch) |
|---|---|---|---|---|---|
| 1 | `identity-en-full` | identity | `frontend/lib/nlp.test.ts:17` ("My name is Ramesh Kumar… ART-2041 … 9876543210 … Bastar…") | transcript | `name`, `phone`, `artisanId`, `location`, `craft` non-null; `pin: null` (input states no postal PIN) |
| 2 | `identity-en-partial` | identity | `frontend/lib/nlp.test.ts:37` ("I craft brass statues in Varanasi.") | transcript | `location`, `craft` non-null; rest null |
| 3 | `identity-en-phone-formats` | identity | `frontend/lib/nlp.test.ts:55` ("…contact +91 91234-56789 from Jaipur.") | transcript | `name`, `phone` (as `'+91 91234-56789'` — exercises normalization), `location`; rest null |
| 4 | `identity-hi-full` | identity | `frontend/lib/nlp.test.ts:63` (Hindi: "मेरा नाम शान्ति देवी है…") | transcript | `name`, `phone`, `artisanId`, `location`, `craft` (`'Traditional Painting'` — English vocab preference); `pin: null` |
| 5 | `product-en-banarasi` | product | `frontend/lib/nlp.test.ts:73` (Banarasi saree) | transcript | all 7 non-null; `materials: ['Silk','Zari']` |
| 6 | `product-en-dhokra` | product | `frontend/lib/nlp.test.ts:99` (Dhokra elephant) | transcript | all 7 non-null; `materials: ['Brass','Beeswax','River clay']` |
| 7 | `product-nothing` | product | `frontend/lib/nlp.test.ts:122` ("Handmade item.") | transcript | all null (regex still fills `description`) |
| 8 | `identity-empty` | identity | `""` | transcript | all null → both lanes identical, `overallConfidence: 0` |
| 9 | `identity-mixed-hien` | identity | `"मेरा नाम Sunita Devi है। मैं Jaipur से हूँ और फ़ोन नंबर 9876543210 है।"` | transcript | `name`, `phone`, `location` non-null; rest null |
| 10 | `identity-bad-mt` | identity | `"I am the name of Ramesh Kumar. From the village Bastar of Chhattisgarh. For contact the number is 9876543210."` | translation | `name`, `phone`, `location` non-null; rest null — regex misses the mangled name, LLM catches it |
| 11 | `product-partial` | product | `"It takes 12 days to make this piece."` | transcript | `timeRequired: '12 days'` only; rest null |
| 12 | `product-mixed-hien` | product | `"यह बनारसी सिल्क साड़ी है, इसमें silk और zari लगा है। इसे बुनने में 15 दिन लगते हैं, शादी में पहनने के लिए।"` | transcript | `productName`, `materials: ['Silk','Zari']`, `timeRequired`, `usage`, `craftCategory` non-null; rest null |

Fixture harness lives in `frontend/tests/extract.test.ts` (shares `mockFetchRouter`): for each fixture, LLM
lane (mock returns `fixture.llm`, keys set) asserts `POST` → 200 + `toEqual(fixture.expected.llm)`; keyless
lane (keys deleted, fetch stub asserts **zero** provider calls) asserts 200 +
`toEqual(fixture.expected.keyless)`.

Corpus note: `identity-empty` (id 8) has `text: ""`, so the empty-text rule (§2) skips the chain in **both**
lanes — no fetch occurs even with keys set, `expected.llm` and `expected.keyless` are identical, and the
`llm` payload documents what a conforming model would have returned had the chain run.

### Mocked cases — `frontend/tests/extract.test.ts` (9, keyless CI, #171 §1)

Helper: `mockFetchRouter([...])` — replays canned responses in call order (each entry: status, body or
`throw`), records `{url, model, …}` per call, and fails the test on an unexpected extra call.

| # | Case | Asserts |
|---|---|---|
| 1 | attempt 1 valid JSON | status **200**, LLM fields `flag: 'verified'`, log `served: 'llm'`, `x-request-id` present |
| 2 | attempt 1 → 429, attempt 2 OK | chain advanced (2 fetch calls), log attempt 1 `outcome: 'rate_limited'`, result `verified` |
| 3 | all 3 attempts → 5xx | regex result, **every populated field `low_confidence`**, log `served: 'regex'` |
| 4 | LLM `name: null`, regex finds `Ramesh` | per-field enrichment (#170 §4a): mixed `verified`/`low_confidence` coexist in one result |
| 5 | no keys configured | 200 regex-only, **zero** `fetch` calls |
| 6 | Zod-rejecting payload (e.g. `phone: 123`) | attempt advances, log `outcome: 'validation'`, next attempt or regex serves |
| 7 | 8s attempt timeout (fake timers) | attempt aborted via the `setTimeout`-driven controller, chain advances, log `outcome: 'timeout'` |
| 8 | phone `'+91 98765 43210'` from LLM | normalized to `'9876543210'`, `verified` |
| 9 | invalid phone `'12345'` post-normalize | field `null` / `missing`, then regex fill if the input has one — never a bogus value |

Plus two cross-cutting tests:

- **PII log guard:** `jest.spyOn(console, 'info')`; run a case with a known transcript; assert the `'[extract]'`
  line contains `reqId`/`served`/counts but **no substring of the input** and **no field value**
  (e.g. `'Ramesh'`, `'9876543210'`), and that Zod failures would log only `path`/`code` (assert on the payload
  shape of case 6).
- **Schema parity:** `Object.keys(identityLlmSchema.shape)` / product equivalent equals the JSON Schema
  `required` array and `properties` keys, and `additionalProperties === false` — keeps the hand-written
  provider schema (§4) and Zod mirror in sync.

### Opt-in live test — `frontend/tests/extract.live.test.ts` (#171 §3)

- **Double gate:** runs only when `EXTRACT_LIVE === '1'` **and** `process.env.GROQ_API_KEY` is non-empty;
  otherwise `(LIVE ? describe : describe.skip)(…)`. CI has neither → `npm test` stays green with zero secrets.
- **Provider/model:** attempt 1 only (`groq / openai/gpt-oss-20b`), invoked through the real `POST` handler
  in-process. Cost: 2 live requests per manual run.
- **Smoke assertions only, never exact output:**
  1. status 200 and the body parses under the response-shape Zod `extractResultSchema(kind)` exported from
     `frontend/lib/extract.ts` (structural mirror of the result types, used by tests);
  2. `rawTranscript === input`, every `flag ∈ {missing, low_confidence, verified}`, every `confidence ∈ [0,1]`;
  3. **anti-hallucination probe:** nameless identity input (`"I craft brass statues in Varanasi."`) →
     `name.value === null`;
  4. **positive probe:** corpus #1 transcript → ≥ 1 field non-null;
  5. each request elapsed < 8 s.

### Regex suite port (#171 §4) — required, not optional

`frontend/lib/nlp.test.ts` is **never executed** by `npm test` (jest `roots` excludes `lib/`, and the file is
a hand-rolled `runTests()` harness calling `process.exit(1)`). Therefore:

1. Port it to `frontend/tests/nlp-regex.test.ts` as proper `describe`/`it`/`expect`, preserving all 7 seed
   transcripts (`frontend/lib/nlp.test.ts:17,37,55,63,73,99,122`) and behavioral assertions (null →
   `missing`, no demo fallback, confidence thresholds, exact `timeRequired`/`phone` values).
2. **Delete `frontend/lib/nlp.test.ts`.** Regex regression coverage starts running in CI for the first time.

### npm scripts (`frontend/package.json`)

```json
{
  "test": "jest --ci",
  "test:live": "EXTRACT_LIVE=1 jest extract.live --ci"
}
```

### CI statement

**No `.github/workflows/ci.yml` change.** CI already runs `npm test` keyless on Node 20; the live file
self-skips; `env-leak.test.ts` (needles extended per §3) keeps guarding `GROQ_*`/`OPENROUTER_*`.

---

## 8. Implementation checklist

Ordered; each item is independently verifiable. Run `cd frontend && npx tsc --noEmit && npm test` after every
group.

1. **`frontend/package.json`** — add `zod` to `dependencies`; add the `test:live` script (§7).
   Verify: `npm ci && npx tsc --noEmit`.
2. **`frontend/lib/nlp.ts`** — add `export` to `CRAFT_TYPES` (line 57) and `MATERIALS_DICTIONARY`
   (line 254). No behavior change. Verify: `npx tsc --noEmit`.
3. **`frontend/lib/extract.ts`** (new) — request schema; both kind schemas + provider JSON Schema literals
   (§4); `normalizeField` per the §4 tables; `runRegex` (regex + forced `low_confidence` flags);
   `buildResult` (merge + confidence rules §4); system-prompt builder (§5, consuming the exported vocab);
   `runExtractionChain` (§3/§6: attempt loop, `min(8s, remaining)` controller-based abort, uniform advance,
   outcome classes, no in-attempt retry); `extractResultSchema`. **No `process.env` access, no
   `GROQ_`/`OPENROUTER_` name literals anywhere in this file** (§3 env-leak constraint).
   Verify: `npx tsc --noEmit`.
4. **`frontend/app/api/extract/route.ts`** (new) — `runtime = 'nodejs'`; parse + Zod-validate body (400 via
   `jsonError`); generate `reqId` → `x-request-id` on every exit; read env keys and build the attempt list
   (pinned constants `openai/gpt-oss-20b` / `openai/gpt-oss-120b` / `qwen/qwen3.8-27b:free` +
   `OPENROUTER_MODEL` override live **here**); set the 26s deadline; regex first → chain → `buildResult`;
   emit the single PII-free `[extract]` line (+ `console.warn` on `outcome: 'config'`); return 200.
   Verify: `npx tsc --noEmit`.
5. **`frontend/.env.example`** — append the three vars (§3).
   Verify: `rg 'GROQ_API_KEY|OPENROUTER_' frontend/.env.example` matches §3 block.
6. **`frontend/tests/env-leak.test.ts`** — extend needles/patterns/`SECRET_NAMES` (§3), no assertions removed.
   Verify: `npx jest env-leak --ci` green.
7. **`frontend/tests/extract.test.ts`** (new) — `mockFetchRouter`, the 9 mocked cases, the PII log guard, the
   schema-parity test (§7), and the 12-fixture two-lane harness. Verify: `npx jest extract --ci` green keyless
   (with real keys absent from the shell too — `env -u GROQ_API_KEY -u OPENROUTER_API_KEY npm test`).
8. **`frontend/tests/__fixtures__/extract/golden/*.json`** (12 new files, §7 corpus table) — authored with
   hand-derived `expected.llm` / `expected.keyless`. Verify: same as item 7.
9. **`frontend/tests/nlp-regex.test.ts`** (new) + **delete `frontend/lib/nlp.test.ts`** (§7 — required).
   Verify: `npx jest nlp-regex --ci` green; `rg --files frontend/lib | rg 'nlp.test'` returns nothing.
10. **`frontend/tests/extract.live.test.ts`** (new) — double-gated smoke test (§7). Verify without a key:
    `npx jest extract.live --ci` reports the suite skipped; `npm test` green.
11. **`frontend/lib/voice.ts` + `frontend/components/VoiceScreen.tsx`** — `processExtract` with
    `AbortSignal.timeout(30000)` and the four `await` call sites + `failed`-phase handling (§2).
    Verify: `npx tsc --noEmit && npm test`. (Not `npm run lint`: this repo has no ESLint config and
    `next lint` blocks on an interactive prompt — see `LOG.md`.)
12. **Full gate** — `cd frontend && npm ci && npx tsc --noEmit && npm test && npm run build` (all green,
    keyless). E2E by hand: voice/typed sample → fields appear with `verified`/`Check` badges with keys set,
    and still appear (all `Check`) with keys removed.
13. **Housekeeping** — add the new route/module to `docs/structure.md` "Key Modules" list (AGENTS.md rule:
    update `docs/structure.md` when modules change). Coordinator logs `LOG.md` / `LEARNINGS.md` — do not touch
    them from the coder session unless told.

---

## 9. Pending-decisions appendix

Two entries in `docs/pending-decisions.md` were consciously excluded from this feature by the map's scope
decision (charted 2026-09-25) and are **not** part of `POST /api/extract` v1:

| Entry | What it is | Why excluded here |
|---|---|---|
| *Voice-login PIN/phone extraction (regex → LLM?)* | 4-digit PIN + 10-digit phone parsed by raw regex on the login path (`frontend/app/(artisan)/login/page.tsx:47-48`) | High-precision, low-ambiguity parse on a security-relevant path; regex does it with zero cost/latency (#166 scope) |
| *Numeric price / making-days parsing (regex → LLM?)* | `match(/(\d+(?:\.\d+)?)/)` at `frontend/app/(artisan)/(protected)/describe/page.tsx:35` and `frontend/app/(artisan)/(protected)/review/page.tsx:48` | Sits outside the transcript extraction functions; open question recorded there: whether `timeRequired` extraction subsumes it once the LLM path ships |

Promote either entry to a new map/ticket if it should be picked up; do not smuggle them into this spec.

**Two further entries are open and were raised by the PR #173 review — these are blocking gates for any
shared/production exposure of the route** (see §2 "Admission controls & third-party disclosure"):

| Entry | What it is | Status |
|---|---|---|
| *Admission controls for `POST /api/extract`* | Per-request bounds exist (413/8s/26s) but no rate, concurrency or daily-quota guard before provider calls burn the free quota | Pending — human decision, not implemented |
| *Third-party transcript disclosure (Groq / OpenRouter) under DPDP* | Raw identity transcripts are forwarded to external processors; the PII-free log does not cover this egress | Pending — human/policy decision, not implemented |

---

## 10. Out of scope / revisit later

- **Retirement of the regex fallback path** — revisit only once LLM output is field-proven; regex is a floor
  (enrichment) and the keyless lane, not a temporary shim.
- **Streaming partial fields** — map fixed single request/response; revisit only if post-spec latency data
  demands it.
- **ASR / Bhashini pipeline changes** and **Python backend changes** — untouched by this feature
  (`/api/voice` keeps its current contract and logging).
- **Prompt-engineering iterations / few-shot examples** — deliberately absent from v1 (#169 §4b); post-spec
  work against live fixtures.
- **Hindi extraction quality thresholds (eval criteria)** — map #166 "Not yet specified"; depends on first
  live fixture runs.
- **Re-pinning provider model IDs** as free-tier catalogs churn (OpenRouter `:free` deprecations) — ops
  follow-up; the `OPENROUTER_MODEL` override exists precisely for this.

---

## 11. Addendum — Clairic as primary provider (2026-11-21)

The §3 Groq → OpenRouter chain is retained **as fallback**, but when Cloudflare
credentials are configured the route now tries **Clairic** first:

- Model: `@cf/cloudflare/clairic` (default) or `@cf/cloudflare/clairic-flash`
  via `CLOUDFLARE_CLAIRIC_MODEL`. Env vars `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` are read **only** in `frontend/app/api/extract/route.ts`.
- Contract: `POST .../ai/run/@cf/cloudflare/clairic` with
  `{model, state: text, fields}` — **not** chat `messages`/`response_format`.
  `buildClairicFields()` maps each kind to typed text fields with "copy exactly,
  never infer" instructions, plain text with vocab instructions for `craft` /
  `craftCategory` / `description`, and a bounded `list` for `materials`.
  **`source_only` is deliberately NOT used on text fields** — the live Workers AI
  API rejects it there (it is valid only for number/date types).
- `runClairicExtraction()` returns the same `ChainResult` as the chat chain, so
  attempt logs, 8s/26s budgets, outcome classes, fallback and PII-free logging
  are unchanged. `attempts[]` now carries `provider: 'clairic'`.
- Order: Clairic → Groq 20B → Groq 120B → OpenRouter → regex. With no Cloudflare
  keys the route behaves exactly as before; an empty transcript still skips all
  providers.

This also narrows the §2 "third-party disclosure" concern: with only Clairic
configured, transcripts go to Cloudflare (zero-data-retention Workers AI model)
instead of Groq/OpenRouter. When Clairic is unconfigured or fails, the fallback
chain still receives the transcript — Cloudflare-only disclosure requires leaving
`GROQ_API_KEY` and `OPENROUTER_API_KEY` unset. The admission-control gap from §2
remains open.
