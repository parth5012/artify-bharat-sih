'use client';

import React from 'react';
import { OnboardingDialect, OnboardingRole } from '../../utils/onboardingStorage';
import { REGIONAL_DIALECTS } from '../../hooks/useAskDadi';

interface AskDadiVoiceGuideProps {
  isSpeaking: boolean;
  activeText: string;
  activeTextEn: string;
  isDialogOpen: boolean;
  currentStep: 1 | 2 | 3;
  dialect: OnboardingDialect;
  role: OnboardingRole;
  onOpenDialog: () => void;
  onCloseDialog: () => void;
  onTriggerSpeech: () => void;
  onStopSpeech: () => void;
}

export const AskDadiVoiceGuide: React.FC<AskDadiVoiceGuideProps> = ({
  isSpeaking,
  activeText,
  activeTextEn,
  isDialogOpen,
  currentStep,
  dialect,
  role,
  onOpenDialog,
  onCloseDialog,
  onTriggerSpeech,
  onStopSpeech,
}) => {
  const dialectInfo = REGIONAL_DIALECTS[dialect] || REGIONAL_DIALECTS.hindi;

  return (
    <>
      {/* Floating Audio Guidance Toggle Button (WCAG min 48px target) */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => {
            if (isSpeaking) {
              onStopSpeech();
            } else {
              onTriggerSpeech();
            }
          }}
          className={`min-h-[52px] px-4 py-3 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 font-bold text-sm sm:text-base border-2 focus:outline-none focus:ring-4 focus:ring-amber-400 active:scale-95 ${
            isSpeaking
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-300 animate-pulse'
              : 'bg-gradient-to-r from-amber-600 via-orange-600 to-terracotta text-white border-amber-300 hover:shadow-amber-500/30'
          }`}
          aria-label="दादी से पूछें - वॉइस गाइड (Ask Dadi Voice Guide)"
          title="दादी से पूछें - वॉइस गाइड"
        >
          {/* Avatar Icon */}
          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xl shadow-inner">
            👵
          </span>

          <span className="flex flex-col text-left leading-tight">
            <span className="font-extrabold text-white text-sm">
              {isSpeaking ? 'दादी बोल रही हैं...' : 'दादी से पूछें'}
            </span>
            <span className="text-[11px] text-amber-100 font-normal">
              {isSpeaking ? 'रोकने के लिए टैप करें' : 'Ask Dadi Voice Guide'}
            </span>
          </span>

          {/* Sound Waves Animation */}
          {isSpeaking ? (
            <span className="flex items-center gap-0.5 ml-1" aria-hidden="true">
              <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-6 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          ) : (
            <span className="text-lg text-white" aria-hidden="true">🔊</span>
          )}
        </button>

        {/* Small text transcript preview bubble when collapsed but speaking */}
        {isSpeaking && !isDialogOpen && (
          <div
            onClick={onOpenDialog}
            className="cursor-pointer mt-2 bg-slate-900/90 backdrop-blur-md text-white text-xs p-3 rounded-xl shadow-xl max-w-xs border border-amber-400/40 text-left line-clamp-2 hover:bg-slate-900"
          >
            <p className="text-amber-300 font-semibold mb-0.5 flex items-center gap-1">
              <span>👵 दादी:</span>
              <span className="text-[10px] text-slate-400 font-normal">(पूरा पढ़ने के लिए टैप करें)</span>
            </p>
            <p>{activeText}</p>
          </div>
        )}
      </div>

      {/* Visual Dialog Box Fallback / Modal */}
      {isDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dadi-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
        >
          <div className="w-full max-w-lg bg-[#FDFBF7] rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-amber-500/30 text-slate-900 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-900/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-2xl shadow-md border-2 border-white">
                  👵
                </div>
                <div>
                  <h3 id="dadi-dialog-title" className="font-extrabold text-lg text-slate-900 leading-tight">
                    दादी का वॉइस गाइड (Ask Dadi)
                  </h3>
                  <p className="text-xs text-amber-800 font-medium">
                    बोली: {dialectInfo.nameNative} ({dialectInfo.nameEn}) • चरण {currentStep}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCloseDialog}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-slate-400"
                aria-label="बंद करें (Close dialog)"
              >
                ✕
              </button>
            </div>

            {/* Speech Wave / Status banner */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/80 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                  आर्टिफ़ाई वॉइस असिस्टेंट
                </span>
                {isSpeaking && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    आवाज़ सक्रिय (Speaking)
                  </span>
                )}
              </div>

              {/* Native Dialect Text */}
              <p className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed font-serif">
                "{activeText || 'नमस्ते! मैं दादी हूँ। आर्टिफ़ाई भारत में आपका स्वागत है।'}"
              </p>

              {/* English Translation */}
              {activeTextEn && (
                <p className="text-xs sm:text-sm text-slate-600 mt-2.5 pt-2.5 border-t border-amber-200/60 italic">
                  Translation: "{activeTextEn}"
                </p>
              )}
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onTriggerSpeech}
                className="flex-1 min-h-[48px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <span>🔊</span>
                <span>फिर से सुनें (Replay Voice)</span>
              </button>

              {isSpeaking && (
                <button
                  type="button"
                  onClick={onStopSpeech}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <span>⏹️</span>
                  <span>रोकें (Mute)</span>
                </button>
              )}

              <button
                type="button"
                onClick={onCloseDialog}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                समझ गया (OK)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
