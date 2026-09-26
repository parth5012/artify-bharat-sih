/**
 * .env.local loader for the eval CLI (TDD red first).
 *
 * Next.js loads `frontend/.env.local` automatically for `/api/extract`, but the
 * eval runner is compiled to plain JS and executed under bare `node`, so
 * `npm run eval:live` would otherwise always fail-fast with
 * "no provider key configured" even with keys on disk.
 */
import {existsSync, mkdtempSync, rmSync, writeFileSync} from 'fs';
import {tmpdir} from 'os';
import path from 'path';
import {loadEnvFile, loadEnvLocal, type EnvTarget} from '../scripts/eval/env';
import {fromAppRoot} from '../scripts/eval/paths';

function withEnvFile(contents: string): {file: string; cleanup: () => void} {
  const dir = mkdtempSync(path.join(tmpdir(), 'eval-env-'));
  const file = path.join(dir, '.env.local');
  writeFileSync(file, contents);
  return {file, cleanup: () => rmSync(dir, {recursive: true, force: true})};
}

describe('loadEnvFile', () => {
  it('is a no-op when the file does not exist', () => {
    const target: EnvTarget = {};
    const result = loadEnvFile(path.join(tmpdir(), 'definitely-missing.env.local'), target);

    expect(result).toEqual({loaded: [], skipped: [], malformed: []});
    expect(target).toEqual({});
  });

  it('parses bare, exported and quoted values, ignoring comments and blanks', () => {
    const {file, cleanup} = withEnvFile(
      ['# comment line', '', 'PLAIN=value_one', 'export EXPORTED="quoted value"', "SINGLE='single quoted'", 'CRLF=line\r'].join('\n')
    );
    const target: EnvTarget = {};
    const result = loadEnvFile(file, target);
    cleanup();

    expect(result.loaded.sort()).toEqual(['CRLF', 'EXPORTED', 'PLAIN', 'SINGLE']);
    expect(result.malformed).toEqual([]);
    expect(target.PLAIN).toBe('value_one');
    expect(target.EXPORTED).toBe('quoted value');
    expect(target.SINGLE).toBe('single quoted');
    expect(target.CRLF).toBe('line');
  });

  it('never overrides a value already present in the target env', () => {
    const {file, cleanup} = withEnvFile('EXISTING=fresh\nFRESH=new\n');
    const target: EnvTarget = {EXISTING: 'original'};
    const result = loadEnvFile(file, target);
    cleanup();

    expect(target.EXISTING).toBe('original');
    expect(result.skipped).toEqual(['EXISTING']);
    expect(result.loaded).toEqual(['FRESH']);
  });

  it('reports malformed lines as line numbers instead of throwing', () => {
    const {file, cleanup} = withEnvFile('NO_EQUALS_HERE\n123BAD=x\nGOOD=yes\n');
    const target: EnvTarget = {};
    const result = loadEnvFile(file, target);
    cleanup();

    expect(result.malformed).toEqual([1, 2]);
    expect(result.loaded).toEqual(['GOOD']);
    expect(target.GOOD).toBe('yes');
  });

  it('reports key names only, never values', () => {
    const secret = 'sk-live-super-secret-42';
    const {file, cleanup} = withEnvFile(`GROQ_API_KEY=${secret}\nBAD LINE\n`);
    const result = loadEnvFile(file, {});
    cleanup();

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(secret);
    expect(serialized).toContain('GROQ_API_KEY');
    expect(result.malformed).toEqual([2]);
  });
});

describe('loadEnvLocal', () => {
  it('targets <appRoot>/.env.local and never throws', () => {
    const target: EnvTarget = {};
    const result = loadEnvLocal(target);

    expect(result).toEqual({
      loaded: expect.any(Array),
      skipped: expect.any(Array),
      malformed: expect.any(Array),
    });
    for (const key of [...result.loaded, ...result.skipped]) {
      expect(key).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/);
    }
  });

  it('assigns provider keys when .env.local is present', () => {
    const target: EnvTarget = {};
    loadEnvLocal(target);

    if (existsSync(path.join(fromAppRoot('.env.local')))) {
      expect(Object.keys(target).length).toBeGreaterThan(0);
    } else {
      expect(target).toEqual({});
    }
  });
});
