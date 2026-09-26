/**
 * Eval report + CLI (TDD). End-to-end runs use the `canned` pipeline so the
 * suite stays offline and keyless.
 */
import {mkdtempSync, readFileSync, rmSync} from 'fs';
import {tmpdir} from 'os';
import path from 'path';
import {
  DEFAULT_OPTIONS,
  UsageError,
  parseArgs,
  runEval,
  type RunOptions,
} from '../scripts/eval/run';
import {
  buildReport,
  evaluateThresholds,
  formatMarkdown,
  formatTable,
  readThresholdMetric,
  writeReport,
  type EvalReportResult,
} from '../scripts/eval/report';
import {aggregate, computeRecordMetrics, type RecordMetrics} from '../scripts/eval/metrics';
import {toFlagMap, toReportResult} from '../scripts/eval/run';
import {parseEvalRecord} from '../scripts/eval/schema';

const ID_FIELDS = ['name', 'phone', 'artisanId', 'location', 'craft', 'pin'] as const;

function metrics(
  gold: Record<string, string | null>,
  pred: Record<string, string | null>,
  overrides: Partial<RecordMetrics> = {}
): RecordMetrics {
  return {
    ...computeRecordMetrics({
      id: 'r',
      kind: 'identity',
      language: 'en',
      gold,
      pred,
      fields: [...ID_FIELDS],
      ms: 5,
      strict: false,
    }),
    ...overrides,
  };
}

const allNull = () => ({
  name: null, phone: null, artisanId: null, location: null, craft: null, pin: null,
});

