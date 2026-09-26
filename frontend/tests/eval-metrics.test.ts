/**
 * Eval metrics engine — field outcomes, P/R/F1, hallucination + miss rates (TDD red first).
 * Hand-computed expectations; see docs/extract-api-spec.md §4 for the field sets.
 */
import {
  aggregate,
  compareValues,
  computeRecordMetrics,
  type FieldFlag,
  type FieldOutcome,
} from '../scripts/eval/metrics';

const ID = ['name', 'phone', 'artisanId', 'location', 'craft', 'pin'] as const;

function identity(partial: Record<string, string | null>) {
  const out: Record<string, string | null> = {};
  for (const f of ID) out[f] = partial[f] ?? null;
  return out;
}

describe('compareValues', () => {
  it('matches null against null and rejects null against a value', () => {
    expect(compareValues(null, null, {strict: false})).toBe(true);
    expect(compareValues(null, 'x', {strict: false})).toBe(false);
    expect(compareValues('x', null, {strict: false})).toBe(false);
  });

  it('normalizes case and whitespace by default', () => {
    expect(compareValues('Ramesh   Kumar', 'ramesh kumar', {strict: false})).toBe(true);
    expect(compareValues('  Bastar,  Chhattisgarh ', 'Bastar, Chhattisgarh', {strict: false})).toBe(true);
  });

  it('--strict compares the raw strings', () => {
    expect(compareValues('Ramesh Kumar', 'ramesh kumar', {strict: true})).toBe(false);
    expect(compareValues('Ramesh Kumar', 'Ramesh Kumar', {strict: true})).toBe(true);
  });

  it('compares material arrays as order-insensitive normalized sets', () => {
    expect(compareValues(['zari', ' silk '], ['Silk', 'Zari'], {strict: false})).toBe(true);
    expect(compareValues(['Silk'], ['Silk', 'Zari'], {strict: false})).toBe(false);
    expect(compareValues(['Zari', 'Silk'], ['Silk', 'Zari'], {strict: true})).toBe(false);
  });

  it('treats an empty array as a populated value, not as null', () => {
    expect(compareValues([], null, {strict: false})).toBe(false);
    expect(compareValues([], [], {strict: false})).toBe(true);
  });

  it('rejects a type mismatch (string vs array)', () => {
    expect(compareValues(['Silk'], 'Silk', {strict: false})).toBe(false);
    expect(compareValues('Silk', ['Silk'], {strict: false})).toBe(false);
  });
});

describe('computeRecordMetrics', () => {
  const gold = identity({
    name: 'Ramesh Kumar',
    phone: '9876543210',
    location: 'Bastar',
  });
  const pred = identity({
    name: 'Ramesh   Kumar', // correct after normalization
    phone: '12345', // wrong
    artisanId: 'ART-1', // hallucination
    craft: 'Handloom', // hallucination
    // location omitted -> miss
  });

  const m = computeRecordMetrics({
    id: 'a',
    kind: 'identity',
    gold,
    pred,
    fields: [...ID],
    ms: 12,
    strict: false,
  });

  it('assigns exactly one outcome per field', () => {
    expect(m.outcomes).toEqual({
      name: 'correct',
      phone: 'wrong',
      artisanId: 'hallucination',
      location: 'miss',
      craft: 'hallucination',
      pin: 'true_negative',
    });
    const counts = Object.values(m.outcomes) as FieldOutcome[];
    expect(counts).toHaveLength(6);
  });

  it('computes hand-checked micro counts', () => {
    expect(m.counts).toEqual({
      correct: 1,
      wrong: 1,
      hallucination: 2,
      miss: 1,
      true_negative: 1,
      total: 6,
    });
  });

  it('computes hand-checked precision / recall / f1', () => {
    // TP=1 FP=wrong+hall=3 FN=wrong+miss=2
    expect(m.precision).toBeCloseTo(0.25, 10);
    expect(m.recall).toBeCloseTo(1 / 3, 10);
    expect(m.f1).toBeCloseTo(0.2857142857, 8);
    expect(m.accuracy).toBeCloseTo(2 / 6, 10); // (correct 1 + true_negative 1) / 6
    expect(m.missRate).toBeCloseTo(1 / 3, 10); // miss / gold-non-null(3)
    expect(m.exactMatch).toBe(false);
  });

  it('keeps accuracy and f1 definitions independent of null-only fields', () => {
    const empty = computeRecordMetrics({
      id: 'empty',
      kind: 'identity',
      gold: identity({}),
      pred: identity({}),
      fields: [...ID],
      ms: 1,
      strict: false,
    });
    expect(empty.counts.true_negative).toBe(6);
    expect(empty.accuracy).toBe(1);
    expect(empty.exactMatch).toBe(true);
    expect(empty.precision).toBe(0); // no predictions -> defined as 0
    expect(empty.recall).toBe(0); // no gold -> defined as 0
    expect(empty.missRate).toBeNull(); // no gold-non-null -> n/a
    expect(empty.scorable).toBe(false); // nothing to extract either way
  });

  it('flags a perfect match as exact', () => {
    const perfect = computeRecordMetrics({
      id: 'p',
      kind: 'identity',
      gold,
      pred: identity({name: 'ramesh kumar', phone: '9876543210', location: 'Bastar'}),
      fields: [...ID],
      ms: 3,
      strict: false,
    });
    expect(perfect.exactMatch).toBe(true);
    expect(perfect.f1).toBe(1);
  });
});

