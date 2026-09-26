import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';

// Guards the Map #136 invariant: Bhashini credentials are server-only.
// Fails the build if a NEXT_PUBLIC_-prefixed Bhashini var appears, if a real
// key value from frontend/.env.local is hardcoded in a tracked file or a
// built client chunk, or if client-bundle code reads BHASHINI_* env vars.
// Needles are assembled by concatenation where the file must not contain the
// literal; client-source detectors are regexes (see CLIENT_ENV_PATTERNS) that
// cover bracket access, quoted keys and destructuring, not just dot access.
// Wayfinder #193 extended the same guard to the server-only ONDC_* vars.

const FRONTEND = path.resolve(__dirname, '..');
const REPO = path.resolve(FRONTEND, '..');
const ENV_LOCAL = path.join(FRONTEND, '.env.local');
const FIXTURES_DIR = path.join(FRONTEND, 'tests', '__fixtures__');
const NEXT_DIR = path.join(FRONTEND, '.next');
const CHUNKS_DIR = path.join(NEXT_DIR, 'static');

const NEXT_PUBLIC_NEEDLE = ['NEXT_PUBLIC', 'BHASHINI'].join('_');
const NEXT_PUBLIC_NEEDLES = [
  NEXT_PUBLIC_NEEDLE,
  ['NEXT_PUBLIC', 'GROQ'].join('_'),
  ['NEXT_PUBLIC', 'OPENROUTER'].join('_'),
  // #193: every ONDC_* var (seller listing, gateway, webhook, checkout) is
  // server-only under frontend/app/api/** and frontend/backend/**.
  ['NEXT_PUBLIC', 'ONDC'].join('_'),
];                                  // each: expect(scanTracked(needle)).toEqual([])
// 1) dot or bracket access off process.env; 2) quoted key literal
// ('BHASHINI_X') wherever it appears (bracket on any object, quoted
// destructuring); 3) bare destructuring `const {BHASHINI_X} = process.env`.
// (2) deliberately also trips on a bare quoted string so a key smuggled
// through a helper cannot hide; false positives on UI copy are accepted
// for a fail-closed secret guard.
// Built per provider prefix via new RegExp so this file never contains the
// assembled literals (same fail-closed concatenation as the needles above).
const CLIENT_ENV_PREFIXES = ['BHASHINI', 'GROQ', 'OPENROUTER', 'ONDC'] as const;
function clientEnvPatterns(prefix: string): RegExp[] {
  return [
    new RegExp(`process\\.env(?:\\.${prefix}|\\[['"]${prefix})`),
    new RegExp(`['"]${prefix}_[A-Z_]+['"]`),
    new RegExp(`(?:const|let|var)\\s*\\{[^}]*\\b${prefix}_[A-Z_]+[^}]*\\}\\s*=\\s*process\\.env`),
  ];
}
const CLIENT_ENV_PATTERNS: RegExp[] = CLIENT_ENV_PREFIXES.flatMap((prefix) => clientEnvPatterns(prefix));
// #193 explicit ONDC needles so the guard's ONDC coverage is visible (and the
// dedicated tests below can fail by name) in addition to the shared prefixes.
const ONDC_NEEDLE = ['NEXT_PUBLIC', 'ONDC'].join('_');
const CLIENT_ONDC_PATTERNS: RegExp[] = clientEnvPatterns('ONDC');
// Any import style: from '...', side-effect import '...', dynamic import('...').
const SERVER_IMPORT_NEEDLE = ['backend', 'bhashini'].join('/');
const SERVER_IMPORT_RE = new RegExp(
  `(?:\\bfrom\\s*|\\bimport\\s*\\(?\\s*)['"][^'"]*${SERVER_IMPORT_NEEDLE}['"]`
);
const SECRET_NAMES = [
  'BHASHINI_API_KEY', 'BHASHINI_USER_ID', 'BHASHINI_INFERENCE_API_KEY',
  'GROQ_API_KEY', 'OPENROUTER_API_KEY',
];
const BINARY_EXT = /\.(jpg|jpeg|png|gif|pdf|zip|woff2?|ico|mp4|db|ttf)$/i;
const MAX_SCAN_BYTES = 2_000_000;

function git(args: string[]): string {
  return execFileSync('git', args, {cwd: REPO, encoding: 'utf8'});
}

