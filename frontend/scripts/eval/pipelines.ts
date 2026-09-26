/**
 * Eval pipelines — the executables the harness scores.
 *
 *   regex   deterministic, offline, keyless (the enrichment floor, §4a step 1)
 *   canned  replays the record's canned provider payload — offline "model" lane
 *   llm     the real bounded provider chain (§3) — requires a key, network
 *
 * Provider constants mirror `app/api/extract/route.ts`; they are duplicated on
 * purpose because the route cannot be imported here (its `@/` path aliases are
 * not rewritten at emit time).
 */
import {
  buildResult,
  runExtractionChain,
  runRegex,
  type AttemptLogEntry,
  type ExtractKind,
  type IdentityLlmPayload,
  type LlmPayload,
  type ProductLlmPayload,
} from '../../lib/extract';
import type {
  ArtisanExtractionResult as IdentityResult,
  ProductExtractionResult,
} from '../../lib/nlp';
import type {EvalRecord} from './schema';

export type PipelineName = 'regex' | 'canned' | 'llm';
export type Served = 'llm' | 'regex' | 'none';

export interface PipelineRun {
  result: IdentityResult | ProductExtractionResult;
  ms: number;
  served: Served;
  attempts: AttemptLogEntry[];
}

export interface Pipeline {
  name: PipelineName;
  run(record: EvalRecord): Promise<PipelineRun>;
}

/** Record has no canned payload for the `canned` lane. */
export class PipelineSkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PipelineSkipError';
  }
}

/** Misconfigured invocation (e.g. `--pipeline llm` with no provider key). */
export class PipelineConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PipelineConfigError';
  }
}

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_MODEL_20B = 'openai/gpt-oss-20b';
const GROQ_MODEL_120B = 'openai/gpt-oss-120b';
const OPENROUTER_MODEL_DEFAULT = 'qwen/qwen3.8-27b:free';
const REQUEST_BUDGET_MS = 26_000;

interface AttemptSpec {
  url: string;
  model: string;
  apiKey: string;
  provider: string;
}

/** Same env/attempt rules as the route (§3) — the only place env is read. */
function buildAttempts(): AttemptSpec[] {
  const out: AttemptSpec[] = [];
  const groqKey = process.env.GROQ_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const openrouterModel = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_DEFAULT;
  if (groqKey) {
    out.push({url: GROQ_BASE_URL, model: GROQ_MODEL_20B, apiKey: groqKey, provider: 'groq'});
    out.push({url: GROQ_BASE_URL, model: GROQ_MODEL_120B, apiKey: groqKey, provider: 'groq'});
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

function runRegexFor(
  kind: ExtractKind,
  text: string
): IdentityResult | ProductExtractionResult {
  return kind === 'identity' ? runRegex('identity', text) : runRegex('product', text);
}

function buildFor(
  kind: ExtractKind,
  text: string,
  llm: LlmPayload | null,
  regex: IdentityResult | ProductExtractionResult
): IdentityResult | ProductExtractionResult {
  if (kind === 'identity') {
    return buildResult('identity', text, (llm ?? null) as IdentityLlmPayload | null, regex as IdentityResult);
  }
  return buildResult('product', text, (llm ?? null) as ProductLlmPayload | null, regex as ProductExtractionResult);
}

function populatedCount(result: unknown): number {
  const record = result as Record<string, unknown>;
  let n = 0;
  for (const value of Object.values(record)) {
    if (value !== null && typeof value === 'object' && 'value' in value) {
      const field = value as {value: unknown};
      if (field.value !== null && field.value !== undefined) n += 1;
    }
  }
  return n;
}

function serve(llm: LlmPayload | null, result: unknown): Served {
  if (llm !== null) return 'llm';
  return populatedCount(result) > 0 ? 'regex' : 'none';
}

function finish(
  record: EvalRecord,
  llm: LlmPayload | null,
  regex: IdentityResult | ProductExtractionResult,
  attempts: AttemptLogEntry[],
  startedAt: number
): PipelineRun {
  const result = buildFor(record.kind, record.input, llm, regex);
  return {result, ms: Date.now() - startedAt, served: serve(llm, result), attempts};
}

function regexPipeline(): Pipeline {
  return {
    name: 'regex',
    async run(record: EvalRecord): Promise<PipelineRun> {
      const startedAt = Date.now();
      return finish(record, null, runRegexFor(record.kind, record.input), [], startedAt);
    },
  };
}

function cannedPipeline(): Pipeline {
  return {
    name: 'canned',
    async run(record: EvalRecord): Promise<PipelineRun> {
      const startedAt = Date.now();
      // Empty input skips the provider stage in both lanes (§2) — the payload
      // documents what a conforming model would have returned, it is not used.
      if (record.input.trim() === '') {
        return finish(record, null, runRegexFor(record.kind, record.input), [], startedAt);
      }
      if (record.llm === undefined) {
        throw new PipelineSkipError(
          `record "${record.id}" has no canned llm payload — add one or use --pipeline regex`
        );
      }
      return finish(
        record,
        record.llm,
        runRegexFor(record.kind, record.input),
        [{provider: 'canned', model: 'fixture', outcome: 'ok', ms: 0}],
        startedAt
      );
    },
  };
}

function llmPipeline(): Pipeline {
  return {
    name: 'llm',
    async run(record: EvalRecord): Promise<PipelineRun> {
      const startedAt = Date.now();
      const regex = runRegexFor(record.kind, record.input);
      if (record.input.trim() === '') {
        return finish(record, null, regex, [], startedAt);
      }
      const attempts = buildAttempts();
      if (attempts.length === 0) {
        throw new PipelineConfigError(
          'no provider key configured — set GROQ_API_KEY or OPENROUTER_API_KEY, ' +
            'or use --pipeline regex (keyless) / --pipeline canned (offline)'
        );
      }
      const {llm, attempts: log} = await runExtractionChain({
        text: record.input,
        kind: record.kind,
        attempts,
        deadlineAt: Date.now() + REQUEST_BUDGET_MS,
      });
      return finish(record, llm, regex, log, startedAt);
    },
  };
}

export function createPipeline(name: PipelineName): Pipeline {
  switch (name) {
    case 'regex':
      return regexPipeline();
    case 'canned':
      return cannedPipeline();
    case 'llm':
      return llmPipeline();
    default: {
      const never: never = name;
      throw new PipelineConfigError(`unknown pipeline "${String(never)}"`);
    }
  }
}

export const PIPELINE_NAMES: readonly PipelineName[] = ['regex', 'canned', 'llm'];
