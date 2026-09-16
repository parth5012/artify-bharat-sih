import { apiRequest, USE_MOCKS } from './apiClient';
import { MOCK_PRODUCTS } from '../mocks/mockData';
import type { CraftProduct } from '../types';

interface BackendCostBreakdown {
  raw_material_cost?: number | null;
  calculated_fair_wage?: number | null;
  fair_labor_wage?: number | null;
  artisan_net_profit?: number | null;
  artisan_profit?: number | null;
  total_suggested_price?: number | null;
  final_price?: number | null;
  daily_wage_rate?: number | null;
}

interface BackendVerification {
  passport_hash: string;
  shortcode?: string | null;
  is_authentic: boolean;
  product_title: string;
  craft_category: string;
  gi_tag_status: string;
  artisan_name: string;
  cluster_name: string;
  state: string;
  district: string;
  geo_coordinates?: { latitude?: number | null; longitude?: number | null } | null;
  enhanced_image_url?: string | null;
  voice_story_url?: string | null;
  cost_breakdown?: BackendCostBreakdown | null;
  issued_at?: string;
}

const FALLBACK_IMAGE = '/hero.png';

function toCraftProduct(raw: BackendVerification, fallbackCode: string): CraftProduct {
  const cb = raw.cost_breakdown ?? {};
  const material = cb.raw_material_cost ?? 0;
  const labor = cb.calculated_fair_wage ?? cb.fair_labor_wage ?? 0;
  const retail = cb.final_price ?? cb.total_suggested_price ?? material + labor;
  const directPct = retail > 0 ? Math.round((labor / retail) * 1000) / 10 : 0;
  const image = raw.enhanced_image_url || FALLBACK_IMAGE;
  const geo = raw.geo_coordinates ?? {};
  const code = (raw.shortcode || fallbackCode).toUpperCase();

  return {
    id: `passport-${code}`,
    shortcode: code,
    title: raw.product_title,
    craftType: raw.craft_category,
    cluster: raw.cluster_name,
    artisanName: raw.artisan_name,
    artisanId: '',
    wipPhotoUrl: image,
    cleanPhotoUrl: image,
    audioStoryUrl: raw.voice_story_url || '',
    transcript: '',
    translatedText: '',
    gpsCoordinates: {
      lat: geo.latitude ?? 0,
      lng: geo.longitude ?? 0,
      timestamp: raw.issued_at ?? '',
      verifiedCluster: raw.cluster_name,
      inCluster: true,
    },
    pricing: {
      floorPrice: retail,
      retailPrice: retail,
      bulkPrice: retail,
      breakdown: {
        materialCost: material,
        laborCost: labor,
        skilledWageRate: cb.daily_wage_rate ?? 450,
        overheadCost: 300,
        seasonalMultiplier: 1,
        craftHeritageCoeff: 1,
        directWageRealizationPct: directPct,
      },
    },
    sha256Hash: raw.passport_hash,
    provenanceTimestamp: raw.issued_at ?? '',
    jurorStatus: raw.is_authentic ? 'Verified' : 'Pending',
    stockQty: 1,
    stockType: 'unique',
    isListed: true,
    reservedQty: 0,
  };
}

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
    const raw = await apiRequest<BackendVerification | CraftProduct>(
      `/api/v1/passport/code/${encodeURIComponent(code)}`
    );
    if (raw && typeof raw === 'object' && 'pricing' in raw && (raw as CraftProduct).pricing) {
      return raw as CraftProduct;
    }
    return toCraftProduct(raw as BackendVerification, code.trim());
  } catch (err) {
    return null;
  }
}
