'use client';

import React from 'react';
import { OnboardingData } from '../../utils/onboardingStorage';

interface DraftRestoreBannerProps {
  draft: OnboardingData;
  onRestore: () => void;
  onDismiss: () => void;
}

export const DraftRestoreBanner: React.FC<DraftRestoreBannerProps> = ({
  draft,
  onRestore,
  onDismiss,
}) => {
  const formattedTime = React.useMemo(() => {
    try {
      return new Date(draft.updatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'हाल ही में (Recently)';
    }
  }, [draft.updatedAt]);

  const stepName =
    draft.step === 1
      ? 'चरण 1: भूमिका व भाषा'
      : draft.step === 2
      ? 'चरण 2: सरकारी पहचान'
      : 'चरण 3: प्रोफ़ाइल';

  return (
    <div
      role="alert"
      aria-live="polite"
      className="w-full bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-600/15 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 mb-6 shadow-md backdrop-blur-sm"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left info */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
            💾
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                पिछला अधूरा ड्राफ्ट मौजूद है!
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                {stepName}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              कमज़ोर 2G/3G नेटवर्क में आपका डेटा सुरक्षित रखा गया था ({formattedTime} पर सहेजा गया)
              {draft.phone ? ` • फ़ोन: ${draft.phone}` : ''}
              {draft.artisanName ? ` • नाम: ${draft.artisanName}` : ''}
            </p>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={onRestore}
            className="flex-1 sm:flex-none min-h-[48px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            <span>🔄</span>
            <span>पिछला ड्राफ्ट पुनः लोड करें</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-sm border border-slate-300 transition-all active:scale-98 focus:outline-none focus:ring-2 focus:ring-slate-400"
            title="नया ड्राफ्ट शुरू करें"
          >
            नया शुरू करें
          </button>
        </div>
      </div>
    </div>
  );
};
