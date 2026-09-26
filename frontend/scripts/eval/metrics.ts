/**
 * Eval metrics — per-field outcomes and dataset-level aggregates for
 * transcript → structured extraction pipelines.
 *
 * Definitions (per scored field, gold G vs prediction P):
 *   correct        G and P both non-null and values match
 *   wrong          G and P both non-null, values differ
 *   hallucination  P non-null, G null      (the anti-hallucination invariant)
 *   miss           G non-null, P null
 *   true_negative  both null               (correct abstention — the "No demo values" invariant)
 *
 * precision = correct / (correct + wrong + hallucination)
 * recall    = correct / (correct + wrong + miss)
 * accuracy  = (correct + true_negative) / total   — abstaining on an unstated
 *             field is a correct prediction (the "No demo values" invariant)
 * missRate  = miss / (gold non-null)        — null when there is no gold to miss
 * exact     = a record with zero wrong + hallucination + miss
 */

export type FieldOutcome =
  | 'correct'
  | 'wrong'
  | 'hallucination'
  | 'miss'
  | 'true_negative';

/** Spec §4 provenance/trust vocabulary carried by every populated field. */
export type FieldFlag = 'missing' | 'low_confidence' | 'verified';

/**
 * Calibration tally for one flag, over fields the pipeline actually populated.
 * Null predictions carry flag `missing` and assert nothing, so they never count.
 */
export interface FlagTally {
  predicted: number;
  errors: number;
  errorRate: number | null;
}

export interface RecordCounts {
  correct: number;
  wrong: number;
  hallucination: number;
  miss: number;
  true_negative: number;
  total: number;
}

export interface CompareOptions {
  strict: boolean;
}

const EMPTY_COUNTS = (): RecordCounts => ({
  correct: 0,
  wrong: 0,
  hallucination: 0,
  miss: 0,
  true_negative: 0,
  total: 0,
});

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeArray(value: string[]): string {
  return value
    .map((v) => normalize(v))
    .sort()
    .join('\u0000');
}

/** Value equality under the eval's normalization rules. */
export function compareValues(pred: unknown, gold: unknown, opts: CompareOptions): boolean {
  const a = pred === undefined ? null : pred;
  const b = gold === undefined ? null : gold;
  if (a === null || b === null) return a === b;
  if (typeof a === 'string' && typeof b === 'string') {
    return opts.strict ? a === b : normalize(a) === normalize(b);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (opts.strict) return a.length === b.length && a.every((v, i) => v === b[i]);
    return normalizeArray(a) === normalizeArray(b);
  }
  return false;
}

export interface RecordMetrics {
  id: string;
  kind: string;
  /** Optional slice key — present so aggregates can group by language. */
  language?: string;
  outcomes: Record<string, FieldOutcome>;
  counts: RecordCounts;
  exactMatch: boolean;
  /** True when either side populates at least one field (drives macro averages). */
  scorable: boolean;
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  hallucinationRate: number;
  missRate: number | null;
  ms: number;
  /** Predicted-non-null fields split by the flag they carried (calibration). */
  byFlag: Record<string, FlagTally>;
}

export interface ComputeRecordArgs {
  id: string;
  kind: string;
  language?: string;
  gold: Record<string, unknown>;
  pred: Record<string, unknown>;
  fields: readonly string[];
  ms: number;
  strict: boolean;
  /** Per-field `flag` from the pipeline result; omit when none was captured. */
  flags?: Record<string, FieldFlag>;
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function f1Of(precision: number, recall: number): number {
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

function pick(record: Record<string, unknown>, field: string): unknown {
  return field in record && record[field] !== undefined ? record[field] : null;
}

export function computeRecordMetrics(args: ComputeRecordArgs): RecordMetrics {
  const opts: CompareOptions = {strict: args.strict};
  const counts = EMPTY_COUNTS();
  const outcomes: Record<string, FieldOutcome> = {};
  const byFlag: Record<string, FlagTally> = {};

  for (const field of args.fields) {
    const gold = pick(args.gold, field);
    const pred = pick(args.pred, field);
    let outcome: FieldOutcome;
    if (gold === null && pred === null) outcome = 'true_negative';
    else if (gold === null) outcome = 'hallucination';
    else if (pred === null) outcome = 'miss';
    else outcome = compareValues(pred, gold, opts) ? 'correct' : 'wrong';
    outcomes[field] = outcome;
    counts[outcome] += 1;
    counts.total += 1;

    // Calibration evidence only exists where the pipeline asserted a value.
    const flag = args.flags?.[field];
    if (flag !== undefined && pred !== null) {
      const tally = byFlag[flag] ?? {predicted: 0, errors: 0, errorRate: null};
      tally.predicted += 1;
      if (outcome === 'wrong' || outcome === 'hallucination') tally.errors += 1;
      byFlag[flag] = tally;
    }
  }
  for (const tally of Object.values(byFlag)) {
    tally.errorRate = tally.predicted === 0 ? null : tally.errors / tally.predicted;
  }

  const tp = counts.correct;
  const fp = counts.wrong + counts.hallucination;
  const fn = counts.wrong + counts.miss;
  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  const goldNonNull = counts.correct + counts.wrong + counts.miss;
  const predNonNull = counts.correct + counts.wrong + counts.hallucination;

  return {
    id: args.id,
    kind: args.kind,
    language: args.language,
    outcomes,
    counts,
    exactMatch: counts.wrong + counts.hallucination + counts.miss === 0,
    scorable: goldNonNull + predNonNull > 0,
    precision,
    recall,
    f1: f1Of(precision, recall),
    accuracy: ratio(counts.correct + counts.true_negative, counts.total),
    hallucinationRate: ratio(counts.hallucination, counts.total),
    missRate: goldNonNull === 0 ? null : counts.miss / goldNonNull,
    ms: args.ms,
    byFlag,
  };
}

export interface Aggregate {
  records: number;
  scorableRecords: number;
  counts: RecordCounts;
  accuracy: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  exactMatchRate: number;
  hallucinationRate: number;
  missRate: number | null;
  macro: {
    precision: number | null;
    recall: number | null;
    f1: number | null;
    accuracy: number | null;
  };
  latency: {meanMs: number; maxMs: number; p50Ms: number; p95Ms: number};
  /** Predicted-non-null fields split by flag, summed across records. */
  byFlag: Record<string, FlagTally>;
  /** Error rate among `verified` fields — the safety net; should be ~0. */
  trustErrorRate: number | null;
  /** Error rate among `low_confidence` fields — should be visibly worse. */
  lowConfErrorRate: number | null;
  /** Share of flagged errors that carried `low_confidence`. Null when no errors. */
  errorCatchRate: number | null;
  by?: Record<string, Aggregate>;
}

export interface AggregateOptions {
  groupBy?: string;
}

/** Nearest-rank percentile over an unsorted sample (p in 0..100). */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1] ?? 0;
}

