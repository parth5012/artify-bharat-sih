import React, { useState } from 'react';
import { Map, MapPin, TrendingUp, Users, ShoppingBag, Award, BarChart3 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { DistrictMetric } from '../../types';

interface EconomicHeatmapProps {
  metrics: DistrictMetric[];
}

export const EconomicHeatmap: React.FC<EconomicHeatmapProps> = ({ metrics }) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Varanasi');

  const current = metrics.find((m) => m.district === selectedDistrict) || metrics[0];

  return (
    <Card className="border-terracotta-200 shadow-warm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-terracotta-200 pb-4 mb-5 gap-3">
        <div>
          <h3 className="text-lg font-bold font-heading text-charcoal-800 flex items-center gap-2">
            <Map className="w-5 h-5 text-terracotta-500" />
            Geospatial District Economic Heatmap
          </h3>
          <p className="text-xs text-charcoal-700 mt-0.5">
            Real-time economic velocity across MoSJE &amp; Handloom Craft Clusters.
          </p>
        </div>

        <Badge variant="verified" icon={<Award className="w-3.5 h-3.5" />}>
          MoSJE Live Feed
        </Badge>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {metrics.map((m) => (
          <button
            key={m.district}
            onClick={() => setSelectedDistrict(m.district)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedDistrict === m.district
                ? 'bg-terracotta-500 text-white shadow-md shadow-terracotta-500/20'
                : 'bg-cream-200/80 text-charcoal-800 hover:bg-cream-300'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{m.district}</span>
          </button>
        ))}
      </div>

      {current && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-cream-100 p-6 rounded-2xl border border-terracotta-200/60">
          <div className="lg:col-span-5 space-y-4">
            <div>
              <span className="text-xs font-semibold text-terracotta-600 uppercase tracking-wider block">
                {current.state}
              </span>
              <h4 className="text-2xl font-bold font-heading text-charcoal-900">
                {current.district} Economic Cluster
              </h4>
              <p className="text-xs text-charcoal-700 mt-1 font-medium">
                Focus: <span className="text-terracotta-700 font-bold">{current.craftFocus}</span>
              </p>
            </div>

            <div className="relative aspect-video rounded-2xl bg-charcoal-900/90 overflow-hidden border-2 border-terracotta-300 p-4 flex flex-col justify-between shadow-inner text-white">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-heritage-gold">GIS Geofence Status</span>
                <span className="px-2 py-0.5 bg-emerald-700 text-white rounded-full text-[10px]">
                  Active Sensor Array
                </span>
              </div>

              <div className="flex flex-col items-center justify-center my-auto space-y-1">
                <div className="w-16 h-16 rounded-full border-4 border-terracotta-500/60 flex items-center justify-center animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-terracotta-500 text-white font-bold flex items-center justify-center text-xs shadow-lg">
                    {current.economicActivityScore}%
                  </div>
                </div>
                <span className="text-[11px] text-cream-200 font-semibold">Economic Velocity Score</span>
              </div>

              <div className="flex justify-between text-[10px] text-cream-100 opacity-90">
                <span>Total Active Loom Nodes: {current.activeArtisans.toLocaleString('en-IN')}</span>
                <span>Demand: {current.demandForecast}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-terracotta-100 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-charcoal-700 font-semibold">
                <Users className="w-4 h-4 text-terracotta-500" />
                <span>Registered Artisans</span>
              </div>
              <strong className="text-2xl font-bold font-mono text-charcoal-900 block">
                {current.artisanCount.toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-emerald-700 font-semibold">
                {current.activeArtisans.toLocaleString('en-IN')} Currently Active
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-terracotta-100 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-charcoal-700 font-semibold">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Average Daily Wage</span>
              </div>
              <strong className="text-2xl font-bold font-mono text-emerald-800 block">
                ₹{current.averageWagePerDay}/day
              </strong>
              <span className="text-[10px] text-charcoal-700">MoSJE Minimum Floor Compliant</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-terracotta-100 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-charcoal-700 font-semibold">
                <ShoppingBag className="w-4 h-4 text-heritage-goldDark" />
                <span>Total Orders Volume</span>
              </div>
              <strong className="text-2xl font-bold font-mono text-charcoal-900 block">
                ₹{(current.ordersVolume / 100000).toFixed(1)} Lakhs
              </strong>
              <span className="text-[10px] text-charcoal-700">{current.productsCount} Provenance Passports</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-terracotta-100 shadow-sm space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-charcoal-700 font-semibold">
                <BarChart3 className="w-4 h-4 text-terracotta-500" />
                <span>PM-DAKSH Upgrade Rate</span>
              </div>
              <strong className="text-2xl font-bold font-mono text-terracotta-700 block">
                {current.skillProgressionRate}%
              </strong>
              <span className="text-[10px] text-emerald-700 font-semibold">High Skill Progression</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
