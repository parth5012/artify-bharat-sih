/**
 * Eval CLI — load a JSONL dataset, run a pipeline over it, score, report.
 *
 *   npm run eval:regex                       deterministic, keyless
 *   npm run eval:canned                      offline "model" lane
 *   npm run eval:live                        real provider chain (needs a key)
 *   npm run eval -- --dataset … --min-f1 0.8 --verbose
 *
 * Exit codes: 0 pass · 1 threshold or per-record error · 2 usage · 3 dataset/runner.
 */
import {existsSync} from 'fs';
import path from 'path';
import {filterRecords, loadDataset} from './dataset';
import {loadEnvLocal} from './env';
import {computeRecordMetrics, type FieldFlag, type RecordMetrics} from './metrics';
import {
  PIPELINE_NAMES,
  PipelineConfigError,
  PipelineSkipError,
  createPipeline,
  type PipelineName,
} from './pipelines';
import {fromAppRoot} from './paths';
import {
  buildReport,
  formatMarkdown,
  formatTable,
  writeReport,
  type EvalReport,
  type EvalReportResult,
  type ThresholdSpec,
  type WrittenReport,
} from './report';
import {allFieldsFor, scoredFieldsFor, type EvalRecord} from './schema';

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

const THRESHOLD_METRICS = [
  'accuracy',
  'precision',
  'recall',
  'f1',
  'exact',
  'hallucination',
  'miss',
  'trusterror',
  'lowconferror',
  'catchrate',
] as const;

export interface RunOptions {
  dataset: string;
  pipeline: PipelineName;
  kind?: 'identity' | 'product';
  language?: string;
  tags: string[];
  limit?: number;
  strict: boolean;
  verbose: boolean;
  json: boolean;
  out: string;
  thresholds: ThresholdSpec[];
  help: boolean;
}

export const DEFAULT_OPTIONS: RunOptions = {
  dataset: 'eval/datasets/golden-v1.jsonl',
  pipeline: 'regex',
  tags: [],
  strict: false,
  verbose: false,
  json: false,
  out: '.tmp/eval',
  thresholds: [],
  help: false,
};

export const USAGE = `Usage: eval [options]

Options:
  --dataset <path>        JSONL dataset (default: eval/datasets/golden-v1.jsonl)
  --pipeline <name>       ${PIPELINE_NAMES.join(' | ')} (default: regex)
  --kind <identity|product>  filter by kind
  --language <code>       filter by language tag (en | hi | hien)
  --tag <tag>             filter by tag (repeatable)
  --limit <n>             score at most n records
  --strict                exact string comparison (no case/space normalization)
  --verbose               include gold/prediction values in the written report
  --json                  print the JSON report instead of the table
  --out <dir>             report directory (default: .tmp/eval)
  --min-<metric> <n>      gate: metric must be >= n
  --max-<metric> <n>      gate: metric must be <= n
                          metrics: ${THRESHOLD_METRICS.join(', ')}
  -h, --help              show this help

Exit codes: 0 pass · 1 threshold/record error · 2 usage · 3 dataset/runner`;

function requireValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new UsageError(`${flag} requires a value`);
  }
  return value;
}

function parseNumber(raw: string, flag: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new UsageError(`${flag} expects a number, got "${raw}"`);
  return value;
}

