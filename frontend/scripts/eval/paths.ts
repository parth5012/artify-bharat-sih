/**
 * Path helpers — the compiled runner lives in frontend/.tmp/eval-dist but must
 * resolve datasets/outputs against the app root regardless of where it was
 * invoked from (npm scripts run in frontend/; a bare `node …` may not).
 */
import {readFileSync} from 'fs';
import path from 'path';

const APP_PACKAGE_NAME = 'artify-artisan-pwa';

function isAppRoot(dir: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as {
      name?: unknown;
    };
    return pkg.name === APP_PACKAGE_NAME;
  } catch {
    return false;
  }
}

/** Directory containing frontend/package.json (falls back to cwd). */
export function appRoot(): string {
  const start = process.cwd();
  const candidates: string[] = [];
  let dir = start;
  for (let i = 0; i < 8; i++) {
    candidates.push(dir, path.join(dir, 'frontend'));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  for (const candidate of candidates) {
    if (isAppRoot(candidate)) return candidate;
  }
  return start;
}

/** Resolve a path relative to the app root (absolute paths pass through). */
export function fromAppRoot(...segments: string[]): string {
  const joined = path.join(...segments);
  return path.isAbsolute(joined) ? joined : path.resolve(appRoot(), joined);
}
