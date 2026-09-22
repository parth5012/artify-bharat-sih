import React, { useState, useEffect } from 'react';
import { IndianRupee, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { calculateFairWagePrice } from '../../api/pricingApi';
import type { PricingResponse } from '../../types';

interface FairWageSliderProps {
  craftType?: string;
  extractedTitle?: string;
  estimatedLaborDays?: number;
  onPriceCalculated?: (price: PricingResponse) => void;
}

const PRESETS = [
  { name: 'Banarasi Saree', hours: 140, material: 5200, level: 'Master', overhead: 900 },
  { name: 'Madhubani Canvas', hours: 35, material: 1100, level: 'Master', overhead: 300 },
  { name: 'Pashmina Stole', hours: 180, material: 9500, level: 'Heritage Grandmaster', overhead: 1200 },
  { name: 'Ajrakh Block Print', hours: 40, material: 1800, level: 'Apprentice', overhead: 400 },
];

export const FairWageSlider: React.FC<FairWageSliderProps> = ({
  craftType = 'Handloom Craft',
  extractedTitle,
  estimatedLaborDays,
  onPriceCalculated,
}) => {
  const [laborHours, setLaborHours] = useState<number>(estimatedLaborDays ? Math.round(estimatedLaborDays * 8) : 45);
  const [materialCost, setMaterialCost] = useState<number>(3200);
  const [skillLevel, setSkillLevel] = useState<'Apprentice' | 'Master' | 'Heritage Grandmaster'>('Master');
  const [overheadCost, setOverheadCost] = useState<number>(600);

  const [pricing, setPricing] = useState<PricingResponse | null>(null);

  const calculatePrice = async () => {
    try {
      const result = await calculateFairWagePrice({
        craftType,
        materialCost,
        laborHours,
        skillLevel,
        overheadCost,
      });
      setPricing(result);
      if (onPriceCalculated) onPriceCalculated(result);
    } catch (err) {
      console.error('Pricing calculation failed:', err);
    }
  };

  useEffect(() => {
    calculatePrice();
  }, [laborHours, materialCost, skillLevel, overheadCost]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setLaborHours(preset.hours);
    setMaterialCost(preset.material);
    setSkillLevel(preset.level as any);
    setOverheadCost(preset.overhead);
  };

  return (
    <Card className="max-w-3xl mx-auto border-terracotta-300 shadow-warm-lg">
      <div className="flex items-center justify-between border-b border-terracotta-200 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-terracotta-500" />
            <h2 className="text-xl font-bold font-heading text-charcoal-800">
              Fair-Wage Pricing Engine
            </h2>
          </div>
          <p className="text-xs text-charcoal-700 mt-1">
            Calculated via MoSJE wage standards &amp; DPI pricing formula: Base Cost = C_mat + (T_labor × W_skill) + C_overhead
          </p>
        </div>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase border border-emerald-300">
          3-Tier Wage Protection
        </span>
      </div>

      <div className="mb-5 p-3 bg-cream-100 rounded-2xl border border-terracotta-200/80">
        {extractedTitle && (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            <span className="font-bold">Voice-extracted catalog:</span> {extractedTitle}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs font-bold text-terracotta-800 mb-2">
          <Sparkles className="w-4 h-4 text-heritage-goldDark" />
          <span>Quick Craft Benchmark Presets:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-charcoal-800 border border-terracotta-200 hover:bg-terracotta-50 hover:border-terracotta-400 transition-all shadow-sm"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-5 bg-cream-100 p-5 rounded-2xl border border-terracotta-200/60">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-charcoal-800">Labor Invested (Hours):</span>
              <span className="text-terracotta-600 font-bold font-mono text-sm">{laborHours} Hours</span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={laborHours}
              onChange={(e) => setLaborHours(Number(e.target.value))}
              className="w-full h-2 bg-cream-300 rounded-lg appearance-none cursor-pointer accent-terracotta-500"
            />
            <div className="flex justify-between text-[10px] text-charcoal-700 mt-1 font-mono">
              <span>5 hrs (Motif)</span>
              <span>100 hrs</span>
              <span>200 hrs (Grand Saree)</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-charcoal-800">Raw Material Cost (₹):</span>
              <span className="text-terracotta-600 font-bold font-mono text-sm">₹{materialCost.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="range"
              min="500"
              max="15000"
              step="250"
              value={materialCost}
              onChange={(e) => setMaterialCost(Number(e.target.value))}
              className="w-full h-2 bg-cream-300 rounded-lg appearance-none cursor-pointer accent-terracotta-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-800 mb-1.5">
              Artisan Skill Tier (PM-DAKSH Scale):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Apprentice', 'Master', 'Heritage Grandmaster'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSkillLevel(tier)}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                    skillLevel === tier
                      ? 'bg-terracotta-500 text-white border-terracotta-600 shadow-sm'
                      : 'bg-white text-charcoal-700 border-terracotta-200 hover:bg-terracotta-50'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-charcoal-800">Loom &amp; Tool Overhead (₹):</span>
              <span className="text-charcoal-700 font-mono">₹{overheadCost}</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={overheadCost}
              onChange={(e) => setOverheadCost(Number(e.target.value))}
              className="w-full h-2 bg-cream-300 rounded-lg appearance-none cursor-pointer accent-terracotta-500"
            />
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          {pricing && (
            <>
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-emerald-800 font-bold block">
                    Direct Artisan Wage Realization
                  </span>
                  <strong className="text-2xl font-bold font-heading text-emerald-700">
                    {pricing.breakdown.directWageRealizationPct}%
                  </strong>
                </div>
                <div className="text-right text-xs text-emerald-800">
                  <span className="block font-semibold">Labor Earnings:</span>
                  <span className="font-mono text-sm font-bold text-emerald-900">
                    ₹{pricing.breakdown.laborCost.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-cream-50 border border-terracotta-200 rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-charcoal-700 block">1. Floor Price (Protection)</span>
                    <span className="text-[10px] text-charcoal-700">Minimum non-exploitative baseline</span>
                  </div>
                  <span className="text-lg font-bold font-mono text-charcoal-800">
                    ₹{pricing.floorPrice.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-4 bg-terracotta-500 text-white rounded-2xl flex items-center justify-between shadow-md shadow-terracotta-500/20 border border-terracotta-600">
                  <div>
                    <span className="text-xs font-bold text-heritage-gold uppercase tracking-wider block">
                      2. Fair Retail Price (Recommended)
                    </span>
                    <span className="text-[10px] text-cream-100 opacity-90">Includes Seasonal (1.12x) &amp; Heritage (1.22x)</span>
                  </div>
                  <span className="text-2xl font-bold font-mono text-white">
                    ₹{pricing.retailPrice.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 bg-cream-50 border border-heritage-gold/60 rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">3. Bulk Wholesale Tier (SHG Hub)</span>
                    <span className="text-[10px] text-charcoal-700">Bulk orders (&gt;10 units)</span>
                  </div>
                  <span className="text-lg font-bold font-mono text-amber-900">
                    ₹{pricing.bulkPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <span>⚖️ Middleman Exploitation vs Artifact Fair Wage</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    +{(pricing.breakdown.directWageRealizationPct - 35).toFixed(1)}% Extra Earnings
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-charcoal-700 mb-0.5">
                      <span>Traditional Trader Payout (35% Realization):</span>
                      <span className="font-mono font-bold text-red-700">₹{Math.round(pricing.retailPrice * 0.35).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full h-2 bg-cream-300 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '35%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-charcoal-700 mb-0.5">
                      <span className="font-bold text-emerald-800">Artifact Guaranteed Payout ({pricing.breakdown.directWageRealizationPct}%):</span>
                      <span className="font-mono font-bold text-emerald-700">₹{Math.round(pricing.retailPrice * (pricing.breakdown.directWageRealizationPct / 100)).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full h-2 bg-cream-300 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pricing.breakdown.directWageRealizationPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

