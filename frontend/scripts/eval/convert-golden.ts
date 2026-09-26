/**
 * Convert the golden fixture corpus (spec §7) into the JSONL eval dataset.
 *
 * Gold comes from `expected.llm` — the field values the pipeline is expected to
 * produce in the LLM lane (the §4a merge of model output + regex floor), which
 * is exactly what an eval wants to measure against.
 *
 * CLI:  node .tmp/eval-dist/scripts/eval/convert-golden.js [--dir DIR] [--out FILE]
 */
import {mkdirSync, readFileSync, readdirSync, writeFileSync} from 'fs';
import path from 'path';
import {fromAppRoot} from './paths';
import {EvalRecordSchema, allFieldsFor, type EvalRecord, type GoldValue} from './schema';

export const DEFAULT_GOLDEN_DIR = 'tests/__fixtures__/extract/golden';
export const DEFAULT_DATASET = 'eval/datasets/golden-v1.jsonl';

export interface GoldenFixture {
  id: string;
  kind: 'identity' | 'product';
  input: string;
  inputSource?: string;
  llm?: unknown;
  expected?: {llm?: Record<string, {value?: unknown}>};
}

const DEVANAGARI = /[\u0900-\u097F]/;
const LATIN = /[A-Za-z]/;

/**
 * Language tag: the fixture id wins (a Hindi record still says `ART-5521`,
 * which would otherwise trip Latin detection); script detection is the
 * fallback for ids without a language marker.
 */
export function inferLanguage(id: string, input: string): string {
  const lower = id.toLowerCase();
  if (lower.includes('hien') || lower.includes('mixed')) return 'hien';
  if (/(^|[-_])hi([-_]|$)/.test(lower)) return 'hi';
  const devanagari = DEVANAGARI.test(input);
  const latin = LATIN.test(input);
  if (devanagari && latin) return 'hien';
  if (devanagari) return 'hi';
  return 'en';
}

export function buildEvalRecord(fixture: GoldenFixture): EvalRecord {
  const expectedLlm = fixture.expected?.llm;
  if (expectedLlm === undefined || typeof expectedLlm !== 'object') {
    throw new Error('missing expected.llm');
  }

  const fields = allFieldsFor(fixture.kind);
  const gold: Record<string, GoldValue> = {};
  for (const field of fields) {
    const cell = expectedLlm[field];
    if (cell === undefined || cell === null || typeof cell !== 'object') {
      throw new Error(`expected.llm.${field} is missing`);
    }
    gold[field] = (cell.value ?? null) as GoldValue;
  }

  const candidate = {
    id: fixture.id,
    kind: fixture.kind,
    input: fixture.input,
    inputSource: fixture.inputSource ?? 'transcript',
    language: inferLanguage(fixture.id, fixture.input),
    tags: ['golden', fixture.kind],
    gold,
    llm: fixture.llm,
    meta: {golden: fixture.id},
  };

  const parsed = EvalRecordSchema.safeParse(candidate);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`converted record is invalid — ${detail}`);
  }
  return parsed.data;
}

export function toJsonl(records: readonly EvalRecord[]): string {
  return records.map((r) => JSON.stringify(r)).join('\n') + '\n';
}

export interface ConvertResult {
  records: EvalRecord[];
  written: number;
  out: string;
}

export function convertGoldenDir(dir: string, outFile: string): ConvertResult {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b));
  if (files.length === 0) throw new Error(`${dir}: no golden fixtures found`);

  const seen = new Set<string>();
  const records = files.map((file) => {
    const fixture = JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as GoldenFixture;
    let record: EvalRecord;
    try {
      record = buildEvalRecord(fixture);
    } catch (e) {
      throw new Error(`${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (seen.has(record.id)) throw new Error(`${file}: duplicate id "${record.id}"`);
    seen.add(record.id);
    return record;
  });

  mkdirSync(path.dirname(outFile), {recursive: true});
  writeFileSync(outFile, toJsonl(records), 'utf8');
  return {records, written: records.length, out: outFile};
}

function main(argv: string[]): void {
  let dir = fromAppRoot(DEFAULT_GOLDEN_DIR);
  let out = fromAppRoot(DEFAULT_DATASET);
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--dir' && argv[i + 1]) dir = path.resolve(argv[++i] as string);
    else if (flag === '--out' && argv[i + 1]) out = path.resolve(argv[++i] as string);
    else throw new Error(`unknown or incomplete flag: ${String(flag)}`);
  }
  const result = convertGoldenDir(dir, out);
  console.log(
    `[eval] wrote ${result.written} records to ${path.relative(process.cwd(), result.out)}`
  );
}

const isMain =
  typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module;
if (isMain) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(`[eval] convert-golden failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}
