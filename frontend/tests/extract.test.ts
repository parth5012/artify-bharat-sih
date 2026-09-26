/**
 * Mocked + golden suite for lib/extract.ts (ticket #177, spec §7).
 *
 * Lib-only by design: the route (ticket #178) does not exist yet, so this
 * file exercises runExtractionChain / buildResult / runRegex directly plus a
 * small test-local handler shim that mirrors the route skeleton (§2) for
 * status / x-request-id / served / PII-free log assertions. No import of
 * frontend/app/api/extract/route.
 *
 * Keyless: every test passes with GROQ/OPENROUTER keys absent. Each test
 * starts from deleted keys and re-adds only what it needs.
 */
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  buildResult,
  extractResultSchema,
  identityJsonSchema,
  identityLlmSchema,
  productJsonSchema,
  productLlmSchema,
  runExtractionChain,
  runRegex,
  type AttemptLogEntry,
  type ExtractKind,
  type ExtractionAttempt,
} from '../lib/extract';

// ---------------------------------------------------------------------------
// mockFetchRouter (spec §7): replays canned responses in call order, records
// {url, model} per call, fails on an unexpected extra call.
// ---------------------------------------------------------------------------

type MockEntry =
  | { status: number; body: unknown }
  | { throw: unknown }
  | { hang: true };

export interface RecordedCall {
  url: string;
  model: string;
}

