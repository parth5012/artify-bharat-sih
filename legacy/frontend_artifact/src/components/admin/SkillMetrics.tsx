import React from 'react';
import { Award, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { PMDakshMetric } from '../../types';

interface SkillMetricsProps {
  metrics: PMDakshMetric[];
}

export const SkillMetrics: React.FC<SkillMetricsProps> = ({ metrics }) => {
  return (
    <Card className="border-terracotta-200 shadow-warm">
      <div className="flex items-center justify-between border-b border-terracotta-200 pb-4 mb-5">
        <div>
          <h3 className="text-lg font-bold font-heading text-charcoal-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-heritage-gold" />
            PM-DAKSH Skill Progression &amp; Wage Realization
          </h3>
          <p className="text-xs text-charcoal-700 mt-0.5">
            Empowerment metrics following PM-DAKSH upskilling certifications.
          </p>
        </div>

        <Badge variant="gold" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
          DPI Certified Scheme
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {metrics.map((m, idx) => {
          const multiplier = (m.wageAfter / m.wageBefore).toFixed(2);

          return (
            <div
              key={idx}
              className="bg-cream-100 p-5 rounded-2xl border border-terracotta-200/70 space-y-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-700 block">
                  {m.certifiedCount.toLocaleString('en-IN')} Certified Artisans
                </span>
                <h4 className="text-base font-bold font-heading text-charcoal-900 mt-0.5">
                  {m.artisanLevel}
                </h4>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-terracotta-100 grid grid-cols-5 gap-2 items-center text-center">
                <div className="col-span-2">
                  <span className="text-[10px] text-charcoal-700 font-semibold block uppercase">BEFORE</span>
                  <strong className="text-sm font-bold font-mono text-charcoal-700">
                    ₹{m.wageBefore}/day
                  </strong>
                  <span className="text-[9px] text-charcoal-700 block">1.0x Baseline</span>
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-terracotta-500" />
                </div>

                <div className="col-span-2">
                  <span className="text-[10px] text-emerald-800 font-bold block uppercase">AFTER PM-DAKSH</span>
                  <strong className="text-base font-bold font-mono text-emerald-800">
                    ₹{m.wageAfter}/day
                  </strong>
                  <span className="text-[10px] text-emerald-700 font-bold block">{multiplier}x Wage Surge</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold text-charcoal-800 mb-1">
                  <span>Certification Mastery:</span>
                  <span className="text-emerald-700 font-bold">{m.trainingProgressPct}% Complete</span>
                </div>
                <div className="h-2 w-full bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${m.trainingProgressPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
