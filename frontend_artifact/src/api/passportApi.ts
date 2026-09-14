import { apiRequest, USE_MOCKS } from './apiClient';
import { MOCK_PRODUCTS } from '../mocks/mockData';
import type { CraftProduct } from '../types';

export async function getPassportByShortcode(code: string): Promise<CraftProduct | null> {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 350));
    const normalized = code.trim().toUpperCase();
    const match = MOCK_PRODUCTS.find((p) => p.shortcode.toUpperCase() === normalized);
    if (match) return match;
    
    const fallback = MOCK_PRODUCTS.find(
      (p) => p.id.toLowerCase() === normalized.toLowerCase() || p.cluster.toLowerCase() === normalized.toLowerCase()
    );
    return fallback || null;
  }

  try {
    return await apiRequest<CraftProduct>(`/api/v1/passport/code/${encodeURIComponent(code)}`);
  } catch (err) {
    return null;
  }
}