export function parseArgs(argv: readonly string[]): RunOptions {
  const options: RunOptions = {...DEFAULT_OPTIONS, thresholds: [], tags: []};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] as string;
    switch (flag) {
      case '--dataset':
        options.dataset = requireValue(argv, i++, flag);
        break;
      case '--pipeline': {
        const value = requireValue(argv, i++, flag) as PipelineName;
        if (!PIPELINE_NAMES.includes(value)) {
          throw new UsageError(
            `--pipeline must be one of: ${PIPELINE_NAMES.join(', ')} (got "${value}")`
          );
        }
        options.pipeline = value;
        break;
      }
      case '--kind': {
        const value = requireValue(argv, i++, flag);
        if (value !== 'identity' && value !== 'product') {
          throw new UsageError(`--kind must be identity or product (got "${value}")`);
        }
        options.kind = value;
        break;
      }
      case '--language':
        options.language = requireValue(argv, i++, flag);
        break;
      case '--tag':
        options.tags.push(requireValue(argv, i++, flag));
        break;
      case '--limit': {
        const value = parseNumber(requireValue(argv, i++, flag), flag);
        if (!Number.isInteger(value) || value < 1) {
          throw new UsageError('--limit expects a positive integer');
        }
        options.limit = value;
        break;
      }
      case '--strict':
        options.strict = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--out':
        options.out = requireValue(argv, i++, flag);
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      default: {
        const min = flag.match(/^--min-([a-z0-9]+)$/);
        const max = flag.match(/^--max-([a-z0-9]+)$/);
        const match = min ?? max;
        if (match) {
          const metric = match[1] ?? '';
          if (!(THRESHOLD_METRICS as readonly string[]).includes(metric)) {
            throw new UsageError(
              `unknown metric "${metric}" for ${flag}; expected one of: ${THRESHOLD_METRICS.join(', ')}`
            );
          }
          const limit = parseNumber(requireValue(argv, i, flag), flag);
          options.thresholds.push({
            name: metric,
            bound: min ? 'min' : 'max',
            limit,
          });
          i += 1;
          break;
        }
        throw new UsageError(`unknown flag "${flag}" (try --help)`);
      }
    }
  }
  return options;
}

function resolveDataset(raw: string): string {
  if (path.isAbsolute(raw)) return raw;
  const fromCwd = path.resolve(process.cwd(), raw);
  if (existsSync(fromCwd)) return fromCwd;
  return fromAppRoot(raw);
}

