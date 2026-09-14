import { apiRequest, USE_MOCKS } from './apiClient';
import type { PricingRequest, PricingResponse } from '../types';

export async function calculateFairWagePrice(request: PricingRequest): Promise<PricingResponse> {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 400));
    
    const skillMultiplier = request.skillLevel === 'Heritage Grandmaster' ? 1.4 : request.skillLevel === 'Master' ? 1.25 : 1.1;
    const baseLabor = request.laborHours * 85 * skillMultiplier;
    const material = request.materialCost || 1200;
    const overhead = request.overheadCost || 400;
    const baseCost = material + baseLabor + overhead;
    
    const seasonalMultiplier = 1.12;
    const craftHeritageCoeff = 1.22;

    const floor = Math.round(baseCost);
    const retail = Math.round(baseCost * seasonalMultiplier * craftHeritageCoeff);
    const bulk = Math.round(retail * 0.86);

    const directWageRealizationPct = Math.min(92, Math.round((baseLabor / retail) * 100 + 35));

    return {
      floorPrice: floor,
      retailPrice: retail,
      bulkPrice: bulk,
      breakdown: {
        materialCost: material,
        laborCost: Math.round(baseLabor),
        skilledWageRate: Math.round(85 * skillMultiplier * 8),
        overheadCost: overhead,
        seasonalMultiplier,
        craftHeritageCoeff,
        directWageRealizationPct,
      },
    };
  }

  return apiRequest<PricingResponse>('/api/v1/pricing/calculate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
