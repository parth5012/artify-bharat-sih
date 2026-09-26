/**
 * Eval report — aggregates, threshold gating, Markdown + JSON rendering.
 *
 * PII rule (docs/extract-api-spec.md §6 spirit): reports carry ids, counts and
 * rates only. Gold/prediction *values* are written exclusively when the caller
 * opts in (`verbose`), because transcripts and extracted fields are PII.
 */
import {mkdirSync, writeFileSync} from 'fs';
import path from 'path';
import {aggregate, type Aggregate, type FieldFlag, type FieldOutcome, type RecordCounts, type RecordMetrics} from './metrics';
import type {PipelineName, Served} from './pipelines';

export interface ThresholdSpec {
  /** Metric key shown to the user (`f1`, `hallucination`, …). */
  name: string;
  bound: 'min' | 'max';
  limit: number;
}

export interface ThresholdCheck extends ThresholdSpec {
  actual: number | null;
  passed: boolean;
  note?: string;
}

export interface EvalReportResult {
  id: string;
  kind: string;
  language?: string;
  served: Served;
  ms: number;
  exactMatch: boolean;
  scorable: boolean;
  counts: RecordCounts;
  outcomes: Record<string, FieldOutcome>;
  /** Present only when `verbose` is set (values are PII; flag/confidence are not). */
  fields?: {
    field: string;
    gold: unknown;
    pred: unknown;
    outcome: FieldOutcome;
    flag?: FieldFlag;
    confidence?: number;
  }[];
}

export interface EvalReport {
  schema: 'artify-extract-eval/v1';
  generatedAt: string;
  dataset: string;
  pipeline: PipelineName;
  options: Record<string, unknown>;
  recordCount: number;
  servedCounts: Record<Served, number>;
  scored: Aggregate;
  allFields: Aggregate;
  byKind: Record<string, Aggregate>;
  byLanguage: Record<string, Aggregate>;
  errors: {id: string; message: string}[];
  skipped: {id: string; reason: string}[];
  thresholds: ThresholdCheck[];
  passed: boolean;
  results: EvalReportResult[];
}

export interface BuildReportArgs {
  dataset: string;
  pipeline: PipelineName;
  options: Record<string, unknown>;
  scored: RecordMetrics[];
  all: RecordMetrics[];
  results: EvalReportResult[];
  errors: {id: string; message: string}[];
  skipped: {id: string; reason: string}[];
  thresholds: ThresholdSpec[];
}

/** Resolve a metric key against the scored aggregate. */
export function readThresholdMetric(name: string, scored: Aggregate): number | null {
  switch (name) {
    case 'accuracy':
      return scored.accuracy;
    case 'precision':
      return scored.precision;
    case 'recall':
      return scored.recall;
    case 'f1':
      return scored.f1;
    case 'exact':
      return scored.exactMatchRate;
    case 'hallucination':
      return scored.hallucinationRate;
    case 'miss':
      return scored.missRate;
    case 'trusterror':
      return scored.trustErrorRate;
    case 'lowconferror':
      return scored.lowConfErrorRate;
    case 'catchrate':
      return scored.errorCatchRate;
    default:
      return null;
  }
}

/** Why a metric came back null — shown as the gate's note. */
const NULL_NOTES: Record<string, string> = {
  hallucination: 'not scorable (no gold/prediction to compare)',
  miss: 'not scorable (no gold/prediction to compare)',
  trusterror: 'no fields flagged verified',
  lowconferror: 'no fields flagged low_confidence',
  catchrate: 'no flagged errors to catch',
};

export function evaluateThresholds(
  specs: readonly ThresholdSpec[],
  scored: Aggregate
): ThresholdCheck[] {
  return specs.map((spec) => {
    const actual = readThresholdMetric(spec.name, scored);
    if (actual === null) {
      return {
        ...spec,
        actual: null,
        passed: false,
        note: NULL_NOTES[spec.name] ?? 'not scorable',
      };
    }
    const passed = spec.bound === 'min' ? actual >= spec.limit : actual <= spec.limit;
    return {...spec, actual, passed};
  });
}

export function buildReport(args: BuildReportArgs): EvalReport {
  const scored = aggregate(args.scored);
  const servedCounts: Record<Served, number> = {llm: 0, regex: 0, none: 0};
  for (const r of args.results) servedCounts[r.served] += 1;

  const thresholds = evaluateThresholds(args.thresholds, scored);
  return {
    schema: 'artify-extract-eval/v1',
    generatedAt: new Date().toISOString(),
    dataset: args.dataset,
    pipeline: args.pipeline,
    options: args.options,
    recordCount: args.results.length,
    servedCounts,
    scored,
    allFields: aggregate(args.all),
    byKind: aggregate(args.scored, {groupBy: 'kind'}).by ?? {},
    byLanguage: aggregate(args.scored, {groupBy: 'language'}).by ?? {},
    errors: args.errors,
    skipped: args.skipped,
    thresholds,
    passed: thresholds.every((t) => t.passed),
    results: args.results,
  };
}

