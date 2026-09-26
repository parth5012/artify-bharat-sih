import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

// Infra guard for Wayfinder #191 (ONDC Beckn sandbox sidecar). Runs without
// docker (grill A3): it parses docker-compose.yml directly, so CI proves the
// sidecar topology, ports, digest pins and env hygiene on every run while a
// live `docker compose up` stays a manual demo step.

const REPO = path.resolve(__dirname, '..', '..');
const COMPOSE_PATH = path.join(REPO, 'docker-compose.yml');
const ENV_EXAMPLE_PATH = path.join(REPO, 'frontend', '.env.example');
const DEPLOY_GUIDE_PATH = path.join(REPO, 'docs', 'deployment-guide.md');

const SANDBOX_SERVICE = 'beckn_sandbox';
const SANDBOX_HOST_PORT = 3100;
const SANDBOX_CONTAINER_PORT = 3000;
const GATEWAY_SERVICE = 'ondc_gateway';
const REGISTRY_SERVICE = 'ondc_registry';
const ONDC_PROFILE = 'ondc-gateway';
const GATEWAY_URL = `http://localhost:${SANDBOX_HOST_PORT}`;
const STAGING_GATEWAY_URL = 'https://staging.gateway.ondc.org';

type ServiceDef = {
  image?: string;
  build?: string | {context?: string; dockerfile?: string};
  ports?: string[];
  environment?: Record<string, string> | string[];
  profiles?: string[];
  healthcheck?: unknown;
};

type ComposeFile = {services?: Record<string, ServiceDef>};

function loadCompose(): ComposeFile {
  const doc = yaml.load(readFileSync(COMPOSE_PATH, 'utf8'));
  return (doc ?? {}) as ComposeFile;
}

function envMap(service: ServiceDef): Record<string, string> {
  const env = service.environment ?? {};
  if (Array.isArray(env)) {
    const map: Record<string, string> = {};
    for (const entry of env) {
      const idx = entry.indexOf('=');
      if (idx === -1) continue;
      map[entry.slice(0, idx)] = entry.slice(idx + 1);
    }
    return map;
  }
  const map: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) map[key] = String(value ?? '');
  return map;
}

describe('ONDC Beckn sandbox compose sidecar (#191)', () => {
  it('docker-compose.yml is valid YAML with a services map', () => {
    const compose = loadCompose();
    expect(typeof compose.services).toBe('object');
    expect(compose.services).not.toBeNull();
    expect(Object.keys(compose.services ?? {}).length).toBeGreaterThan(0);
  });

  it('declares the beckn_sandbox mock BPP on the documented port with a healthcheck', () => {
    const sandbox = loadCompose().services?.[SANDBOX_SERVICE];
    expect(sandbox).toBeDefined();
    expect(sandbox?.ports).toContain(`${SANDBOX_HOST_PORT}:${SANDBOX_CONTAINER_PORT}`);
    expect(envMap(sandbox as ServiceDef).PORT).toBe(String(SANDBOX_CONTAINER_PORT));
    expect(sandbox?.healthcheck).toBeDefined();
  });

  it('builds the sandbox from a commit-pinned beckn-sandbox ref', () => {
    const build = loadCompose().services?.[SANDBOX_SERVICE]?.build;
    expect(typeof build).toBe('object');
    const context = (build as {context?: string}).context ?? '';
    expect(context).toContain('github.com/beckn/beckn-sandbox');
    expect(context).toMatch(/#[0-9a-f]{40}$/);
    expect((build as {dockerfile?: string}).dockerfile).toBe('Dockerfile');
  });

  it('pins the gateway and registry images by digest behind the optional profile', () => {
    const services = loadCompose().services ?? {};
    for (const name of [GATEWAY_SERVICE, REGISTRY_SERVICE]) {
      const service = services[name];
      expect(service).toBeDefined();
      expect(service?.image).toMatch(/@sha256:[0-9a-f]{64}$/);
      expect(service?.profiles).toContain(ONDC_PROFILE);
    }
  });

  it('keeps secret-shaped values out of the sidecar environment', () => {
    const services = loadCompose().services ?? {};
    const sidecars = [SANDBOX_SERVICE, GATEWAY_SERVICE, REGISTRY_SERVICE]
      .map((name) => services[name])
      .filter((service): service is ServiceDef => Boolean(service));
    expect(sidecars.length).toBe(3);

    const secretKey = /(TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY|PRIVATE)/i;
    const secretValue = /^[A-Za-z0-9+/=_-]{24,}$/;
    const violations: string[] = [];
    for (const service of sidecars) {
      for (const [key, value] of Object.entries(envMap(service))) {
        if (secretKey.test(key) && value.length > 0) violations.push(`${key}=${value}`);
        else if (secretValue.test(value)) violations.push(`${key}=${value}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('defaults ONDC_GATEWAY_URL to the local sandbox and documents the staging switch', () => {
    expect(existsSync(ENV_EXAMPLE_PATH)).toBe(true);
    const envExample = readFileSync(ENV_EXAMPLE_PATH, 'utf8');
    expect(envExample).toContain(`ONDC_GATEWAY_URL=${GATEWAY_URL}`);
    expect(envExample).toContain(STAGING_GATEWAY_URL);

    // Server-only ONDC seller/webhook vars must survive env changes (#191).
    for (const key of ['ONDC_SELLER_LISTING_URL', 'ONDC_SELLER_TOKEN', 'ONDC_WEBHOOK_SECRET']) {
      expect(envExample).toContain(`${key}=`);
    }
  });

  it('deployment guide documents the local sandbox boot and the signing/registry pointers', () => {
    expect(existsSync(DEPLOY_GUIDE_PATH)).toBe(true);
    const guide = readFileSync(DEPLOY_GUIDE_PATH, 'utf8');
    expect(guide).toContain(`docker compose up ${SANDBOX_SERVICE}`);
    expect(guide).toContain('https://github.com/beckn/beckn-sandbox.git');
    expect(guide).toContain('https://github.com/beckn/protocol-server');
    expect(guide).toContain(STAGING_GATEWAY_URL);
  });
});
