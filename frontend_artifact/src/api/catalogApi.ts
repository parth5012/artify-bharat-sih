import { USE_MOCKS } from './apiClient';

export interface VoiceCatalogExtraction {
  dialect?: string;
  artisanName?: string;
  artisanPhone?: string;
  originalTranscript: string;
  translatedEnglish: string;
  extractedDescription: string;
  extractedTitle: string;
  extractedCraftType: string;
  extractedMaterial: string;
  estimatedLaborDays: number;
  tags: string[];
}

export interface CatalogListing {
  product_id: string;
  title: string;
  craft_category: string;
  status: string;
  enhanced_image_url?: string;
  published_channels: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function saveProductCatalog(productId: string, payload: {
  title: string;
  description: string;
  craft_category: string;
  material: string;
  estimated_days: number;
  seo_tags: string[];
  enhanced_image_url?: string;
}): Promise<CatalogListing> {
  const response = await fetch(`${API_BASE_URL}/api/v1/catalog/products/${productId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${window.localStorage.getItem('artify-auth-token') || ''}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail || `Product catalog save failed (HTTP ${response.status})`);
  }
  return response.json() as Promise<CatalogListing>;
}

export async function getPublicCatalogListings(): Promise<CatalogListing[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/catalog/listings`);
  if (!response.ok) throw new Error(`Product listings failed (HTTP ${response.status})`);
  const result = await response.json() as { inventory: CatalogListing[] };
  return result.inventory;
}

interface BackendVoiceCatalogResponse {
  transcript_regional: string;
  transcript_english: string;
  metadata: {
    title: string;
    craft_category: string;
    description: string;
    artisan_name?: string | null;
    artisan_phone?: string | null;
    artisan_dialect?: string | null;
    material?: string | null;
    estimated_days: number;
    seo_tags: string[];
  };
}

export async function uploadVoiceRecording(
  audioBlob: Blob,
  options: { dialect?: string; productId?: string } = {},
): Promise<VoiceCatalogExtraction> {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 800));
    return {
      dialect: undefined,
      artisanName: undefined,
      artisanPhone: undefined,
      originalTranscript: 'Hum Banarasi Zari silk saree 18 din mein hath se bunte hain, asli resham aur soni zari ke dhagon se.',
      translatedEnglish: 'We hand-weave this Banarasi Zari silk saree over 18 days using pure Mulberry silk and golden zari threads.',
      extractedDescription: 'We hand-weave this Banarasi Zari silk saree over 18 days using pure Mulberry silk and golden zari threads.',
      extractedTitle: 'Heritage Banarasi Zari Handloom Silk Saree',
      extractedCraftType: 'Banarasi Brocade & Zari Weaving',
      extractedMaterial: 'Pure Mulberry Silk & Metallic Zari',
      estimatedLaborDays: 18,
      tags: ['GI Tagged', 'Varanasi Weave', 'Pure Silk', 'Handloom Verified'],
    };
  }

  const formData = new FormData();
  if (options.productId) {
    formData.append('product_id', options.productId);
  }
  formData.append('dialect', options.dialect || 'bhojpuri');
  formData.append('audio', audioBlob, 'voice_story.webm');

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/v1/catalog/voice`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
    const detail = errorBody?.detail || `Voice catalog extraction failed (HTTP ${response.status})`;
    if (response.status === 502 || detail.toLowerCase().includes('ollama')) {
      throw new Error('Ollama is not available. Start Ollama and try the product description again.');
    }
    throw new Error(detail);
  }

  const result = (await response.json()) as BackendVoiceCatalogResponse;
  return {
    dialect: result.metadata.artisan_dialect || undefined,
    artisanName: result.metadata.artisan_name || undefined,
    artisanPhone: result.metadata.artisan_phone || undefined,
    originalTranscript: result.transcript_regional,
    translatedEnglish: result.transcript_english,
    extractedDescription: result.metadata.description,
    extractedTitle: result.metadata.title,
    extractedCraftType: result.metadata.craft_category,
    extractedMaterial: result.metadata.material || '',
    estimatedLaborDays: result.metadata.estimated_days,
    tags: result.metadata.seo_tags,
  };
}
