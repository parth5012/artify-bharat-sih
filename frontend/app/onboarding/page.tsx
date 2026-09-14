'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  OnboardingData,
  DEFAULT_ONBOARDING_DATA,
  getStoredOnboardingDraft,
  saveOnboardingDraft,
  clearStoredOnboardingDraft,
  saveCompletedArtisanProfile,
  OnboardingRole,
  OnboardingDialect,
} from '../../utils/onboardingStorage';
import { useAskDadi, REGIONAL_DIALECTS } from '../../hooks/useAskDadi';
import { OnboardingStepper } from '../../components/onboarding/OnboardingStepper';
import { DraftRestoreBanner } from '../../components/onboarding/DraftRestoreBanner';
import { Step1RoleDialect } from '../../components/onboarding/Step1RoleDialect';
import { Step2GovtVerification } from '../../components/onboarding/Step2GovtVerification';
import { Step3ProfileWelcome } from '../../components/onboarding/Step3ProfileWelcome';
import { AskDadiVoiceGuide } from '../../components/onboarding/AskDadiVoiceGuide';
import { ArtifyApiClient } from '../../utils/apiClient';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State: Active Onboarding Data
  const [formData, setFormData] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA);
  const [storedDraft, setStoredDraft] = useState<OnboardingData | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState<boolean>(false);
  const [isCompletedSuccess, setIsCompletedSuccess] = useState<boolean>(false);
  const [highestStep, setHighestStep] = useState<number>(1);

  // Ask Dadi voice assistant hook
  const {
    isSpeaking,
    activeText,
    activeTextEn,
    isVisualDialogOpen,
    setIsVisualDialogOpen,
    speak,
    stopSpeaking,
    playDialectPreview,
    speakStepGuidance,
  } = useAskDadi();

  // 1. Initial Load & Offline Draft Recovery Check + Query Param Support
  useEffect(() => {
    const existingDraft = getStoredOnboardingDraft();
    if (existingDraft && (existingDraft.phone || existingDraft.step > 1 || existingDraft.artisanName)) {
      setStoredDraft(existingDraft);
      setShowRestoreBanner(true);
    } else {
      // Check query param for role
      const roleParam = searchParams.get('role');
      if (roleParam === 'shg' || roleParam === 'artisan') {
        setFormData((prev) => ({ ...prev, role: roleParam }));
      }
    }
  }, [searchParams]);

  // 2. Auto-save draft on data changes to prevent data loss on poor rural networks
  const updateFormData = useCallback((partial: Partial<OnboardingData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...partial, updatedAt: new Date().toISOString() };
      saveOnboardingDraft(updated);
      return updated;
    });
  }, []);

  // Restore Draft Action
  const handleRestoreDraft = () => {
    if (storedDraft) {
      setFormData(storedDraft);
      setHighestStep(Math.max(highestStep, storedDraft.step));
      setShowRestoreBanner(false);
      // Play a voice cue in restored dialect
      speakStepGuidance(storedDraft.step, storedDraft.dialect, storedDraft.role);
    }
  };

  // Dismiss Draft Banner Action
  const handleDismissDraft = () => {
    setShowRestoreBanner(false);
    clearStoredOnboardingDraft();
    setStoredDraft(null);
  };

  // Step Navigation
  const goToStep = (stepNumber: 1 | 2 | 3) => {
    updateFormData({ step: stepNumber });
    setHighestStep((prev) => Math.max(prev, stepNumber));
    // Voice guide announces current step instructions
    speakStepGuidance(stepNumber, formData.dialect, formData.role);
  };

  // Tour Voice Tour in Step 3
  const handlePlayWelcomeTour = () => {
    const dialectConfig = REGIONAL_DIALECTS[formData.dialect] || REGIONAL_DIALECTS.hindi;
    const tourText =
      formData.role === 'shg'
        ? `नमस्ते! हम दादी हैं। आर्टिफ़ाई भारत में आपके स्वयं सहायता समूह का हार्दिक स्वागत है। यहाँ आपके समूह के हर एक बुनकर को कानूनन न्यूनतम निष्पक्ष मजदूरी मिलेगी, शून्य प्रतिशत बिचौलिया कमीशन कटेगा, और हर कपड़े को 6-अक्षर का डिजिटल पासपोर्ट मिलेगा। आप सभी का उत्पाद सीधे GeM और ONDC पर दुनिया भर में बिकेगा।`
        : `नमस्ते! हम दादी हैं। आर्टिफ़ाई भारत में आपका हार्दिक स्वागत है। यहाँ आपके हुनर को सीधा बाज़ार मिलेगा, बिना किसी बिचौलिए के सौ प्रतिशत पैसा आपके बैंक खाते में आएगा, और हर साड़ी को सरकार से मान्यता प्राप्त डिजिटल हेरिटेज पासपोर्ट मिलेगा। आइए, अपनी कला से आत्मनिर्भर भारत बनाएं।`;

    speak(
      tourText,
      dialectConfig.langTag,
      'Welcome to Artify Bharat! We guarantee 100% statutory fair wages, 0% middleman commission, digital heritage passports with thermal tags, and direct GeM/ONDC publishing.'
    );
  };

  const [completionError, setCompletionError] = useState<string | null>(null);

  // Final Registration / Onboarding Submission - via /auth/onboarding/sync to preserve role/e-Shram
  const handleCompleteOnboarding = async () => {
    setCompletionError(null);
    const phone = (formData.phone || '').trim();
    const pin = (formData.pin || '').trim();
    if (!/^[6-9]\d{9}$/.test(phone) || !/^\d{4}$/.test(pin)) {
      goToStep(1);
      return;
    }
    const name = (formData.artisanName || '').trim();
    if (!name) {
      goToStep(3);
      return;
    }

    // 1. Submit to AuthService via onboarding sync (preserves role, e-Shram, SHG)
    let token: string | undefined;
    try {
      const syncPayload: Record<string, any> = {
        phone,
        pin,
        name,
        dialect: formData.dialect,
        role: formData.role === 'shg' ? 'shg_leader' : 'artisan',
        id_type: formData.govtIdType || 'none',
        id_number: formData.govtIdValue || null,
        state: formData.state || null,
        district: formData.district || null,
        cluster_name: formData.clusterName || null,
        craft_category: formData.craftCategory || null,
        shg_group_name: formData.shgGroupName || null,
        shg_member_count: formData.shgMemberCount ?? null,
      };
      // Preserve session token if draft was resumed
      const draftToken = typeof window !== 'undefined' ? localStorage.getItem('artify_session_token') : null;
      if (draftToken) syncPayload.session_token = draftToken;

      let syncRes: any = null;
      try {
        syncRes = await ArtifyApiClient.syncOnboarding(syncPayload);
        token = syncRes?.access_token;
      } catch (syncErr: any) {
        if (syncErr?.isApiError) throw syncErr;
        // Offline fallback: try legacy register (transport failure only)
        const regRes = await ArtifyApiClient.registerArtisan({
          name,
          phone,
          pin,
          primary_dialect: formData.dialect,
          state: formData.state || 'Uttar Pradesh',
          district: formData.district || 'Varanasi',
          cluster_name: formData.clusterName || 'Varanasi Handloom Cluster',
          pehchan_id: formData.govtIdType === 'pehchan' ? formData.govtIdValue : null,
          trifed_id: formData.govtIdType === 'trifed' ? formData.govtIdValue : null,
        });
        token = regRes?.access_token;
        // If register returned mock token, treat as offline success (do not treat as API error)
        if (token?.startsWith('mock_')) {
          // keep offline success path
        }
      }
    } catch (apiErr: any) {
      if (apiErr?.isApiError) {
        // Keep draft, show retryable error - do NOT clear or mark success
        const msg = apiErr?.message || 'पंजीकरण अस्वीकृत (Registration rejected). कृपया विवरण जांचें और पुनः प्रयास करें।';
        setCompletionError(msg);
        console.warn('[OnboardingPage] Registration rejected:', apiErr);
        return;
      }
      console.warn('[OnboardingPage] Registration endpoint warning:', apiErr);
    }

    // 2. Persist completed profile to localStorage (pin/govtId filtered inside)
    saveCompletedArtisanProfile({
      ...formData,
      artisanName: name,
      phone,
      isRegistered: true,
      registeredAt: new Date().toISOString(),
    }, token);

    // 3. Clear incomplete draft
    clearStoredOnboardingDraft();
    // 4. Show celebratory confirmation
    setIsCompletedSuccess(true);
    speak(
      'बधाई हो! आपकी ऑनबोर्डिंग सफलतापूर्वक पूरी हो गई है। आर्टिफ़ाई भारत में आपका स्वागत है।',
      'hi-IN',
      'Congratulations! Your onboarding has been successfully completed. Welcome to Artify Bharat.'
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 flex flex-col justify-between">
      {/* HEADER WITH LOGO & QUICK NAV */}
      <header className="bg-gradient-to-r from-amber-700 via-orange-700 to-amber-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-white rounded-lg p-1"
          >
            <span className="text-2xl">🏛️</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-extrabold text-base sm:text-lg tracking-wide">
                  Artify Bharat
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 uppercase">
                  MoSJE PS 26090
                </span>
              </div>
              <p className="text-[11px] text-amber-200 hidden sm:block">
                3-Step Progressive Voice & MoSJE e-KYC Onboarding
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsVisualDialogOpen(true)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-white"
              title="दादी से बात करें"
            >
              <span>👵</span>
              <span className="hidden sm:inline">दादी का मार्गदर्शन</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {/* SUCCESS STATE CELEBRATION */}
        {isCompletedSuccess ? (
          <div
            role="status"
            className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-emerald-500 shadow-2xl text-center space-y-6 animate-fadeIn"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-4xl mx-auto shadow-md border-2 border-emerald-300">
              ✓
            </div>

            <div>
              <span className="inline-block px-4 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 mb-2">
                ✅ MoSJE e-KYC & Digital Heritage Onboarding Complete
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                बधाई हो, {formData.artisanName || 'कारीगर जी'}!
              </h2>
              <p className="text-slate-600 mt-2 max-w-md mx-auto text-sm sm:text-base">
                आपका खाता {formData.role === 'shg' ? 'SHG हब' : 'एकल कारीगर'} के रूप में सफलतापूर्वक सक्रिय हो गया है। अब आप सीधे अपने शिल्प को 100% पारदर्शी दर पर बेच सकते हैं।
              </p>
            </div>

            {/* Verified Credentials Summary Card */}
            <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-300/80 text-left max-w-lg mx-auto space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-amber-200 pb-2">
                <span className="text-slate-500 font-medium">पंजीकृत मोबाइल:</span>
                <span className="font-mono font-bold text-slate-900">+91 {formData.phone}</span>
              </div>
              <div className="flex justify-between border-b border-amber-200 pb-2">
                <span className="text-slate-500 font-medium">प्राथमिक बोली:</span>
                <span className="font-bold text-slate-900 capitalize">{formData.dialect}</span>
              </div>
              <div className="flex justify-between border-b border-amber-200 pb-2">
                <span className="text-slate-500 font-medium">क्लस्टर स्थान:</span>
                <span className="font-bold text-slate-900">{formData.clusterName}</span>
              </div>
              {formData.isVerified && (
                <div className="flex justify-between pt-1 text-emerald-800 font-bold">
                  <span>सरकारी सत्यापन:</span>
                  <span>✅ MoSJE / {formData.govtIdType.toUpperCase()} सत्यापित</span>
                </div>
              )}
            </div>

            {/* Launch Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/"
                className="w-full sm:w-auto min-h-[52px] px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-base shadow-lg shadow-emerald-700/30 hover:from-emerald-700 hover:to-teal-800 transition-all flex items-center justify-center gap-2"
              >
                <span>📸</span>
                <span>उत्पाद कैटलॉग स्टूडियो खोलें (Enter Studio)</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* OFFLINE DRAFT RESTORE BANNER */}
            {showRestoreBanner && storedDraft && (
              <DraftRestoreBanner
                draft={storedDraft}
                onRestore={handleRestoreDraft}
                onDismiss={handleDismissDraft}
              />
            )}

            {/* STEPPER PROGRESS HEADER */}
            <OnboardingStepper
              currentStep={formData.step}
              highestStepReached={highestStep}
              onStepClick={goToStep}
            />

            {/* STEP 1: ROLE & REGIONAL DIALECT & CONTACT */}
            {formData.step === 1 && (
              <Step1RoleDialect
                role={formData.role}
                dialect={formData.dialect}
                phone={formData.phone}
                pin={formData.pin}
                onChangeRole={(newRole: OnboardingRole) => updateFormData({ role: newRole })}
                onChangeDialect={(newDialect: OnboardingDialect) => updateFormData({ dialect: newDialect })}
                onChangePhone={(newPhone: string) => updateFormData({ phone: newPhone })}
                onChangePin={(newPin: string) => updateFormData({ pin: newPin })}
                onPlayDialectAudio={playDialectPreview}
                onContinue={() => goToStep(2)}
              />
            )}

            {/* STEP 2: 1-TAP GOVERNMENT VERIFICATION */}
            {formData.step === 2 && (
              <Step2GovtVerification
                data={formData}
                onUpdateData={updateFormData}
                onBack={() => goToStep(1)}
                onContinue={() => goToStep(3)}
              />
            )}

            {completionError && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-sm font-semibold">
                {completionError}
              </div>
            )}
            {/* STEP 3: ARTISAN / SHG PROFILE & DADI TOUR */}
            {formData.step === 3 && (
              <Step3ProfileWelcome
                data={formData}
                isSpeaking={isSpeaking}
                onUpdateData={updateFormData}
                onPlayWelcomeTour={handlePlayWelcomeTour}
                onStopSpeech={stopSpeaking}
                onBack={() => goToStep(2)}
                onComplete={handleCompleteOnboarding}
              />
            )}
          </>
        )}
      </main>

      {/* FLOATING 'ASK DADI' VOICE GUIDE & ACCESSIBLE MODAL */}
      <AskDadiVoiceGuide
        isSpeaking={isSpeaking}
        activeText={activeText}
        activeTextEn={activeTextEn}
        isDialogOpen={isVisualDialogOpen}
        currentStep={formData.step}
        dialect={formData.dialect}
        role={formData.role}
        onOpenDialog={() => setIsVisualDialogOpen(true)}
        onCloseDialog={() => setIsVisualDialogOpen(false)}
        onTriggerSpeech={() => speakStepGuidance(formData.step, formData.dialect, formData.role)}
        onStopSpeech={stopSpeaking}
      />

      {/* FOOTER */}
      <footer className="bg-amber-950/5 border-t border-amber-900/10 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            🇮🇳 Artify Bharat • Ministry of Social Justice & Empowerment (MoSJE) • SIH PS 26090
          </span>
          <span className="text-slate-400">
            WCAG 2.2 AA Compliant • 100% Statutory Fair Wage Protected
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-extrabold text-slate-800 text-lg">
              आर्टिफ़ाई भारत ऑनबोर्डिंग लोड हो रहा है...
            </p>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
