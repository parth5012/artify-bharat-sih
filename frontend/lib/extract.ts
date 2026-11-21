/**
 * LLM form-extraction core for `POST /api/extract` (spec `docs/extract-api-spec.md`).
 *
 * Pure extraction logic only: schemas, field normalization, regex wrapper,
 * LLM/regex merge with confidence rules, system-prompt builder, and the
 * bounded provider attempt chain. Keyless-safe by construction — this module
 * takes resolved values (URLs, model IDs, keys) as parameters and never reads
 * ambient configuration, so it performs no HTTP unless its caller invokes the
 * chain and no lookup outside its arguments.
 */

import { z } from 'zod';
import {
  CRAFT_TYPES,
  MATERIALS_DICTIONARY,
  extractArtisanFromTranscript,
  extractProductFromTranscript,
  type ArtisanExtractionResult,
  type ExtractedField,
  type ProductExtractionResult,
} from './nlp';

// ---------------------------------------------------------------------------
// Request schema (§2)
// ---------------------------------------------------------------------------

export const ExtractKindSchema = z.enum(['identity', 'product']);
export type ExtractKind = z.infer<typeof ExtractKindSchema>;

export const ExtractRequestSchema = z.object({
  text: z.string(),
  kind: ExtractKindSchema,
});
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

// ---------------------------------------------------------------------------
// Response type (§2: result object returned directly, no envelope)
// ---------------------------------------------------------------------------

export type ExtractResponse<K extends ExtractKind> =
  K extends 'identity' ? ArtisanExtractionResult : ProductExtractionResult;

// ---------------------------------------------------------------------------
// Kind schemas + provider JSON Schema literals (§4)
// ---------------------------------------------------------------------------

export const identityLlmSchema = z.object({
  name: z.string().nullable(),
  phone: z.string().nullable(),
  artisanId: z.string().nullable(),
  location: z.string().nullable(),
  craft: z.string().nullable(),
  pin: z.string().nullable(),
});
export type IdentityLlmPayload = z.infer<typeof identityLlmSchema>;

export const productLlmSchema = z.object({
  productName: z.string().nullable(),
  materials: z.array(z.string()).max(12).nullable(),
  makingProcess: z.string().nullable(),
  usage: z.string().nullable(),
  timeRequired: z.string().nullable(),
  craftCategory: z.string().nullable(),
  description: z.string().nullable(),
});
export type ProductLlmPayload = z.infer<typeof productLlmSchema>;

export type LlmPayload = IdentityLlmPayload | ProductLlmPayload;

export const identityJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'phone', 'artisanId', 'location', 'craft', 'pin'],
  properties: {
    name: { type: ['string', 'null'] },
    phone: { type: ['string', 'null'] },
    artisanId: { type: ['string', 'null'] },
    location: { type: ['string', 'null'] },
    craft: { type: ['string', 'null'] },
    pin: { type: ['string', 'null'] },
  },
} as const;

export const productJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'productName',
    'materials',
    'makingProcess',
    'usage',
    'timeRequired',
    'craftCategory',
    'description',
  ],
  properties: {
    productName: { type: ['string', 'null'] },
    materials: { type: ['array', 'null'], maxItems: 12, items: { type: 'string' } },
    makingProcess: { type: ['string', 'null'] },
    usage: { type: ['string', 'null'] },
    timeRequired: { type: ['string', 'null'] },
    craftCategory: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
  },
} as const;

export function providerJsonSchema(kind: ExtractKind) {
  return kind === 'identity' ? identityJsonSchema : productJsonSchema;
}

// ---------------------------------------------------------------------------
// Clairic (Cloudflare Workers AI) typed extraction
// ---------------------------------------------------------------------------

export const CLAIRIC_MODEL = 'clairic';
export const CLAIRIC_FLASH_MODEL = 'clairic-flash';
const CLAIRIC_BASE_URL = 'https://api.cloudflare.com/client/v4/accounts';

export interface ClairicConfig {
  accountId: string;
  apiToken: string;
  model: string;
  baseUrl?: string;
}

