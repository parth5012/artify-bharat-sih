/**
 * TDD suite for Clairic typed extraction (Cloudflare Workers AI) in /api/extract.
 *
 * Clairic is grounded extraction: it takes `state` + `fields` and returns typed
 * values with spans/confidence. It is NOT a chat-completions provider, so it
 * needs its own adapter before the existing Groq/OpenRouter chain.
 */
import {
  buildClairicFields,
  CLAIRIC_MODEL,
  CLAIRIC_FLASH_MODEL,
  runClairicExtraction,
  type ClairicConfig,
} from '../lib/extract';

const nativeFetch = global.fetch;
afterEach(() => {
  // clearMocks resets call history but does not restore global.fetch stubs.
  global.fetch = nativeFetch;
});

const CF: ClairicConfig = { accountId: 'acct-1', apiToken: 'tok-1', model: CLAIRIC_MODEL };
const TEXT = 'Ramesh Kumar, phone 9876543210, from Bastar. Artisan ID ART-2041.';

function envelope(answers: Record<string, { value?: unknown; confidence?: number }>) {
  return {
    result: {
      model: 'clairic-27b',
      answers: Object.fromEntries(
        Object.entries(answers).map(([k, v]) => [k, { type: 'text', value: v.value ?? null, ...v }])
      ),
      usage: { input_tokens: 500, passes: 3 },
    },
    success: true,
  };
}

function stubFetch(impl: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  global.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), init: init as RequestInit });
    return impl(String(url), init as RequestInit);
  }) as unknown as typeof fetch;
  return calls;
}

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('buildClairicFields', () => {
  it('maps identity to grounded typed fields with all six keys', () => {
    const fields = buildClairicFields('identity');
    expect(Object.keys(fields).sort()).toEqual(
      ['artisanId', 'craft', 'location', 'name', 'phone', 'pin'].sort()
    );
    expect(fields.name).toMatchObject({ type: 'text' });
    expect(fields.name.instructions).toContain('Copy exactly');
    expect(fields.phone.type).toBe('text');
    expect(fields.pin.instructions).toContain('6-digit');
    // Live Clairic rejects source_only on text fields (number/date types only).
    expect(Object.values(fields).every((f) => !('source_only' in f))).toBe(true);
  });

  it('maps product materials to a bounded list and keeps timeRequired verbatim', () => {
    const fields = buildClairicFields('product');
    expect(Object.keys(fields).sort()).toEqual(
      ['craftCategory', 'description', 'makingProcess', 'materials', 'productName', 'timeRequired', 'usage'].sort()
    );
    expect(fields.materials).toMatchObject({ type: 'list', items: 'text', max_items: 12 });
    expect(fields.timeRequired).toMatchObject({ type: 'text' });
    expect(fields.craftCategory.instructions).toContain('craft');
    expect(Object.values(fields).every((f) => !('source_only' in f))).toBe(true);
  });
});

