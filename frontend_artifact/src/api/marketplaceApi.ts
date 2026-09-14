import { apiRequest, USE_MOCKS } from './apiClient';
import type { CraftProduct, Reservation } from '../types';
import { MOCK_PRODUCTS } from '../mocks/mockData';

export interface MarketListParams {
  cluster?: string;
  search?: string;
}

export interface ReserveProductPayload {
  productId: string;
  qty: number;
  buyerName: string;
  buyerPhone: string;
  otp: string;
  buyerArtisanId?: string;
}

interface BackendReservation {
  id: string;
  product_id: string;
  qty: number;
  status: string;
  expires_at: string;
  pickup_code: string;
  buyer_name?: string | null;
}

function toReservation(raw: BackendReservation): Reservation {
  return {
    id: raw.id,
    productId: raw.product_id,
    qty: raw.qty,
    status: raw.status as Reservation['status'],
    expiresAt: raw.expires_at,
    pickupCode: raw.pickup_code,
    buyerName: raw.buyer_name ?? undefined,
  };
}

async function readApiError(response: Response, fallback: string): Promise<Error> {
  const body = (await response.json().catch(() => null)) as { detail?: string } | null;
  return new Error(body?.detail || `${fallback} (HTTP ${response.status})`);
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function listMarketProducts(params: MarketListParams = {}): Promise<CraftProduct[]> {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 300));
    const verified = MOCK_PRODUCTS.filter(
      (p) => p.jurorStatus === 'Verified' && p.isListed !== false,
    );
    const cluster = params.cluster?.trim().toLowerCase();
    const search = params.search?.trim().toLowerCase();
    return verified.filter((p) => {
      if (cluster && p.cluster.toLowerCase() !== cluster) return false;
      if (search) {
        const hay = `${p.title} ${p.craftType} ${p.artisanName}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }

  const query = new URLSearchParams();
  if (params.cluster) query.set('cluster', params.cluster);
  if (params.search) query.set('search', params.search);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<CraftProduct[]>(`/api/v1/marketplace/products${suffix}`);
}

export async function reserveProduct(payload: ReserveProductPayload): Promise<Reservation> {
  if (!payload.productId) throw new Error('productId is required');
  if (payload.qty < 1) throw new Error('qty must be at least 1');
  if (!payload.buyerPhone) throw new Error('buyerPhone is required');
  if (!payload.otp) throw new Error('otp is required');

  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 500));
    const product = MOCK_PRODUCTS.find((p) => p.id === payload.productId);
    if (!product) throw new Error(`Product ${payload.productId} not found (HTTP 404)`);
    const available = product.stockQty - product.reservedQty;
    if (payload.qty > available) {
      throw new Error(`Only ${available} unit(s) available (HTTP 409)`);
    }
    return {
      id: `res-${Date.now()}`,
      productId: product.id,
      qty: payload.qty,
      status: 'pending',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      pickupCode: `PK-${Math.floor(100000 + Math.random() * 900000)}`,
      buyerName: payload.buyerName,
    };
  }

  const response = await fetch(`${API_BASE}/api/v1/marketplace/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: payload.productId,
      qty: payload.qty,
      buyer_name: payload.buyerName,
      buyer_phone: payload.buyerPhone,
      otp: payload.otp,
      ...(payload.buyerArtisanId ? { buyer_artisan_id: payload.buyerArtisanId } : {}),
    }),
  });
  if (!response.ok) throw await readApiError(response, 'Reservation failed');
  const raw = (await response.json()) as { reservation: BackendReservation } | BackendReservation;
  const reservation = 'reservation' in raw ? raw.reservation : raw;
  return toReservation(reservation);
}

export async function getMyReservations(phone: string): Promise<Reservation[]> {
  if (!phone) throw new Error('phone is required');

  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 300));
    const stored = window.localStorage.getItem('artify-mock-reservations');
    if (!stored) return [];
    try {
      return JSON.parse(stored) as Reservation[];
    } catch {
      return [];
    }
  }

  const query = new URLSearchParams({ phone });
  const raw = await apiRequest<BackendReservation[]>(
    `/api/v1/marketplace/my-reservations?${query.toString()}`,
  );
  return raw.map(toReservation);
}

export async function confirmReservation(
  id: string,
  artisanId: string,
  action: 'confirm' | 'decline',
): Promise<Reservation> {
  if (!id) throw new Error('reservation id is required');
  if (!artisanId) throw new Error('artisanId is required');

  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 300));
    const stored = window.localStorage.getItem('artify-mock-reservations');
    const list: Reservation[] = stored ? ((JSON.parse(stored) as Reservation[]) ?? []) : [];
    const found = list.find((r) => r.id === id);
    const target: Reservation = found ?? {
      id,
      productId: MOCK_PRODUCTS[0]?.id ?? 'prod-001',
      qty: 1,
      status: 'pending',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      pickupCode: 'PK-000000',
    };
    target.status = action === 'confirm' ? 'confirmed' : 'declined';
    return target;
  }

  const query = new URLSearchParams({ artisan_id: artisanId });
  const response = await fetch(
    `${API_BASE}/api/v1/marketplace/reservations/${id}/${action}?${query.toString()}`,
    { method: 'PATCH' },
  );
  if (!response.ok) throw await readApiError(response, `Reservation ${action} failed`);
  const raw = (await response.json()) as BackendReservation;
  return toReservation(raw);
}