/** Resolved config only — env vars are read in the server route, never here. */
export interface ClairicArgs {
  text: string;
  kind: ExtractKind;
  config: ClairicConfig;
  deadlineAt: number;
}

const EXACT = (instructions: string) => ({ type: 'text', instructions });

/**
 * Translate the existing extraction contract into Clairic's `fields` schema.
 * Grounding is enforced by instructions ("copy exactly, never infer") rather
 * than `source_only`: the live Workers AI API rejects `source_only` on text
 * and text-list fields (it is only valid for number/date types). Vocabulary
 * re-labelling fields carry the label lists in their instructions.
 */
export function buildClairicFields(kind: ExtractKind): Record<string, Record<string, unknown>> {
  const craftLabels = CRAFT_TYPES.map((c) => c.label).join(' · ');
  if (kind === 'identity') {
    return {
      name: EXACT('The artisan’s own name as stated. Copy exactly; no honorifics or punctuation.'),
      phone: EXACT('The phone number exactly as stated, in any formatting.'),
      artisanId: EXACT('The artisan ID / Pehchan ID exactly as stated, e.g. ART-2041.'),
      location: EXACT('The place, cluster or state as stated.'),
      craft: {
        type: 'text',
        instructions: `The craft they practice. Prefer one of these labels on a close match: ${craftLabels}. Otherwise copy the stated words. Never invent a craft; return null if unstated.`,
      },
      pin: EXACT('The 6-digit Indian postal PIN code as stated. Return null if no postal PIN is stated.'),
    };
  }
  const materialLabels = MATERIALS_DICTIONARY.map((m) => m.label).join(' · ');
  return {
    productName: EXACT('What the speaker calls the piece. Copy exactly as stated.'),
    materials: {
      type: 'list', items: 'text', max_items: 12,
      instructions: `Only raw materials explicitly named, e.g. ${materialLabels}. Never colors, techniques or uses.`,
    },
    makingProcess: EXACT('How it is made, in the speaker’s own words, exactly as stated.'),
    usage: EXACT('What it is used for, exactly as stated.'),
    timeRequired: EXACT('The time to make it — number and unit exactly as stated. Never convert days to hours or vice versa.'),
    craftCategory: {
      type: 'text',
      instructions: `The craft category. Prefer one of these labels on a close match: ${craftLabels}. Otherwise copy the stated words. Never invent a category; return null if unstated.`,
    },
    description: {
      type: 'text',
      instructions: 'Condense only what the speaker stated about the piece into one sentence. Add no facts, colors, materials or uses that were not said.',
    },
  };
}

// ---------------------------------------------------------------------------
// Field normalization (§4 field-by-field tables)
// ---------------------------------------------------------------------------

function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

function normalizePin(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  // 6-digit Indian postal PIN. A shorter login PIN is invalid in this lane
  // and falls through to the regex fill (flagged for re-check).
  return /^\d{6}$/.test(digits) ? digits : null;
}

function normalizeMaterials(raw: unknown): string[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed === '') continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.length > 0 ? out : null;
}

/**
 * Normalize one raw LLM value per the §4 tables. Returns the stored value or
 * null when the value is absent/invalid (caller then tries the regex fill).
 */
export function normalizeField(field: string, raw: unknown): string | string[] | null {
  if (field === 'materials') return normalizeMaterials(raw);
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (field === 'phone') return normalizePhone(trimmed);
  if (field === 'pin') return normalizePin(trimmed);
  return trimmed === '' ? null : trimmed;
}

// ---------------------------------------------------------------------------
// Regex wrapper (§4 adapter: runRegex)
// ---------------------------------------------------------------------------

function demote<T>(field: ExtractedField<T>): ExtractedField<T> {
  if (field.value === null) return field;
  return { ...field, flag: 'low_confidence' };
}

