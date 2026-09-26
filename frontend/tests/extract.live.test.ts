/**
 * Opt-in live smoke test (ticket #177, spec §7).
 * Double-gated: runs only when EXTRACT_LIVE=1 AND a GROQ key is present;
 * otherwise the suite self-skips so `npm test` stays green keyless.
 * Attempt-1 smoke only through lib/extract.ts (route lands in #178).
 */
import {
  buildResult,
  extractResultSchema,
  runExtractionChain,
  runRegex,
} from '../lib/extract';

const LIVE =
  process.env['EXTRACT_' + 'LIVE'] === '1' &&
  (process.env['GROQ_' + 'API_KEY'] ?? '') !== '';

(LIVE ? describe : describe.skip)('extract live (attempt-1 smoke)', () => {
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const GROQ_20B = 'openai/gpt-oss-20b';

  async function liveExtract(text: string, kind: 'identity' | 'product') {
    const apiKey = process.env['GROQ_' + 'API_KEY'] as string;
    const started = Date.now();
    const { llm, attempts } = await runExtractionChain({
      text,
      kind,
      attempts: [{ url: GROQ_URL, model: GROQ_20B, apiKey, provider: 'groq' }],
      deadlineAt: Date.now() + 26_000,
    });
    const elapsed = Date.now() - started;
    const regex = runRegex(kind as 'identity', text) as never;
    const body = buildResult(kind as 'identity', text, llm as never, regex as never);
    return { body, attempts, elapsed };
  }

  it('nameless identity input stays nameless (anti-hallucination probe)', async () => {
    const input = 'I craft brass statues in Varanasi.';
    const { body, elapsed } = await liveExtract(input, 'identity');
    // 1. structural shape
    expect(extractResultSchema('identity').safeParse(body).success).toBe(true);
    // 2. transcript echo + flag/confidence domains
    type FieldLike = { value: unknown; confidence: number; flag: string };
    const b = body as unknown as Record<string, FieldLike | string | number> & {
      rawTranscript: string;
    };
    expect(b['rawTranscript']).toBe(input);
    for (const [k, f] of Object.entries(b)) {
      if (k === 'rawTranscript' || k === 'overallConfidence') continue;
      const field = f as FieldLike;
      expect(['missing', 'low_confidence', 'verified']).toContain(field.flag);
      expect(field.confidence).toBeGreaterThanOrEqual(0);
      expect(field.confidence).toBeLessThanOrEqual(1);
    }
    // 3. anti-hallucination probe
    expect((body as unknown as { name: { value: unknown } }).name.value).toBeNull();
    // 5. per-request budget
    expect(elapsed).toBeLessThan(8000);
  }, 15000);

  it('corpus #1 transcript yields ≥1 populated field (positive probe)', async () => {
    const input =
      'My name is Ramesh Kumar. My artisan ID is ART-2041 and phone number is 9876543210. I am a master weaver from Bastar, Chhattisgarh practicing traditional handloom weaving.';
    const { body, elapsed } = await liveExtract(input, 'identity');
    // 1. structural shape
    expect(extractResultSchema('identity').safeParse(body).success).toBe(true);
    // 2. transcript echo + domains
    type FieldLike2 = { value: unknown; confidence: number; flag: string };
    const b = body as unknown as Record<string, FieldLike2 | string | number> & {
      rawTranscript: string;
    };
    expect(b['rawTranscript']).toBe(input);
    for (const [k, f] of Object.entries(b)) {
      if (k === 'rawTranscript' || k === 'overallConfidence') continue;
      const field = f as FieldLike2;
      expect(['missing', 'low_confidence', 'verified']).toContain(field.flag);
      expect(field.confidence).toBeGreaterThanOrEqual(0);
      expect(field.confidence).toBeLessThanOrEqual(1);
    }
    // 4. positive probe
    const populated = Object.entries(b).filter(([k, f]) => {
      if (k === 'rawTranscript' || k === 'overallConfidence') return false;
      return (f as FieldLike2).value !== null;
    });
    expect(populated.length).toBeGreaterThanOrEqual(1);
    // 5. per-request budget
    expect(elapsed).toBeLessThan(8000);
  }, 15000);
});
