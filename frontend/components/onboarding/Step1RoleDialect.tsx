'use client';

import React, { useState } from 'react';
import { OnboardingDialect, OnboardingRole } from '../../utils/onboardingStorage';
import { REGIONAL_DIALECTS } from '../../hooks/useAskDadi';

interface Step1RoleDialectProps {
  role: OnboardingRole;
  dialect: OnboardingDialect;
  phone: string;
  pin: string;
  onChangeRole: (role: OnboardingRole) => void;
  onChangeDialect: (dialect: OnboardingDialect) => void;
  onChangePhone: (phone: string) => void;
  onChangePin: (pin: string) => void;
  onPlayDialectAudio: (dialect: OnboardingDialect) => void;
  onContinue: () => void;
}

const DIALECT_LIST: OnboardingDialect[] = [
  'bhojpuri',
  'maithili',
  'hindi',
  'awadhi',
  'bengali',
  'marathi',
];

export const Step1RoleDialect: React.FC<Step1RoleDialectProps> = ({
  role,
  dialect,
  phone,
  pin,
  onChangeRole,
  onChangeDialect,
  onChangePhone,
  onChangePin,
  onPlayDialectAudio,
  onContinue,
}) => {
  const [showPin, setShowPin] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [pinTouched, setPinTouched] = useState(false);

  // Validation
  const isPhoneValid = /^[6-9]\d{9}$/.test(phone.trim());
  const isPinValid = /^\d{4}$/.test(pin.trim());
  const canProceed = isPhoneValid && isPinValid;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChangePhone(clean);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
    onChangePin(clean);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* SECTION 1: DUAL ROLE SELECTOR */}
      <div>
        <div className="mb-3">
          <label className="block text-lg font-extrabold text-slate-900">
            1. अपनी परिचालन भूमिका चुनें (Select Operating Role)
          </label>
          <p className="text-sm text-slate-600">
            आप व्यक्तिगत रूप से बुनते हैं या गाँव के स्वयं सहायता समूह का नेतृत्व करते हैं?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Role A: Artisan Direct */}
          <div
            onClick={() => onChangeRole('artisan')}
            role="radio"
            aria-checked={role === 'artisan'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onChangeRole('artisan');
              }
            }}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all min-h-[110px] flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-amber-500 relative ${
              role === 'artisan'
                ? 'bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-100/40 border-amber-600 shadow-md ring-2 ring-amber-400/30'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl shadow-sm">
                  🧑🎨
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-base text-slate-900">
                      एकल कारीगर (Artisan Direct)
                    </h4>
                  </div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/70 text-amber-900 mt-0.5">
                    व्यक्तिगत बुनकर / शिल्पी
                  </span>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  role === 'artisan'
                    ? 'border-amber-600 bg-amber-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {role === 'artisan' && <span className="text-xs">✓</span>}
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              सीधा बाज़ार, अपनी डिजिटल पहचान (Heritage Passport), 100% पारदर्शी मजदूरी और शून्य बिचौलिया कमीशन।
            </p>
          </div>

          {/* Role B: SHG Leader Hub */}
          <div
            onClick={() => onChangeRole('shg')}
            role="radio"
            aria-checked={role === 'shg'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onChangeRole('shg');
              }
            }}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all min-h-[110px] flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500 relative ${
              role === 'shg'
                ? 'bg-gradient-to-br from-blue-50 via-indigo-50/50 to-blue-100/40 border-blue-600 shadow-md ring-2 ring-blue-400/30'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-300 flex items-center justify-center text-2xl shadow-sm">
                  👥
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-base text-slate-900">
                      SHG लीडर हब (SHG Leader Hub)
                    </h4>
                  </div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-200/70 text-blue-900 mt-0.5">
                    समूह एग्रीगेटर / बैंक सखी
                  </span>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  role === 'shg'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {role === 'shg' && <span className="text-xs">✓</span>}
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              गाँव के स्वयं सहायता समूह, 50+ कारीगरों का थोक प्रबंधन, साझा थर्मल प्रिंटिंग और एकीकृत GeM/ONDC ऑर्डर।
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: REGIONAL DIALECT SELECTOR */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block text-lg font-extrabold text-slate-900">
              2. क्षेत्रीय बोली चुनें (Regional Dialect)
            </label>
            <p className="text-sm text-slate-600">
              दादी से अपनी मातृभाषा में बात करने और वॉयस गाइड सुनने के लिए भाषा चुनें
            </p>
          </div>
          <span className="text-xs text-amber-800 font-semibold bg-amber-100 px-3 py-1 rounded-full border border-amber-300 hidden sm:inline-block">
            🔊 स्पीकर पर टैप करके आवाज़ सुनें
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {DIALECT_LIST.map((dCode) => {
            const d = REGIONAL_DIALECTS[dCode];
            const isSelected = dialect === dCode;

            return (
              <div
                key={dCode}
                className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all min-h-[56px] focus-within:ring-2 focus-within:ring-amber-500 ${
                  isSelected
                    ? 'bg-amber-50 border-amber-600 shadow-sm ring-2 ring-amber-400/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                {/* Dialect Selector Label / Radio */}
                <button
                  type="button"
                  onClick={() => onChangeDialect(dCode)}
                  className="flex-1 text-left flex items-center gap-2.5 focus:outline-none min-h-[48px]"
                  aria-pressed={isSelected}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <span className="text-[10px]">✓</span>}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-base leading-tight">
                      {d.nameNative}
                    </p>
                    <p className="text-xs text-slate-500">{d.nameEn}</p>
                  </div>
                </button>

                {/* Auditory Speaker Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayDialectAudio(dCode);
                  }}
                  className="w-10 h-10 rounded-xl bg-amber-100/80 hover:bg-amber-200 text-amber-900 flex items-center justify-center text-base transition-all shrink-0 ml-1 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  aria-label={`${d.nameNative} (${d.nameEn}) वॉयस नमूना सुनें`}
                  title={`${d.nameNative} वॉयस नमूना सुनें`}
                >
                  🔊
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: MOBILE NUMBER & 4-DIGIT PIN */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 mb-1">
            3. संपर्क व वॉइस सुरक्षा (Phone & Voice Security PIN)
          </h3>
          <p className="text-sm text-slate-600">
            दैनिक वॉइस लॉगिन और पेआउट सूचनाओं के लिए अपना 10 अंकों का मोबाइल नंबर व 4 अंकों का पिन बनाएं।
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Mobile Phone Input */}
          <div>
            <label
              htmlFor="phone-input"
              className="block text-sm font-bold text-slate-800 mb-1.5"
            >
              मोबाइल नंबर (10-Digit Mobile Number) <span className="text-rose-600">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-bold text-slate-600 select-none">
                🇮🇳 +91
              </span>
              <input
                id="phone-input"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={phone}
                onChange={handlePhoneChange}
                onBlur={() => setPhoneTouched(true)}
                placeholder="9876543210"
                className={`w-full min-h-[52px] pl-20 pr-4 rounded-xl border-2 font-mono text-base font-bold text-slate-900 tracking-wider transition-all focus:outline-none focus:ring-2 ${
                  phoneTouched && !isPhoneValid
                    ? 'border-rose-500 focus:ring-rose-400 bg-rose-50/20'
                    : isPhoneValid
                    ? 'border-emerald-500 focus:ring-emerald-400 bg-emerald-50/20'
                    : 'border-slate-300 focus:ring-amber-500 bg-white'
                }`}
                aria-invalid={phoneTouched && !isPhoneValid}
                aria-describedby="phone-helper"
                required
              />
              {isPhoneValid && (
                <span className="absolute right-3.5 text-emerald-600 text-lg" aria-hidden="true">
                  ✓
                </span>
              )}
            </div>
            <p id="phone-helper" className="text-xs text-slate-500 mt-1">
              {phoneTouched && !isPhoneValid ? (
                <span className="text-rose-600 font-semibold">
                  कृपया 6-9 से शुरू होने वाला 10 अंकों का वैध मोबाइल नंबर दर्ज करें।
                </span>
              ) : (
                'MoSJE OTP और प्रत्यक्ष बैंक ट्रांसफर (DBT) अलर्ट के लिए उपयोग होगा'
              )}
            </p>
          </div>

          {/* 4-Digit Voice PIN */}
          <div>
            <label
              htmlFor="pin-input"
              className="block text-sm font-bold text-slate-800 mb-1.5"
            >
              4-अंकों का वॉइस पिन (4-Digit Voice PIN) <span className="text-rose-600">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                id="pin-input"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={handlePinChange}
                onBlur={() => setPinTouched(true)}
                placeholder="••••"
                className={`w-full min-h-[52px] px-4 pr-16 rounded-xl border-2 font-mono text-xl font-extrabold text-slate-900 tracking-widest transition-all focus:outline-none focus:ring-2 ${
                  pinTouched && !isPinValid
                    ? 'border-rose-500 focus:ring-rose-400 bg-rose-50/20'
                    : isPinValid
                    ? 'border-emerald-500 focus:ring-emerald-400 bg-emerald-50/20'
                    : 'border-slate-300 focus:ring-amber-500 bg-white'
                }`}
                aria-invalid={pinTouched && !isPinValid}
                aria-describedby="pin-helper"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded bg-slate-100 transition-all"
                aria-label={showPin ? 'पिन छिपाएं' : 'पिन दिखाएं'}
              >
                {showPin ? 'छिपाएं' : 'दिखाएं'}
              </button>
            </div>
            <p id="pin-helper" className="text-xs text-slate-500 mt-1">
              {pinTouched && !isPinValid ? (
                <span className="text-rose-600 font-semibold">
                  कृपया ठीक 4 अंकों का गोपनीय सुरक्षा पिन दर्ज करें (जैसे 4421)।
                </span>
              ) : (
                'ऑर्डर स्वीकृति और दैनिक वॉइस प्रमाणीकरण के लिए पिन'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* CONTINUATION BUTTON */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          disabled={!canProceed}
          onClick={onContinue}
          className={`min-h-[52px] px-8 py-3 rounded-2xl font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 ${
            canProceed
              ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-terracotta text-white hover:from-amber-700 hover:to-orange-700 active:scale-98 shadow-amber-600/30'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
          }`}
        >
          <span>आगे बढ़ें (Continue to Step 2)</span>
          <span className="text-xl leading-none">→</span>
        </button>
      </div>
    </div>
  );
};