describe('parseArgs', () => {
  it('returns the documented defaults', () => {
    const o = parseArgs([]);
    expect(o).toEqual(DEFAULT_OPTIONS);
    expect(o.pipeline).toBe('regex');
    expect(o.dataset).toBe('eval/datasets/golden-v1.jsonl');
    expect(o.thresholds).toEqual([]);
  });

  it('parses filters, limits, gates and repeatable tags', () => {
    const o = parseArgs([
      '--dataset', 'x.jsonl',
      '--pipeline', 'canned',
      '--kind', 'product',
      '--language', 'hien',
      '--tag', 'golden',
      '--tag', 'smoke',
      '--limit', '3',
      '--strict',
      '--verbose',
      '--json',
      '--out', 'tmp-out',
      '--min-f1', '0.8',
      '--max-hallucination', '0.05',
    ]);
    expect(o.dataset).toBe('x.jsonl');
    expect(o.pipeline).toBe('canned');
    expect(o.kind).toBe('product');
    expect(o.language).toBe('hien');
    expect(o.tags).toEqual(['golden', 'smoke']);
    expect(o.limit).toBe(3);
    expect(o.strict).toBe(true);
    expect(o.verbose).toBe(true);
    expect(o.json).toBe(true);
    expect(o.out).toBe('tmp-out');
    expect(o.thresholds).toEqual([
      {name: 'f1', bound: 'min', limit: 0.8},
      {name: 'hallucination', bound: 'max', limit: 0.05},
    ]);
  });

  it('exposes help', () => {
    expect(parseArgs(['--help']).help).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('rejects unknown flags and bad values with UsageError', () => {
    expect(() => parseArgs(['--nope'])).toThrow(UsageError);
    expect(() => parseArgs(['--nope'])).toThrow(/unknown flag/);
    expect(() => parseArgs(['--pipeline', 'fast'])).toThrow(/--pipeline must be one of/);
    expect(() => parseArgs(['--kind', 'price'])).toThrow(/--kind must be/);
    expect(() => parseArgs(['--min-accuracy'])).toThrow(/requires a value/);
    expect(() => parseArgs(['--min-accuracy', 'high'])).toThrow(/expects a number/);
    expect(() => parseArgs(['--max-precision', '0.5', '--max-wat', '1'])).toThrow(/unknown metric/);
    expect(() => parseArgs(['--limit', '0'])).toThrow(/positive integer/);
    expect(() => parseArgs(['--dataset'])).toThrow(/requires a value/);
  });
});

describe('evaluateThresholds', () => {
  const scored = aggregate([
    metrics({...allNull(), name: 'A'}, {...allNull(), name: 'A'}),
  ]);

  it('passes min gates at or above the limit and fails below it', () => {
    const pass = evaluateThresholds([{name: 'accuracy', bound: 'min', limit: 0.9}], scored);
    expect(pass[0]!.passed).toBe(true);
    const fail = evaluateThresholds([{name: 'accuracy', bound: 'min', limit: 1.1}], scored);
    expect(fail[0]!.passed).toBe(false);
  });

  it('inverts for max gates', () => {
    expect(
      evaluateThresholds([{name: 'hallucination', bound: 'max', limit: 0}], scored)[0]!.passed
    ).toBe(true);
    expect(
      evaluateThresholds([{name: 'miss', bound: 'max', limit: 0}], scored)[0]!.passed
    ).toBe(true);
  });

  it('fails a gate whose metric is not scorable, with a note', () => {
    const empty = aggregate([
      computeRecordMetrics({
        id: 'e', kind: 'identity', gold: allNull(), pred: allNull(),
        fields: [...ID_FIELDS], ms: 1, strict: false,
      }),
    ]);
    const check = evaluateThresholds([{name: 'f1', bound: 'min', limit: 0.5}], empty)[0]!;
    expect(check.actual).toBeNull();
    expect(check.passed).toBe(false);
    expect(check.note).toContain('not scorable');
  });

  it('rejects an unknown metric name as not scorable', () => {
    const check = evaluateThresholds([{name: 'nope', bound: 'min', limit: 1}], scored)[0]!;
    expect(check.actual).toBeNull();
    expect(check.passed).toBe(false);
  });
});

describe('report rendering', () => {
  const good = metrics({...allNull(), name: 'Alpha'}, {...allNull(), name: 'Alpha'}, {id: 'a'});
  const bad = metrics({...allNull(), name: 'Beta'}, {...allNull(), name: 'Gamma'}, {id: 'b'});

  function sampleReport(verbose = false) {
    const results: EvalReportResult[] = [
      {
        id: 'a', kind: 'identity', language: 'en', served: 'llm', ms: 4,
        exactMatch: true, scorable: true, counts: good.counts, outcomes: good.outcomes,
        ...(verbose
          ? {fields: [{field: 'name', gold: 'Alpha', pred: 'Alpha', outcome: 'correct' as const}]}
          : {}),
      },
      {
        id: 'b', kind: 'identity', language: 'en', served: 'llm', ms: 6,
        exactMatch: false, scorable: true, counts: bad.counts, outcomes: bad.outcomes,
        ...(verbose
          ? {fields: [{field: 'name', gold: 'Beta', pred: 'Gamma', outcome: 'wrong' as const}]}
          : {}),
      },
    ];
    return buildReport({
      dataset: 'eval/datasets/demo.jsonl',
      pipeline: 'canned',
      options: {strict: false},
      scored: [good, bad],
      all: [good, bad],
      results,
      errors: [],
      skipped: [],
      thresholds: [{name: 'f1', bound: 'min', limit: 0.4}],
    });
  }

  it('aggregates both records and gates the threshold', () => {
    const report = sampleReport();
    expect(report.recordCount).toBe(2);
    expect(report.servedCounts).toEqual({llm: 2, regex: 0, none: 0});
    expect(report.passed).toBe(true);
    expect(report.schema).toBe('artify-extract-eval/v1');
    expect(Object.keys(report.byKind)).toEqual(['identity']);
    expect(Object.keys(report.byLanguage)).toEqual(['en']);
  });

  it('renders every section in markdown', () => {
    const md = formatMarkdown(sampleReport());
    expect(md).toContain('# Extract eval — `canned`');
    expect(md).toContain('## Scored metrics');
    expect(md).toContain('## All fields');
    expect(md).toContain('## Latency');
    expect(md).toContain('### By kind');
    expect(md).toContain('### By language');
    expect(md).toContain('## Thresholds');
    expect(md).toContain('## Per-record results');
    expect(md).toContain('| a | identity | llm |');
    expect(md).toContain('### Field-level misses');
  });

  it('keeps values out of the report unless verbose', () => {
    expect(formatMarkdown(sampleReport(false))).not.toContain('Gamma');
    expect(formatMarkdown(sampleReport(true))).toContain('Gamma');
    expect(JSON.stringify(sampleReport(false))).not.toContain('"fields"');
    expect(JSON.stringify(sampleReport(true))).toContain('"fields"');
  });

  it('prints a compact console table ending in the verdict', () => {
    expect(formatTable(sampleReport(true))).toContain('overall: PASS');
    const failing = buildReport({
      dataset: 'd', pipeline: 'canned', options: {},
      scored: [good, bad], all: [good, bad], results: [], errors: [], skipped: [],
      thresholds: [{name: 'f1', bound: 'min', limit: 0.99}],
    });
    expect(failing.passed).toBe(false);
    expect(formatTable(failing)).toContain('overall: FAIL');
  });

  it('writes JSON and Markdown files that round-trip', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'eval-report-'));
    const written = writeReport(sampleReport(), dir);
    const parsed = JSON.parse(readFileSync(written.jsonPath, 'utf8'));
    expect(parsed.schema).toBe('artify-extract-eval/v1');
    expect(parsed.recordCount).toBe(2);
    expect(readFileSync(written.mdPath, 'utf8')).toContain('## Thresholds');
    rmSync(dir, {recursive: true, force: true});
  });
});

