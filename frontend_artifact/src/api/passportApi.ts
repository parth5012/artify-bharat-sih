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

// Map old/legacy shortcodes to canonical seeded shortcodes for seamless backward compatibility
const LEGACY_SHORTCODE_MAP: Record<string, string> = {
  ABC123: 'A7X-9B2',
  'ABC-123': 'A7X-9B2',
  VRN456: 'M3B-77L',
  'VRN-456': 'M3B-77L',
  MDB789: 'K9P-12M',
  'MDB-789': 'K9P-12M',
};

/**
 * Extract raw shortcode from possible full URL (e.g. https://artifybharat.in/verify/A7X-9B2).
 */
export function extractShortcodeFromText(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.includes('/') || trimmed.includes('?')) {
    try {
      const url = new URL(trimmed, 'https://artify.local');
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1];
    } catch {
      const parts = trimmed.split('/');
      const last = parts.pop() || '';
      return last.split('?')[0];
    }
  }
  return trimmed;
}

/**
 * Normalizes shortcode client-side: strips spaces/underscores, converts to upper-case,
 * and inserts a hyphen for 6-char alphanumeric codes (e.g. a7x9b2 -> A7X-9B2).
 */
export function normalizeShortcode(input: string): string {
  if (!input) return '';
  const raw = extractShortcodeFromText(input);
  const stripped = raw.replace(/[\s_]+/g, '').toUpperCase();
  const dehy = stripped.replace(/-/g, '');
  if (dehy.length === 6) {
    return `${dehy.slice(0, 3)}-${dehy.slice(3)}`;
  }
  return stripped;
}

/**
 * Generates variants following backend passport_service._shortcode_variants pattern:
 * exact, upper, dehyphenated, hyphenated at 3rd char.
 */
export function getShortcodeVariants(input: string): string[] {
  const raw = extractShortcodeFromText(input);
  const base = raw.replace(/[\s_]+/g, '');
  const variants: string[] = [];

  const add = (v: string) => {
    if (v && !variants.includes(v)) {
      variants.push(v);
    }
  };

  add(base);
  add(base.toUpperCase());
  const dehy = base.replace(/-/g, '');
  add(dehy);
  add(dehy.toUpperCase());
  if (dehy.length === 6) {
    add(`${dehy.slice(0, 3)}-${dehy.slice(3)}`);
    add(`${dehy.slice(0, 3).toUpperCase()}-${dehy.slice(3).toUpperCase()}`);
  }

  // Also include mapped legacy canonical variants
  for (const v of [...variants]) {
    const mapped = LEGACY_SHORTCODE_MAP[v.toUpperCase()];
    if (mapped) {
      add(mapped);
      add(mapped.replace(/-/g, ''));
    }
  }

  return variants;
}

export async function getPassportByShortcode(code: string): Promise<CraftProduct | null> {
  const normalized = normalizeShortcode(code);
  const variants = getShortcodeVariants(code);

  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 200));

    // Match against mock products by canonical shortcode, legacy shortcode, or variants
    const match = MOCK_PRODUCTS.find((p) => {
      const pShort = p.shortcode.toUpperCase();
      const pDehy = pShort.replace(/-/g, '');
      const pLegacy = (p.legacyShortcode || '').toUpperCase();
      const pLegacyDehy = pLegacy.replace(/-/g, '');

      return variants.some((v) => {
        const vUpper = v.toUpperCase();
        const vDehy = vUpper.replace(/-/g, '');
        return (
          pShort === vUpper ||
          pDehy === vDehy ||
          (pLegacy && (pLegacy === vUpper || pLegacyDehy === vDehy))
        );
      });
    });

    if (match) return match;

    const fallback = MOCK_PRODUCTS.find(
      (p) =>
        p.id.toLowerCase() === normalized.toLowerCase() ||
        p.cluster.toLowerCase() === normalized.toLowerCase() ||
        variants.some((v) => p.id.toLowerCase() === v.toLowerCase() || p.cluster.toLowerCase() === v.toLowerCase())
    );
    return fallback || null;
  }

  // Live backend API call: try normalized primary first, then query backend
  // Backend _shortcode_variants() handles case/hyphen variants automatically
  const codeToQuery = normalized || code.trim();
  try {
    const raw = await apiRequest<BackendVerification | CraftProduct>(
      `/api/v1/passport/code/${encodeURIComponent(codeToQuery)}`
    );
    if (raw && typeof raw === 'object' && 'pricing' in raw && (raw as CraftProduct).pricing) {
      return raw as CraftProduct;
    }
    return toCraftProduct(raw as BackendVerification, codeToQuery);
  } catch {
    // If normalized query fails and there are legacy variants, try canonical variant
    if (variants.length > 0 && variants[variants.length - 1] !== codeToQuery) {
      try {
        const fallbackQuery = variants[variants.length - 1];
        const raw = await apiRequest<BackendVerification | CraftProduct>(
          `/api/v1/passport/code/${encodeURIComponent(fallbackQuery)}`
        );
        if (raw && typeof raw === 'object' && 'pricing' in raw && (raw as CraftProduct).pricing) {
          return raw as CraftProduct;
        }
        return toCraftProduct(raw as BackendVerification, fallbackQuery);
      } catch {
        return null;
      }
    }
    return null;
  }
}
