export type ArtisanRole = 'solo' | 'shg_leader';
export type Language = 'en' | 'hi';

export interface ArtisanProfile {
  id: string;
  name: string;
  dialect: string;
  cluster: string;
  shgGroup?: string;
  membersCount?: number;
  pmDakshCertified: boolean;
  wageMultiplierBefore: number;
  wageMultiplierAfter: number;
  photoUrl: string;
}

export interface CraftProduct {
  id: string;
  shortcode: string;
  legacyShortcode?: string;
  title: string;
  craftType: string;
  cluster: string;
  artisanName: string;
  artisanId: string;
  wipPhotoUrl: string;
  cleanPhotoUrl: string;
  audioStoryUrl: string;
  transcript: string;
  translatedText: string;
  gpsCoordinates: {
    lat: number;
    lng: number;
    timestamp: string;
    verifiedCluster: string;
    inCluster: boolean;
  };
  pricing: {
    floorPrice: number;
    retailPrice: number;
    bulkPrice: number;
    breakdown: {
      materialCost: number;
      laborCost: number;
      skilledWageRate: number;
      overheadCost: number;
      seasonalMultiplier: number;
      craftHeritageCoeff: number;
      directWageRealizationPct: number;
    };
  };
  sha256Hash: string;
  provenanceTimestamp: string;
  jurorStatus: 'Verified' | 'Pending' | 'Rejected' | 'Anomaly';
  stockQty: number;
  stockType: 'unique' | 'batch';
  isListed: boolean;
  reservedQty: number;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'declined' | 'expired';

export interface Reservation {
  id: string;
  productId: string;
  qty: number;
  status: ReservationStatus;
  expiresAt: string;
  pickupCode: string;
  buyerName?: string;
}

export interface CartItem {
  product: CraftProduct;
  qty: number;
}

export interface PricingRequest {
  craftType: string;
  materialCost: number;
  laborHours: number;
  skillLevel: 'Apprentice' | 'Master' | 'Heritage Grandmaster';
  overheadCost: number;
}

export interface PricingResponse {
  floorPrice: number;
  retailPrice: number;
  bulkPrice: number;
  breakdown: {
    materialCost: number;
    laborCost: number;
    skilledWageRate: number;
    overheadCost: number;
    seasonalMultiplier: number;
    craftHeritageCoeff: number;
    directWageRealizationPct: number;
  };
}

export interface ReportFakeRequest {
  shortcode: string;
  reason: 'Machine-made' | 'Incorrect provenance' | 'Suspicious product' | 'Incorrect artisan information' | 'Other';
  description: string;
  reporterContact?: string;
  /** Optional backend product id — improves passport/shortcode resolution. */
  productId?: string;
}

export interface ReportFakeResponse {
  success: boolean;
  /** Frontend ticket ref — maps 1:1 to backend report_id. */
  ticketId: string;
  report_id?: string;
  status?: string;
}

export interface JuryStatus {
  jury_ticket_id: string;
  product_id: string;
  status: string;
  votes_received: number;
  quorum_size: number;
  quorum_verdict?: string | null;
  average_craft_score?: number | null;
  last_updated: string;
}

export interface AuditFeedItem {
  id: string;
  productShortcode: string;
  craftName: string;
  artisanName: string;
  cluster: string;
  timestamp: string;
  jurorsCount: number;
  quorumMet: boolean;
  status: 'Verified' | 'Pending' | 'Rejected' | 'Anomaly detected' | 'Under review';
  anomalyFlag?: string;
  jurorVotes: { jurorId: string; vote: 'approve' | 'reject'; timestamp: string }[];
}

export interface DistrictMetric {
  district: 'Varanasi' | 'Madhubani' | 'Kashmir' | 'Kutch' | 'Pochampally';
  state: string;
  craftFocus: string;
  artisanCount: number;
  activeArtisans: number;
  productsCount: number;
  ordersVolume: number;
  averageWagePerDay: number;
  economicActivityScore: number;
  skillProgressionRate: number;
  demandForecast: 'High' | 'Very High' | 'Moderate';
}

export interface PMDakshMetric {
  artisanLevel: string;
  certifiedCount: number;
  wageBefore: number;
  wageAfter: number;
  trainingProgressPct: number;
}

export interface OfflineDraft {
  id: string;
  artisanId?: string;
  title: string;
  craftType: string;
  wipPhotoDataUrl?: string;
  voiceAudioDataUrl?: string;
  gpsCoords?: { lat: number; lng: number };
  provenanceTimestamp?: string;
  tiltVerified: boolean;
  createdAt: string;
  synced: boolean;
  studioDraft?: StudioDraft;
}

export interface StudioDraft {
  backendProductId?: string;
  capturedImage: string;
  productTitle: string;
  enhancedImage: string;
  enhancedImages: string[];
  updatedAt: string;
}