function pct(value: number | null): string {
  return value === null ? 'n/a' : `${(value * 100).toFixed(2)}%`;
}

function num(value: number | null, digits = 4): string {
  return value === null ? 'n/a' : value.toFixed(digits);
}

function metricRows(label: string, agg: Aggregate): string[] {
  const prefix = label === '' ? '' : `${label} `;
  return [
    `| ${prefix}accuracy | ${pct(agg.accuracy)} |`,
    `| ${prefix}precision | ${num(agg.precision)} |`,
    `| ${prefix}recall | ${num(agg.recall)} |`,
    `| ${prefix}f1 | ${num(agg.f1)} |`,
    `| ${prefix}exact-match | ${pct(agg.exactMatchRate)} |`,
    `| ${prefix}hallucination rate | ${pct(agg.hallucinationRate)} |`,
    `| ${prefix}miss rate | ${pct(agg.missRate)} |`,
  ];
}

function breakdownTable(title: string, groups: Record<string, Aggregate>): string[] {
  const keys = Object.keys(groups).sort();
  if (keys.length === 0) return [`_no ${title} breakdown_`];
  const lines = [
    `### By ${title}`,
    '',
    `| ${title} | records | accuracy | precision | recall | f1 | exact | hallucination | miss |`,
    `|---|---:|---:|---:|---:|---:|---:|---:|---:|`,
  ];
  for (const key of keys) {
    const g = groups[key]!;
    lines.push(
      `| ${key} | ${g.records} | ${pct(g.accuracy)} | ${num(g.precision)} | ${num(g.recall)} | ` +
        `${num(g.f1)} | ${pct(g.exactMatchRate)} | ${pct(g.hallucinationRate)} | ${pct(g.missRate)} |`
    );
  }
  return lines;
}

function calibrationSection(agg: Aggregate): string[] {
  const lines = [
    '## Calibration',
    '',
    'Does the per-field `flag` (spec §4) predict correctness?',
    '',
    '| flag | predicted | errors | error rate |',
    '|---|---:|---:|---:|',
  ];
  const flags = Object.keys(agg.byFlag).sort();
  if (flags.length === 0) lines.push('| _no flags captured_ | — | — | — |');
  for (const flag of flags) {
    const tally = agg.byFlag[flag]!;
    lines.push(`| ${flag} | ${tally.predicted} | ${tally.errors} | ${pct(tally.errorRate)} |`);
  }
  lines.push(
    '',
    `- **trustError** — wrong or hallucinated among \`verified\` fields: ${pct(agg.trustErrorRate)}`,
    `- **lowConfError** — wrong or hallucinated among \`low_confidence\` fields: ${pct(agg.lowConfErrorRate)}`,
    `- **catchRate** — share of flagged errors the \`low_confidence\` flag caught: ${pct(agg.errorCatchRate)}`,
    ''
  );
  return lines;
}

export function formatMarkdown(report: EvalReport): string {
  const s = report.scored;
  const lines: string[] = [
    `# Extract eval — \`${report.pipeline}\` on \`${report.dataset}\``,
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `**${report.recordCount} records** scored · served: llm ${report.servedCounts.llm} / ` +
      `regex ${report.servedCounts.regex} / none ${report.servedCounts.none} · ` +
      `errors ${report.errors.length} · skipped ${report.skipped.length}`,
    '',
    `## Scored metrics (spec §4 set — \`description\` excluded)`,
    '',
    '| metric | value |',
    '|---|---:|',
    ...metricRows('', s),
    '',
    ...calibrationSection(s),
    `## All fields (includes \`description\`)`,
    '',
    '| metric | value |',
    '|---|---:|',
    ...metricRows('', report.allFields),
    '',
    '## Latency',
    '',
    `| p50 | p95 | mean | max |`,
    `|---:|---:|---:|---:|`,
    `| ${s.latency.p50Ms} ms | ${s.latency.p95Ms} ms | ${s.latency.meanMs} ms | ${s.latency.maxMs} ms |`,
    '',
    ...breakdownTable('kind', report.byKind),
    '',
    ...breakdownTable('language', report.byLanguage),
    '',
    '## Thresholds',
    '',
  ];

  if (report.thresholds.length === 0) {
    lines.push('_no thresholds requested_');
  } else {
    lines.push('| check | bound | limit | actual | result |', '|---|---|---:|---:|---|');
    for (const t of report.thresholds) {
      lines.push(
        `| ${t.name} | ${t.bound} | ${t.limit} | ${t.actual === null ? 'n/a' : t.actual.toFixed(4)} | ` +
          `${t.passed ? 'PASS' : 'FAIL'}${t.note ? ` (${t.note})` : ''} |`
      );
    }
  }

  lines.push(
    '',
    '## Per-record results',
    '',
    '| id | kind | served | ms | exact | correct | wrong | hallucination | miss | true-neg |',
    '|---|---|---|---:|:---:|---:|---:|---:|---:|---:|'
  );
  for (const r of report.results) {
    lines.push(
      `| ${r.id} | ${r.kind} | ${r.served} | ${r.ms} | ${r.exactMatch ? 'yes' : 'no'} | ` +
        `${r.counts.correct} | ${r.counts.wrong} | ${r.counts.hallucination} | ` +
        `${r.counts.miss} | ${r.counts.true_negative} |`
    );
  }

  const failures = report.results.filter((r) => !r.exactMatch);
  if (failures.length > 0) {
    lines.push('', '### Field-level misses', '');
    for (const r of failures) {
      const bad = Object.entries(r.outcomes).filter(
        ([, o]) => o === 'wrong' || o === 'hallucination' || o === 'miss'
      );
      lines.push(`- **${r.id}**: ${bad.map(([f, o]) => `${f}=${o}`).join(', ')}`);
      if (r.fields && r.fields.length > 0) {
        for (const f of r.fields) {
          if (f.outcome === 'correct' || f.outcome === 'true_negative') continue;
          lines.push(`  - ${f.field}: \`${JSON.stringify(f.gold)}\` → \`${JSON.stringify(f.pred)}\``);
        }
      }
    }
  }

  if (report.skipped.length > 0) {
    lines.push('', '### Skipped', '');
    for (const sk of report.skipped) lines.push(`- ${sk.id}: ${sk.reason}`);
  }
  if (report.errors.length > 0) {
    lines.push('', '### Errors', '');
    for (const er of report.errors) lines.push(`- ${er.id}: ${er.message}`);
  }

  lines.push('');
  return lines.join('\n');
}

