/**
 * Eval record schema — the JSONL database contract for transcript → structured extraction evals.
 *
 * One JSON object per line. Ground truth lives in `gold` (field value or null);
 * a canned provider payload for the offline `canned` pipeline lives in `llm`.
 * Field sets are imported from lib/extract.ts so the eval can never drift from
 * the pipeline it measures.
 */
import {z} from 'zod';
import {
  ExtractKindSchema,
  IDENTITY_FIELDS,
  PRODUCT_FIELDS,
  PRODUCT_SCORED,
  identityLlmSchema,
  productLlmSchema,
  type ExtractKind,
  type LlmPayload,
} from '../../lib/extract';

/** Spec §2 request bound — a record that would 413 must not enter the DB. */
export const MAX_INPUT_CHARS = 4_000;

export type GoldValue = string | string[] | null;
export type GoldRecord = Record<string, GoldValue>;

export interface EvalRecord {
  id: string;
  kind: ExtractKind;
  input: string;
  inputSource: 'transcript' | 'translation';
  language?: string;
  tags: string[];
  gold: GoldRecord;
  /** Optional canned provider payload; required only by the `canned` pipeline. */
  llm?: LlmPayload;
  /** Free-form provenance (e.g. `{golden: '<fixture id>'}`). */
  meta?: Record<string, unknown>;
}

/** Every field the pipeline may populate for this kind. */
export function allFieldsFor(kind: ExtractKind): readonly string[] {
  return kind === 'identity' ? IDENTITY_FIELDS : PRODUCT_FIELDS;
}

/** Fields that count toward scored metrics (`description` excluded — §4 parity). */
export function scoredFieldsFor(kind: ExtractKind): readonly string[] {
  return kind === 'identity' ? IDENTITY_FIELDS : PRODUCT_SCORED;
}

/** Fields excluded from the scored set (reported separately). */
export function unscoredFieldsFor(kind: ExtractKind): readonly string[] {
  return allFieldsFor(kind).filter((f) => !scoredFieldsFor(kind).includes(f));
}

const ARRAY_GOLD_FIELDS = new Set(['materials']);

function goldIssue(path: (string | number)[], message: string): z.ZodIssue {
  return {code: z.ZodIssueCode.custom, path, message};
}

export const EvalRecordSchema = z
  .object({
    id: z.string().min(1),
    kind: ExtractKindSchema,
    input: z.string().max(MAX_INPUT_CHARS),
    inputSource: z.enum(['transcript', 'translation']).default('transcript'),
    language: z.string().min(2).max(8).optional(),
    tags: z.array(z.string().min(1)).default([]),
    gold: z.record(z.unknown()),
    llm: z.unknown().optional(),
    meta: z.record(z.unknown()).optional(),
  })
  .superRefine((rec, ctx) => {
    const fields = allFieldsFor(rec.kind);

    for (const field of fields) {
      if (!(field in rec.gold)) {
        ctx.addIssue(
          goldIssue(
            ['gold', field],
            `missing gold field "${field}" (kind "${rec.kind}" requires: ${fields.join(', ')})`
          )
        );
        continue;
      }
      const value = rec.gold[field];
      const wantsArray = ARRAY_GOLD_FIELDS.has(field);
      const ok = value === null || (wantsArray ? isArrayOfStrings(value) : typeof value === 'string');
      if (!ok) {
        ctx.addIssue(
          goldIssue(
            ['gold', field],
            `gold.${field} must be ${wantsArray ? 'string[] | null' : 'string | null'}`
          )
        );
      }
    }

    for (const key of Object.keys(rec.gold)) {
      if (!fields.includes(key)) {
        ctx.addIssue(
          goldIssue(['gold', key], `unknown gold field "${key}" for kind "${rec.kind}"`)
        );
      }
    }

    if (rec.llm !== undefined) {
      const schema = rec.kind === 'identity' ? identityLlmSchema : productLlmSchema;
      const parsed = schema.safeParse(rec.llm);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['llm', ...issue.path],
            message: `canned llm payload: ${issue.message}`,
          });
        }
      }
    }
  })
  .transform((rec) => rec as unknown as EvalRecord);

function isArrayOfStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

export type EvalRecordInput = z.input<typeof EvalRecordSchema>;

/** Parse a single JSONL line object; throws ZodError on contract violations. */
export function parseEvalRecord(data: unknown): EvalRecord {
  return EvalRecordSchema.parse(data);
}