describe('runEval end-to-end (canned, offline)', () => {
  let dir: string;
  let dataset: string;

  const record = (
    id: string,
    name: string,
    llmName: string
  ) =>
    JSON.stringify({
      id,
      kind: 'identity',
      input: `Seasonal note for ${id}.`,
      language: 'en',
      tags: ['golden'],
      gold: {...allNull(), name},
      llm: {...allNull(), name: llmName},
    });

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'eval-e2e-'));
    dataset = path.join(dir, 'data.jsonl');
    require('fs').writeFileSync(dataset, [record('a', 'Alpha', 'Alpha'), record('b', 'Beta', 'Gamma')].join('\n') + '\n');
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  function opts(over: Partial<RunOptions> = {}): RunOptions {
    return {
      ...DEFAULT_OPTIONS,
      dataset,
      pipeline: 'canned',
      out: path.join(dir, 'out'),
      thresholds: [],
      tags: [],
      ...over,
    };
  }

  it('scores the dataset, writes both reports and exits 0', async () => {
    const outcome = await runEval(opts());
    expect(outcome.fatal).toBeUndefined();
    expect(outcome.exitCode).toBe(0);
    expect(outcome.report!.recordCount).toBe(2);
    expect(outcome.report!.scored.counts.correct).toBe(1);
    expect(outcome.report!.scored.counts.wrong).toBe(1);
    expect(outcome.report!.results[0]!.exactMatch).toBe(true);
    expect(outcome.written).not.toBeNull();
    const json = JSON.parse(readFileSync(outcome.written!.jsonPath, 'utf8'));
    expect(json.pipeline).toBe('canned');
    expect(readFileSync(outcome.written!.mdPath, 'utf8')).toContain('canned');
  });

  it('exits 1 when a --min gate is not met', async () => {
    const outcome = await runEval(
      opts({thresholds: [{name: 'precision', bound: 'min', limit: 0.9}]})
    );
    expect(outcome.exitCode).toBe(1);
    expect(outcome.report!.passed).toBe(false);
    expect(outcome.report!.thresholds[0]!.passed).toBe(false);
  });

  it('exits 0 when every requested gate passes', async () => {
    const outcome = await runEval(
      opts({thresholds: [{name: 'accuracy', bound: 'min', limit: 0.9}]})
    );
    expect(outcome.exitCode).toBe(0);
    expect(outcome.report!.passed).toBe(true);
  });

  it('exits 3 for a missing dataset, naming the path', async () => {
    const outcome = await runEval(opts({dataset: path.join(dir, 'nope.jsonl')}));
    expect(outcome.exitCode).toBe(3);
    expect(outcome.report).toBeNull();
    expect(outcome.fatal).toMatch(/not found/);
  });

  it('exits 3 when filters match nothing', async () => {
    const outcome = await runEval(opts({kind: 'product'}));
    expect(outcome.exitCode).toBe(3);
    expect(outcome.fatal).toMatch(/no records match/);
  });

  it('exits 3 when the llm pipeline has no provider key', async () => {
    delete process.env['GROQ_' + 'API_KEY'];
    delete process.env['OPENROUTER_' + 'API_KEY'];
    const outcome = await runEval(opts({pipeline: 'llm'}));
    expect(outcome.exitCode).toBe(3);
    expect(outcome.fatal).toMatch(/API_KEY/);
  });

  it('skips records without a canned payload and fails when nothing remains', async () => {
    const bare = path.join(dir, 'bare.jsonl');
    require('fs').writeFileSync(
      bare,
      JSON.stringify({id: 'x', kind: 'identity', input: 'Note.', gold: allNull()}) + '\n'
    );
    const outcome = await runEval(opts({dataset: bare}));
    expect(outcome.exitCode).toBe(3);
    expect(outcome.fatal).toMatch(/skipped/);
  });

  it('honours --limit', async () => {
    const outcome = await runEval(opts({limit: 1}));
    expect(outcome.report!.recordCount).toBe(1);
    expect(outcome.report!.results[0]!.id).toBe('a');
  });
});