function trackedFiles(): string[] {
  return git(['ls-files']).split('\n').filter(Boolean);
}

function readSafe(rel: string): string | null {
  if (BINARY_EXT.test(rel)) return null;
  try {
    const abs = path.join(REPO, rel);
    if (statSync(abs).size > MAX_SCAN_BYTES) return null;
    return readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
}

function scanTracked(needle: string): string[] {
  const hits: string[] = [];
  for (const rel of trackedFiles()) {
    const text = readSafe(rel);
    if (text !== null && text.includes(needle)) hits.push(rel);
  }
  return hits;
}

function localKeyValues(): string[] {
  if (!existsSync(ENV_LOCAL)) return [];
  const text = readFileSync(ENV_LOCAL, 'utf8');
  const values: string[] = [];
  for (const name of SECRET_NAMES) {
    const m = text.match(new RegExp(`^${name}=(.*)$`, 'm'));
    const value = m ? m[1].trim() : '';
    if (value.length >= 8) values.push(value);
  }
  return values;
}

// Planted-violation fixtures are scanned from the working tree (they are
// normally untracked, so git ls-files would miss them) so a fixture left
// behind after a red-step demo fails this suite instead of rotting silently.
function fixtureFiles(): string[] {
  if (!existsSync(FIXTURES_DIR)) return [];
  const rels: string[] = [];
  const stack = [FIXTURES_DIR];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    for (const entry of readdirSync(dir)) {
      const abs = path.join(dir, entry);
      if (statSync(abs).isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (BINARY_EXT.test(abs)) continue;
      rels.push(path.relative(REPO, abs));
    }
  }
  return rels;
}

function clientSourceFiles(): string[] {
  const roots = ['frontend/lib/', 'frontend/components/', 'frontend/app/'];
  const tracked = trackedFiles().filter((rel) => {
    if (!roots.some((r) => rel.startsWith(r))) return false;
    if (rel.startsWith('frontend/app/api/')) return false; // server routes
    return !BINARY_EXT.test(rel);
  });
  return [...new Set([...tracked, ...fixtureFiles()])];
}

// Strips type-only imports so value-import checks do not false-positive.
// TS4.5 inline form (`import { type X } from '...'`) is stripped whole ONLY
// when every specifier is `type`-marked; a mixed import still value-imports
// its remaining specifiers, so it is kept and re-checked as a value import.
function stripTypeImports(text: string): string {
  return text
    .replace(/import\s+type\s+\{[^}]*\}\s+from\s*['"][^'"]+['"];?/g, '')
    .replace(/import\s+type\s+[^;]*?from\s*['"][^'"]+['"];?/g, '')
    .replace(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"];?/g, (stmt, specifiers: string) => {
      const specs = specifiers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const allType = specs.length > 0 && specs.every((s) => /^type\s/.test(s));
      return allType ? '' : stmt;
    });
}