describe('aggregate', () => {
  const goldA = identity({name: 'Ramesh Kumar', phone: '9876543210', location: 'Bastar'});
  const predA = identity({
    name: 'Ramesh   Kumar',
    phone: '12345',
    artisanId: 'ART-1',
    craft: 'Handloom',
  });
  const records = [
    computeRecordMetrics({
      id: 'a', kind: 'identity', gold: goldA, pred: predA,
      fields: [...ID], ms: 10, strict: false,
    }),
    computeRecordMetrics({
      id: 'b', kind: 'identity', gold: identity({}), pred: identity({}),
      fields: [...ID], ms: 30, strict: false,
    }),
  ];

  const agg = aggregate(records);

  it('micro-sums counts across records', () => {
    expect(agg.records).toBe(2);
    expect(agg.counts).toEqual({
      correct: 1, wrong: 1, hallucination: 2, miss: 1, true_negative: 7, total: 12,
    });
    expect(agg.accuracy).toBeCloseTo(8 / 12, 10); // (correct 1 + tn 7) / 12
    expect(agg.precision).toBeCloseTo(0.25, 10);
    expect(agg.recall).toBeCloseTo(1 / 3, 10);
    expect(agg.exactMatchRate).toBeCloseTo(0.5, 10);
    expect(agg.hallucinationRate).toBeCloseTo(2 / 12, 10);
    expect(agg.missRate).toBeCloseTo(1 / 3, 10);
  });

  it('macro-averages only over records with something to extract', () => {
    // record 'b' is all-null both sides -> excluded from macro P/R/F1/accuracy
    expect(agg.macro.precision).toBeCloseTo(0.25, 10);
    expect(agg.macro.recall).toBeCloseTo(1 / 3, 10);
    expect(agg.macro.f1).toBeCloseTo(0.2857142857, 8);
    expect(agg.macro.accuracy).toBeCloseTo(1 / 3, 10);
    expect(agg.scorableRecords).toBe(1);
  });

  it('reports latency p50 / p95 / mean / max', () => {
    expect(agg.latency.meanMs).toBeCloseTo(20, 10);
    expect(agg.latency.maxMs).toBe(30);
    expect(agg.latency.p50Ms).toBe(10);
    expect(agg.latency.p95Ms).toBe(30);
  });

  it('returns null (not 0) when there is nothing scorable at all', () => {
    const none = aggregate([
      computeRecordMetrics({
        id: 'z', kind: 'identity', gold: identity({}), pred: identity({}),
        fields: [...ID], ms: 1, strict: false,
      }),
    ]);
    expect(none.scorableRecords).toBe(0);
    expect(none.precision).toBeNull();
    expect(none.recall).toBeNull();
    expect(none.f1).toBeNull();
    expect(none.macro.f1).toBeNull();
    expect(none.accuracy).toBe(1); // still defined: everything was right
    expect(none.exactMatchRate).toBe(1);
  });

  it('is order-independent (same inputs, same outputs)', () => {
    const flipped = aggregate([records[1]!, records[0]!]);
    expect(flipped.counts).toEqual(agg.counts);
    expect(flipped.precision).toBeCloseTo(agg.precision!, 12);
    expect(flipped.latency.p50Ms).toBe(agg.latency.p50Ms);
  });

  it('breaks down by a caller-supplied key', () => {
    const withKeys = records.map((r, i) => ({...r, kind: i === 0 ? 'identity' : 'product'} as const));
    const grouped = aggregate(withKeys, {groupBy: 'kind'});
    const by = grouped.by as Record<string, ReturnType<typeof aggregate>>;
    expect(Object.keys(by).sort()).toEqual(['identity', 'product']);
    expect(by['identity']!.records).toBe(1);
    expect(by['product']!.records).toBe(1);
    expect(by['product']!.exactMatchRate).toBe(1);
  });
});

