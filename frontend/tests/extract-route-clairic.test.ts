/** Route-level proof that Clairic is the primary /api/extract provider. */
import { POST } from '../app/api/extract/route';

const TEXT = 'Ramesh Kumar, phone 9876543210, from Bastar. ART-2041.';
const IDENTITY = {
  name: 'Ramesh Kumar', phone: '9876543210', artisanId: 'ART-2041',
  location: 'Bastar', craft: null, pin: null,
};

const cfOk = () => new Response(JSON.stringify({
  result: {
    answers: Object.fromEntries(
      Object.entries(IDENTITY).map(([k, v]) => [k, { type: 'text', value: v, confidence: 0.95 }])
    ),
  },
  success: true,
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

const groqOk = () => new Response(JSON.stringify({
  choices: [{ message: { content: JSON.stringify(IDENTITY) } }],
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

function stubFetch(responses: Response[]) {
  const calls: string[] = [];
  global.fetch = jest.fn(async (url: unknown) => {
    calls.push(String(url));
    const next = responses.shift();
    if (!next) throw new Error('unexpected extra fetch');
    return next;
  }) as unknown as typeof fetch;
  return calls;
}

function request() {
  return new Request('http://localhost/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: TEXT, kind: 'identity' }),
  });
}

const ENV_KEYS = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'GROQ_API_KEY', 'OPENROUTER_API_KEY'];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('POST /api/extract — Clairic primary provider', () => {
  it('calls Clairic first and never reaches Groq when it succeeds', async () => {
    process.env.CLOUDFLARE_API_TOKEN = 'tok';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'acct';
    process.env.GROQ_API_KEY = 'groq-key'; // detects an unintended fallback after Clairic succeeds
    const calls = stubFetch([cfOk()]);

    const res = await POST(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(body.name).toEqual({ value: 'Ramesh Kumar', confidence: 0.9, flag: 'verified' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('/ai/run/@cf/cloudflare/clairic');
  });

  it('falls back to the Groq chain when Clairic errors', async () => {
    process.env.CLOUDFLARE_API_TOKEN = 'tok';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'acct';
    process.env.GROQ_API_KEY = 'groq-key';
    const calls = stubFetch([
      new Response('{}', { status: 401 }),
      groqOk(),
    ]);

    const res = await POST(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.phone.value).toBe('9876543210');
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('@cf/cloudflare/clairic');
    expect(calls[1]).toContain('api.groq.com');
  });

  it('stays keyless-safe: regex result when neither Clairic nor chat keys are set', async () => {
    const calls = stubFetch([]);
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(0);
    expect((await res.json()).rawTranscript).toBe(TEXT);
  });
});