function resolveOut(raw: string): string {
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

/**
 * Flatten a result object (`{field: {value, confidence, flag}}`) to plain
 * field values — that is what metrics compare against `gold`.
 */
export function toValueMap(result: unknown): Record<string, unknown> {
  const source = (result ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [field, cell] of Object.entries(source)) {
    if (cell !== null && typeof cell === 'object' && 'value' in cell) {
      out[field] = (cell as {value: unknown}).value;
    }
  }
  return out;
}

/**
 * Keep the trust metadata (`flag` + `confidence`) that `toValueMap` discards —
 * the eval cannot measure calibration (spec §4) without it.
 */
export interface FieldMeta {
  flag: FieldFlag;
  confidence: number;
}

const VALID_FLAGS: readonly string[] = ['missing', 'low_confidence', 'verified'];

export function toFlagMap(result: unknown): Record<string, FieldMeta> {
  const source = (result ?? {}) as Record<string, unknown>;
  const out: Record<string, FieldMeta> = {};
  for (const [field, cell] of Object.entries(source)) {
    if (cell === null || typeof cell !== 'object' || !('value' in cell)) continue;
    const flag = (cell as {flag?: unknown}).flag;
    if (typeof flag !== 'string' || !VALID_FLAGS.includes(flag)) continue; // never invent a flag
    const confidence = (cell as {confidence?: unknown}).confidence;
    out[field] = {flag: flag as FieldFlag, confidence: typeof confidence === 'number' ? confidence : 0};
  }
  return out;
}

function toFlags(meta: Record<string, FieldMeta>): Record<string, FieldFlag> {
  const out: Record<string, FieldFlag> = {};
  for (const [field, m] of Object.entries(meta)) out[field] = m.flag;
  return out;
}

export function toReportResult(
  record: EvalRecord,
  metrics: RecordMetrics,
  served: 'llm' | 'regex' | 'none',
  ms: number,
  pred: Record<string, unknown>,
  meta: Record<string, FieldMeta>,
  verbose: boolean
): EvalReportResult {
  const result: EvalReportResult = {
    id: record.id,
    kind: record.kind,
    language: record.language,
    served,
    ms,
    exactMatch: metrics.exactMatch,
    scorable: metrics.scorable,
    counts: metrics.counts,
    outcomes: metrics.outcomes,
  };
  if (verbose) {
    result.fields = Object.entries(metrics.outcomes).map(([field, outcome]) => ({
      field,
      gold: record.gold[field] ?? null,
      pred: pred[field] ?? null,
      outcome,
      flag: meta[field]?.flag,
      confidence: meta[field]?.confidence,
    }));
  }
  return result;
}

export interface EvalRunOutcome {
  report: EvalReport | null;
  exitCode: number;
  written: WrittenReport | null;
  /** Human-readable failure when the run could not produce a report. */
  fatal?: string;
}

export async function runEval(options: RunOptions): Promise<EvalRunOutcome> {
  let records: EvalRecord[];
  try {
    records = filterRecords(loadDataset(resolveDataset(options.dataset)), {
      kind: options.kind,
      language: options.language,
      tag: options.tags,
      limit: options.limit,
    });
  } catch (e) {
    return {report: null, exitCode: 3, written: null, fatal: e instanceof Error ? e.message : String(e)};
  }

  const pipeline = createPipeline(options.pipeline);
  const scored: RecordMetrics[] = [];
  const all: RecordMetrics[] = [];
  const results: EvalReportResult[] = [];
  const errors: {id: string; message: string}[] = [];
  const skipped: {id: string; reason: string}[] = [];

  for (const record of records) {
    let run;
    try {
      run = await pipeline.run(record);
    } catch (e) {
      if (e instanceof PipelineSkipError) {
        skipped.push({id: record.id, reason: e.message});
        continue;
      }
      if (e instanceof PipelineConfigError) {
        return {report: null, exitCode: 3, written: null, fatal: e.message};
      }
      errors.push({id: record.id, message: e instanceof Error ? e.message : String(e)});
      continue;
    }

    const pred = toValueMap(run.result);
    const meta = toFlagMap(run.result);
    const common = {
      id: record.id,
      kind: record.kind,
      language: record.language,
      gold: record.gold,
      pred,
      flags: toFlags(meta),
      ms: run.ms,
      strict: options.strict,
    };
    const scoredMetrics = computeRecordMetrics({...common, fields: scoredFieldsFor(record.kind)});
    scored.push(scoredMetrics);
    all.push(computeRecordMetrics({...common, fields: allFieldsFor(record.kind)}));
    results.push(
      toReportResult(record, scoredMetrics, run.served, run.ms, pred, meta, options.verbose)
    );
  }

  if (results.length === 0) {
    const detail =
      skipped.length > 0
        ? `all ${skipped.length} record(s) were skipped`
        : errors.length > 0
          ? `all ${errors.length} record(s) errored`
          : 'dataset produced no scorable records';
    return {report: null, exitCode: 3, written: null, fatal: detail};
  }

  const report = buildReport({
    dataset: options.dataset,
    pipeline: options.pipeline,
    options: {
      kind: options.kind ?? 'all',
      language: options.language ?? 'all',
      tags: options.tags,
      limit: options.limit ?? null,
      strict: options.strict,
      verbose: options.verbose,
    },
    scored,
    all,
    results,
    errors,
    skipped,
    thresholds: options.thresholds,
  });

  const written = writeReport(report, resolveOut(options.out));
  const exitCode = report.passed && errors.length === 0 ? 0 : 1;
  return {report, exitCode, written};
}

async function main(argv: string[]): Promise<number> {
  let options: RunOptions;
  try {
    options = parseArgs(argv);
  } catch (e) {
    console.error(`[eval] ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }
  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  // Mirror Next.js: pick up frontend/.env.local before the pipeline reads env.
  const env = loadEnvLocal();
  if (env.loaded.length > 0) {
    console.error(`[eval] .env.local: loaded ${env.loaded.join(', ')}`);
  }

  const outcome = await runEval(options);
  const {report, written} = outcome;
  if (report === null || written === null) {
    console.error(`[eval] ${outcome.fatal ?? 'run failed'}`);
    return outcome.exitCode;
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatTable(report));
    console.log('');
    console.log(`report: ${path.relative(process.cwd(), written.jsonPath)}`);
    console.log(`        ${path.relative(process.cwd(), written.mdPath)}`);
  }
  return outcome.exitCode;
}

const isMain =
  typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module;
if (isMain) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((e: unknown) => {
      console.error(`[eval] unexpected failure: ${e instanceof Error ? e.message : String(e)}`);
      process.exitCode = 3;
    });
}

export {formatMarkdown, formatTable};
