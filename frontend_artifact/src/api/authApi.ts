import { apiRequest } from './apiClient';

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

export async function registerArtisan(payload: ArtisanRegistration): Promise<ArtisanSession> {
  return apiRequest<ArtisanSession>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginArtisan(phone: string, pin: string): Promise<ArtisanSession> {
  return apiRequest<ArtisanSession>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, pin }),
  });
}

export async function registerOrLoginArtisan(payload: ArtisanRegistration): Promise<ArtisanSession> {
  try {
    return await registerArtisan(payload);
  } catch (error) {
    if (error instanceof Error && error.message.includes('400')) {
      return loginArtisan(payload.phone, payload.pin);
    }
    throw error;
  }
}