export function runRegex(kind: 'identity', text: string): ArtisanExtractionResult;
export function runRegex(kind: 'product', text: string): ProductExtractionResult;
export function runRegex(
  kind: ExtractKind,
  text: string,
): ArtisanExtractionResult | ProductExtractionResult {
  if (kind === 'identity') {
    const r = extractArtisanFromTranscript(text);
    return {
      ...r,
      name: demote(r.name),
      phone: demote(r.phone),
      artisanId: demote(r.artisanId),
      location: demote(r.location),
      craft: demote(r.craft),
      pin: demote(r.pin),
    };
  }
  const r = extractProductFromTranscript(text);
  return {
    ...r,
    productName: demote(r.productName),
    materials: demote(r.materials),
    makingProcess: demote(r.makingProcess),
    usage: demote(r.usage),
    timeRequired: demote(r.timeRequired),
    craftCategory: demote(r.craftCategory),
    description: demote(r.description),
  };
}

// ---------------------------------------------------------------------------
// Merge + confidence (§4 adapter: buildResult)
// ---------------------------------------------------------------------------

// Exported for the eval harness (frontend/scripts/eval) — export-only, no behavior change.
export const IDENTITY_FIELDS = ['name', 'phone', 'artisanId', 'location', 'craft', 'pin'] as const;
export const PRODUCT_FIELDS = [
  'productName',
  'materials',
  'makingProcess',
  'usage',
  'timeRequired',
  'craftCategory',
  'description',
] as const;
// Product score set excludes `description` (parity with nlp checkFields).
export const PRODUCT_SCORED = [
  'productName',
  'materials',
  'makingProcess',
  'usage',
  'timeRequired',
  'craftCategory',
] as const;

function computeOverallConfidence(
  kind: ExtractKind,
  out: Record<string, ExtractedField<never>>,
  fromRegex: number,
): number {
  const scored: readonly string[] = kind === 'identity' ? IDENTITY_FIELDS : PRODUCT_SCORED;
  const populated = scored.filter((f) => out[f] != null && out[f].value !== null);
  if (populated.length === 0) return 0;
  if (fromRegex > 0) {
    const sum = populated.reduce((acc, f) => acc + out[f].confidence, 0);
    return Number((sum / populated.length).toFixed(2));
  }
  return Number(((0.9 * populated.length) / scored.length).toFixed(2));
}

export function buildResult(
  kind: 'identity',
  text: string,
  llm: IdentityLlmPayload | null,
  regex: ArtisanExtractionResult,
): ArtisanExtractionResult;
export function buildResult(
  kind: 'product',
  text: string,
  llm: ProductLlmPayload | null,
  regex: ProductExtractionResult,
): ProductExtractionResult;
export function buildResult(
  kind: ExtractKind,
  text: string,
  llm: LlmPayload | null,
  regex: ArtisanExtractionResult | ProductExtractionResult,
): ArtisanExtractionResult | ProductExtractionResult {
  const fieldNames: readonly string[] = kind === 'identity' ? IDENTITY_FIELDS : PRODUCT_FIELDS;
  const llmRecord = (llm ?? {}) as Record<string, unknown>;
  const regexRecord = regex as unknown as Record<string, ExtractedField<never>>;
  const out: Record<string, ExtractedField<never>> = {};
  let fromRegex = 0;
  for (const f of fieldNames) {
    const normalized = llm ? normalizeField(f, llmRecord[f] ?? null) : null;
    if (normalized !== null) {
      out[f] = {
        value: normalized as never,
        confidence: 0.9,
        flag: 'verified',
      };
    } else if (regexRecord[f] != null && regexRecord[f].value !== null) {
      // Regex fill keeps its own numeric confidence; flags were already
      // forced to low_confidence by runRegex.
      out[f] = regexRecord[f];
      fromRegex += 1;
    } else {
      out[f] = { value: null, confidence: 0, flag: 'missing' };
    }
  }
  return {
    ...out,
    rawTranscript: text,
    overallConfidence: computeOverallConfidence(kind, out, fromRegex),
  } as unknown as ArtisanExtractionResult | ProductExtractionResult;
}

