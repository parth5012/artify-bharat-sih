import { USE_MOCKS } from './apiClient';

export interface ProductEvidencePayload {
  artisanId: string;
  productTitle: string;
  craftCategory: string;
  image: Blob;
  gpsLatitude: number;
  gpsLongitude: number;
  provenanceTimestamp: string;
}

export interface ProductEvidenceResponse {
  product_id: string;
  raw_image_url: string;
  enhanced_image_url: string;
  visual_complexity_score: number;
  auto_cropped_ratio?: string;
  clahe_applied?: boolean;
  background_removed?: boolean;
  status: string;
  message: string;
}

export interface StudioImageResponse {
  raw_image_url?: string;
  enhanced_image_url: string;
  visual_complexity_score: number;
  status: string;
  message: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function readApiError(response: Response, fallback: string): Promise<Error> {
  const body = (await response.json().catch(() => null)) as { detail?: string } | null;
  return new Error(body?.detail || `${fallback} (HTTP ${response.status})`);
}

export async function createProductFromEvidence(
  payload: ProductEvidencePayload,
): Promise<ProductEvidenceResponse> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      product_id: `web-${Date.now()}`,
      raw_image_url: '',
      enhanced_image_url: '',
      visual_complexity_score: 0,
      status: 'enhanced',
      message: 'Product evidence saved locally for sync.',
    };
  }

  const formData = new FormData();
  formData.append('artisan_id', payload.artisanId);
  formData.append('product_title', payload.productTitle);
  formData.append('craft_category', payload.craftCategory);
  formData.append('gps_latitude', String(payload.gpsLatitude));
  formData.append('gps_longitude', String(payload.gpsLongitude));
  formData.append('provenance_timestamp', payload.provenanceTimestamp);
  formData.append('image', payload.image, 'product-evidence.jpg');

  const response = await fetch(
    `${API_BASE_URL}/api/v1/studio/enhance`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('artify-auth-token') || ''}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw await readApiError(response, 'Product evidence upload failed');
  }

  return response.json() as Promise<ProductEvidenceResponse>;
}

export async function enhanceAdditionalProductImage(image: Blob): Promise<StudioImageResponse> {
  if (USE_MOCKS) {
    return {
      enhanced_image_url: '',
      visual_complexity_score: 0,
      status: 'enhanced',
      message: 'Image enhanced locally.',
    };
  }

  const formData = new FormData();
  formData.append('image', image, 'product-detail.jpg');
  formData.append('remove_bg', 'true');

  const response = await fetch(`${API_BASE_URL}/api/v1/studio/enhance-studio`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw await readApiError(response, 'Additional image enhancement failed');
  }

  return response.json() as Promise<StudioImageResponse>;
}