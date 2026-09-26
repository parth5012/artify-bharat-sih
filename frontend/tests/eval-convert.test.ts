/**
 * Golden fixtures → JSONL eval dataset converter (TDD red first).
 * Source of truth: frontend/tests/__fixtures__/extract/golden/*.json (spec §7).
 */
import {mkdtempSync, readFileSync, readdirSync, rmSync} from 'fs';
import {tmpdir} from 'os';
import path from 'path';
import {
  buildEvalRecord,
  convertGoldenDir,
  inferLanguage,
  toJsonl,
  type GoldenFixture,
} from '../scripts/eval/convert-golden';
import {loadDataset, parseJsonl} from '../scripts/eval/dataset';
import {allFieldsFor} from '../scripts/eval/schema';

const GOLDEN_DIR = path.join(__dirname, '..', 'tests', '__fixtures__', 'extract', 'golden');

function readFixture(id: string): GoldenFixture {
  return JSON.parse(readFileSync(path.join(GOLDEN_DIR, `${id}.json`), 'utf8')) as GoldenFixture;
}

describe('inferLanguage', () => {
  it('detects Latin, Devanagari and mixed scripts', () => {
    expect(inferLanguage('x', 'My name is Ramesh Kumar.')).toBe('en');
    expect(inferLanguage('x', 'मेरा नाम शान्ति देवी है।')).toBe('hi');
    expect(
      inferLanguage('x', 'मेरा नाम Sunita Devi है। मैं Jaipur से हूँ।')
    ).toBe('hien');
  });

  it('defaults to en for empty input', () => {
    expect(inferLanguage('identity-empty', '')).toBe('en');
  });
});

describe('buildEvalRecord', () => {
  it('derives gold from expected.llm for an identity fixture', () => {
    const rec = buildEvalRecord(readFixture('identity-en-full'));
    expect(rec.id).toBe('identity-en-full');
    expect(rec.kind).toBe('identity');
    expect(rec.inputSource).toBe('transcript');
    expect(rec.language).toBe('en');
    expect(rec.tags).toEqual(['golden', 'identity']);
    expect(rec.gold['name']).toBe('Ramesh Kumar');
    expect(rec.gold['phone']).toBe('9876543210');
    expect(rec.gold['pin']).toBeNull();
    expect(rec.llm).toBeDefined();
  });

  it('keeps array-valued gold and all 7 product fields', () => {
    const rec = buildEvalRecord(readFixture('product-en-dhokra'));
    expect(rec.kind).toBe('product');
    expect(rec.gold['materials']).toEqual(['Brass', 'Beeswax', 'River clay']);
    expect(Object.keys(rec.gold).sort()).toEqual([...allFieldsFor('product')].sort());
  });

  it('never carries rawTranscript / overallConfidence into gold', () => {
    const rec = buildEvalRecord(readFixture('identity-en-full'));
    expect(rec.gold).not.toHaveProperty('rawTranscript');
    expect(rec.gold).not.toHaveProperty('overallConfidence');
  });

  it('records provenance in meta', () => {
    const rec = buildEvalRecord(readFixture('identity-bad-mt'));
    expect(rec.meta).toEqual({golden: 'identity-bad-mt'});
    expect(rec.inputSource).toBe('translation');
    expect(rec.language).toBe('en');
  });
});

describe('convertGoldenDir', () => {
  let out: string;

  beforeEach(() => {
    out = path.join(mkdtempSync(path.join(tmpdir(), 'eval-out-')), 'golden-v1.jsonl');
  });

  afterEach(() => {
    rmSync(path.dirname(out), {recursive: true, force: true});
  });

  it('converts the whole 12-fixture corpus to a loadable JSONL dataset', () => {
    const result = convertGoldenDir(GOLDEN_DIR, out);
    expect(result.written).toBe(12);

    const records = loadDataset(out);
    expect(records).toHaveLength(12);
    const ids = records.map((r) => r.id).sort();
    const fixtures = readdirSync(GOLDEN_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort();
    expect(ids).toEqual(fixtures);
  });

  it('round-trips through toJsonl without losing types', () => {
    const result = convertGoldenDir(GOLDEN_DIR, out);
    const text = toJsonl(result.records);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.split('\n').filter((l) => l.trim() !== '')).toHaveLength(12);
    const reparsed = parseJsonl(text, 'roundtrip');
    expect(reparsed.map((r) => r.id)).toEqual(result.records.map((r) => r.id));
    expect(reparsed.find((r) => r.id === 'product-en-dhokra')!.gold['materials']).toEqual([
      'Brass', 'Beeswax', 'River clay',
    ]);
  });

  it('tags the mixed Hindi/English records as hien', () => {
    const result = convertGoldenDir(GOLDEN_DIR, out);
    const byId = new Map(result.records.map((r) => [r.id, r]));
    expect(byId.get('identity-hi-full')!.language).toBe('hi');
    expect(byId.get('identity-mixed-hien')!.language).toBe('hien');
    expect(byId.get('product-mixed-hien')!.language).toBe('hien');
    expect(byId.get('product-partial')!.language).toBe('en');
  });

  it('fails loudly when a fixture does not satisfy the record contract', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'eval-bad-'));
    const bad = readFixture('identity-en-full');
    bad.llm = {phone: 12345}; // fails identityLlmSchema
    require('fs').writeFileSync(path.join(dir, 'broken.json'), JSON.stringify(bad));
    expect(() => convertGoldenDir(dir, path.join(dir, 'out.jsonl'))).toThrow(/broken\.json/);
    rmSync(dir, {recursive: true, force: true});
  });
});