export function aggregate(
  records: readonly RecordMetrics[],
  options: AggregateOptions = {}
): Aggregate {
  const counts = EMPTY_COUNTS();
  let exact = 0;
  let scorableRecords = 0;
  let macroPrecisionSum = 0;
  let macroRecallSum = 0;
  let macroF1Sum = 0;
  let macroAccuracySum = 0;
  let msSum = 0;
  let msMax = 0;
  const samples: number[] = [];
  const byFlagAcc: Record<string, {predicted: number; errors: number}> = {};

  for (const r of records) {
    counts.correct += r.counts.correct;
    counts.wrong += r.counts.wrong;
    counts.hallucination += r.counts.hallucination;
    counts.miss += r.counts.miss;
    counts.true_negative += r.counts.true_negative;
    counts.total += r.counts.total;
    if (r.exactMatch) exact += 1;
    if (r.scorable) {
      scorableRecords += 1;
      macroPrecisionSum += r.precision;
      macroRecallSum += r.recall;
      macroF1Sum += r.f1;
      macroAccuracySum += r.accuracy;
    }
    msSum += r.ms;
    msMax = Math.max(msMax, r.ms);
    samples.push(r.ms);
    for (const [flag, tally] of Object.entries(r.byFlag)) {
      const acc = byFlagAcc[flag] ?? {predicted: 0, errors: 0};
      acc.predicted += tally.predicted;
      acc.errors += tally.errors;
      byFlagAcc[flag] = acc;
    }
  }

  const byFlag: Record<string, FlagTally> = {};
  for (const [flag, acc] of Object.entries(byFlagAcc)) {
    byFlag[flag] = {
      predicted: acc.predicted,
      errors: acc.errors,
      errorRate: acc.predicted === 0 ? null : acc.errors / acc.predicted,
    };
  }
  const flaggedErrors = Object.values(byFlag).reduce((sum, t) => sum + t.errors, 0);

  const tp = counts.correct;
  const fp = counts.wrong + counts.hallucination;
  const fn = counts.wrong + counts.miss;
  const precision = tp + fp === 0 ? null : tp / (tp + fp);
  const recall = tp + fn === 0 ? null : tp / (tp + fn);
  const f1 = precision === null || recall === null ? null : f1Of(precision, recall);
  const goldNonNull = counts.correct + counts.wrong + counts.miss;

  const base: Omit<Aggregate, 'by'> = {
    records: records.length,
    scorableRecords,
    counts,
    accuracy: ratio(counts.correct + counts.true_negative, counts.total),
    precision,
    recall,
    f1,
    exactMatchRate: ratio(exact, records.length),
    hallucinationRate: ratio(counts.hallucination, counts.total),
    missRate: goldNonNull === 0 ? null : counts.miss / goldNonNull,
    macro: {
      precision: scorableRecords === 0 ? null : macroPrecisionSum / scorableRecords,
      recall: scorableRecords === 0 ? null : macroRecallSum / scorableRecords,
      f1: scorableRecords === 0 ? null : macroF1Sum / scorableRecords,
      accuracy: scorableRecords === 0 ? null : macroAccuracySum / scorableRecords,
    },
    latency: {
      meanMs: records.length === 0 ? 0 : Math.round(msSum / records.length),
      maxMs: msMax,
      p50Ms: percentile(samples, 50),
      p95Ms: percentile(samples, 95),
    },
    byFlag,
    trustErrorRate: byFlag['verified']?.errorRate ?? null,
    lowConfErrorRate: byFlag['low_confidence']?.errorRate ?? null,
    errorCatchRate:
      flaggedErrors === 0 ? null : (byFlag['low_confidence']?.errors ?? 0) / flaggedErrors,
  };

  if (options.groupBy === undefined) return base;

  const groups = new Map<string, RecordMetrics[]>();
  for (const r of records) {
    const key = r[options.groupBy as keyof RecordMetrics];
    const label = typeof key === 'string' && key !== '' ? key : 'unknown';
    const bucket = groups.get(label);
    if (bucket) bucket.push(r);
    else groups.set(label, [r]);
  }
  const by: Record<string, Aggregate> = {};
  for (const [label, bucket] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    by[label] = aggregate(bucket);
  }
  return {...base, by};
}
