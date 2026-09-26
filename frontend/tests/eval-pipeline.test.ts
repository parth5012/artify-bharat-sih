/**
 * Eval pipelines — regex / canned / llm runners (TDD red first).
 * Keyless by default: every test passes with GROQ/OPENROUTER keys absent.
 */
import {
  PipelineConfigError,
  PipelineSkipError,
  createPipeline,
} from '../scripts/eval/pipelines';
import {extractResultSchema} from '../lib/extract';
import type {
  ArtisanExtractionResult,
  ProductExtractionResult,
} from '../lib/nlp';
import type {EvalRecord} from '../scripts/eval/schema';
import type {PipelineRun} from '../scripts/eval/pipelines';

/** Narrow the union for assertions — the record kind is fixed per test. */
function identityRun(run: PipelineRun): ArtisanExtractionResult {
  return run.result as ArtisanExtractionResult;
}
function productRun(run: PipelineRun): ProductExtractionResult {
  return run.result as ProductExtractionResult;
}

const IDENTITY_INPUT =
  'My name is Ramesh Kumar. My artisan ID is ART-2041 and phone number is 9876543210. ' +
  'I am a master weaver from Bastar, Chhattisgarh practicing traditional handloom weaving.';

const EMPTY_IDENTITY_GOLD = {
  name: null,
  phone: null,
  artisanId: null,
  location: null,
  craft: null,
  pin: null,
};

function identityRecord(over: Partial<EvalRecord> = {}): EvalRecord {
  return {
    id: 'identity-en-full',
    kind: 'identity',
    input: IDENTITY_INPUT,
    inputSource: 'transcript',
    tags: [],
    gold: {
      name: 'Ramesh Kumar',
      phone: '9876543210',
      artisanId: 'ART-2041',
      location: 'Bastar, Chhattisgarh',
      craft: 'Handloom & Weaving',
      pin: null,
    },
    ...over,
  };
}

function productRecord(over: Partial<EvalRecord> = {}): EvalRecord {
  return {
    id: 'product-en-dhokra',
    kind: 'product',
    input: 'Handmade item.',
    inputSource: 'transcript',
    tags: [],
    gold: {
      productName: null,
      materials: null,
      makingProcess: null,
      usage: null,
      timeRequired: null,
      craftCategory: null,
      description: 'Handmade item.',
    },
    ...over,
  };
}

const originalFetch = globalThis.fetch;

function stubFetch(payload: unknown): {calls: string[]; fn: jest.Mock} {
  const calls: string[] = [];
  const fn = jest.fn(async (url: unknown) => {
    calls.push(String(url));
    return new Response(
      JSON.stringify({choices: [{message: {content: JSON.stringify(payload)}}]}),
      {status: 200, headers: {'Content-Type': 'application/json'}}
    );
  });
  globalThis.fetch = fn as unknown as typeof fetch;
  return {calls, fn};
}

beforeEach(() => {
  delete process.env['GROQ_' + 'API_KEY'];
  delete process.env['OPENROUTER_' + 'API_KEY'];
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('pipeline: regex', () => {
  it('fills known fields from the transcript without touching the network', async () => {
    const fail = jest.fn(async () => {
      throw new Error('regex pipeline must never call fetch');
    });
    globalThis.fetch = fail as unknown as typeof fetch;

    const run = await createPipeline('regex').run(identityRecord());

    expect(run.served).toBe('regex');
    expect(run.ms).toBeGreaterThanOrEqual(0);
    expect(extractResultSchema('identity').safeParse(run.result).success).toBe(true);
    expect(identityRun(run).rawTranscript).toBe(IDENTITY_INPUT);
    expect(identityRun(run).name.value).toBe('Ramesh Kumar');
    expect(identityRun(run).phone.value).toBe('9876543210');
    expect(identityRun(run).name.flag).toBe('low_confidence'); // regex must never masquerade as verified
    expect(fail).not.toHaveBeenCalled();
  });

  it('returns the all-missing result for empty input (served: none)', async () => {
    const run = await createPipeline('regex').run(identityRecord({input: '', gold: {...EMPTY_IDENTITY_GOLD}}));
    expect(run.served).toBe('none');
    expect(identityRun(run).overallConfidence).toBe(0);
    expect(identityRun(run).name.value).toBeNull();
    expect(identityRun(run).name.flag).toBe('missing');
  });

  it('handles the product kind with a schema-valid result', async () => {
    const run = await createPipeline('regex').run(productRecord());
    expect(run.served).toBe('regex');
    expect(extractResultSchema('product').safeParse(run.result).success).toBe(true);
    expect(productRun(run).rawTranscript).toBe('Handmade item.');
  });
});

describe('pipeline: canned', () => {
  const llm = {
    name: 'Ramesh Kumar',
    phone: '9876543210',
    artisanId: 'ART-2041',
    location: 'Bastar, Chhattisgarh',
    craft: 'Handloom & Weaving',
    pin: null,
  };

  it('replays the record payload as verified fields without the network', async () => {
    const fail = jest.fn(async () => {
      throw new Error('canned pipeline must never call fetch');
    });
    globalThis.fetch = fail as unknown as typeof fetch;

    const run = await createPipeline('canned').run(identityRecord({llm}));

    expect(run.served).toBe('llm');
    expect(identityRun(run).name.flag).toBe('verified');
    expect(identityRun(run).name.confidence).toBe(0.9);
    expect(identityRun(run).pin.flag).toBe('missing'); // payload null, regex finds none
    expect(fail).not.toHaveBeenCalled();
  });

  it('throws PipelineSkipError when the record carries no canned payload', async () => {
    await expect(createPipeline('canned').run(identityRecord())).rejects.toBeInstanceOf(
      PipelineSkipError
    );
  });
});

describe('pipeline: llm', () => {
  it('refuses to start without a provider key, with an actionable message', async () => {
    await expect(createPipeline('llm').run(identityRecord())).rejects.toBeInstanceOf(
      PipelineConfigError
    );
    await expect(createPipeline('llm').run(identityRecord())).rejects.toThrow(/API_KEY/);
  });

  it('serves the first provider attempt when the key is present', async () => {
    process.env['GROQ_' + 'API_KEY'] = 'test-key-not-a-secret';
    const {calls} = stubFetch({
      name: 'Ramesh Kumar',
      phone: '9876543210',
      artisanId: 'ART-2041',
      location: 'Bastar, Chhattisgarh',
      craft: 'Handloom & Weaving',
      pin: null,
    });

    const run = await createPipeline('llm').run(identityRecord());

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('api.groq.com');
    expect(run.served).toBe('llm');
    expect(identityRun(run).name.flag).toBe('verified');
    expect(extractResultSchema('identity').safeParse(run.result).success).toBe(true);
  });

  it('falls back to the regex floor when every attempt fails', async () => {
    process.env['GROQ_' + 'API_KEY'] = 'test-key-not-a-secret';
    globalThis.fetch = jest.fn(async () => new Response('boom', {status: 500})) as unknown as typeof fetch;

    const run = await createPipeline('llm').run(identityRecord());

    expect(run.served).toBe('regex');
    expect(identityRun(run).name.flag).toBe('low_confidence');
    expect(identityRun(run).name.value).toBe('Ramesh Kumar');
  });
});