/**
 * Calibration — spec §4 says `verified` means "LLM-sourced" and
 * `low_confidence` means "regex-sourced / check this". The eval must be able to
 * answer: does `low_confidence` actually predict a wrong field, and does a
 * `verified` field ever turn out wrong?
 */
describe('flag calibration', () => {
  const gold = identity({
    name: 'Ramesh Kumar',
    phone: '9876543210',
    location: 'Bastar',
  });
  const pred = identity({
    name: 'Ramesh Kumar', // correct      -> verified
    phone: '12345', // wrong          -> low_confidence
    craft: 'Handloom', // hallucination -> verified
    // artisanId / location / pin remain null
  });
  const flags: Record<string, FieldFlag> = {
    name: 'verified',
    phone: 'low_confidence',
    craft: 'verified',
    artisanId: 'missing',
    location: 'missing',
    pin: 'missing',
  };

  const m = computeRecordMetrics({
    id: 'cal',
    kind: 'identity',
    gold,
    pred,
    fields: [...ID],
    flags,
    ms: 5,
    strict: false,
  });

  it('tallies predicted-non-null fields split by flag', () => {
    expect(m.byFlag).toEqual({
      verified: {predicted: 2, errors: 1, errorRate: 0.5},
      low_confidence: {predicted: 1, errors: 1, errorRate: 1},
    });
    // a `missing` flag always rides on a null prediction -> not calibration evidence
    expect(m.byFlag['missing']).toBeUndefined();
  });

  it('leaves byFlag empty when the caller supplies no flags', () => {
    const plain = computeRecordMetrics({
      id: 'plain',
      kind: 'identity',
      gold,
      pred,
      fields: [...ID],
      ms: 5,
      strict: false,
    });
    expect(plain.byFlag).toEqual({});
  });

  describe('aggregate', () => {
    const agg = aggregate([m]);

    it('derives error rates for each trust flag', () => {
      expect(agg.trustErrorRate).toBeCloseTo(0.5, 10); // craft hallucination on a `verified` field
      expect(agg.lowConfErrorRate).toBeCloseTo(1, 10); // phone wrong on a `low_confidence` field
    });

    it('reports what share of all errors the low_confidence flag caught', () => {
      // errors = phone (wrong, flagged) + craft (hallucination, trusted) = 2; caught = 1
      expect(agg.errorCatchRate).toBeCloseTo(0.5, 10);
    });

    it('keeps calibration on grouped aggregates too', () => {
      const grouped = aggregate([m], {groupBy: 'kind'});
      expect(grouped.trustErrorRate).toBeCloseTo(0.5, 10);
      expect((grouped.by as Record<string, typeof agg>)['identity']!.trustErrorRate).toBeCloseTo(
        0.5,
        10
      );
    });

    it('reports 0 (not null) when every trusted field is right', () => {
      const clean = aggregate([
        computeRecordMetrics({
          id: 'clean',
          kind: 'identity',
          gold: identity({name: 'Ramesh Kumar'}),
          pred: identity({name: 'Ramesh Kumar'}),
          fields: [...ID],
          flags: {name: 'verified', phone: 'missing', artisanId: 'missing', location: 'missing', craft: 'missing', pin: 'missing'},
          ms: 1,
          strict: false,
        }),
      ]);
      expect(clean.trustErrorRate).toBe(0);
      expect(clean.lowConfErrorRate).toBeNull(); // no low_confidence field at all
      expect(clean.errorCatchRate).toBeNull(); // no errors to catch
    });

    it('returns null everywhere when no flags were captured', () => {
      const none = aggregate([
        computeRecordMetrics({
          id: 'n',
          kind: 'identity',
          gold: identity({}),
          pred: identity({}),
          fields: [...ID],
          ms: 1,
          strict: false,
        }),
      ]);
      expect(none.byFlag).toEqual({});
      expect(none.trustErrorRate).toBeNull();
      expect(none.lowConfErrorRate).toBeNull();
      expect(none.errorCatchRate).toBeNull();
    });
  });
});