// ---------------------------------------------------------------------------
// System prompt (§5)
// ---------------------------------------------------------------------------

const SHARED_PROMPT = `You extract structured form fields from a rural Indian artisan's spoken voice note, which may have been machine-translated. Reply with a single JSON object and nothing else.

Rules — follow all eight:
1. Extract only what is explicitly stated in the user message. If a field is not stated, return null. Never infer, guess, complete, or bring in outside information.
2. Copy digits exactly as stated. Never invent digits, never complete a partial number, and never derive one field from another (for example, do not invent a PIN or build a phone number from fragments).
3. Use no knowledge from outside the user message — no common-sense completion, no world knowledge.
4. If two readings of the same words are equally plausible, return null.
5. Return the value only, trimmed: no honorifics (Shri, Smt., ji, Devi), no trailing punctuation, no quotation marks, no explanation inside the value.
6. materials: only named raw materials (for example silk, brass, river clay) — never colors, never techniques, never uses.
7. timeRequired: keep the number and its unit exactly as stated (for example "15 days", "3 hours") — never convert between days and hours.
8. Output language (see below).`;

const LANGUAGE_POLICY = `Output language: name, location, productName, description, makingProcess and usage mirror the input language — the artisan's own words. craft, craftCategory and materials prefer the English vocab label on a close match (this keeps category mapping working), otherwise mirror the input language. phone, artisanId, pin and timeRequired are language-neutral (digits / IDs / number + unit as stated).`;

const IDENTITY_FIELDS_PROMPT = `Return these keys, all present (null when not stated):
- name: the artisan's own name as stated.
- phone: the phone number as stated (any formatting; it is normalized later).
- artisanId: the artisan ID / Pehchan ID exactly as stated (for example ART-2041).
- location: place, cluster or state as stated.
- craft: the craft they practice (prefer a craft label from the list above on a close match).
- pin: the 6-digit Indian postal PIN code as stated; if no postal PIN is stated, return null.`;

const PRODUCT_FIELDS_PROMPT = `Return these keys, all present (null when not stated):
- productName: what the speaker calls the piece.
- materials: raw materials they name (prefer material labels from the list above on a close match).
- makingProcess: how it is made, as stated.
- usage: what it is used for, as stated.
- timeRequired: the time to make it — number and unit exactly as stated.
- craftCategory: the craft category (prefer a craft label from the list above on a close match).
- description: the speaker's description of the piece in their own words, condensed to what they stated.`;

const CLOSING_LINE = `Remember: one JSON object, every key present, null for anything not stated.`;

/**
 * Build the §5 system prompt for a kind. Vocab label lists are derived from
 * the exported nlp constants at prompt build time, never retyped.
 */
export function buildSystemPrompt(kind: ExtractKind): string {
  const craftLabels = CRAFT_TYPES.map((c) => c.label).join(' · ');
  const materialLabels = MATERIALS_DICTIONARY.map((m) => m.label).join(' · ');
  const vocab =
    `Preferred terms — use one only on a close match, otherwise use your own words; ` +
    `if the field is not stated, return null:\n` +
    `Craft / craft category labels: ${craftLabels}\n` +
    `Material labels: ${materialLabels}`;
  const fields = kind === 'identity' ? IDENTITY_FIELDS_PROMPT : PRODUCT_FIELDS_PROMPT;
  return [SHARED_PROMPT, LANGUAGE_POLICY, vocab, fields, CLOSING_LINE].join('\n\n');
}

// ---------------------------------------------------------------------------
// Provider attempt chain (§3/§6)
// ---------------------------------------------------------------------------

export const ATTEMPT_TIMEOUT_MS = 8_000;
const MIN_REMAINING_MS = 1_000;

export interface ExtractionAttempt {
  url: string;
  model: string;
  apiKey: string;
  /** Opaque provider label used only for log entries; caller-supplied. */
  provider: string;
}

export type AttemptOutcome =
  | 'ok'
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'server_error'
  | 'config'
  | 'bad_request'
  | 'bad_response'
  | 'validation';

