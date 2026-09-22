import React from 'react';
import { Camera, Mic, IndianRupee, QrCode, Printer, HardDrive, Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MOCK_ARTISAN_PROFILES, MOCK_PRODUCTS } from '../../mocks/mockData';

interface SoloArtisanDashboardProps {
  onNavigateToCapture: () => void;
  onNavigateToVoice: () => void;
  onNavigateToPricing: () => void;
  onNavigateToPassport: (code: string) => void;
  onNavigateToPrint: (code: string) => void;
  onNavigateToDrafts: () => void;
}

export const SoloArtisanDashboard: React.FC<SoloArtisanDashboardProps> = ({
  onNavigateToCapture,
  onNavigateToVoice,
  onNavigateToPricing,
  onNavigateToPassport,
  onNavigateToPrint,
  onNavigateToDrafts,
}) => {
  const profile = MOCK_ARTISAN_PROFILES.solo;

  return (
    <div className="space-y-6">
      <Card variant="gold" padding="lg" className="border-terracotta-300">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <img
            src={profile.photoUrl}
            alt={profile.name}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-heritage-gold shadow-md"
          />

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-bold font-heading text-charcoal-900">{profile.name}</h2>
              <Badge variant="verified">Solo Master Artisan</Badge>
              <Badge variant="gold">PM-DAKSH Certified (1.38x Wage)</Badge>
            </div>
            <p className="text-xs text-charcoal-700">
              Mother Tongue: <strong className="text-terracotta-700">{profile.dialect}</strong> • Hub Cluster: <strong className="text-charcoal-800">{profile.cluster} Hub</strong>
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={onNavigateToCapture}
            className="w-full sm:w-auto"
          >
            Create New Product
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={onNavigateToCapture}
          className="p-5 bg-cream-50 hover:bg-terracotta-50 rounded-2xl border border-terracotta-200/80 shadow-warm text-left space-y-3 transition-all hover:scale-[1.02] group"
        >
          <div className="w-10 h-10 rounded-xl bg-terracotta-500 text-white flex items-center justify-center shadow-md shadow-terracotta-500/20 group-hover:scale-110 transition-transform">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold font-heading text-sm text-charcoal-800">Camera Studio</h3>
            <p className="text-[11px] text-charcoal-700 mt-0.5">1:1 Live Loom Snapshot</p>
          </div>
        </button>

        <button
          onClick={onNavigateToVoice}
          className="p-5 bg-cream-50 hover:bg-terracotta-50 rounded-2xl border border-terracotta-200/80 shadow-warm text-left space-y-3 transition-all hover:scale-[1.02] group"
        >
          <div className="w-10 h-10 rounded-xl bg-heritage-gold text-charcoal-900 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold font-heading text-sm text-charcoal-800">Voice Story</h3>
            <p className="text-[11px] text-charcoal-700 mt-0.5">Record Dialect Audio</p>
          </div>
        </button>

        <button
          onClick={onNavigateToPricing}
          className="p-5 bg-cream-50 hover:bg-terracotta-50 rounded-2xl border border-terracotta-200/80 shadow-warm text-left space-y-3 transition-all hover:scale-[1.02] group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold font-heading text-sm text-charcoal-800">Fair Wage Calculator</h3>
            <p className="text-[11px] text-charcoal-700 mt-0.5">3-Tier Wage Protection</p>
          </div>
        </button>

        <button
          onClick={onNavigateToDrafts}
          className="p-5 bg-cream-50 hover:bg-terracotta-50 rounded-2xl border border-terracotta-200/80 shadow-warm text-left space-y-3 transition-all hover:scale-[1.02] group"
        >
          <div className="w-10 h-10 rounded-xl bg-charcoal-800 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold font-heading text-sm text-charcoal-800">Offline Drafts</h3>
            <p className="text-[11px] text-charcoal-700 mt-0.5">IndexedDB Local Storage</p>
          </div>
        </button>
      </div>

      <Card className="border-terracotta-200 shadow-warm">
        <div className="flex items-center justify-between border-b border-terracotta-200 pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold font-heading text-charcoal-800">My Registered Craft Passports</h3>
            <p className="text-xs text-charcoal-700">Digital Passport SHA-256 provenance active.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_PRODUCTS.map((prod) => (
            <div
              key={prod.id}
              className="p-4 bg-cream-100 rounded-2xl border border-terracotta-200/80 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3.5">
                <img
                  src={prod.wipPhotoUrl}
                  alt={prod.title}
                  className="w-16 h-16 rounded-xl object-cover border border-terracotta-200"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-terracotta-600 bg-cream-200 px-2 py-0.5 rounded border border-cream-300">
                      {prod.shortcode}
                    </span>
                    <Badge variant="verified">Verified</Badge>
                  </div>
                  <h4 className="text-sm font-bold text-charcoal-900 mt-1 line-clamp-1">{prod.title}</h4>
                  <p className="text-xs text-emerald-800 font-semibold font-mono mt-0.5">
                    ₹{prod.pricing.retailPrice.toLocaleString('en-IN')} (84.5% Direct Wage)
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<QrCode className="w-3.5 h-3.5" />}
                  onClick={() => onNavigateToPassport(prod.shortcode)}
                >
                  Passport
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                  onClick={() => onNavigateToPrint(prod.shortcode)}
                >
                  Print Tag
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
