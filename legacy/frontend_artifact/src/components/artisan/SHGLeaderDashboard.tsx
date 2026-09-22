import React from 'react';
import { Users, ShoppingBag, QrCode, Printer, Camera } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MOCK_ARTISAN_PROFILES, MOCK_PRODUCTS } from '../../mocks/mockData';

interface SHGLeaderDashboardProps {
  onNavigateToCapture?: () => void;
  onNavigateToPassport?: (code: string) => void;
  onNavigateToPrint?: (code: string) => void;
}

export const SHGLeaderDashboard: React.FC<SHGLeaderDashboardProps> = ({
  onNavigateToCapture,
  onNavigateToPassport,
  onNavigateToPrint,
}) => {
  const leader = MOCK_ARTISAN_PROFILES.shg_leader;

  return (
    <div className="space-y-6">
      <Card variant="gold" padding="lg" className="border-heritage-gold shadow-warm-lg">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <img
            src={leader.photoUrl}
            alt={leader.name}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-heritage-gold shadow-md"
          />

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-bold font-heading text-charcoal-900">{leader.shgGroup}</h2>
              <Badge variant="gold" icon={<Users className="w-3.5 h-3.5" />}>
                52 Member Hub
              </Badge>
            </div>
            <p className="text-xs text-charcoal-800 font-medium">
              Leader: <strong>{leader.name}</strong> • Cluster: <strong>{leader.cluster} Hub</strong> • Dialects: <strong>{leader.dialect}</strong>
            </p>
            <p className="text-[11px] text-charcoal-700">
              MoSJE Co-operative Register ID: <code className="font-mono bg-cream-200 px-1 py-0.5 rounded">SHG-BR-2026-991</code>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {onNavigateToCapture && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Camera className="w-4 h-4" />}
                onClick={onNavigateToCapture}
              >
                Add Group Product
              </Button>
            )}
            <Button
              variant="gold"
              size="md"
              leftIcon={<ShoppingBag className="w-4 h-4" />}
              onClick={() => onNavigateToPassport && onNavigateToPassport('ABC123')}
            >
              Wholesale B2B Catalog
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-cream-50 rounded-2xl border border-terracotta-200 shadow-warm space-y-1">
          <span className="text-[11px] font-semibold text-charcoal-700 block">Total Active Artisans</span>
          <strong className="text-2xl font-bold font-mono text-charcoal-900 block">52 Artisans</strong>
          <span className="text-[10px] text-emerald-700 font-semibold">100% PM-DAKSH Certified</span>
        </div>

        <div className="p-4 bg-cream-50 rounded-2xl border border-terracotta-200 shadow-warm space-y-1">
          <span className="text-[11px] font-semibold text-charcoal-700 block">Monthly Production</span>
          <strong className="text-2xl font-bold font-mono text-terracotta-700 block">184 Units</strong>
          <span className="text-[10px] text-charcoal-700">Handloom &amp; Mithila Paint</span>
        </div>

        <div className="p-4 bg-cream-50 rounded-2xl border border-terracotta-200 shadow-warm space-y-1">
          <span className="text-[11px] font-semibold text-charcoal-700 block">Direct Member Payouts</span>
          <strong className="text-2xl font-bold font-mono text-emerald-800 block">₹8.45 Lakhs</strong>
          <span className="text-[10px] text-emerald-700 font-semibold">86.2% Avg Wage Realization</span>
        </div>

        <div className="p-4 bg-cream-50 rounded-2xl border border-terracotta-200 shadow-warm space-y-1">
          <span className="text-[11px] font-semibold text-charcoal-700 block">Bulk B2B Orders</span>
          <strong className="text-2xl font-bold font-mono text-amber-900 block">14 Active Contracts</strong>
          <span className="text-[10px] text-amber-800 font-semibold">High Season Demand</span>
        </div>
      </div>

      <Card className="border-terracotta-200 shadow-warm">
        <div className="flex items-center justify-between border-b border-terracotta-200 pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold font-heading text-charcoal-800">
              50-Artisan Group Wholesale Catalog &amp; Bulk Pricing
            </h3>
            <p className="text-xs text-charcoal-700">
              Wholesale tier (86% retail) applied automatically for bulk orders (&gt;10 units).
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {MOCK_PRODUCTS.map((prod) => (
            <div
              key={prod.id}
              className="p-4 bg-cream-100 rounded-2xl border border-terracotta-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3.5">
                <img
                  src={prod.wipPhotoUrl}
                  alt={prod.title}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="w-14 h-14 rounded-xl object-cover border border-terracotta-200 bg-terracotta-100"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-terracotta-600 bg-cream-200 px-2 py-0.5 rounded border border-cream-300">
                      {prod.shortcode}
                    </span>
                    <Badge variant="cluster">{prod.cluster}</Badge>
                  </div>
                  <h4 className="text-sm font-bold text-charcoal-900 mt-0.5">{prod.title}</h4>
                  <p className="text-xs text-charcoal-700">Artisan: {prod.artisanName}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-cream-200 pt-2 sm:pt-0">
                <div className="text-right">
                  <span className="text-[10px] text-charcoal-700 font-semibold block uppercase">Bulk Wholesale</span>
                  <strong className="text-base font-bold font-mono text-amber-900">
                    ₹{prod.pricing.bulkPrice.toLocaleString('en-IN')} / unit
                  </strong>
                  <span className="text-[10px] text-charcoal-700 block">Retail: ₹{prod.pricing.retailPrice.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {onNavigateToPassport && (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<QrCode className="w-3.5 h-3.5" />}
                      onClick={() => onNavigateToPassport(prod.shortcode)}
                    >
                      Passport
                    </Button>
                  )}
                  {onNavigateToPrint && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Printer className="w-3.5 h-3.5" />}
                      onClick={() => onNavigateToPrint(prod.shortcode)}
                    >
                      Print Tag
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
