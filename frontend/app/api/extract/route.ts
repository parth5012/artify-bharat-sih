import { NextResponse } from 'next/server';
import { jsonError } from '@/backend/http';
import {
  ExtractRequestSchema,
  buildResult,
  runExtractionChain,
  runRegex,
  type ExtractionAttempt,
} from '@/lib/extract';

export const runtime = 'nodejs';

const REQUEST_BUDGET_MS = 26_000;
const MAX_TEXT_CHARS = 4_000;

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_MODEL_20B = 'openai/gpt-oss-20b';
const GROQ_MODEL_120B = 'openai/gpt-oss-120b';
const OPENROUTER_MODEL_DEFAULT = 'qwen/qwen3.8-27b:free';

/** Only place provider env is read (server-only, under app/api/**). */
function buildAttempts(): ExtractionAttempt[] {
  const out: ExtractionAttempt[] = [];
  const groqKey = process.env.GROQ_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const openrouterModel = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT;
  if (groqKey) {
    out.push({ url: GROQ_BASE_URL, model: GROQ_MODEL_20B, apiKey: groqKey, provider: 'groq' });
    out.push({ url: GROQ_BASE_URL, model: GROQ_MODEL_120B, apiKey: groqKey, provider: 'groq' });
  }
  if (openrouterKey) {
    out.push({
      url: OPENROUTER_BASE_URL,
      model: openrouterModel,
      apiKey: openrouterKey,
      provider: 'openrouter',
    });
  }
  return out;
}

function withId(res: NextResponse, reqId: string): NextResponse {
  res.headers.set('x-request-id', reqId);
  return res;
}

export async function POST(request: Request): Promise<Response> {
  const reqId = crypto.randomUUID();
  try {
    const body = await request.json().catch(() => null);
    const parsed = ExtractRequestSchema.safeParse(body);
    if (!parsed.success) {
      return withId(jsonError('Invalid request: text and kind are required.'), reqId);
    }

    const { text, kind } = parsed.data;
    if (text.length > MAX_TEXT_CHARS) {
      return withId(jsonError('Text exceeds 4000 characters.', 413), reqId);
    }

    const deadlineAt = Date.now() + REQUEST_BUDGET_MS;
    const empty = text.trim() === '';
    // Regex always runs first (§4a step 1); flags forced low_confidence inside runRegex.
    const regex =
      kind === 'identity' ? runRegex('identity', text) : runRegex('product', text);
    const attempts = empty ? [] : buildAttempts();
    const { llm, attempts: attemptLog } = empty
      ? { llm: null, attempts: [] as never[] }
      : await runExtractionChain({ text, kind, attempts, deadlineAt });
    const result =
      kind === 'identity'
        ? buildResult('identity', text, llm as never, regex as never)
        : buildResult('product', text, llm as never, regex as never);

    let fromLLM = 0;
    let fromRegex = 0;
    let missing = 0;
    let populated = 0;
    for (const [k, f] of Object.entries(result)) {
      if (k === 'rawTranscript' || k === 'overallConfidence') continue;
      const field = f as { value: unknown; flag: string };
      if (field.value !== null) populated += 1;
      if (field.flag === 'verified') fromLLM += 1;
      else if (field.flag === 'low_confidence') fromRegex += 1;
      else missing += 1;
    }
    const served = llm !== null ? 'llm' : populated > 0 ? 'regex' : 'none';

    for (const a of attemptLog) {
      if (a.outcome === 'config') {
        console.warn('[extract] provider config error', { provider: a.provider, model: a.model });
      }
    }
    // PII-free: inputChars length only, never raw text or field values.
    console.info(
      '[extract]',
      JSON.stringify({
        reqId,
        kind,
        inputChars: text.length,
        attempts: attemptLog,
        served,
        fromLLM,
        fromRegex,
        missing,
        overallConfidence: (result as { overallConfidence: number }).overallConfidence,
      }),
    );
    return withId(NextResponse.json(result), reqId);
  } catch {
    return withId(jsonError('Extraction failed.', 500), reqId);
  }
}