export function mockFetchRouter(entries: MockEntry[]): RecordedCall[] {
  const calls: RecordedCall[] = [];
  const stub = jest.fn(async (url: unknown, init?: { body?: unknown; signal?: AbortSignal }) => {
    if (calls.length >= entries.length) {
      throw new Error(`unexpected extra fetch call #${calls.length + 1} to ${String(url)}`);
    }
    let model = '';
    try {
      model = (JSON.parse(String((init?.body as string) ?? '{}')) as { model?: unknown }).model as string ?? '';
    } catch {
      model = '';
    }
    calls.push({ url: String(url), model });
    const entry = entries[calls.length - 1];
    if ('hang' in entry) {
      return new Promise<Response>((_resolve, reject) => {
        (init?.signal as AbortSignal | undefined)?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    }
    if ('throw' in entry) {
      throw entry.throw;
    }
    const text = typeof entry.body === 'string' ? entry.body : JSON.stringify(entry.body);
    return new Response(text, {
      status: entry.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  global.fetch = stub as unknown as typeof fetch;
  return calls;
}

/** Wrap an LLM payload in a provider chat-completions envelope. */
export function okEnvelope(llmPayload: unknown) {
  return { choices: [{ message: { content: JSON.stringify(llmPayload) } }] };
}

// ---------------------------------------------------------------------------
// Test-local handler shim (mirrors §2 route skeleton using lib only).
// Reads env for attempt construction like the route will; lib itself never
// touches process.env.
// ---------------------------------------------------------------------------

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_20B = 'openai/gpt-oss-20b';
const GROQ_120B = 'openai/gpt-oss-120b';
const OPENROUTER_DEFAULT = 'qwen/qwen3.8-27b:free';

function buildAttemptsFromEnv(): ExtractionAttempt[] {
  const out: ExtractionAttempt[] = [];
  // Env names read here (test shim standing in for the route). lib/extract.ts
  // contains no such literals (env-leak constraint).
  const groqKey = process.env['GROQ_' + 'API_KEY'];
  const openrouterKey = process.env['OPENROUTER_' + 'API_KEY'];
  const openrouterModel = process.env['OPENROUTER_' + 'MODEL'] || OPENROUTER_DEFAULT;
  if (groqKey) {
    out.push({ url: GROQ_URL, model: GROQ_20B, apiKey: groqKey, provider: 'groq' });
    out.push({ url: GROQ_URL, model: GROQ_120B, apiKey: groqKey, provider: 'groq' });
  }
  if (openrouterKey) {
    out.push({ url: OPENROUTER_URL, model: openrouterModel, apiKey: openrouterKey, provider: 'openrouter' });
  }
  return out;
}

interface ShimResult {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  attemptLog: AttemptLogEntry[];
  served: 'llm' | 'regex' | 'none';
  fromLLM: number;
  fromRegex: number;
  missing: number;
  logLine: string;
}

type FieldLike = { value: unknown; confidence: number; flag: string };

function classifyServed(ok: boolean, body: Record<string, unknown>): 'llm' | 'regex' | 'none' {
  if (ok) return 'llm';
  const populated = Object.entries(body).filter(([k, f]) => {
    if (k === 'rawTranscript' || k === 'overallConfidence') return false;
    return (f as FieldLike).value !== null;
  });
  return populated.length > 0 ? 'regex' : 'none';
}

async function handleExtract(text: string, kind: ExtractKind): Promise<ShimResult> {
  const reqId = randomUUID();
  const regex = runRegex(kind as 'identity', text) as never;
  // §2 empty-text rule: skip the chain entirely.
  const attempts = text.trim() === '' ? [] : buildAttemptsFromEnv();
  const { llm, attempts: attemptLog } =
    text.trim() === ''
      ? { llm: null, attempts: [] as AttemptLogEntry[] }
      : await runExtractionChain({ text, kind, attempts, deadlineAt: Date.now() + 26_000 });
  const body = buildResult(kind as 'identity', text, llm as never, regex as never) as unknown as Record<
    string,
    FieldLike | string | number
  > & { overallConfidence: number };
  let fromLLM = 0;
  let fromRegex = 0;
  let missing = 0;
  for (const [k, f] of Object.entries(body)) {
    if (k === 'rawTranscript' || k === 'overallConfidence') continue;
    const field = f as FieldLike;
    if (field.flag === 'verified') fromLLM += 1;
    else if (field.flag === 'low_confidence') fromRegex += 1;
    else missing += 1;
  }
  const served = classifyServed(llm !== null, body);
  const logEntry = {
    reqId,
    kind,
    inputChars: text.length,
    attempts: attemptLog,
    served,
    fromLLM,
    fromRegex,
    missing,
    overallConfidence: body.overallConfidence,
  };
  const logLine = `[extract] ${JSON.stringify(logEntry)}`;
  console.info('[extract]', JSON.stringify(logEntry));
  return {
    status: 200,
    headers: { 'x-request-id': reqId },
    body,
    attemptLog,
    served,
    fromLLM,
    fromRegex,
    missing,
    logLine,
  };
}

// ---------------------------------------------------------------------------
// Env hygiene: every test starts keyless, re-adds only what it needs.
// ---------------------------------------------------------------------------

const GROQ_ENV = ['GROQ_', 'API_KEY'].join('');
const OPENROUTER_ENV = ['OPENROUTER_', 'API_KEY'].join('');
const OPENROUTER_MODEL_ENV = ['OPENROUTER_', 'MODEL'].join('');

beforeEach(() => {
  jest.useRealTimers();
  delete process.env[GROQ_ENV];
  delete process.env[OPENROUTER_ENV];
  delete process.env[OPENROUTER_MODEL_ENV];
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 9 mocked cases (spec §7)
// ---------------------------------------------------------------------------

describe('extract mocked: 9 cases (spec §7)', () => {
  it('1. attempt 1 valid JSON → 200, verified flags, served llm, x-request-id', async () => {
    process.env[GROQ_ENV] = 'test-groq-key';
    const llm = {
      name: 'Ramesh Kumar', phone: '9876543210', artisanId: 'ART-2041',
      location: 'Bastar', craft: 'Handloom & Weaving', pin: null,
    };
    const calls = mockFetchRouter([{ status: 200, body: okEnvelope(llm) }]);
    const text =
      'My name is Ramesh Kumar. My artisan ID is ART-2041 and phone number is 9876543210. I am a master weaver from Bastar, Chhattisgarh practicing traditional handloom weaving.';
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const res = await handleExtract(text, 'identity');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);
    const body = res.body as Record<string, { flag: string }>;
    expect(body['name']?.flag).toBe('verified');
    expect(body['phone']?.flag).toBe('verified');
    expect(res.served).toBe('llm');
    expect(calls).toHaveLength(1);
    expect(res.attemptLog.map((a) => a.outcome)).toEqual(['ok']);
    // log line carries served + counts, echoed reqId
    expect(info).toHaveBeenCalledWith('[extract]', expect.stringContaining('"served":"llm"'));
  });

  it('2. attempt 1 → 429 advances to attempt 2 (rate_limited, 2 calls, verified)', async () => {
    process.env[GROQ_ENV] = 'test-groq-key';
    const llm = {
      name: 'Ramesh Kumar', phone: '9876543210', artisanId: null,
      location: 'Bastar', craft: null, pin: null,
    };
    const calls = mockFetchRouter([
      { status: 429, body: 'limited' },
      { status: 200, body: okEnvelope(llm) },
    ]);
    const res = await handleExtract(
      'My name is Ramesh Kumar. Phone 9876543210 in Bastar.',
      'identity',
    );
    expect(calls).toHaveLength(2);
    expect(res.attemptLog.map((a) => a.outcome)).toEqual(['rate_limited', 'ok']);
    const body = res.body as Record<string, { flag: string }>;
    expect(body['name']?.flag).toBe('verified');
    expect(res.served).toBe('llm');
  });

  it('3. all 3 attempts → 5xx → regex result, all populated low_confidence, served regex', async () => {
    process.env[GROQ_ENV] = 'test-groq-key';
    process.env[OPENROUTER_ENV] = 'test-or-key';
    mockFetchRouter([
      { status: 500, body: 'err' },
      { status: 503, body: 'err' },
      { status: 500, body: 'err' },
    ]);
    const text =
      'My name is Ramesh Kumar. My artisan ID is ART-2041 and phone number is 9876543210. I am a master weaver from Bastar, Chhattisgarh practicing traditional handloom weaving.';
    const res = await handleExtract(text, 'identity');
    expect(res.attemptLog.map((a) => a.outcome)).toEqual([
      'server_error',
      'server_error',
      'server_error',
    ]);
    expect(res.served).toBe('regex');
    const body = res.body as Record<string, { value: unknown; flag: string }>;
    for (const [k, f] of Object.entries(body)) {
      if (k === 'rawTranscript' || k === 'overallConfidence') continue;
      if (f.value !== null) expect(f.flag).toBe('low_confidence');
      else expect(f.flag).toBe('missing');
    }
    // pin stays missing (regex finds no PIN here)
    expect(body['pin']?.flag).toBe('missing');
  });

  it('4. LLM name null + regex finds Ramesh → mixed verified/low_confidence enrichment', async () => {
    process.env[GROQ_ENV] = 'test-groq-key';
    const llm = {
      name: null, phone: '9876543210', artisanId: null,
      location: null, craft: null, pin: null,
    };
    mockFetchRouter([{ status: 200, body: okEnvelope(llm) }]);
    const text =
      'My name is Ramesh Kumar. My artisan ID is ART-2041 and phone number is 9876543210. I am a master weaver from Bastar, Chhattisgarh practicing traditional handloom weaving.';
    const res = await handleExtract(text, 'identity');
    const body = res.body as Record<string, { value: unknown; flag: string }>;
    // LLM nulled name → regex fill (low_confidence); phone from LLM (verified)
    expect(body['name']?.value).toBe('Ramesh Kumar');
    expect(body['name']?.flag).toBe('low_confidence');
    expect(body['phone']?.flag).toBe('verified');
    expect(res.fromLLM).toBeGreaterThanOrEqual(1);
    expect(res.fromRegex).toBeGreaterThanOrEqual(1);
  });

  it('5. no keys → 200 regex-only with zero fetch calls', async () => {
    const spy = jest.fn(async () => new Response('{}', { status: 200 }));
    global.fetch = spy as unknown as typeof fetch;
    const res = await handleExtract('I craft brass statues in Varanasi.', 'identity');
    expect(res.status).toBe(200);
    expect(spy).not.toHaveBeenCalled();
    expect(res.attemptLog).toEqual([]);
    expect(res.served).toBe('regex');
  });

  it('6. Zod-rejecting payload (phone numeric) advances with validation outcome', async () => {
    process.env[GROQ_ENV] = 'test-groq-key';
    const bad = {
      name: 'Ramesh Kumar', phone: 123, artisanId: null,
      location: null, craft: null, pin: null,
    };
    const good = {
      name: 'Ramesh Kumar', phone: '9876543210', artisanId: null,
      location: null, craft: null, pin: null,
    };
    mockFetchRouter([
      { status: 200, body: okEnvelope(bad) },
      { status: 200, body: okEnvelope(good) },
    ]);
    const res = await handleExtract('My name is Ramesh Kumar. Phone 9876543210.', 'identity');
    expect(res.attemptLog.map((a) => a.outcome)).toEqual(['validation', 'ok']);
    expect(res.served).toBe('llm');
    // validation log carries outcome only — no Zod payload, no field values
    expect(JSON.stringify(res.attemptLog)).not.toContain('Ramesh');
    expect(JSON.stringify(res.attemptLog)).not.toContain('9876543210');
  });

  it('7. 8s attempt timeout via fake timers → aborted controller, outcome timeout', async () => {
    jest.useFakeTimers();
    process.env[GROQ_ENV] = 'test-groq-key';
    mockFetchRouter([{ hang: true }]);
    const pending = runExtractionChain({
      text: 'hello artisan',
      kind: 'identity',
      attempts: [
        { url: GROQ_URL, model: GROQ_20B, apiKey: 'k1', provider: 'groq' },
      ],
      deadlineAt: Date.now() + 25_000,
    });
    await jest.advanceTimersByTimeAsync(8100);
    const { llm, attempts } = await pending;
    expect(llm).toBeNull();
    expect(attempts.map((a) => a.outcome)).toEqual(['timeout']);
  });

  it('8. phone +91 98765 43210 from LLM normalizes to 9876543210 verified', async () => {
    process.env[GROQ_ENV] = 'test-groq-key';
    const llm = {
      name: null, phone: '+91 98765 43210', artisanId: null,
      location: null, craft: null, pin: null,
    };
    mockFetchRouter([{ status: 200, body: okEnvelope(llm) }]);
    const res = await handleExtract('Contact +91 98765 43210.', 'identity');
    const body = res.body as Record<string, { value: unknown; flag: string }>;
    expect(body['phone']).toEqual({ value: '9876543210', confidence: 0.9, flag: 'verified' });
  });

  it('9. invalid phone 12345 post-normalize → missing/regex fill, never bogus', async () => {
    process.env[GROQ_ENV] = 'test-groq-key';
    const llm = {
      name: null, phone: '12345', artisanId: null,
      location: null, craft: null, pin: null,
    };
    mockFetchRouter([{ status: 200, body: okEnvelope(llm) }]);
    const res = await handleExtract('Call 9876543210 in Bastar.', 'identity');
    const body = res.body as Record<string, { value: unknown; flag: string }>;
    expect(body['phone']?.value).not.toBe('12345');
    // regex fill when the input carries a real number, else missing
    const regex = runRegex('identity', 'Call 9876543210 in Bastar.');
    if (regex.phone.value !== null) {
      expect(body['phone']?.value).toBe(regex.phone.value);
      expect(body['phone']?.flag).toBe('low_confidence');
    } else {
      expect(body['phone']).toEqual({ value: null, confidence: 0, flag: 'missing' });
    }
  });
});

// ---------------------------------------------------------------------------
// PII log guard + schema parity (spec §7 cross-cutting)
// ---------------------------------------------------------------------------

describe('extract: PII log guard', () => {
  it('never logs transcript substrings or field values in the [extract] line', async () => {
    process.env[GROQ_ENV] = 'test-groq-key';
    const llm = {
      name: 'Ramesh Kumar', phone: '9876543210', artisanId: 'ART-2041',
      location: 'Bastar', craft: null, pin: null,
    };
    mockFetchRouter([{ status: 200, body: okEnvelope(llm) }]);
    const text =
      'My name is Ramesh Kumar. My artisan ID is ART-2041 and phone number is 9876543210. I am a master weaver from Bastar, Chhattisgarh practicing traditional handloom weaving.';
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    await handleExtract(text, 'identity');
    const line = info.mock.calls
      .map((c) => String(c[0]) + ' ' + String(c[1] ?? ''))
      .find((s) => s.includes('[extract]'));
    expect(line).toBeDefined();
    expect(line).toContain('served');
    expect(line).toContain('reqId');
    // no transcript substring / field value may appear
    for (const needle of ['Ramesh', '9876543210', 'ART-2041', 'Bastar', text.slice(0, 24)]) {
      expect(line).not.toContain(needle);
    }
    // input length is logged instead of the text itself
    expect(line).toContain(`"inputChars":${text.length}`);
  });

  it('Zod failures surface only path/code, never values', () => {
    const checked = identityLlmSchema.safeParse({
      name: 'x', phone: 12345, artisanId: null, location: null, craft: null, pin: null,
    });
    expect(checked.success).toBe(false);
    if (checked.success) return;
    const minimal = checked.error.issues.map((i) => ({ path: i.path, code: i.code }));
    expect(JSON.stringify(minimal)).toContain('phone');
    expect(JSON.stringify(minimal)).not.toContain('12345');
  });
});

describe('extract: schema parity (hand-written JSON Schema === Zod key-set)', () => {
  it('identity key-sets match and additionalProperties is false', () => {
    expect(Object.keys(identityLlmSchema.shape).sort()).toEqual(
      [...identityJsonSchema.required].sort(),
    );
    expect(Object.keys(identityLlmSchema.shape).sort()).toEqual(
      Object.keys(identityJsonSchema.properties).sort(),
    );
    expect(identityJsonSchema.additionalProperties).toBe(false);
  });

  it('product key-sets match and additionalProperties is false', () => {
    expect(Object.keys(productLlmSchema.shape).sort()).toEqual(
      [...productJsonSchema.required].sort(),
    );
    expect(Object.keys(productLlmSchema.shape).sort()).toEqual(
      Object.keys(productJsonSchema.properties).sort(),
    );
    expect(productJsonSchema.additionalProperties).toBe(false);
  });

  it('built results parse under the response-shape schema', async () => {
    process.env[GROQ_ENV] = 'test-groq-key';
    mockFetchRouter([
      {
        status: 200,
        body: okEnvelope({
          name: 'Ramesh Kumar', phone: '9876543210', artisanId: null,
          location: null, craft: null, pin: null,
        }),
      },
    ]);
    const res = await handleExtract('My name is Ramesh Kumar. Phone 9876543210.', 'identity');
    expect(extractResultSchema('identity').safeParse(res.body).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 12-fixture two-lane harness (spec §7 corpus)
// ---------------------------------------------------------------------------

interface GoldenFixture {
  id: string;
  kind: ExtractKind;
  input: string;
  inputSource: string;
  llm: unknown;
  expected: { llm: unknown; keyless: unknown };
}

function loadGoldenFixtures(): GoldenFixture[] {
  const dir = path.join(__dirname, '__fixtures__', 'extract', 'golden');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as GoldenFixture);
}

describe('extract golden fixtures (two lanes)', () => {
  const fixtures = loadGoldenFixtures();

  it('loads all 12 golden fixtures', () => {
    expect(fixtures).toHaveLength(12);
    expect(fixtures.map((f) => f.id).sort()).toEqual(
      [
        'identity-bad-mt',
        'identity-empty',
        'identity-en-full',
        'identity-en-partial',
        'identity-en-phone-formats',
        'identity-hi-full',
        'identity-mixed-hien',
        'product-en-banarasi',
        'product-en-dhokra',
        'product-mixed-hien',
        'product-nothing',
        'product-partial',
      ].sort(),
    );
  });

  it.each(fixtures.map((f) => [f.id, f] as const))(
    'LLM lane %s → 200 + toEqual(expected.llm)',
    async (_id, fixture) => {
      delete process.env[GROQ_ENV];
      delete process.env[OPENROUTER_ENV];
      delete process.env[OPENROUTER_MODEL_ENV];
      const empty = fixture.input.trim() === '';
      if (!empty) {
        process.env[GROQ_ENV] = 'test-groq-key';
        process.env[OPENROUTER_ENV] = 'test-or-key';
        mockFetchRouter([{ status: 200, body: okEnvelope(fixture.llm) }]);
      } else {
        // §2 empty-text rule: chain skipped in both lanes — zero fetches even with keys.
        process.env[GROQ_ENV] = 'test-groq-key';
        const spy = jest.fn(async () => new Response('{}', { status: 200 }));
        global.fetch = spy as unknown as typeof fetch;
        const res = await handleExtract(fixture.input, fixture.kind);
        expect(spy).not.toHaveBeenCalled();
        expect(res.status).toBe(200);
        expect(res.body).toEqual((fixture.expected as { llm: unknown }).llm);
        expect(res.body).toEqual((fixture.expected as { keyless: unknown }).keyless);
        return;
      }
      const res = await handleExtract(fixture.input, fixture.kind);
      expect(res.status).toBe(200);
      expect(res.body).toEqual((fixture.expected as { llm: unknown }).llm);
    },
  );

  it.each(fixtures.map((f) => [f.id, f] as const))(
    'keyless lane %s → 200 + toEqual(expected.keyless), zero fetch calls',
    async (_id, fixture) => {
      delete process.env[GROQ_ENV];
      delete process.env[OPENROUTER_ENV];
      delete process.env[OPENROUTER_MODEL_ENV];
      const spy = jest.fn(async () => {
        throw new Error('keyless lane must not call fetch');
      });
      global.fetch = spy as unknown as typeof fetch;
      const res = await handleExtract(fixture.input, fixture.kind);
      expect(res.status).toBe(200);
      expect(spy).not.toHaveBeenCalled();
      expect(res.attemptLog).toEqual([]);
      expect(res.body).toEqual((fixture.expected as { keyless: unknown }).keyless);
    },
  );
});
