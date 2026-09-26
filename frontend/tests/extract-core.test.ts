/**
 * Focused unit tests for frontend/lib/extract.ts (ticket #176 core).
 * Covers normalizeField / buildResult / chain-advance only.
 * Full mocked + golden suite lives in extract.test.ts (ticket #177) — do not expand here.
 */
import {
  ATTEMPT_TIMEOUT_MS,
  ExtractRequestSchema,
  buildResult,
  buildSystemPrompt,
  extractResultSchema,
  identityLlmSchema,
  normalizeField,
  productLlmSchema,
  runExtractionChain,
  runRegex,
} from '../lib/extract';

describe('extract core: request + kind schemas', () => {
  it('validates kind/text and rejects malformed bodies', () => {
    expect(ExtractRequestSchema.safeParse({ text: 'hi', kind: 'identity' }).success).toBe(true);
    expect(ExtractRequestSchema.safeParse({ text: 'hi', kind: 'product' }).success).toBe(true);
    expect(ExtractRequestSchema.safeParse({ text: 123, kind: 'identity' }).success).toBe(false);
    expect(ExtractRequestSchema.safeParse({ text: 'hi', kind: 'bogus' }).success).toBe(false);
  });

  it('kind schemas accept present-but-nullable keys and cap materials at 12', () => {
    const ok = identityLlmSchema.safeParse({
      name: 'Ramesh', phone: null, artisanId: null, location: null, craft: null, pin: null,
    });
    expect(ok.success).toBe(true);
    // missing key is a contract breach (all keys required)
    expect(identityLlmSchema.safeParse({ name: 'x' }).success).toBe(false);
    const tooMany = productLlmSchema.safeParse({
      productName: null, materials: Array.from({ length: 13 }, (_, i) => `m${i}`),
      makingProcess: null, usage: null, timeRequired: null, craftCategory: null, description: null,
    });
    expect(tooMany.success).toBe(false);
  });
});

describe('extract core: normalizeField', () => {
  it('normalizes phone formats and rejects invalid phones', () => {
    expect(normalizeField('phone', '+91 98765 43210')).toBe('9876543210');
    expect(normalizeField('phone', '919876543210')).toBe('9876543210');
    expect(normalizeField('phone', '9876543210')).toBe('9876543210');
    expect(normalizeField('phone', '12345')).toBeNull();
    expect(normalizeField('phone', '5123456789')).toBeNull();
    expect(normalizeField('phone', null)).toBeNull();
  });

  it('validates pin as exactly 6 digits (4-digit login PIN is invalid here)', () => {
    expect(normalizeField('pin', '123456')).toBe('123456');
    expect(normalizeField('pin', '1234')).toBeNull();
    expect(normalizeField('pin', ' 493331 ')).toBe('493331');
    expect(normalizeField('pin', null)).toBeNull();
  });

  it('trims text fields and normalizes materials', () => {
    expect(normalizeField('name', '  Ramesh Kumar  ')).toBe('Ramesh Kumar');
    expect(normalizeField('name', '   ')).toBeNull();
    expect(normalizeField('materials', ['Silk ', 'silk', ' Zari ', ''])).toEqual(['Silk', 'Zari']);
    expect(normalizeField('materials', [])).toBeNull();
    expect(normalizeField('materials', null)).toBeNull();
  });
});

describe('extract core: runRegex forces low_confidence', () => {
  it('populated regex fields are low_confidence, missing stay missing', () => {
    const r = runRegex(
      'identity',
      'My name is Ramesh Kumar. My artisan ID is ART-2041 and phone number is 9876543210. I am a master weaver from Bastar, Chhattisgarh practicing traditional handloom weaving.',
    );
    expect(r.name.value).toBe('Ramesh Kumar');
    expect(r.name.flag).toBe('low_confidence');
    expect(r.phone.value).toBe('9876543210');
    expect(r.phone.flag).toBe('low_confidence');
    // empty input stays all-missing
    const e = runRegex('identity', '   ');
    expect(e.name).toEqual({ value: null, confidence: 0, flag: 'missing' });
    expect(e.overallConfidence).toBe(0);
  });
});

describe('extract core: buildResult merge + confidence', () => {
  it('LLM wins, regex fills, missing otherwise; blended mean when any regex field', () => {
    const text = 'My name is Ramesh Kumar. Phone 9876543210 in Bastar.';
    const regex = runRegex('identity', text);
    // LLM fills name+phone only; force location to a known regex hit
    const llm = {
      name: 'Ramesh Kumar', phone: '9876543210', artisanId: null,
      location: null, craft: null, pin: null,
    };
    const res = buildResult('identity', text, llm, regex);
    expect(res.name).toEqual({ value: 'Ramesh Kumar', confidence: 0.9, flag: 'verified' });
    expect(res.phone.flag).toBe('verified');
    // location comes from regex when LLM nulls it
    if (regex.location.value !== null) {
      expect(res.location.value).toBe(regex.location.value);
      expect(res.location.flag).toBe('low_confidence');
      const pop = ['name', 'phone', 'location'] as const;
      const mean =
        (0.9 + 0.9 + regex.location.confidence) / pop.length;
      expect(res.overallConfidence).toBe(Number(mean.toFixed(2)));
    }
    expect(res.rawTranscript).toBe(text);
  });

  it('worked check: 2 LLM + 0.85 regex => 0.88; pure-LLM 2/6 => 0.30', () => {
    const text = 't';
    const regex = runRegex('identity', '   ');
    const fakeRegex = {
      ...regex,
      location: { value: 'Bastar', confidence: 0.85, flag: 'low_confidence' as const },
    };
    const llm = {
      name: 'Ramesh Kumar', phone: '9876543210', artisanId: null,
      location: null, craft: null, pin: null,
    };
    const mixed = buildResult('identity', text, llm as never, fakeRegex as never);
    expect(mixed.overallConfidence).toBe(0.88);
    const pure = buildResult('identity', text, llm as never, regex);
    expect(pure.overallConfidence).toBe(0.3);
  });

  it('invalid LLM phone nulls to missing/regex fill, never a bogus value', () => {
    const text = 'Call 9876543210 in Bastar.';
    const regex = runRegex('identity', text);
    const llm = {
      name: null, phone: '12345', artisanId: null, location: null, craft: null, pin: null,
    };
    const res = buildResult('identity', text, llm as never, regex);
    // '12345' normalizes to null so phone must come from regex or be missing — never '12345'
    expect(res.phone.value).not.toBe('12345');
  });
});

