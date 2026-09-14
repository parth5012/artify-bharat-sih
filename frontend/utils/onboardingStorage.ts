/**
 * Artify Bharat Onboarding Storage & Offline Draft Recovery Utility
 * Manages local persistence of incomplete onboarding drafts in `localStorage` under `artify_onboarding_draft`
 * to prevent artisan data loss on poor rural 2G/3G network connectivity.
 */

export type OnboardingRole = 'artisan' | 'shg';

export type OnboardingDialect =
  | 'bhojpuri'
  | 'maithili'
  | 'hindi'
  | 'awadhi'
  | 'bengali'
  | 'marathi';

export type GovtIdType = 'pehchan' | 'eshram' | 'trifed';

export interface OnboardingData {
  step: 1 | 2 | 3;
  role: OnboardingRole;
  dialect: OnboardingDialect;
  phone: string;
  pin: string;
  govtIdType: GovtIdType;
  govtIdValue: string;
  isVerified: boolean;
  verificationSource?: string;
  artisanName: string;
  craftCategory: string;
  clusterName: string;
  district: string;
  state: string;
  giCertified: boolean;
  giTagName?: string;
  shgGroupName?: string;
  shgMemberCount?: number;
  isManualEntry?: boolean;
  updatedAt: string;
}

export const ONBOARDING_DRAFT_KEY = 'artify_onboarding_draft';
export const ARTISAN_PROFILE_KEY = 'artify_artisan_profile';
export const AUTH_TOKEN_KEY = 'artify_auth_token';

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  step: 1,
  role: 'artisan',
  dialect: 'hindi',
  phone: '',
  pin: '',
  govtIdType: 'pehchan',
  govtIdValue: '',
  isVerified: false,
  verificationSource: '',
  artisanName: '',
  craftCategory: 'हथकरघा एवं वस्त्र (Handloom Textile)',
  clusterName: 'वाराणसी हथकरघा क्लस्टर (Varanasi Handloom Cluster)',
  district: 'Varanasi',
  state: 'Uttar Pradesh',
  giCertified: false,
  giTagName: '',
  shgGroupName: '',
  shgMemberCount: 10,
  isManualEntry: false,
  updatedAt: new Date().toISOString(),
};

/**
 * Loads stored onboarding draft from localStorage
 */
export function getStoredOnboardingDraft(): OnboardingData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.step) {
      return { ...DEFAULT_ONBOARDING_DATA, ...parsed };
    }
    return null;
  } catch (err) {
    console.warn('[OnboardingStorage] Failed to read draft:', err);
    return null;
  }
}

/**
 * Saves current draft to localStorage
 */
export function saveOnboardingDraft(data: Partial<OnboardingData>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredOnboardingDraft() || DEFAULT_ONBOARDING_DATA;
    const updated: OnboardingData = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[OnboardingStorage] Failed to save draft:', err);
  }
}

/**
 * Clears the stored onboarding draft (called upon successful registration)
 */
export function clearStoredOnboardingDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch (err) {
    console.warn('[OnboardingStorage] Failed to clear draft:', err);
  }
}

/**
 * Persists final verified artisan profile and mock session token
 */
export function saveCompletedArtisanProfile(profile: Record<string, any>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ARTISAN_PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(
      AUTH_TOKEN_KEY,
      `artify_jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    );
  } catch (err) {
    console.warn('[OnboardingStorage] Failed to persist profile:', err);
  }
}
