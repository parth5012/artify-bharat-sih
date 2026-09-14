/**
 * Artify Bharat - Frontend API Client
 * Typed client wrapper for FastAPI backend endpoints:
 * - WhatsApp Business Alerts
 * - Fair-Wage Dynamic Pricing Engine
 * - Mock e-Shram & MoSJE Sandbox KYC
 * - Mock India Post / CSC Logistics First-Mile Drop-off PIN
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface FairWageCalculationParams {
  raw_material_cost: number;
  labor_hours: number;
  state_code?: string;
  hourly_wage_override?: number;
  is_gi_tagged?: boolean;
  craft_category?: string;
  visual_complexity?: number;
}

export interface FairWageCalculationResult {
  state_code: string;
  state_name: string;
  hourly_wage_rate: number;
  statutory_floor_enforced: boolean;
  is_gi_tagged: boolean;
  gi_heritage_multiplier: number;
  statutory_floor_price: number;
  fair_retail_price: number;
  bulk_wholesale_price: number;
  artisan_net_profit: number;
  direct_realization_percent: number;
  cost_breakdown: {
    raw_material_cost: number;
    labor_hours: number;
    labor_days?: number;
    hourly_wage_rate: number;
    daily_wage_rate?: number;
    calculated_fair_wage: number;
    packaging_overhead: number;
    artisan_net_profit: number;
    total_suggested_price: number;
  };
  pricing_formula_summary: string;
}

export interface WhatsAppAlertParams {
  recipient_phone: string;
  message_body: string;
  alert_type?: 'ORDER_STATUS_UPDATE' | 'FIRST_MILE_DROPOFF' | 'PAYOUT_SETTLEMENT' | 'PASSPORT_ISSUED';
  order_id?: string;
  tracking_pin?: string;
  preview_url?: boolean;
}

export interface WhatsAppAlertResult {
  success: boolean;
  status: string;
  recipient_phone: string;
  message_id?: string;
  meta_response_code: number;
  details?: Record<string, any>;
}

export interface EShramKYCParams {
  uan_number?: string;
  aadhaar_last_four?: string;
  artisan_name?: string;
  state?: string;
}

export interface EShramKYCResult {
  is_verified: boolean;
  uan_number: string;
  artisan_name: string;
  primary_occupation: string;
  sub_category: string;
  state: string;
  district: string;
  social_category: string;
  kyc_status: string;
  active_schemes: Array<{
    scheme_code: string;
    scheme_name: string;
    ministry: string;
    eligibility_status: string;
    benefit_description: string;
    annual_benefit_inr?: number;
    direct_benefit_transfer_ready: boolean;
  }>;
  total_potential_annual_benefit_inr: number;
  direct_payout_escrow_account: {
    bank_name: string;
    account_mask: string;
    ifsc_code: string;
    dbt_linked: string;
  };
  verification_authority: string;
}

export interface LogisticsPinParams {
  order_id: string;
  artisan_id: string;
  origin_pincode?: string;
  destination_pincode?: string;
  weight_grams?: number;
}

export interface LogisticsPinResult {
  order_id: string;
  artisan_id: string;
  dropoff_tracking_pin: string;
  speed_post_awb: string;
  barcode_format: string;
  origin_pincode: string;
  nearest_csc_center_id: string;
  nearest_center_name: string;
  center_address: string;
  distance_km: number;
  operating_hours: string;
  contact_person_vle: string;
  vle_phone: string;
  transit_partner: string;
  estimated_transit_days: number;
  dropoff_deadline_hours: number;
}

export interface ArtisanIdVerificationParams {
  identifier_type: 'pehchan' | 'trifed' | 'eshram';
  identifier_value: string;
}

export interface ArtisanIdVerificationResult {
  is_valid: boolean;
  identifier_type: string;
  identifier_value: string;
  artisan_name?: string | null;
  craft_category?: string | null;
  cluster_name?: string | null;
  gi_certified: boolean;
  gi_tag_name?: string | null;
  state?: string | null;
  district?: string | null;
  verification_source: string;
}

export interface ArtisanRegisterParams {
  name: string;
  phone: string;
  pin: string;
  primary_dialect?: string;
  state?: string;
  district?: string;
  cluster_name?: string;
  trifed_id?: string | null;
  pehchan_id?: string | null;
  geo_lat?: number;
  geo_lng?: number;
}

export interface ArtisanRegisterResult {
  access_token: string;
  token_type: string;
  artisan_id: string;
  name: string;
  phone: string;
}

// Built-in offline fallback master registry (aligned with MoSJE / National Database)
const LOCAL_MASTER_ARTISANS: Record<string, Omit<ArtisanIdVerificationResult, 'identifier_type' | 'identifier_value'>> = {
  'PEH-IND-88320': {
    is_valid: true,
    artisan_name: 'Gauri Devi',
    craft_category: 'हथकरघा वस्त्र (Handloom Textile)',
    cluster_name: 'वाराणसी हथकरघा क्लस्टर (Varanasi Handloom Cluster)',
    gi_certified: true,
    gi_tag_name: 'बनारसी ब्रोकेड साड़ी (GI Reg #39)',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    verification_source: 'National Handicrafts Database (DC Handicrafts Pehchan Registry)',
  },
  'UP-VAR-102938': {
    is_valid: true,
    artisan_name: 'Radha Devi',
    craft_category: 'हथकरघा रेशम (Handloom Silk)',
    cluster_name: 'वाराणसी हथकरघा क्लस्टर (Varanasi Handloom Cluster)',
    gi_certified: true,
    gi_tag_name: 'बनारसी ब्रोकेड साड़ी (GI Reg #39)',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    verification_source: 'National Handicrafts Database (DC Handicrafts Pehchan Registry)',
  },
  'TRIFED-UP-VNS-1049': {
    is_valid: true,
    artisan_name: 'Gauri Devi',
    craft_category: 'जनजातीय हथकरघा (Tribal Handloom)',
    cluster_name: 'वाराणसी जनजातीय क्लस्टर (Varanasi Tribal Cluster)',
    gi_certified: true,
    gi_tag_name: 'बनारसी ब्रोकेड साड़ी (GI Reg #39)',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    verification_source: 'TRIFED Tribal Artisan Master Directory',
  },
  'ESHRAM-8821-9920-1120': {
    is_valid: true,
    artisan_name: 'Radha Devi',
    craft_category: 'कुटीर उद्योग बुनकर (Cottage Industry Weaver)',
    cluster_name: 'वाराणसी ग्रामीण बुनकर क्लस्टर',
    gi_certified: true,
    gi_tag_name: 'बनारसी ब्रोकेड साड़ी (GI Reg #39)',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    verification_source: 'Ministry of Labour & Employment (e-Shram National Database)',
  },
};

async function safeFetch<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      const error: any = new Error(errBody.detail || `Server error (${res.status}): ${res.statusText}`);
      error.status = res.status;
      error.isApiError = true;
      throw error;
    }
    return await res.json();
  } catch (err: any) {
    if (err.isApiError) {
      throw err;
    }
    if (err.name === "TypeError" || err.message?.includes("fetch") || err.message?.includes("Network")) {
      const netError: any = new Error(`Network offline or API endpoint unreachable: ${url}`);
      netError.isNetworkError = true;
      throw netError;
    }
    throw err;
  }
}

export const ArtifyApiClient = {
  /**
   * Calculate Fair-Wage Dynamic Pricing
   */
  async calculateFairPrice(params: FairWageCalculationParams): Promise<FairWageCalculationResult> {
    return safeFetch<FairWageCalculationResult>(`${API_BASE_URL}/calculate-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  /**
   * Dispatch automated WhatsApp Notification via Meta Graph API
   */
  async sendWhatsAppAlert(params: WhatsAppAlertParams): Promise<WhatsAppAlertResult> {
    return safeFetch<WhatsAppAlertResult>(`${API_BASE_URL}/whatsapp/send-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  /**
   * Verify e-Shram / MoSJE welfare scheme KYC in Sandbox
   */
  async verifyEShramKYC(params: EShramKYCParams = {}): Promise<EShramKYCResult> {
    return safeFetch<EShramKYCResult>(`${API_BASE_URL}/mock/auth/eshram-kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  /**
   * Generate first-mile CSC / India Post drop-off PIN Sandbox
   */
  async generateLogisticsPin(params: LogisticsPinParams): Promise<LogisticsPinResult> {
    return safeFetch<LogisticsPinResult>(`${API_BASE_URL}/mock/logistics/generate-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  /**
   * 1-Tap Government Verification (Pehchan ID, e-Shram UAN, TRIFED ID)
   * Queries FastAPI AuthService endpoint (/auth/verify-artisan-id) with graceful offline fallback
   * to built-in MoSJE Master Registry when offline.
   */
  async verifyArtisanId(params: ArtisanIdVerificationParams): Promise<ArtisanIdVerificationResult> {
    const cleanId = params.identifier_value.trim().toUpperCase();
    try {
      const result = await safeFetch<ArtisanIdVerificationResult>(`${API_BASE_URL}/auth/verify-artisan-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier_type: params.identifier_type,
          identifier_value: cleanId,
        }),
      });
      return result;
    } catch (networkOrApiErr: any) {
      if (networkOrApiErr?.isApiError) {
        throw networkOrApiErr;
      }
      console.warn('[ArtifyApiClient] Remote ID verification unavailable, checking local master registry:', networkOrApiErr);
      if (LOCAL_MASTER_ARTISANS[cleanId]) {
        const local = LOCAL_MASTER_ARTISANS[cleanId];
        return {
          is_valid: true,
          identifier_type: params.identifier_type,
          identifier_value: cleanId,
          ...local,
        };
      }
      return {
        is_valid: false,
        identifier_type: params.identifier_type,
        identifier_value: cleanId,
        artisan_name: null,
        craft_category: null,
        cluster_name: null,
        gi_certified: false,
        gi_tag_name: null,
        state: null,
        district: null,
        verification_source: 'National Master Artisan Registry (Record Not Found / Offline)',
      };
    }
  },

  /**
   * Register Artisan / SHG Coordinator with MoSJE AuthService
   */
  async registerArtisan(params: ArtisanRegisterParams): Promise<ArtisanRegisterResult> {
    try {
      return await safeFetch<ArtisanRegisterResult>(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    } catch (err: any) {
      if (err?.isApiError) {
        throw err;
      }
      console.warn('[ArtifyApiClient] Register endpoint unavailable, generating local session token:', err);
      return {
        access_token: `mock_artisan_jwt_${Date.now()}`,
        token_type: 'bearer',
        artisan_id: `art_${Date.now().toString(36)}`,
        name: params.name,
        phone: params.phone,
      };
    }
  },
};
