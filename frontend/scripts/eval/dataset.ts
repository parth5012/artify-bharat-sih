/**
 * JSONL dataset loader — parse, validate, dedupe and filter eval records.
 *
 * Format: one JSON object per line. Blank lines and lines starting with `#`
 * are ignored so the DB can be hand-edited. Every failure reports the source
 * file and 1-based line number instead of a raw zod blob.
 */
import {readFileSync} from 'fs';
import {z} from 'zod';
import {EvalRecordSchema, type EvalRecord} from './schema';

export class EvalDatasetError extends Error {
  readonly source: string;
  readonly line: number | null;

  constructor(message: string, source: string, line: number | null = null) {
    super(line === null ? `${source}: ${message}` : `${source} (line ${line}): ${message}`);
    this.name = 'EvalDatasetError';
    this.source = source;
    this.line = line;
  }
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.length > 0 ? i.path.join('.') : '(root)'}: ${i.message}`)
    .join('; ');
}

/** Parse JSONL text into records. Throws EvalDatasetError with a line number. */
export function parseJsonl(text: string, source: string): EvalRecord[] {
  const records: EvalRecord[] = [];
  const seen = new Map<string, number>();

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const lineNo = i + 1;

    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch (e) {
      throw new EvalDatasetError(
        `invalid JSON (${e instanceof Error ? e.message : String(e)})`,
        source,
        lineNo
      );
    }

    const parsed = EvalRecordSchema.safeParse(data);
    if (!parsed.success) {
      throw new EvalDatasetError(
        `invalid record — ${formatZodError(parsed.error)}`,
        source,
        lineNo
      );
    }

    const previous = seen.get(parsed.data.id);
    if (previous !== undefined) {
      throw new EvalDatasetError(
        `duplicate id "${parsed.data.id}" (first seen on line ${previous})`,
        source,
        lineNo
      );
    }
    seen.set(parsed.data.id, lineNo);
    records.push(parsed.data);
  }

  if (records.length === 0) {
    throw new EvalDatasetError('dataset contains no records', source);
  }
  return records;
}

/** Read and parse a JSONL dataset from disk. */
export function loadDataset(filePath: string): EvalRecord[] {
  let text: string;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch {
    throw new EvalDatasetError('dataset not found or unreadable', filePath);
  }
  return parseJsonl(text, filePath);
}

export type ValidationResult =
  | {ok: true; record: EvalRecord}
  | {ok: false; errors: string[]};

/** Non-throwing single-record validation (used by tests and the converter). */
export function validateRecord(data: unknown): ValidationResult {
  const parsed = EvalRecordSchema.safeParse(data);
  if (parsed.success) return {ok: true, record: parsed.data};
  return {ok: false, errors: formatZodError(parsed.error).split('; ')};
}

export interface DatasetFilter {
  kind?: EvalRecord['kind'];
  language?: string;
  tag?: string[];
  limit?: number;
}

/** Filter by kind / language / tag, then apply `limit`. Throws when nothing matches. */
export function filterRecords(records: EvalRecord[], filter: DatasetFilter): EvalRecord[] {
  const tags = filter.tag ?? [];
  let out = records.filter((r) => {
    if (filter.kind !== undefined && r.kind !== filter.kind) return false;
    if (filter.language !== undefined && r.language !== filter.language) return false;
    if (tags.length > 0 && !tags.every((t) => r.tags.includes(t))) return false;
    return true;
  });
  if (filter.limit !== undefined && filter.limit >= 0) out = out.slice(0, filter.limit);
  if (out.length === 0) {
    const bits: string[] = [];
    if (filter.kind !== undefined) bits.push(`kind=${filter.kind}`);
    if (filter.language !== undefined) bits.push(`language=${filter.language}`);
    if (tags.length > 0) bits.push(`tags=${tags.join('+')}`);
    if (filter.limit !== undefined) bits.push(`limit=${filter.limit}`);
    throw new Error(`no records match filter${bits.length > 0 ? ` (${bits.join(', ')})` : ''}`);
  }
  return out;
}