describe('flag capture', () => {
  const result = {
    name: {value: 'Ramesh Kumar', confidence: 0.9, flag: 'verified'},
    phone: {value: '12345', confidence: 0.8, flag: 'low_confidence'},
    artisanId: {value: null, confidence: 0, flag: 'missing'},
    location: {value: null, confidence: 0, flag: 'missing'},
    craft: {value: null, confidence: 0, flag: 'missing'},
    pin: {value: null, confidence: 0, flag: 'missing'},
  };
  const plain = {name: 'Ramesh Kumar', phone: '12345'};

  it('toFlagMap keeps flag + confidence beside each value', () => {
    expect(toFlagMap(result)).toEqual({
      name: {flag: 'verified', confidence: 0.9},
      phone: {flag: 'low_confidence', confidence: 0.8},
      artisanId: {flag: 'missing', confidence: 0},
      location: {flag: 'missing', confidence: 0},
      craft: {flag: 'missing', confidence: 0},
      pin: {flag: 'missing', confidence: 0},
    });
  });

  it('attaches flag + confidence to verbose field diffs', () => {
    const record = parseEvalRecord({
      id: 'r',
      kind: 'identity',
      input: 'My name is Ramesh Kumar.',
      language: 'en',
      gold: {
        name: 'Ramesh Kumar',
        phone: null,
        artisanId: null,
        location: null,
        craft: null,
        pin: null,
      },
    });
    const m = computeRecordMetrics({
      id: 'r',
      kind: 'identity',
      gold: record.gold,
      pred: plain,
      fields: [...ID_FIELDS],
      ms: 3,
      strict: false,
    });

    const out = toReportResult(record, m, 'llm', 3, plain, toFlagMap(result), true);
    expect(out.fields).toEqual([
      {field: 'name', gold: 'Ramesh Kumar', pred: 'Ramesh Kumar', outcome: 'correct', flag: 'verified', confidence: 0.9},
      {field: 'phone', gold: null, pred: '12345', outcome: 'hallucination', flag: 'low_confidence', confidence: 0.8},
      {field: 'artisanId', gold: null, pred: null, outcome: 'true_negative', flag: 'missing', confidence: 0},
      {field: 'location', gold: null, pred: null, outcome: 'true_negative', flag: 'missing', confidence: 0},
      {field: 'craft', gold: null, pred: null, outcome: 'true_negative', flag: 'missing', confidence: 0},
      {field: 'pin', gold: null, pred: null, outcome: 'true_negative', flag: 'missing', confidence: 0},
    ]);
  });

  it('still omits field diffs (and their flags) without --verbose', () => {
    const record = parseEvalRecord({
      id: 'r',
      kind: 'identity',
      input: 'x',
      gold: {name: null, phone: null, artisanId: null, location: null, craft: null, pin: null},
    });
    const m = computeRecordMetrics({
      id: 'r',
      kind: 'identity',
      gold: record.gold,
      pred: {},
      fields: [...ID_FIELDS],
      ms: 1,
      strict: false,
    });
    expect(toReportResult(record, m, 'regex', 1, {}, {}, false).fields).toBeUndefined();
  });
});

describe('calibration thresholds', () => {
  const scored = aggregate([
    computeRecordMetrics({
      id: 'r',
      kind: 'identity',
      gold: {name: 'A', phone: null, artisanId: null, location: null, craft: null, pin: null},
      pred: {name: 'WRONG', phone: null, artisanId: null, location: null, craft: null, pin: null},
      fields: [...ID_FIELDS],
      flags: {
        name: 'low_confidence',
        phone: 'missing',
        artisanId: 'missing',
        location: 'missing',
        craft: 'missing',
        pin: 'missing',
      },
      ms: 1,
      strict: false,
    }),
  ]);

  it('exposes trusterror / lowconferror / catchrate to --min-/–max-', () => {
    expect(readThresholdMetric('trusterror', scored)).toBeNull(); // no trusted field at all
    expect(readThresholdMetric('lowconferror', scored)).toBeCloseTo(1, 10);
    expect(readThresholdMetric('catchrate', scored)).toBeCloseTo(1, 10); // the only error was flagged
  });

  it('gates on them like any other metric', () => {
    const fail = evaluateThresholds([{name: 'lowconferror', bound: 'max', limit: 0}], scored)[0]!;
    expect(fail.actual).toBeCloseTo(1, 10);
    expect(fail.passed).toBe(false);
    const pass = evaluateThresholds([{name: 'catchrate', bound: 'min', limit: 0.8}], scored)[0]!;
    expect(pass.passed).toBe(true);
  });

  it('renders the calibration block in the console table and markdown', () => {
    const report = buildReport({
      dataset: 'd.jsonl',
      pipeline: 'llm',
      options: {},
      scored: [
        computeRecordMetrics({
          id: 'r',
          kind: 'identity',
          gold: {name: 'A', phone: null, artisanId: null, location: null, craft: null, pin: null},
          pred: {name: 'WRONG', phone: null, artisanId: null, location: null, craft: null, pin: null},
          fields: [...ID_FIELDS],
          flags: {
            name: 'verified',
            phone: 'missing',
            artisanId: 'missing',
            location: 'missing',
            craft: 'missing',
            pin: 'missing',
          },
          ms: 1,
          strict: false,
        }),
      ],
      all: [],
      results: [],
      errors: [],
      skipped: [],
      thresholds: [],
    });
    expect(formatTable(report)).toContain('calibration');
    expect(formatTable(report)).toContain('trustError=');
    expect(formatMarkdown(report)).toContain('## Calibration');
    expect(report.scored.trustErrorRate).toBeCloseTo(1, 10);
  });
});