describe('extract core: system prompt + result schema', () => {
  it('prompt contains rules, vocab labels, kind field list and closing line', () => {
    const sys = buildSystemPrompt('identity');
    expect(sys).toMatch(/Reply with a single JSON object and nothing else/);
    expect(sys).toMatch(/follow all eight/);
    expect(sys).toMatch(/Handloom & Weaving/);
    expect(sys).toMatch(/River clay/);
    expect(sys).toMatch(/artisanId/);
    expect(sys).toMatch(/one JSON object, every key present/);
    const prod = buildSystemPrompt('product');
    expect(prod).toMatch(/productName/);
    expect(prod).toMatch(/materials/);
  });

  it('extractResultSchema parses a built result structurally', () => {
    const regex = runRegex('identity', '   ');
    const res = buildResult('identity', '   ', null, regex);
    expect(extractResultSchema('identity').safeParse(res).success).toBe(true);
    const pRegex = runRegex('product', 'Handmade item.');
    const pRes = buildResult('product', 'Handmade item.', null, pRegex);
    expect(extractResultSchema('product').safeParse(pRes).success).toBe(true);
  });
});

describe('extract core: runExtractionChain advance semantics', () => {
  const OLD_FETCH = global.fetch;

  beforeEach(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    global.fetch = OLD_FETCH;
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  function okPayload(kind: string) {
    const content =
      kind === 'identity'
        ? JSON.stringify({
            name: 'Ramesh Kumar', phone: '9876543210', artisanId: null,
            location: 'Bastar', craft: null, pin: null,
          })
        : JSON.stringify({
            productName: 'Saree', materials: ['Silk'], makingProcess: null,
            usage: null, timeRequired: null, craftCategory: null, description: null,
          });
    return { choices: [{ message: { content } }] };
  }

  it(`per-attempt budget is ${ATTEMPT_TIMEOUT_MS}ms`, () => {
    expect(ATTEMPT_TIMEOUT_MS).toBe(8000);
  });

  it('advances past 429 to the next attempt (one fetch per attempt, no retry)', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (url: unknown, init?: { body?: unknown }) => {
      calls.push(String(url));
      const body = JSON.parse(String((init?.body as string) ?? '{}'));
      if (calls.length === 1) return new Response('limited', { status: 429 });
      return new Response(JSON.stringify(okPayload('identity')), { status: 200 });
    }) as unknown as typeof fetch;
    const { llm, attempts } = await runExtractionChain({
      text: 'My name is Ramesh Kumar. Phone 9876543210 in Bastar.',
      kind: 'identity',
      attempts: [
        { url: 'https://a.test/v1', model: 'm-1', apiKey: 'k1', provider: 'p1' },
        { url: 'https://b.test/v1', model: 'm-2', apiKey: 'k2', provider: 'p2' },
      ],
      deadlineAt: Date.now() + 25000,
    });
    expect(calls).toHaveLength(2);
    expect(attempts.map((a) => a.outcome)).toEqual(['rate_limited', 'ok']);
    expect(llm).not.toBeNull();
  });

  it('advances past Zod validation failure to regex-served null', async () => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ phone: 123 }) } }] }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;
    const { llm, attempts } = await runExtractionChain({
      text: 'hello',
      kind: 'identity',
      attempts: [{ url: 'https://a.test/v1', model: 'm-1', apiKey: 'k1', provider: 'p1' }],
      deadlineAt: Date.now() + 25000,
    });
    expect(llm).toBeNull();
    expect(attempts.map((a) => a.outcome)).toEqual(['validation']);
  });

  it('skips the chain when remaining budget is under a second (zero fetches)', async () => {
    const spy = jest.fn(async () => new Response('{}', { status: 200 }));
    global.fetch = spy as unknown as typeof fetch;
    const { llm, attempts } = await runExtractionChain({
      text: 'hello',
      kind: 'identity',
      attempts: [{ url: 'https://a.test/v1', model: 'm-1', apiKey: 'k1', provider: 'p1' }],
      deadlineAt: Date.now() + 500,
    });
    expect(spy).not.toHaveBeenCalled();
    expect(llm).toBeNull();
    expect(attempts).toEqual([]);
  });

  it('aborts a hanging attempt via global setTimeout (fake timers) and advances', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(
      (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    ) as unknown as typeof fetch;
    const pending = runExtractionChain({
      text: 'hello',
      kind: 'identity',
      attempts: [{ url: 'https://a.test/v1', model: 'm-1', apiKey: 'k1', provider: 'p1' }],
      deadlineAt: Date.now() + 25000,
    });
    await jest.advanceTimersByTimeAsync(8100);
    const { llm, attempts } = await pending;
    expect(llm).toBeNull();
    expect(attempts.map((a) => a.outcome)).toEqual(['timeout']);
  });
});
