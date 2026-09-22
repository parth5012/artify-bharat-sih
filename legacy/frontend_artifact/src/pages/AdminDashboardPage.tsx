import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { EconomicHeatmap } from '../components/admin/EconomicHeatmap';
import { JuryAuditFeed } from '../components/admin/JuryAuditFeed';
import { SkillMetrics } from '../components/admin/SkillMetrics';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { getDistrictMetrics, getJuryAuditFeed, getPMDakshMetrics } from '../api/adminApi';
import type { DistrictMetric, AuditFeedItem, PMDakshMetric } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const [districtMetrics, setDistrictMetrics] = useState<DistrictMetric[]>([]);
  const [auditFeed, setAuditFeed] = useState<AuditFeedItem[]>([]);
  const [pmDakshMetrics, setPmDakshMetrics] = useState<PMDakshMetric[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [districts, audit, pmDaksh] = await Promise.all([
        getDistrictMetrics(),
        getJuryAuditFeed(),
        getPMDakshMetrics(),
      ]);
      setDistrictMetrics(districts);
      setAuditFeed(audit);
      setPmDakshMetrics(pmDaksh);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-cream-50 p-6 rounded-3xl border border-terracotta-200 shadow-warm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-terracotta-500 text-white flex items-center justify-center font-bold shadow-md shadow-terracotta-500/20">
            <Shield className="w-6 h-6 text-heritage-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-heading text-charcoal-900">
                MoSJE Executive Admin Dashboard
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                Government Telemetry
              </span>
            </div>
            <p className="text-xs text-charcoal-700">
              Ministry of Social Justice &amp; Empowerment • SIH PS 26090 Platform Monitor
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          onClick={loadAdminData}
        >
          Refresh Telemetry
        </Button>
      </div>

      {isLoading ? (
        <Loader size="lg" label="Connecting to MoSJE Audit Ledger..." />
      ) : (
        <div className="space-y-8 animate-fade-in">
          <EconomicHeatmap metrics={districtMetrics} />
          <JuryAuditFeed auditFeed={auditFeed} />
          <SkillMetrics metrics={pmDakshMetrics} />
        </div>
      )}
    </div>
  );
};
