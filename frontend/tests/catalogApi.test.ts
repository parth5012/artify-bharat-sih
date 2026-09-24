/**
 * Tests for the Next.js frontend FastAPI client (frontend/lib/catalogApi.ts).
 * Mirrors legacy/frontend_artifact/src/api/catalogApi.ts + authApi.ts contracts.
 */
import {
  saveProductCatalog,
  createProductDraft,
  registerOrLoginArtisan,
} from '../lib/catalogApi';

type FetchMock = jest.MockedFunction<typeof fetch>;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

let fetchMock: FetchMock;
const store: Record<string, string> = {};

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    },
    configurable: true,
    writable: true,
  });
});

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  fetchMock = jest.fn() as unknown as FetchMock;
  globalThis.fetch = fetchMock;
});

describe('saveProductCatalog', () => {
  const payload = {
    title: 'Bhagalpuri Silk Saree',
    description: 'Hand-woven silk saree.',
    craft_category: 'handloom',
    material: 'Mulberry silk',
    estimated_days: 7,
    seo_tags: ['bhagalpuri'],
  };

  it('PATCHes the legacy contract with Bearer auth and full payload', async () => {
    store['artify-auth-token'] = 'tok-abc';
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        product_id: 'prod-1',
        title: payload.title,
        craft_category: 'handloom',
        status: 'cataloged',
        published_channels: ['Artisan Site'],
      }),
    );

    const result = await saveProductCatalog('prod-1', payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain('/api/v1/catalog/products/prod-1');
    expect(init?.method).toBe('PATCH');
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer tok-abc',
    });
    expect(JSON.parse(String(init?.body))).toEqual(payload);
    expect(result.status).toBe('cataloged');
  });

  it('maps backend detail error to the legacy message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { detail: 'Product not found. Please run Studio enhancement again.' }),
    );

    await expect(saveProductCatalog('prod-x', payload)).rejects.toThrow(
      'Product not found. Please run Studio enhancement again.',
    );
  });

  it('falls back to HTTP status message when body has no detail', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(502, {}));

    await expect(saveProductCatalog('prod-x', payload)).rejects.toThrow(
      'Product catalog save failed (HTTP 502)',
    );
  });

  it('joins FastAPI 422 array detail msg fields into a readable string', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, {
        detail: [
          {loc: ['body', 'title'], msg: 'Field required', type: 'missing'},
          {
            loc: ['body', 'estimated_days'],
            msg: 'Input should be a valid integer',
            type: 'int_parsing',
          },
        ],
      }),
    );

    await expect(saveProductCatalog('prod-x', payload)).rejects.toThrow(
      'Field required; Input should be a valid integer',
    );
  });

  it('JSON.stringifies object detail instead of rendering [object Object]', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, {detail: {code: 'DB_DOWN', retry: true}}),
    );

    await expect(saveProductCatalog('prod-x', payload)).rejects.toThrow(
      '{"code":"DB_DOWN","retry":true}',
    );
  });

  it('omits the Authorization header entirely when no token is stored', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        product_id: 'prod-1',
        title: payload.title,
        craft_category: 'handloom',
        status: 'cataloged',
        published_channels: [],
      }),
    );

    await saveProductCatalog('prod-1', payload);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init?.headers as Record<string, string>;
    expect(headers).not.toHaveProperty('Authorization');
    expect(headers).toMatchObject({'Content-Type': 'application/json'});
  });
});

describe('createProductDraft', () => {
  it('POSTs /api/v1/catalog/drafts with auth and returns product_id', async () => {
    store['artify-auth-token'] = 'tok-draft';
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        product_id: 'prod-new',
        title: 'Chanderi Saree',
        craft_category: 'handloom',
        status: 'draft',
        published_channels: ['Draft'],
      }),
    );

    const result = await createProductDraft({
      title: 'Chanderi Saree',
      craft_category: 'handloom',
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/v1/catalog/drafts');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer tok-draft',
    });
    expect(result.product_id).toBe('prod-new');
    expect(result.status).toBe('draft');
  });

  it('uses detail error mapping when draft create fails', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { detail: 'Authentication token required.' }),
    );

    await expect(
      createProductDraft({ title: 'X', craft_category: 'handloom' }),
    ).rejects.toThrow('Authentication token required.');
  });
});

describe('registerOrLoginArtisan', () => {
  const payload = {
    name: 'Sunita Devi',
    phone: '9988776655',
    pin: '1234',
  };

  it('registers, stores artify-auth-token, and returns the session', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        access_token: 'reg-token',
        token_type: 'bearer',
        artisan_id: 'art-1',
        name: payload.name,
        phone: payload.phone,
      }),
    );

    const session = await registerOrLoginArtisan(payload);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/v1/auth/register');
    expect(init?.method).toBe('POST');
    expect(store['artify-auth-token']).toBe('reg-token');
    expect(session.access_token).toBe('reg-token');
    expect(session.artisan_id).toBe('art-1');
  });

  it('falls back to login when register returns 400 (already registered)', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(400, {
          detail:
            'An artisan with this phone number is already registered. Please log in using your 4-digit PIN.',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          access_token: 'login-token',
          token_type: 'bearer',
          artisan_id: 'art-1',
          name: payload.name,
          phone: payload.phone,
        }),
      );

    const session = await registerOrLoginArtisan(payload);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [loginUrl] = fetchMock.mock.calls[1] as unknown as [string];
    expect(loginUrl).toContain('/api/v1/auth/login');
    expect(store['artify-auth-token']).toBe('login-token');
    expect(session.access_token).toBe('login-token');
  });

  it('rethrows non-400 register failures without falling back', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { detail: 'Internal server error' }),
    );

    await expect(registerOrLoginArtisan(payload)).rejects.toThrow(
      'Internal server error',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store['artify-auth-token']).toBeUndefined();
  });
});
