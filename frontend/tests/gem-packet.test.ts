import {emptyDb,Database} from '../backend/db';

// Wayfinder #204 — GeM approval-ready packet route + GEM_* server-only seam.
// TDD red first: no route / no gem.ts exists yet. Guards mirror
// app/api/ondc/listing/route.ts line-for-line (grill G6 + G8). No network:
// packet generation is a pure transform, so `fetch` is never called here.

const fetchMock = jest.fn();
const realFetch = global.fetch;
beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterAll(() => {
  global.fetch = realFetch;
});

const storeHolder: {store: Database} = {store: null as unknown as Database};
jest.mock('../backend/db', () => {
  const actual = jest.requireActual('../backend/db') as typeof import('../backend/db');
  return {
    ...actual,
    readDb: async () => storeHolder.store,
    writeDb: async (next: Database) => {
      storeHolder.store = next;
    },
  };
});
const sessionHolder: {token: string | null} = {token: null};
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) =>
      name === 'artifact_session' && sessionHolder.token ? {value: sessionHolder.token} : undefined,
  }),
}));

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
  });
}

async function login(phone: string, ip: string) {
  const {POST: requestOtp} = await import('../app/api/auth/request-otp/route');
  const {POST: verifyOtp} = await import('../app/api/auth/verify-otp/route');
  const otpRes = await requestOtp(
    new Request('http://x/otp', {
      method: 'POST',
      body: JSON.stringify({phone}),
      headers: {'Content-Type': 'application/json', 'x-forwarded-for': ip},
    }),
  );
  const {devCode} = await otpRes.json();
  const loginRes = await verifyOtp(
    new Request('http://x/otp', {
      method: 'POST',
      body: JSON.stringify({phone, code: devCode}),
      headers: {'Content-Type': 'application/json', 'x-forwarded-for': ip},
    }),
  );
  sessionHolder.token = /artifact_session=([^;]+)/.exec(loginRes.headers.get('set-cookie') ?? '')?.[1] ?? null;
}

async function registerProduct(phone: string, ip: string) {
  await login(phone, ip);
  const {POST: create} = await import('../app/api/products/route');
  const res = await create(
    jsonRequest('http://x/api/products', {
      name: 'Banarasi Silk Saree',
      craft: 'Banarasi Silk',
      description: 'Handwoven on a pit loom with real zari.',
      price: 2500,
      materials: ['Silk'],
    }),
  );
  expect(res.status).toBe(201);
  const data = await res.json();
  fetchMock.mockReset();
  return data.product as {id: string; artisanId: string};
}

beforeEach(() => {
  storeHolder.store = {...emptyDb};
  fetchMock.mockReset();
  sessionHolder.token = null;
  delete process.env.GEM_PORTAL_API_URL;
  delete process.env.GEM_SELLER_TOKEN;
});

describe('getGemEnv() — reserved future-API seam (grill G6)', () => {
  it('reports unconfigured with the exact reason when GEM_PORTAL_API_URL is unset', async () => {
    const {getGemEnv} = await import('../backend/gem');
    expect(getGemEnv()).toEqual({
      configured: false,
      reason: 'GEM_PORTAL_API_URL is not configured',
    });
  });

  it('reports configured when GEM_PORTAL_API_URL is set — and never leaks the token', async () => {
    process.env.GEM_PORTAL_API_URL = 'https://api.example.gov.in/gem';
    process.env.GEM_SELLER_TOKEN = 'secret-seller-token-value';
    const {getGemEnv} = await import('../backend/gem');
    const env = getGemEnv();
    expect(env).toEqual({configured: true, portalUrl: 'https://api.example.gov.in/gem'});
    expect(JSON.stringify(env)).not.toContain('secret-seller-token-value');
  });
});

describe('buildGemPacket() — packet assembly (grill G1)', () => {
  it('assembles catalog + XML + CSV + manifest from a product + artisan', async () => {
    const {buildGemPacket} = await import('../backend/gem');
    const packet = buildGemPacket({
      product: {
        id: 'prd_1',
        parentHash: 'p'.repeat(64),
        childHash: 'c'.repeat(64),
        serialNumber: '1',
        artisanId: 'usr_1',
        name: 'Banarasi Silk Saree',
        craft: 'Banarasi Silk',
        price: 2500,
        description: 'Handwoven on a pit loom with real zari.',
        materials: ['Silk'],
        status: 'published',
        ownership: 'artisan',
        createdAt: 1,
      },
      artisan: {id: 'usr_1', phone: '9', name: 'Ramesh Kumar', artisanId: 'ART-2041', place: 'Varanasi, Uttar Pradesh', createdAt: 1, updatedAt: 1},
      shortcode: 'a7x9b2',
    });
    expect(packet.catalog.product_details.hsn_code).toBe('50072010');
    expect(packet.xml).toContain('<gem_catalog');
    expect(packet.csv.split('\n')[0]).toContain('gem_catalog_version');
    expect(packet.manifest.stage3_price.offerPrice).toBe(2500);
    expect(packet.manifest.stage3_price.mrp).toBe(Math.ceil(2500 / 0.9));
    expect(packet.manifest.passport.shortcode).toBe('A7X-9B2');
    expect(packet.env).toEqual({configured: false, reason: 'GEM_PORTAL_API_URL is not configured'});
    const serialized = JSON.stringify(packet);
    expect(serialized).not.toContain('GEM_SELLER_TOKEN');
    expect(serialized).not.toContain('process.env');
  });
});

