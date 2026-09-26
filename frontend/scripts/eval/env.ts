/**
 * Minimal `.env.local` loader for the eval CLI.
 *
 * Next.js loads `frontend/.env.local` automatically when `/api/extract` runs,
 * but the compiled runner is executed under bare `node`, so `npm run eval:live`
 * would otherwise always fail-fast with "no provider key configured" even when
 * keys are on disk.
 *
 * dotenv semantics: a value already present in the target always wins. Nothing
 * is ever logged — malformed lines are reported as line numbers only, since the
 * raw line could contain a secret.
 */
import {readFileSync} from 'fs';
import path from 'path';
import {fromAppRoot} from './paths';

/**
 * Key/value bag (`process.env` by default). Deliberately not `NodeJS.ProcessEnv`,
 * which Next.js augments with a required `NODE_ENV` — that makes an empty object
 * untestable, and the loader only ever needs index access.
 */
export type EnvTarget = Record<string, string | undefined>;

export interface EnvLoadResult {
  /** Keys newly assigned to the target env. */
  loaded: string[];
  /** Keys skipped because the target already held a value. */
  skipped: string[];
  /** 1-based line numbers that could not be parsed. */
  malformed: number[];
}

type ParsedLine =
  | {kind: 'entry'; key: string; value: string}
  | {kind: 'skip'}
  | {kind: 'malformed'};

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function parseLine(raw: string): ParsedLine {
  const line = raw.trim();
  if (line === '' || line.startsWith('#')) return {kind: 'skip'};

  const body = line.startsWith('export ') ? line.slice(7).trim() : line;
  const eq = body.indexOf('=');
  if (eq <= 0) return {kind: 'malformed'};

  const key = body.slice(0, eq).trim();
  if (!KEY_PATTERN.test(key)) return {kind: 'malformed'};

  let value = body.slice(eq + 1).trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' || first === "'") && last === first) value = value.slice(1, -1);
  }
  return {kind: 'entry', key, value};
}

/** Load a dotenv-style file into `target` (defaults to `process.env`). */
export function loadEnvFile(filePath: string, target: EnvTarget = process.env): EnvLoadResult {
  const result: EnvLoadResult = {loaded: [], skipped: [], malformed: []};

  let contents: string;
  try {
    contents = readFileSync(filePath, 'utf8');
  } catch {
    return result; // absent file is a no-op, not an error
  }

  const lines = contents.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseLine(lines[i]);
    if (parsed.kind === 'malformed') {
      result.malformed.push(i + 1);
      continue;
    }
    if (parsed.kind === 'skip') continue;
    if (target[parsed.key] !== undefined) {
      result.skipped.push(parsed.key);
      continue;
    }
    target[parsed.key] = parsed.value;
    result.loaded.push(parsed.key);
  }
  return result;
}

/** Load `<appRoot>/.env.local` if it exists. */
export function loadEnvLocal(target: EnvTarget = process.env): EnvLoadResult {
  return loadEnvFile(fromAppRoot('.env.local'), target);
}