describe('Bhashini credentials stay server-side only', () => {
  it('no NEXT_PUBLIC_-prefixed Bhashini var in any tracked file', () => {
    expect(scanTracked(NEXT_PUBLIC_NEEDLE)).toEqual([]);
  });

  it('no NEXT_PUBLIC_-prefixed LLM provider var in any tracked file', () => {
    for (const needle of NEXT_PUBLIC_NEEDLES) expect(scanTracked(needle)).toEqual([]);
  });

  it('frontend/.env.local is git-ignored and not tracked', () => {
    if (!existsSync(ENV_LOCAL)) return;
    let ignored = false;
    try {
      execFileSync('git', ['check-ignore', '-q', 'frontend/.env.local'], {cwd: REPO});
      ignored = true;
    } catch {
      ignored = false;
    }
    expect(ignored).toBe(true);
    expect(git(['ls-files', '--', 'frontend/.env.local']).trim()).toBe('');
  });

  it('frontend/.env.local is mode 0600', () => {
    if (!existsSync(ENV_LOCAL)) return;
    expect(statSync(ENV_LOCAL).mode & 0o077).toBe(0);
  });

  it('no real Bhashini key value hardcoded in any tracked file', () => {
    const keys = localKeyValues();
    if (keys.length === 0) return; // .env.local absent: nothing to compare against
    // full value plus a 16-char prefix to catch truncated/partial copies
    const needles = keys.flatMap((key) => [key, key.slice(0, 16)]);
    const leaks: string[] = [];
    for (const rel of trackedFiles()) {
      const text = readSafe(rel);
      if (text === null) continue;
      if (needles.some((needle) => text.includes(needle))) leaks.push(rel);
    }
    expect([...new Set(leaks)]).toEqual([]);
  });

  it('client-bundle sources never read BHASHINI_* env vars', () => {
    const hits: string[] = [];
    for (const rel of clientSourceFiles()) {
      const text = readSafe(rel);
      if (text !== null && CLIENT_ENV_PATTERNS.some((re) => re.test(text))) hits.push(rel);
    }
    expect(hits).toEqual([]);
  });

  it('no NEXT_PUBLIC_-prefixed ONDC var in any tracked file (#193)', () => {
    expect(scanTracked(ONDC_NEEDLE)).toEqual([]);
  });

  it('client-bundle sources never read ONDC_* env vars (#193)', () => {
    const hits: string[] = [];
    for (const rel of clientSourceFiles()) {
      const text = readSafe(rel);
      if (text !== null && CLIENT_ONDC_PATTERNS.some((re) => re.test(text))) hits.push(rel);
    }
    expect(hits).toEqual([]);
  });

  it('client-bundle sources never value-import the Bhashini server module', () => {
    const hits: string[] = [];
    for (const rel of clientSourceFiles()) {
      const text = readSafe(rel);
      if (text === null || !text.includes(SERVER_IMPORT_NEEDLE)) continue;
      if (SERVER_IMPORT_RE.test(stripTypeImports(text))) hits.push(rel);
    }
    expect(hits).toEqual([]);
  });

  const hasNextBuild = existsSync(NEXT_DIR);
  const hasClientChunks = existsSync(CHUNKS_DIR);
  if (!hasNextBuild) {
    // No build artifacts at all (e.g. fresh clone): nothing to scan.
    console.log(
      '[env-leak] note: no frontend/.next build present — skipping client-chunk scan ' +
        '(run `npm run build` to enable it).'
    );
    it.skip('built client chunks contain no Bhashini secret', () => {});
  } else {
    it('built client chunks contain no Bhashini secret', () => {
      // .next exists but the client bundle dir is missing: a partial/stale
      // build would otherwise let this guard pass vacuously — fail loudly.
      if (!hasClientChunks) {
        throw new Error(
          'frontend/.next exists but frontend/.next/static is missing — run a full ' +
            '`npm run build` before relying on this guard (server-side import/env ' +
            'checks above still cover the source tree).'
        );
      }
      const hits: string[] = [];
      const keyPrefixes = localKeyValues().map((key) => key.slice(0, 16));
      const stack = [CHUNKS_DIR];
      while (stack.length > 0) {
        const dir = stack.pop() as string;
        for (const entry of readdirSync(dir)) {
          const abs = path.join(dir, entry);
          if (statSync(abs).isDirectory()) {
            stack.push(abs);
            continue;
          }
          if (BINARY_EXT.test(abs)) continue;
          const text = readFileSync(abs, 'utf8');
          for (const needle of NEXT_PUBLIC_NEEDLES) {
            if (text.includes(needle)) hits.push(abs);
          }
          for (const prefix of keyPrefixes) {
            if (text.includes(prefix)) hits.push(abs);
          }
        }
      }
      expect([...new Set(hits)]).toEqual([]);
    });
  }

  it('.env.example files contain Bhashini placeholders only', () => {
    const examples = [
      '.env.example',
      'frontend/.env.example',
      'legacy/.env.example',
      'legacy/backend/.env.example',
    ];
    const bad: string[] = [];
    for (const rel of examples) {
      const abs = path.join(REPO, rel);
      if (!existsSync(abs)) continue;
      const text = readFileSync(abs, 'utf8');
      for (const line of text.split('\n')) {
        const m = line.match(/^(?:NEXT_PUBLIC_)?(BHASHINI_(?:API_KEY|USER_ID|INFERENCE_API_KEY|ULCA_API_KEY))=(.*)$/);
        if (!m) continue;
        const value = m[2].trim();
        const placeholder = value === '' || /^(your_|<|change|xxx|placeholder|mock)/i.test(value);
        if (!placeholder) bad.push(`${rel}:${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
