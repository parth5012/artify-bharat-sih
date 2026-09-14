'use client';

import React, { useState } from 'react';
import { OnboardingData } from '../../utils/onboardingStorage';
import { REGIONAL_DIALECTS } from '../../hooks/useAskDadi';

interface Step3ProfileWelcomeProps {
  data: OnboardingData;
  isSpeaking: boolean;
  onUpdateData: (partial: Partial<OnboardingData>) => void;
  onPlayWelcomeTour: () => void;
  onStopSpeech: () => void;
  onBack: () => void;
  onComplete: () => void;
}

const CRAFT_CATEGORIES = [
  'हथकरघा एवं बनारसी सिल्क (Handloom & Pure Silk Brocade)',
  'जरी-जरदोजी कढ़ाई (Zari Zardozi Embroidery)',
  'मिट्टी के बर्तन एवं टेराकोटा (Clay Pottery & Terracotta)',
  'लकड़ी पर नक्काशी (Wood Inlay & Carving)',
  'मुरादाबादी पीतल व धातु शिल्प (Brass & Metalware)',
  'ब्लू पॉटरी एवं सिरेमिक (Blue Pottery & Ceramic)',
  'हस्तनिर्मित कालीन व दरी (Handmade Carpets & Durries)',
];

export const Step3ProfileWelcome: React.FC<Step3ProfileWelcomeProps> = ({
  data,
  isSpeaking,
  onUpdateData,
  onPlayWelcomeTour,
  onStopSpeech,
  onBack,
  onComplete,
}) => {
  const isShg = data.role === 'shg';
  const dialectInfo = REGIONAL_DIALECTS[data.dialect] || REGIONAL_DIALECTS.hindi;

  const [name, setName] = useState(data.artisanName || '');
  const [shgName, setShgName] = useState(data.shgGroupName || '');
  const [shgCount, setShgCount] = useState<number>(data.shgMemberCount ?? 2);
  const [craft, setCraft] = useState(data.craftCategory || CRAFT_CATEGORIES[0]);
  const [cluster, setCluster] = useState(data.clusterName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    onUpdateData({ artisanName: val });
  };

  const handleShgNameChange = (val: string) => {
    setShgName(val);
    onUpdateData({ shgGroupName: val });
  };

  const handleShgCountChange = (val: number) => {
    setShgCount(val);
    onUpdateData({ shgMemberCount: val });
  };

  const handleCraftChange = (val: string) => {
    setCraft(val);
    onUpdateData({ craftCategory: val });
  };

  const handleClusterChange = (val: string) => {
    setCluster(val);
    onUpdateData({ clusterName: val });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = isShg ? shgName.trim() && name.trim() : name.trim();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* SECTION 1: PROFILE DETAILS FORM */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold text-sm">
              {isShg ? '👥' : '🧑🎨'}
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">
              {isShg ? 'समूह विवरण (SHG Group Profile)' : 'कारीगर प्रोफ़ाइल (Artisan Profile)'}
            </h3>
          </div>
          <p className="text-sm text-slate-600">
            {isShg
              ? 'अपने स्वयं सहायता समूह व सदस्य बुनकरों का विवरण पूरा करें।'
              : 'डिजिटल हेरिटेज पासपोर्ट पर प्रदर्शित होने वाला आपका अधिकृत नाम व शिल्प।'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* If SHG: Group Name */}
          {isShg && (
            <div className="sm:col-span-2">
              <label
                htmlFor="shg-name-input"
                className="block text-sm font-bold text-slate-800 mb-1.5"
              >
                स्वयं सहायता समूह का नाम (SHG Group Name) <span className="text-rose-600">*</span>
              </label>
              <input
                id="shg-name-input"
                type="text"
                value={shgName}
                onChange={(e) => handleShgNameChange(e.target.value)}
                placeholder="उदा. गंगा बुनकर महिला स्वयं सहायता समूह"
                className="w-full min-h-[52px] px-4 rounded-xl border-2 border-slate-300 font-semibold text-base text-slate-900 transition-all focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 bg-white"
                required
              />
            </div>
          )}

          {/* Leader / Artisan Full Name */}
          <div>
            <label
              htmlFor="artisan-name-input"
              className="block text-sm font-bold text-slate-800 mb-1.5"
            >
              {isShg ? 'समूह लीडर / बैंक सखी का नाम' : 'कारीगर का पूरा नाम (Full Name)'}{' '}
              <span className="text-rose-600">*</span>
            </label>
            <input
              id="artisan-name-input"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="उदा. राधा देवी (Radha Devi)"
              className="w-full min-h-[52px] px-4 rounded-xl border-2 border-slate-300 font-semibold text-base text-slate-900 transition-all focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 bg-white"
              required
            />
          </div>

          {/* If SHG: Member Count */}
          {isShg ? (
            <div>
              <label
                htmlFor="shg-member-count"
                className="block text-sm font-bold text-slate-800 mb-1.5"
              >
                सदस्य कारीगरों की संख्या (Member Count) <span className="text-rose-600">*</span>
              </label>
              <input
                id="shg-member-count"
                type="number"
                min={2}
                max={500}
                value={shgCount}
                onChange={(e) => { const val = parseInt(e.target.value, 10); handleShgCountChange(isNaN(val) ? 2 : Math.min(500, Math.max(2, val))); }}
                className="w-full min-h-[52px] px-4 rounded-xl border-2 border-slate-300 font-semibold text-base text-slate-900 transition-all focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 bg-white"
                required
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="craft-select"
                className="block text-sm font-bold text-slate-800 mb-1.5"
              >
                मुख्य शिल्प / कला (Craft Category)
              </label>
              <select
                id="craft-select"
                value={craft}
                onChange={(e) => handleCraftChange(e.target.value)}
                className="w-full min-h-[52px] px-3.5 rounded-xl border-2 border-slate-300 font-semibold text-sm text-slate-900 transition-all focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 bg-white"
              >
                {CRAFT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cluster Name */}
          <div className="sm:col-span-2">
            <label
              htmlFor="cluster-input"
              className="block text-sm font-bold text-slate-800 mb-1.5"
            >
              हथकरघा / शिल्प क्लस्टर (Craft Cluster Location)
            </label>
            <input
              id="cluster-input"
              type="text"
              value={cluster}
              onChange={(e) => handleClusterChange(e.target.value)}
              placeholder="उदा. वाराणसी हथकरघा क्लस्टर"
              className="w-full min-h-[52px] px-4 rounded-xl border-2 border-slate-300 font-semibold text-base text-slate-900 transition-all focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 bg-white"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: 'ASK DADI' AUDIO WELCOME TOUR */}
      <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/15 to-terracotta/10 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-terracotta text-white flex items-center justify-center text-3xl shadow-md border-2 border-white">
              👵
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  दादी का ऑडियो स्वागत संदेश (Dadi's Welcome Tour)
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-amber-900 font-medium">
                आपकी चुनी हुई बोली: <strong>{dialectInfo.nameNative} ({dialectInfo.nameEn})</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isSpeaking) {
                onStopSpeech();
              } else {
                onPlayWelcomeTour();
              }
            }}
            className={`min-h-[50px] px-6 py-2.5 rounded-full font-bold text-sm shadow-md transition-all flex items-center gap-2.5 active:scale-95 focus:outline-none focus:ring-4 ${
              isSpeaking
                ? 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-400 animate-pulse'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white focus:ring-emerald-400'
            }`}
          >
            {isSpeaking ? (
              <>
                <span>⏹️</span>
                <span>रोकें (Stop Audio)</span>
              </>
            ) : (
              <>
                <span>🔊</span>
                <span>दादी का स्वागत संदेश सुनें (Play Welcome Tour)</span>
              </>
            )}
          </button>
        </div>

        {/* 4 Pillars of MoSJE Protection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          <div className="bg-white/85 backdrop-blur-sm p-4 rounded-2xl border border-amber-300/80 shadow-sm flex items-start gap-3">
            <span className="text-2xl shrink-0">⚖️</span>
            <div>
              <h5 className="font-extrabold text-sm text-slate-900">
                100% निष्पक्ष न्यूनतम मजदूरी
              </h5>
              <p className="text-xs text-slate-600 mt-0.5">
                कानूनी न्यूनतम मजदूरी दर (Statutory Wage Floor) के नीचे किसी को भी उत्पाद बेचने नहीं दिया जाएगा।
              </p>
            </div>
          </div>

          <div className="bg-white/85 backdrop-blur-sm p-4 rounded-2xl border border-amber-300/80 shadow-sm flex items-start gap-3">
            <span className="text-2xl shrink-0">🚫</span>
            <div>
              <h5 className="font-extrabold text-sm text-slate-900">
                0% बिचौलिया कमीशन
              </h5>
              <p className="text-xs text-slate-600 mt-0.5">
                जन धन/UPI प्रत्यक्ष बैंक खाते में भुगतान (DBT)। कोई मध्यस्थ या कमीशन कटौती नहीं।
              </p>
            </div>
          </div>

          <div className="bg-white/85 backdrop-blur-sm p-4 rounded-2xl border border-amber-300/80 shadow-sm flex items-start gap-3">
            <span className="text-2xl shrink-0">🏷️</span>
            <div>
              <h5 className="font-extrabold text-sm text-slate-900">
                डिजिटल हेरिटेज पासपोर्ट व 58mm टैग
              </h5>
              <p className="text-xs text-slate-600 mt-0.5">
                हर उत्पाद को 6-अक्षर का जुगाड़ कोड (जैसे A7X-9B2) व थर्मल प्रिंटर टैग मिलेगा जिससे खरीदार प्रामाणिकता जांच सकें।
              </p>
            </div>
          </div>

          <div className="bg-white/85 backdrop-blur-sm p-4 rounded-2xl border border-amber-300/80 shadow-sm flex items-start gap-3">
            <span className="text-2xl shrink-0">🚀</span>
            <div>
              <h5 className="font-extrabold text-sm text-slate-900">
                GeM और ONDC पर एक-टैप निर्यात
              </h5>
              <p className="text-xs text-slate-600 mt-0.5">
                सरकारी विभागों (GeM B2G) और पूरे देश के ई-कॉमर्स (ONDC Beckn) पर सीधे उत्पाद प्रकाशित होंगे।
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto min-h-[52px] px-6 py-3 rounded-2xl font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          ← पीछे जाएं (Back to Step 2)
        </button>

        <button
          type="button"
          disabled={!isFormValid || isSubmitting}
          onClick={handleSubmit}
          className={`w-full sm:w-auto min-h-[56px] px-8 py-3.5 rounded-2xl font-extrabold text-lg shadow-xl transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-4 ${
            isFormValid && !isSubmitting
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-teal-700 active:scale-98 shadow-emerald-700/30'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>ऑनबोर्डिंग सहेजी जा रही है...</span>
            </>
          ) : (
            <>
              <span>🎉</span>
              <span>ऑनबोर्डिंग पूर्ण करें (Complete Onboarding & Enter Studio)</span>
              <span className="text-2xl leading-none">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