export interface AttemptLogEntry {
  provider: string;
  model: string;
  outcome: AttemptOutcome;
  ms: number;
}

export interface ChainArgs {
  text: string;
  kind: ExtractKind;
  attempts: ExtractionAttempt[];
  deadlineAt: number;
}

export interface ChainResult {
  llm: LlmPayload | null;
  attempts: AttemptLogEntry[];
}

function classifyStatus(status: number): AttemptOutcome {
  if (status === 429) return 'rate_limited';
  if (status >= 500 && status <= 599) return 'server_error';
  if (status === 401 || status === 403 || status === 404) return 'config';
  if (status === 400) return 'bad_request';
  return 'bad_response';
}

function extractContent(envelope: unknown): unknown {
  if (envelope === null || typeof envelope !== 'object') return undefined;
  const choices = (envelope as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return undefined;
  const first = choices[0] as { message?: unknown };
  if (first === null || typeof first !== 'object') return undefined;
  const message = first.message as { content?: unknown };
  if (message === null || typeof message !== 'object') return undefined;
  return message.content;
}

/**
 * Run the bounded provider chain (§3/§6). Each attempt gets
 * `min(8s, remaining)` via an AbortController tripped by the global
 * setTimeout (fake-timer controllable); every failure advances uniformly
 * with no in-attempt retry. Returns the first Zod-valid payload, or null
 * when every attempt failed (caller falls back to the regex result).
 */
export async function runExtractionChain(args: ChainArgs): Promise<ChainResult> {
  const { text, kind, attempts, deadlineAt } = args;
  const log: AttemptLogEntry[] = [];
  const kindSchema = kind === 'identity' ? identityLlmSchema : productLlmSchema;
  const system = buildSystemPrompt(kind);
  const schema = providerJsonSchema(kind);

  for (const attempt of attempts) {
    const remaining = deadlineAt - Date.now();
    if (remaining < MIN_REMAINING_MS) break;
    const timeoutMs = Math.min(ATTEMPT_TIMEOUT_MS, remaining);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    let response: Response;
    try {
      response = await fetch(attempt.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${attempt.apiKey}`,
        },
        body: JSON.stringify({
          model: attempt.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: text },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'extraction', strict: true, schema },
          },
        }),
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timer);
      const ms = Date.now() - started;
      log.push({
        provider: attempt.provider,
        model: attempt.model,
        outcome: controller.signal.aborted ? 'timeout' : 'network',
        ms,
      });
      continue;
    }
    clearTimeout(timer);
    const ms = Date.now() - started;

    if (!response.ok) {
      const outcome = classifyStatus(response.status);
      log.push({ provider: attempt.provider, model: attempt.model, outcome, ms });
      if (outcome === 'config') {
        console.warn('[extract] provider config error', {
          provider: attempt.provider,
          model: attempt.model,
          status: response.status,
        });
      }
      continue;
    }

    let envelope: unknown;
    try {
      envelope = await response.json();
    } catch {
      log.push({ provider: attempt.provider, model: attempt.model, outcome: 'bad_response', ms });
      continue;
    }
    const content = extractContent(envelope);
    if (typeof content !== 'string') {
      log.push({ provider: attempt.provider, model: attempt.model, outcome: 'bad_response', ms });
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      log.push({ provider: attempt.provider, model: attempt.model, outcome: 'bad_response', ms });
      continue;
    }
    const checked = kindSchema.safeParse(parsed);
    if (!checked.success) {
      log.push({ provider: attempt.provider, model: attempt.model, outcome: 'validation', ms });
      continue;
    }
    log.push({ provider: attempt.provider, model: attempt.model, outcome: 'ok', ms });
    return { llm: checked.data as LlmPayload, attempts: log };
  }

  return { llm: null, attempts: log };
}

/**
 * Run one Clairic extraction call with the same budget/outcome contract as a
 * chat-provider attempt. Clairic's response is `{result:{answers:{...}}}` where
 * each answer is a typed value; no JSON-in-markdown parsing is needed.
 */
export async function runClairicExtraction(args: ClairicArgs): Promise<ChainResult> {
  const { text, kind, config, deadlineAt } = args;
  const log: AttemptLogEntry[] = [];
  const remaining = deadlineAt - Date.now();
  if (remaining < MIN_REMAINING_MS) return { llm: null, attempts: log };

  const model = config.model;
  const base = (config.baseUrl ?? CLAIRIC_BASE_URL).replace(/\/$/, '');
  const tag = model.startsWith('@cf/') ? model : `@cf/cloudflare/${model}`;
  const url = `${base}/${config.accountId}/ai/run/${tag}`;
  const fields = buildClairicFields(kind);
  const timeoutMs = Math.min(ATTEMPT_TIMEOUT_MS, remaining);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: JSON.stringify({
        model: model.split('/').pop(),
        state: text,
        fields,
      }),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    log.push({
      provider: 'clairic', model,
      outcome: controller.signal.aborted ? 'timeout' : 'network',
      ms: Date.now() - started,
    });
    return { llm: null, attempts: log };
  }
  clearTimeout(timer);
  const ms = Date.now() - started;

  if (!response.ok) {
    log.push({ provider: 'clairic', model, outcome: classifyStatus(response.status), ms });
    return { llm: null, attempts: log };
  }

  let envelope: unknown;
  try {
    envelope = await response.json();
  } catch {
    log.push({ provider: 'clairic', model, outcome: 'bad_response', ms });
    return { llm: null, attempts: log };
  }

  const result = (envelope as { result?: unknown } | null)?.result;
  const answers =
    (result as { answers?: unknown } | null)?.answers ??
    (envelope as { answers?: unknown } | null)?.answers;
  if (answers === null || typeof answers !== 'object' || Array.isArray(answers)) {
    log.push({ provider: 'clairic', model, outcome: 'bad_response', ms });
    return { llm: null, attempts: log };
  }

  const payload: Record<string, unknown> = {};
  for (const field of Object.keys(fields)) {
    const answer = (answers as Record<string, unknown>)[field] as { value?: unknown } | undefined;
    payload[field] = answer && typeof answer === 'object' && 'value' in answer
      ? (answer.value ?? null)
      : null;
  }
  const schema = kind === 'identity' ? identityLlmSchema : productLlmSchema;
  const checked = schema.safeParse(payload);
  if (!checked.success) {
    log.push({ provider: 'clairic', model, outcome: 'validation', ms });
    return { llm: null, attempts: log };
  }

  log.push({ provider: 'clairic', model, outcome: 'ok', ms });
  return { llm: checked.data as LlmPayload, attempts: log };
}

// ---------------------------------------------------------------------------
// Full-result response schema (structural mirror for tests/consumers)
// ---------------------------------------------------------------------------

function textFieldSchema() {
  return z.object({
    value: z.string().nullable(),
    confidence: z.number(),
    flag: z.enum(['missing', 'low_confidence', 'verified']),
  });
}

function listFieldSchema() {
  return z.object({
    value: z.array(z.string()).nullable(),
    confidence: z.number(),
    flag: z.enum(['missing', 'low_confidence', 'verified']),
  });
}

export function extractResultSchema(kind: ExtractKind) {
  if (kind === 'identity') {
    return z.object({
      name: textFieldSchema(),
      phone: textFieldSchema(),
      artisanId: textFieldSchema(),
      location: textFieldSchema(),
      craft: textFieldSchema(),
      pin: textFieldSchema(),
      rawTranscript: z.string(),
      overallConfidence: z.number(),
    });
  }
  return z.object({
    productName: textFieldSchema(),
    materials: listFieldSchema(),
    makingProcess: textFieldSchema(),
    usage: textFieldSchema(),
    timeRequired: textFieldSchema(),
    craftCategory: textFieldSchema(),
    description: textFieldSchema(),
    rawTranscript: z.string(),
    overallConfidence: z.number(),
  });
}
