import React from 'react';
import { ShieldCheck, HeartHandshake } from 'lucide-react';
import { Card } from '../ui/Card';

interface TransparentCostBreakdownProps {
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  retailPrice: number;
  directWagePct: number;
}

export const TransparentCostBreakdown: React.FC<TransparentCostBreakdownProps> = ({
  materialCost,
  laborCost,
  overheadCost,
  retailPrice,
  directWagePct,
}) => {
  const materialPct = Math.round((materialCost / retailPrice) * 100);
  const laborPct = Math.round((laborCost / retailPrice) * 100);
  const overheadPct = Math.round((overheadCost / retailPrice) * 100);

  return (
    <Card className="border-terracotta-200 shadow-warm">
      <div className="flex items-center justify-between border-b border-terracotta-200 pb-3 mb-4">
        <div>
          <h3 className="text-lg font-bold font-heading text-charcoal-800 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-terracotta-500" />
            Transparent Wage &amp; Price Breakdown
          </h3>
          <p className="text-xs text-charcoal-700 mt-0.5">
            Every rupee spent is tracked transparently to eliminate middleman exploitation.
          </p>
        </div>

        {directWagePct >= 80 && (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase border border-emerald-300 flex items-center gap-1 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            {directWagePct}% Direct Wage Realization
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs font-bold text-charcoal-800 mb-1.5">
            <span>Price Distribution Breakdown (₹{retailPrice.toLocaleString('en-IN')})</span>
            <span className="text-emerald-700 font-mono font-bold">{directWagePct}% Direct to Artisan</span>
          </div>

          <div className="h-4 w-full bg-cream-200 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${laborPct}%` }}
              className="bg-emerald-600 h-full transition-all"
              title={`Direct Artisan Labor: ${laborPct}%`}
            />
            <div
              style={{ width: `${materialPct}%` }}
              className="bg-terracotta-500 h-full transition-all"
              title={`Raw Material: ${materialPct}%`}
            />
            <div
              style={{ width: `${overheadPct}%` }}
              className="bg-heritage-gold h-full transition-all"
              title={`Overhead & Loom: ${overheadPct}%`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">1. Artisan Direct Labor</span>
            <strong className="text-base font-bold font-mono text-emerald-900">
              ₹{laborCost.toLocaleString('en-IN')}
            </strong>
            <span className="text-[10px] text-emerald-700 block mt-0.5">{laborPct}% of total retail price</span>
          </div>

          <div className="p-3 bg-terracotta-50 rounded-xl border border-terracotta-200">
            <span className="text-[10px] uppercase font-bold text-terracotta-800 block">2. Raw Material Cost</span>
            <strong className="text-base font-bold font-mono text-terracotta-900">
              ₹{materialCost.toLocaleString('en-IN')}
            </strong>
            <span className="text-[10px] text-terracotta-700 block mt-0.5">{materialPct}% (Silk/Zari/Pigments)</span>
          </div>

          <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
            <span className="text-[10px] uppercase font-bold text-amber-900 block">3. Loom &amp; Craft Overhead</span>
            <strong className="text-base font-bold font-mono text-amber-900">
              ₹{overheadCost.toLocaleString('en-IN')}
            </strong>
            <span className="text-[10px] text-amber-800 block mt-0.5">{overheadPct}% tool wear &amp; logistics</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
