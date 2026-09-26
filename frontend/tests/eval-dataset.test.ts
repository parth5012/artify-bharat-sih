/**
 * Eval JSONL dataset — schema + loader (TDD red first).
 * Standards: AGENTS.md TDD; docs/extract-api-spec.md §7 fixture shape.
 */
import {existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'fs';
import {tmpdir} from 'os';
import path from 'path';
import {
  EvalDatasetError,
  filterRecords,
  loadDataset,
  parseJsonl,
  validateRecord,
} from '../scripts/eval/dataset';
import {EvalRecordSchema, scoredFieldsFor} from '../scripts/eval/schema';

const baseRecord = {
  id: 'identity-en-full',
  kind: 'identity' as const,
  input: 'My name is Ramesh Kumar.',
  gold: {
    name: 'Ramesh Kumar',
    phone: '9876543210',
    artisanId: 'ART-2041',
    location: 'Bastar',
    craft: null,
    pin: null,
  },
};

describe('eval record schema', () => {
  it('accepts a minimal identity record (defaults applied)', () => {
    const parsed = EvalRecordSchema.parse(baseRecord);
    expect(parsed.inputSource).toBe('transcript');
    expect(parsed.tags).toEqual([]);
    expect(parsed.language).toBeUndefined();
    expect(parsed.llm).toBeUndefined();
  });

  it('accepts a product record with array-valued materials', () => {
    const parsed = EvalRecordSchema.parse({
      id: 'product-en-dhokra',
      kind: 'product',
      input: 'Dhokra elephant.',
      inputSource: 'transcript',
      language: 'en',
      tags: ['golden', 'product'],
      gold: {
        productName: 'Dhokra Brass Elephant Figurine',
        materials: ['Brass', 'Beeswax'],
        makingProcess: 'Lost-wax casting',
        usage: 'Home decor',
        timeRequired: '5 days',
        craftCategory: 'Dhokra Brass & Bell Metal Craft',
        description: 'A brass elephant.',
      },
      llm: {productName: null, materials: null, makingProcess: null,
        usage: null, timeRequired: null, craftCategory: null, description: null},
    });
    expect(parsed.gold['materials']).toEqual(['Brass', 'Beeswax']);
    expect(parsed.llm).toBeDefined();
  });

  it('rejects a record whose gold is missing a required field', () => {
    const {name: _dropped, ...goldWithoutName} = baseRecord.gold;
    expect(() =>
      EvalRecordSchema.parse({...baseRecord, gold: goldWithoutName})
    ).toThrow();
  });

  it('rejects a record with an unknown gold field (typo guard)', () => {
    expect(() =>
      EvalRecordSchema.parse({
        ...baseRecord,
        gold: {...baseRecord.gold, naem: 'Ramesh Kumar'},
      })
    ).toThrow();
  });

  it('rejects a non-string gold value for a string field', () => {
    expect(() =>
      EvalRecordSchema.parse({...baseRecord, gold: {...baseRecord.gold, phone: 9876543210}})
    ).toThrow();
  });

  it('rejects an empty id and an invalid kind', () => {
    expect(() => EvalRecordSchema.parse({...baseRecord, id: ''})).toThrow();
    expect(() => EvalRecordSchema.parse({...baseRecord, kind: 'price'})).toThrow();
  });

  it('rejects an input longer than the 4000-char route budget', () => {
    expect(() =>
      EvalRecordSchema.parse({...baseRecord, input: 'x'.repeat(4001)})
    ).toThrow();
  });

  it('rejects a canned llm payload that fails the provider schema', () => {
    expect(() =>
      EvalRecordSchema.parse({...baseRecord, llm: {phone: 12345}})
    ).toThrow();
  });

  it('scoredFieldsFor excludes product description, includes all identity fields', () => {
    expect(scoredFieldsFor('identity')).toEqual([
      'name', 'phone', 'artisanId', 'location', 'craft', 'pin',
    ]);
    expect(scoredFieldsFor('product')).not.toContain('description');
    expect(scoredFieldsFor('product')).toContain('materials');
  });
});

describe('parseJsonl', () => {
  it('parses one record per line and skips blank lines and # comments', () => {
    const text =
      '# my dataset\n' +
      JSON.stringify(baseRecord) + '\n' +
      '\n' +
      JSON.stringify({...baseRecord, id: 'second'}) + '\n';
    const records = parseJsonl(text, 'mem.jsonl');
    expect(records.map((r) => r.id)).toEqual(['identity-en-full', 'second']);
  });

  it('throws EvalDatasetError carrying the offending line number', () => {
    const text = JSON.stringify(baseRecord) + '\n{"id": "broken"\n';
    let caught: unknown;
    try {
      parseJsonl(text, 'mem.jsonl');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(EvalDatasetError);
    expect((caught as EvalDatasetError).line).toBe(2);
    expect((caught as EvalDatasetError).source).toBe('mem.jsonl');
  });

  it('rejects duplicate ids', () => {
    const text =
      JSON.stringify(baseRecord) + '\n' + JSON.stringify(baseRecord) + '\n';
    expect(() => parseJsonl(text, 'mem.jsonl')).toThrow(/duplicate id/i);
  });

  it('reports schema failures with their line number, not the raw zod blob', () => {
    const bad = JSON.stringify({...baseRecord, gold: {name: 'x'}});
    expect(() => parseJsonl(bad + '\n', 'mem.jsonl')).toThrow(/line 1/);
  });
});

describe('loadDataset / validateRecord / filterRecords', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'eval-ds-'));
    mkdirSync(dir, {recursive: true});
    writeFileSync(
      path.join(dir, 'a.jsonl'),
      [
        JSON.stringify({...baseRecord, kind: 'identity', language: 'en', tags: ['golden']}),
        JSON.stringify({
          ...baseRecord,
          id: 'identity-hi-full',
          language: 'hi',
          tags: ['golden', 'hindi'],
        }),
        JSON.stringify({
          id: 'product-en-dhokra',
          kind: 'product',
          input: 'Dhokra elephant.',
          language: 'en',
          tags: ['golden'],
          gold: {
            productName: 'Dhokra Elephant', materials: ['Brass'], makingProcess: 'x',
            usage: 'y', timeRequired: '5 days', craftCategory: 'z', description: null,
          },
        }),
      ].join('\n') + '\n',
      'utf8'
    );
  });

  afterAll(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('loadDataset reads a JSONL file from disk', () => {
    const records = loadDataset(path.join(dir, 'a.jsonl'));
    expect(records).toHaveLength(3);
    expect(records[0]!.id).toBe('identity-en-full');
  });

  it('loadDataset surfaces a friendly error for a missing file', () => {
    expect(() => loadDataset(path.join(dir, 'nope.jsonl'))).toThrow(/not found/);
  });

  it('validateRecord returns ok/errors rather than throwing', () => {
    const ok = validateRecord({...baseRecord, id: 'ok'});
    expect(ok.ok).toBe(true);
    const bad = validateRecord({...baseRecord, id: 'bad', gold: {name: 'x'}});
    expect(bad.ok).toBe(false);
  });

  it('filterRecords filters by kind, tag and language', () => {
    const records = loadDataset(path.join(dir, 'a.jsonl'));
    expect(filterRecords(records, {kind: 'product'})).toHaveLength(1);
    expect(filterRecords(records, {tag: ['hindi']})).toHaveLength(1);
    expect(filterRecords(records, {language: 'en'})).toHaveLength(2);
    expect(
      filterRecords(records, {kind: 'identity', tag: ['golden'], language: 'en'})
    ).toHaveLength(1);
  });

  it('filterRecords applies limit last and is idempotent without filters', () => {
    const records = loadDataset(path.join(dir, 'a.jsonl'));
    expect(filterRecords(records, {})).toHaveLength(3);
    expect(filterRecords(records, {limit: 2})).toHaveLength(2);
  });

  it('filterRecords rejects an empty result set with a clear message', () => {
    const records = loadDataset(path.join(dir, 'a.jsonl'));
    expect(() => filterRecords(records, {kind: 'price' as never})).toThrow(
      /no records match/
    );
  });

  it('wiring sanity: the fixture golden dir exists for the converter', () => {
    expect(existsSync(path.join(__dirname, '..', 'tests', '__fixtures__', 'extract', 'golden'))).toBe(true);
  });
});