describe('POST /api/gem/packet — guards mirror the ONDC listing route (#204)', () => {
  it('requires an authenticated artisan (401)', async () => {
    const {POST} = await import('../app/api/gem/packet/route');
    const res = await POST(jsonRequest('http://x/api/gem/packet', {productId: 'prd_x'}));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a missing productId (400)', async () => {
    await login('9876599301', '10.9.9.31');
    const {POST} = await import('../app/api/gem/packet/route');
    const res = await POST(jsonRequest('http://x/api/gem/packet', {}));
    expect(res.status).toBe(400);
  });

  it('404s an unknown product', async () => {
    await login('9876599302', '10.9.9.32');
    const {POST} = await import('../app/api/gem/packet/route');
    const res = await POST(jsonRequest('http://x/api/gem/packet', {productId: 'prd_missing'}));
    expect(res.status).toBe(404);
  });

  it('403s a product owned by another artisan (dual identifier rule)', async () => {
    await login('9876599303', '10.9.9.33');
    storeHolder.store.products.push({
      id: 'prd_other', parentHash: 'a'.repeat(64), childHash: 'b'.repeat(64), serialNumber: '1',
      artisanId: 'usr_someone_else', name: 'Other craft', craft: 'metal', price: 1,
      description: 'd', materials: [], status: 'published', ownership: 'artisan', createdAt: Date.now(),
    });
    const {POST} = await import('../app/api/gem/packet/route');
    const res = await POST(jsonRequest('http://x/api/gem/packet', {productId: 'prd_other'}));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the packet + unconfigured verdict and audits product.gem_packet', async () => {
    const product = await registerProduct('9876599304', '10.9.9.34');
    const {POST} = await import('../app/api/gem/packet/route');
    const res = await POST(jsonRequest('http://x/api/gem/packet', {productId: product.id}));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.gem.catalog.product_details.hsn_code).toBe('50072010');
    expect(data.gem.xml).toContain('</gem_catalog>');
    expect(data.gem.manifest.manual_upload_note).toContain('gem.gov.in');
    expect(data.gem.env).toEqual({configured: false, reason: 'GEM_PORTAL_API_URL is not configured'});
    expect(fetchMock).not.toHaveBeenCalled();

    const audits = storeHolder.store.auditLogs.filter(
      (x) => x.action === 'product.gem_packet' && x.target === product.id,
    );
    expect(audits).toHaveLength(1);
    expect(audits[0].detail).toMatchObject({configured: false});
  });

  it('works for a legacy product stored under the login id after an artisanId was set', async () => {
    await login('9876599305', '10.9.9.35');
    const user = storeHolder.store.users.find((u) => u.phone === '9876599305');
    storeHolder.store.products.push({
      id: 'prd_legacy_gem', parentHash: 'c'.repeat(64), childHash: 'd'.repeat(64), serialNumber: '9',
      artisanId: user!.id, name: 'Legacy craft', craft: 'metal', price: 10, description: 'd',
      materials: [], status: 'published', ownership: 'artisan', createdAt: Date.now(),
    });
    user!.artisanId = 'ART-2041';
    const {POST} = await import('../app/api/gem/packet/route');
    const res = await POST(jsonRequest('http://x/api/gem/packet', {productId: 'prd_legacy_gem'}));
    expect(res.status).toBe(200);
  });

  it('returns 400 for a non-positive product price instead of an unhandled 500 (OCR medium)', async () => {
    await login('9876599307', '10.9.9.37');
    const user = storeHolder.store.users.find((u) => u.phone === '9876599307');
    storeHolder.store.products.push({
      id: 'prd_bad_price', parentHash: 'e'.repeat(64), childHash: 'f'.repeat(64), serialNumber: '7',
      artisanId: user!.id, name: 'Unpriced craft', craft: 'metal', price: 0,
      description: 'd', materials: [], status: 'published', ownership: 'artisan', createdAt: Date.now(),
    });
    const {POST} = await import('../app/api/gem/packet/route');
    const res = await POST(jsonRequest('http://x/api/gem/packet', {productId: 'prd_bad_price'}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(typeof data.error).toBe('string');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rate-limits packet generation per user (429 after the hourly cap)', async () => {
    const product = await registerProduct('9876599306', '10.9.9.36');
    const {POST} = await import('../app/api/gem/packet/route');
    let last: Response | null = null;
    for (let i = 0; i < 11; i += 1) {
      last = await POST(jsonRequest('http://x/api/gem/packet', {productId: product.id}));
    }
    expect(last?.status).toBe(429);
  });
});