describe('runClairicExtraction', () => {
  it('calls the Workers AI fields endpoint and maps grounded answers to the payload', async () => {
    const calls = stubFetch(() => okJson(envelope({
      name: { value: 'Ramesh Kumar', confidence: 0.99 },
      phone: { value: '9876543210', confidence: 0.99 },
      artisanId: { value: 'ART-2041', confidence: 0.98 },
      location: { value: 'Bastar', confidence: 0.9 },
      craft: { value: null },
      pin: { value: null },
    })));

    const res = await runClairicExtraction({
      text: TEXT, kind: 'identity', config: CF, deadlineAt: Date.now() + 10_000,
    });

    expect(res.llm).toEqual({
      name: 'Ramesh Kumar', phone: '9876543210', artisanId: 'ART-2041',
      location: 'Bastar', craft: null, pin: null,
    });
    expect(res.attempts).toMatchObject([{ provider: 'clairic', model: CLAIRIC_MODEL, outcome: 'ok' }]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      'https://api.cloudflare.com/client/v4/accounts/acct-1/ai/run/@cf/cloudflare/clairic'
    );
    expect(calls[0].init.headers).toMatchObject({ Authorization: 'Bearer tok-1' });
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.model).toBe(CLAIRIC_MODEL);
    expect(body.state).toBe(TEXT);
    expect(body.fields.name.type).toBe('text');
    expect(body.messages).toBeUndefined();
    expect(body.response_format).toBeUndefined();
  });

  it('uses the flash selector when configured', async () => {
    const calls = stubFetch(() => okJson(envelope({
      name: { value: 'Ramesh Kumar' }, phone: { value: '9876543210' },
      artisanId: { value: null }, location: { value: null }, craft: { value: null }, pin: { value: null },
    })));
    await runClairicExtraction({
      text: TEXT, kind: 'identity', config: { ...CF, model: CLAIRIC_FLASH_MODEL },
      deadlineAt: Date.now() + 10_000,
    });
    expect(calls[0].url.endsWith('@cf/cloudflare/clairic-flash')).toBe(true);
    expect(JSON.parse(String(calls[0].init.body)).model).toBe(CLAIRIC_FLASH_MODEL);
  });

  it('treats absent answers as null and still validates the payload', async () => {
    stubFetch(() => okJson({ result: { answers: {}, usage: {} } }));
    const res = await runClairicExtraction({
      text: TEXT, kind: 'identity', config: CF, deadlineAt: Date.now() + 10_000,
    });
    expect(res.llm).toEqual({
      name: null, phone: null, artisanId: null, location: null, craft: null, pin: null,
    });
    expect(res.attempts[0].outcome).toBe('ok');
  });

  it.each([
    [401, 'config'],
    [429, 'rate_limited'],
    [500, 'server_error'],
  ])('classifies HTTP %i as %s', async (status, outcome) => {
    stubFetch(() => new Response('{}', { status }));
    const res = await runClairicExtraction({
      text: TEXT, kind: 'identity', config: CF, deadlineAt: Date.now() + 10_000,
    });
    expect(res.llm).toBeNull();
    expect(res.attempts[0].outcome).toBe(outcome);
  });

  it('reports bad_response for malformed JSON and validation for wrong field types', async () => {
    stubFetch(() => new Response('not-json', { status: 200 }));
    const bad = await runClairicExtraction({
      text: TEXT, kind: 'identity', config: CF, deadlineAt: Date.now() + 10_000,
    });
    expect(bad.attempts[0].outcome).toBe('bad_response');

    stubFetch(() => okJson(envelope({
      name: { value: 12345 }, phone: { value: null }, artisanId: { value: null },
      location: { value: null }, craft: { value: null }, pin: { value: null },
    })));
    const wrong = await runClairicExtraction({
      text: TEXT, kind: 'identity', config: CF, deadlineAt: Date.now() + 10_000,
    });
    expect(wrong.attempts[0].outcome).toBe('validation');
  });

  it('never puts the transcript in the attempt log', async () => {
    stubFetch(() => okJson(envelope({
      name: { value: 'Ramesh Kumar' }, phone: { value: null }, artisanId: { value: null },
      location: { value: null }, craft: { value: null }, pin: { value: null },
    })));
    const res = await runClairicExtraction({
      text: TEXT, kind: 'identity', config: CF, deadlineAt: Date.now() + 10_000,
    });
    expect(JSON.stringify(res.attempts)).not.toContain('Ramesh');
    expect(JSON.stringify(res.attempts)).not.toContain('9876543210');
  });
});

/**
 * Live proof against Cloudflare Workers AI. Double-gated like extract.live.test.ts:
 * run with EXTRACT_CLAIRIC_LIVE=1 and real CLOUDFLARE_* env values. Never logs text.
 */
const live = process.env.EXTRACT_CLAIRIC_LIVE === '1';
(live ? describe : describe.skip)('LIVE Clairic extraction', () => {
  it('extracts grounded fields from a real artisan transcript', async () => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    expect(accountId).toBeTruthy();
    expect(apiToken).toBeTruthy();

    const res = await runClairicExtraction({
      text: 'मेरा नाम रमेश कुमार है। फ़ोन नंबर 9876543210 है। मैं बस्तर से हूँ। ART-2041.',
      kind: 'identity',
      config: { accountId: accountId as string, apiToken: apiToken as string, model: CLAIRIC_MODEL },
      deadlineAt: Date.now() + 25_000,
    });

    expect(res.attempts).toMatchObject([{ provider: 'clairic', outcome: 'ok' }]);
    const payload = res.llm as { phone?: string | null; artisanId?: string | null } | null;
    expect(payload?.phone).toBe('9876543210');
    expect(payload?.artisanId).toBe('ART-2041');
    expect(JSON.stringify(res.attempts)).not.toContain('रमेश');
  });
});
