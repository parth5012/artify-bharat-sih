'use client';

import React, { useState } from 'react';
import { GovtIdType, OnboardingData } from '../../utils/onboardingStorage';
import { ArtifyApiClient, ArtisanIdVerificationResult } from '../../utils/apiClient';

interface Step2GovtVerificationProps {
  data: OnboardingData;
  onUpdateData: (partial: Partial<OnboardingData>) => void;
  onBack: () => void;
  onContinue: () => void;
}

const DEMO_PRESETS: Array<{
  idType: GovtIdType;
  idValue: string;
  name: string;
  cluster: string;
  giTag: string;
}> = [
  {
    idType: 'pehchan',
    idValue: 'PEH-IND-88320',
    name: 'Gauri Devi',
    cluster: 'वाराणसी हथकरघा क्लस्टर',
    giTag: 'बनारसी ब्रोकेड साड़ी (GI Reg #39)',
  },
  {
    idType: 'pehchan',
    idValue: 'UP-VAR-102938',
    name: 'Radha Devi',
    cluster: 'वाराणसी हथकरघा क्लस्टर',
    giTag: 'बनारसी ब्रोकेड साड़ी (GI Reg #39)',
  },
  {
    idType: 'trifed',
    idValue: 'TRIFED-UP-VNS-1049',
    name: 'Gauri Devi',
    cluster: 'वाराणसी जनजातीय क्लस्टर',
    giTag: 'बनारसी ब्रोकेड साड़ी (GI Reg #39)',
  },
  {
    idType: 'eshram',
    idValue: 'ESHRAM-8821-9920-1120',
    name: 'Radha Devi',
    cluster: 'वाराणसी ग्रामीण बुनकर क्लस्टर',
    giTag: 'बनारसी ब्रोकेड साड़ी (GI Reg #39)',
  },
];

