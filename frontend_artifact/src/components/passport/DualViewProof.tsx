import React, { useState } from 'react';
import { Sparkles, MapPin, ShieldCheck } from 'lucide-react';
import { Card } from '../ui/Card';
import type { CraftProduct } from '../../types';

interface DualViewProofProps {
  product: CraftProduct;
}

export const DualViewProof: React.FC<DualViewProofProps> = ({ product }) => {
  const [activeTab, setActiveTab] = useState<'both' | 'wip' | 'clean'>('both');

  return (
    <Card className="border-terracotta-200 shadow-warm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-terracotta-200 pb-4 mb-4 gap-2">
        <div>
          <h3 className="text-lg font-bold font-heading text-charcoal-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Dual-Visual Craft Provenance Proof
          </h3>
          <p className="text-xs text-charcoal-700 mt-0.5">
            Authenticity verified via live loom snapshot &amp; background isolation studio enhancement.
          </p>
        </div>

        <div className="bg-cream-200/80 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'both' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-charcoal-700'
            }`}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setActiveTab('wip')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'wip' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-charcoal-700'
            }`}
          >
            1. WIP Loom Proof
          </button>
          <button
            onClick={() => setActiveTab('clean')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'clean' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-charcoal-700'
            }`}
          >
            2. Studio Presentation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(activeTab === 'both' || activeTab === 'wip') && (
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-terracotta-300 shadow-md group">
              <img
                src={product.wipPhotoUrl}
                alt="WIP Loom Evidence Photo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              <div className="absolute top-3 left-3 bg-charcoal-900/80 backdrop-blur-md text-white p-2.5 rounded-xl border border-cream-200/30 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-0.5">
                  <MapPin className="w-4 h-4" />
                  <span>GPS Geofence Verified</span>
                </div>
                <div className="text-[10px] text-cream-100 opacity-90 font-mono">
                  {product.gpsCoordinates.lat}° N, {product.gpsCoordinates.lng}° E
                </div>
                <div className="text-[10px] text-terracotta-300 font-semibold mt-0.5">
                  {product.gpsCoordinates.verifiedCluster}
                </div>
              </div>

              <div className="absolute bottom-3 right-3 px-3 py-1 bg-terracotta-600/90 text-white text-[11px] font-bold rounded-full backdrop-blur-md">
                1:1 Camera Studio Snapshot
              </div>
            </div>

            <div className="p-3 bg-cream-100 rounded-xl border border-terracotta-200/60 text-xs">
              <strong className="text-charcoal-800 block font-semibold mb-0.5">
                Work-in-Progress (WIP) Proof:
              </strong>
              <p className="text-charcoal-700">
                Captured directly on loom/workbench at {product.gpsCoordinates.timestamp}. Tilt angle locked within ≤ 1.5° tolerance.
              </p>
            </div>
          </div>
        )}

        {(activeTab === 'both' || activeTab === 'clean') && (
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-heritage-gold/60 bg-cream-200/40 shadow-md flex items-center justify-center p-4 group">
              <img
                src={product.cleanPhotoUrl}
                alt="Clean Studio Product Presentation"
                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-xl"
              />

              <div className="absolute top-3 right-3 px-3 py-1 bg-heritage-gold text-charcoal-900 text-xs font-bold rounded-full shadow-md flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>U²-Net Background Isolated</span>
              </div>
            </div>

            <div className="p-3 bg-cream-100 rounded-xl border border-terracotta-200/60 text-xs">
              <strong className="text-charcoal-800 block font-semibold mb-0.5">
                Final Studio Product Presentation:
              </strong>
              <p className="text-charcoal-700">
                Background removed using U²-Net AI isolation &amp; CLAHE contrast enhancement for e-commerce catalog presentation.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