export function formatTable(report: EvalReport): string {
  const s = report.scored;
  const rows: string[] = [
    `extract eval · pipeline=${report.pipeline} · dataset=${report.dataset}`,
    `records=${report.recordCount}  served: llm=${report.servedCounts.llm} ` +
      `regex=${report.servedCounts.regex} none=${report.servedCounts.none} ` +
      `errors=${report.errors.length} skipped=${report.skipped.length}`,
    '',
    'scored (description excluded):',
    `  accuracy=${pct(s.accuracy)}  precision=${num(s.precision)}  recall=${num(s.recall)}  f1=${num(s.f1)}`,
    `  exact=${pct(s.exactMatchRate)}  hallucination=${pct(s.hallucinationRate)}  miss=${pct(s.missRate)}`,
    `  latency p50=${s.latency.p50Ms}ms p95=${s.latency.p95Ms}ms max=${s.latency.maxMs}ms`,
    `  calibration: trustError=${pct(s.trustErrorRate)} lowConfError=${pct(s.lowConfErrorRate)} ` +
      `catchRate=${pct(s.errorCatchRate)}`,
  ];
  const kindKeys = Object.keys(report.byKind).sort();
  if (kindKeys.length > 0) {
    rows.push('', 'by kind:');
    for (const key of kindKeys) {
      const g = report.byKind[key]!;
      rows.push(
        `  ${key}: n=${g.records} accuracy=${pct(g.accuracy)} f1=${num(g.f1)} exact=${pct(g.exactMatchRate)}`
      );
    }
  }
  const langKeys = Object.keys(report.byLanguage).sort();
  if (langKeys.length > 0) {
    rows.push('', 'by language:');
    for (const key of langKeys) {
      const g = report.byLanguage[key]!;
      rows.push(
        `  ${key}: n=${g.records} accuracy=${pct(g.accuracy)} f1=${num(g.f1)} exact=${pct(g.exactMatchRate)}`
      );
    }
  }
  if (report.thresholds.length > 0) {
    rows.push('', 'thresholds:');
    for (const t of report.thresholds) {
      rows.push(
        `  ${t.passed ? 'PASS' : 'FAIL'}  ${t.name} ${t.bound} ${t.limit} ` +
          `(actual=${t.actual === null ? 'n/a' : t.actual.toFixed(4)}${t.note ? ` — ${t.note}` : ''})`
      );
    }
  }
  const failures = report.results.filter((r) => !r.exactMatch);
  if (failures.length > 0) {
    rows.push('', `field-level misses (${failures.length}):`);
    for (const r of failures) {
      const bad = Object.entries(r.outcomes)
        .filter(([, o]) => o !== 'correct' && o !== 'true_negative')
        .map(([f, o]) => `${f}:${o}`);
      rows.push(`  ${r.id}  ${bad.join(' ')}`);
    }
  }
  rows.push('', `overall: ${report.passed ? 'PASS' : 'FAIL'}`);
  return rows.join('\n');
}

export interface WrittenReport {
  jsonPath: string;
  mdPath: string;
}

export function writeReport(report: EvalReport, outDir: string): WrittenReport {
  mkdirSync(outDir, {recursive: true});
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const base = `${stamp}-${report.pipeline}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const mdPath = path.join(outDir, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(mdPath, formatMarkdown(report), 'utf8');
  return {jsonPath, mdPath};
}
