export interface ArtisanSession {
  access_token: string;
  token_type: string;
  artisan_id: string;
  name: string;
  phone: string;
}

export interface ArtisanRegistration {
  name: string;
  phone: string;
  pin: string;
  primary_dialect?: string;
}

export interface CatalogListing {
  product_id: string;
  title: string;
  craft_category: string;
  status: string;
  final_price?: number | null;
  passport_hash?: string | null;
  enhanced_image_url?: string | null;
  published_channels: string[];
  created_at?: string | null;
}

export interface ProductCatalogPayload {
  title: string;
  description: string;
  craft_category: string;
  material: string;
  estimated_days: number;
  seo_tags: string[];
  enhanced_image_url?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

const TOKEN_KEY = 'artify-auth-token';

function authHeader(): Record<string, string> {
  const token =
    (globalThis.localStorage && globalThis.localStorage.getItem(TOKEN_KEY)) ||
    '';
  return token ? {Authorization: `Bearer ${token}`} : {};
}

async function readDetail(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as {
    detail?: unknown;
  } | null;
  const detail = body?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map(item =>
        item && typeof item === 'object' && 'msg' in item
          ? String((item as {msg: unknown}).msg)
          : String(item),
      )
      .filter(Boolean);
    return msgs.length ? msgs.join('; ') : null;
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail);
  return null;
}

export async function saveProductCatalog(
  productId: string,
  payload: ProductCatalogPayload,
): Promise<CatalogListing> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/catalog/products/${productId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(),
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    const detail = await readDetail(response);
    throw new Error(
      detail || `Product catalog save failed (HTTP ${response.status})`,
    );
  }
  return response.json() as Promise<CatalogListing>;
}

export async function createProductDraft(payload: {
  title: string;
  craft_category: string;
}): Promise<CatalogListing> {
  const response = await fetch(`${API_BASE_URL}/api/v1/catalog/drafts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await readDetail(response);
    throw new Error(
      detail || `Product draft create failed (HTTP ${response.status})`,
    );
  }
  return response.json() as Promise<CatalogListing>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await readDetail(response);
    const error = new Error(
      detail || `Auth request failed (HTTP ${response.status})`,
    );
    (error as Error & {status?: number}).status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

export async function registerArtisan(
  payload: ArtisanRegistration,
): Promise<ArtisanSession> {
  const session = await postJson<ArtisanSession>(
    '/api/v1/auth/register',
    payload,
  );
  globalThis.localStorage?.setItem(TOKEN_KEY, session.access_token);
  return session;
}

export async function loginArtisan(
  phone: string,
  pin: string,
): Promise<ArtisanSession> {
  const session = await postJson<ArtisanSession>('/api/v1/auth/login', {
    phone,
    pin,
  });
  globalThis.localStorage?.setItem(TOKEN_KEY, session.access_token);
  return session;
}

export async function registerOrLoginArtisan(
  payload: ArtisanRegistration,
): Promise<ArtisanSession> {
  try {
    return await registerArtisan(payload);
  } catch (error) {
    const status = (error as Error & {status?: number}).status;
    if (status === 400) {
      return loginArtisan(payload.phone, payload.pin);
    }
    throw error;
  }
}