export const Step2GovtVerification: React.FC<Step2GovtVerificationProps> = ({
  data,
  onUpdateData,
  onBack,
  onContinue,
}) => {
  const [idType, setIdType] = useState<GovtIdType>(data.govtIdType || 'pehchan');
  const [idValue, setIdValue] = useState<string>(data.govtIdValue || '');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    status: 'idle' | 'success' | 'notFound' | 'error';
    message?: string;
  }>({
    status: data.isVerified ? 'success' : 'idle',
  });
  const [isManualMode, setIsManualMode] = useState<boolean>(data.isManualEntry || false);

  // Manual fallback inputs
  const [manualCluster, setManualCluster] = useState(
    data.clusterName || 'वाराणसी हथकरघा क्लस्टर (Varanasi Handloom Cluster)'
  );
  const [manualDistrict, setManualDistrict] = useState(data.district || 'Varanasi');
  const [manualState, setManualState] = useState(data.state || 'Uttar Pradesh');

  const handleIdTypeChange = (newType: GovtIdType) => {
    setIdType(newType);
    onUpdateData({ govtIdType: newType });
  };

  const handleIdValueChange = (val: string) => {
    setIdValue(val);
    onUpdateData({ govtIdValue: val, isVerified: false });
    if (verificationFeedback.status !== 'idle') {
      setVerificationFeedback({ status: 'idle' });
    }
  };

  const applyDemoPreset = (preset: typeof DEMO_PRESETS[0]) => {
    setIdType(preset.idType);
    setIdValue(preset.idValue);
    onUpdateData({
      govtIdType: preset.idType,
      govtIdValue: preset.idValue,
    });
    // Auto-trigger verification for seamless evaluator experience
    executeVerification(preset.idType, preset.idValue);
  };

  const executeVerification = async (
    targetType: GovtIdType = idType,
    targetValue: string = idValue
  ) => {
    const clean = targetValue.trim();
    if (!clean) return;

    setIsVerifying(true);
    setVerificationFeedback({ status: 'idle' });

    try {
      const result: ArtisanIdVerificationResult = await ArtifyApiClient.verifyArtisanId({
        identifier_type: targetType,
        identifier_value: clean,
      });

      if (result.is_valid) {
        onUpdateData({
          isVerified: true,
          govtIdType: targetType,
          govtIdValue: result.identifier_value,
          artisanName: result.artisan_name || data.artisanName || 'Radha Devi',
          craftCategory: result.craft_category || data.craftCategory,
          clusterName: result.cluster_name || data.clusterName,
          district: result.district || data.district,
          state: result.state || data.state,
          giCertified: result.gi_certified,
          giTagName: result.gi_tag_name || '',
          verificationSource: result.verification_source,
          isManualEntry: false,
        });
        setVerificationFeedback({
          status: 'success',
          message: `सफलतापूर्वक सत्यापित! ${result.artisan_name || 'कारीगर'} का रिकॉर्ड राष्ट्रीय डेटाबेस में मिल गया।`,
        });
      } else {
        onUpdateData({
          isVerified: false,
          verificationSource: result.verification_source,
        });
        setVerificationFeedback({
          status: 'notFound',
          message: 'पहचान संख्या डेटाबेस में नहीं मिली। कृपया पुनः जांचें अथवा नीचे "मैन्युअल भरें" विकल्प चुनें।',
        });
      }
    } catch (err: any) {
      console.warn('[Step2GovtVerification] Verification error:', err);
      setVerificationFeedback({
        status: 'error',
        message: 'नेटवर्क त्रुटि या सर्वर उपलब्ध नहीं है। आप मैन्युअल विवरण भरकर आगे बढ़ सकते हैं।',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggleManual = () => {
    const nextManual = !isManualMode;
    setIsManualMode(nextManual);
    onUpdateData({
      isManualEntry: nextManual,
      clusterName: manualCluster,
      district: manualDistrict,
      state: manualState,
    });
  };

  const handleManualClusterChange = (val: string) => {
    setManualCluster(val);
    onUpdateData({ clusterName: val });
  };

  const handleManualDistrictChange = (val: string) => {
    setManualDistrict(val);
    onUpdateData({ district: val });
  };

  const handleManualStateChange = (val: string) => {
    setManualState(val);
    onUpdateData({ state: val });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold text-sm">
            🪪
          </span>
          <h3 className="text-xl font-extrabold text-slate-900">
            1-टैप सरकारी सत्यापन (Govt Registry e-KYC)
          </h3>
        </div>
        <p className="text-sm text-slate-600">
          पहचान कार्ड (Pehchan Card), ई-श्रम UAN अथवा TRIFED संख्या से स्वतः क्लस्टर, जिला और GI प्रमाणीकरण लोड करें।
        </p>
      </div>

      {/* ID Type Selector Tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
        <button
          type="button"
          onClick={() => handleIdTypeChange('pehchan')}
          className={`flex-1 min-h-[48px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
            idType === 'pehchan'
              ? 'bg-white text-slate-900 shadow-md border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🪪 पहचान पत्र (Pehchan)</span>
        </button>

        <button
          type="button"
          onClick={() => handleIdTypeChange('eshram')}
          className={`flex-1 min-h-[48px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
            idType === 'eshram'
              ? 'bg-white text-slate-900 shadow-md border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>💼 ई-श्रम (e-Shram UAN)</span>
        </button>

        <button
          type="button"
          onClick={() => handleIdTypeChange('trifed')}
          className={`flex-1 min-h-[48px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
            idType === 'trifed'
              ? 'bg-white text-slate-900 shadow-md border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🌿 ट्राईफेड (TRIFED ID)</span>
        </button>
      </div>

      {/* 1-Click Demo Evaluation Presets */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡</span>
            <span>त्वरित परीक्षण नमूने (1-Tap Demo Test IDs):</span>
          </span>
          <span className="text-[11px] text-amber-700">टैप करके स्वतः भरें</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEMO_PRESETS.map((p) => (
            <button
              key={p.idValue}
              type="button"
              onClick={() => applyDemoPreset(p)}
              className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100/80 text-slate-800 border border-amber-300 shadow-sm transition-all flex items-center gap-1.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <span>{p.idValue}</span>
              <span className="text-[10px] text-slate-500 font-sans font-normal">
                ({p.name.split(' ')[0]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Verification Input Field */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div>
          <label
            htmlFor="govt-id-input"
            className="block text-sm font-bold text-slate-800 mb-1.5"
          >
            {idType === 'pehchan'
              ? 'Pehchan कार्ड संख्या (Pehchan ID Number)'
              : idType === 'eshram'
              ? '12-अंकों का ई-श्रम UAN (12-Digit e-Shram UAN)'
              : 'TRIFED शिल्पी संख्या (TRIFED Artisan ID)'}
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                id="govt-id-input"
                type="text"
                value={idValue}
                onChange={(e) => handleIdValueChange(e.target.value)}
                placeholder={
                  idType === 'pehchan'
                    ? 'उदा. PEH-IND-88320 या UP-VAR-102938'
                    : idType === 'eshram'
                    ? 'उदा. ESHRAM-8821-9920-1120'
                    : 'उदा. TRIFED-UP-VNS-1049'
                }
                className="w-full min-h-[52px] px-4 rounded-xl border-2 border-slate-300 font-mono font-bold text-base text-slate-900 tracking-wide transition-all focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 uppercase"
              />
              {data.isVerified && (
                <span className="absolute right-3.5 top-3.5 text-emerald-600 text-lg font-bold">
                  ✓
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={isVerifying || !idValue.trim()}
              onClick={() => executeVerification()}
              className={`min-h-[52px] px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500 shrink-0 ${
                isVerifying || !idValue.trim()
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98'
              }`}
            >
              {isVerifying ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>जांच हो रही है...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>1-टैप सत्यापन करें (Verify)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Verification Status Feedback Alerts */}
        {verificationFeedback.status === 'success' && data.isVerified && (
          <div
            role="status"
            className="bg-emerald-50 border-2 border-emerald-500/60 rounded-2xl p-4 sm:p-5 animate-fadeIn"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shadow-sm">
                  ✓
                </span>
                <div>
                  <h4 className="font-extrabold text-base text-emerald-950">
                    सरकारी डेटाबेस में सत्यापित! (Verified Authentic)
                  </h4>
                  <p className="text-xs text-emerald-700 font-medium">
                    {data.verificationSource || 'National Handicrafts & Handlooms Database (DC Handicrafts)'}
                  </p>
                </div>
              </div>

              {data.giCertified && (
                <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-200/90 text-amber-950 border border-amber-400 shadow-sm">
                  🎖️ GI प्रमाणित शिल्प
                </span>
              )}
            </div>

            {/* Autofilled metadata grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-emerald-200 text-xs sm:text-sm">
              <div>
                <span className="text-slate-500 font-medium">कारीगर का नाम:</span>
                <p className="font-bold text-slate-900 text-base">{data.artisanName || 'Radha Devi'}</p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">शिल्प श्रेणी:</span>
                <p className="font-bold text-slate-900">{data.craftCategory}</p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">हथकरघा / शिल्प क्लस्टर:</span>
                <p className="font-bold text-slate-900">{data.clusterName}</p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">जिला एवं राज्य:</span>
                <p className="font-bold text-slate-900">
                  {data.district}, {data.state}
                </p>
              </div>

              {data.giTagName && (
                <div className="sm:col-span-2 bg-white/80 p-2.5 rounded-xl border border-emerald-300">
                  <span className="text-xs font-bold text-amber-900">भौगोलिक उपदर्शन (GI Tag):</span>
                  <p className="font-extrabold text-emerald-900 text-sm">{data.giTagName}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {verificationFeedback.status === 'notFound' && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs sm:text-sm text-amber-900"
          >
            <p className="font-bold flex items-center gap-1.5">
              <span>⚠️</span>
              <span>रिकॉर्ड नहीं मिला (Record Not Found)</span>
            </p>
            <p className="mt-1 text-slate-700">
              {verificationFeedback.message} आप ऊपर दिए गए त्वरित परीक्षण नमूनों (जैसे{' '}
              <button
                type="button"
                onClick={() => applyDemoPreset(DEMO_PRESETS[0])}
                className="underline font-bold text-amber-900"
              >
                PEH-IND-88320
              </button>
              ) का उपयोग कर सकते हैं अथवा नीचे मैन्युअल विवरण भर सकते हैं।
            </p>
          </div>
        )}

        {verificationFeedback.status === 'error' && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 text-xs sm:text-sm text-rose-900"
          >
            <p className="font-bold">{verificationFeedback.message}</p>
          </div>
        )}
      </div>

      {/* EXPLICIT SKIP / MANUAL ENTRY FALLBACK */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">
              सरकारी कार्ड अभी पास नहीं है?
            </h4>
            <p className="text-xs text-slate-600">
              आप पहचान पत्र सत्यापन को अभी छोड़कर सीधे क्लस्टर व राज्य विवरण मैन्युअल दर्ज कर सकते हैं।
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleManual}
            className="min-h-[48px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {isManualMode
              ? 'मैन्युअल फ़ॉर्म छिपाएं'
              : 'छोड़ें और मैन्युअल भरें (Skip & Enter Manually)'}
          </button>
        </div>

        {isManualMode && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3.5 animate-fadeIn">
            <div>
              <label
                htmlFor="manual-cluster"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                क्लस्टर / गाँव का नाम <span className="text-rose-600">*</span>
              </label>
              <input
                id="manual-cluster"
                type="text"
                value={manualCluster}
                onChange={(e) => handleManualClusterChange(e.target.value)}
                placeholder="उदा. वाराणसी हथकरघा क्लस्टर"
                className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="manual-district"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                जिला (District) <span className="text-rose-600">*</span>
              </label>
              <input
                id="manual-district"
                type="text"
                value={manualDistrict}
                onChange={(e) => handleManualDistrictChange(e.target.value)}
                placeholder="उदा. Varanasi"
                className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="manual-state"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                राज्य (State) <span className="text-rose-600">*</span>
              </label>
              <input
                id="manual-state"
                type="text"
                value={manualState}
                onChange={(e) => handleManualStateChange(e.target.value)}
                placeholder="उदा. Uttar Pradesh"
                className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[52px] px-6 py-3 rounded-2xl font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          ← पीछे जाएं (Back to Step 1)
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="min-h-[52px] px-8 py-3 rounded-2xl font-extrabold text-base bg-gradient-to-r from-amber-600 via-orange-600 to-terracotta text-white hover:from-amber-700 hover:to-orange-700 shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 active:scale-98 focus:outline-none focus:ring-4 focus:ring-amber-400"
        >
          <span>आगे बढ़ें (Continue to Step 3)</span>
          <span className="text-xl leading-none">→</span>
        </button>
      </div>
    </div>
  );
};
