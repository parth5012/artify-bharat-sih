'use client';

import React from 'react';

interface OnboardingStepperProps {
  currentStep: 1 | 2 | 3;
  onStepClick?: (step: 1 | 2 | 3) => void;
  highestStepReached?: number;
}

const STEPS = [
  {
    step: 1 as const,
    titleHi: 'भूमिका व भाषा',
    titleEn: 'Role & Language',
    icon: '🧑🎨',
  },
  {
    step: 2 as const,
    titleHi: 'सरकारी पहचान',
    titleEn: 'Govt Verification',
    icon: '🪪',
  },
  {
    step: 3 as const,
    titleHi: 'प्रोफ़ाइल व स्वागत',
    titleEn: 'Profile & Welcome',
    icon: '👵',
  },
];

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({
  currentStep,
  onStepClick,
  highestStepReached = 1,
}) => {
  const progressPercent =
    currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100;

  return (
    <div
      className="w-full bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-sm border border-amber-900/10 mb-6"
      role="region"
      aria-label="प्रगति संकेतक (Onboarding Progress)"
    >
      {/* Accessible Live Region */}
      <div className="sr-only" aria-live="polite">
        चरण {currentStep} का 3: {STEPS[currentStep - 1].titleHi} (
        {STEPS[currentStep - 1].titleEn})
      </div>

      {/* Progress Bar Top Track */}
      <div className="flex items-center justify-between mb-3 text-xs sm:text-sm font-semibold text-slate-700">
        <span className="flex items-center gap-1.5 text-amber-800">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse" />
          <span>चरण {currentStep} / 3</span>
        </span>
        <span className="text-slate-500 font-medium">
          {progressPercent}% पूर्ण
        </span>
      </div>

      <div
        className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-6"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`पंजीकरण प्रगति: ${progressPercent}%`}
      >
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Indicators with Accessible Touch Targets */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
        {STEPS.map((s) => {
          const isCompleted = s.step < currentStep;
          const isCurrent = s.step === currentStep;
          const isAccessible = s.step <= Math.max(currentStep, highestStepReached);

          return (
            <button
              key={s.step}
              type="button"
              disabled={!isAccessible || !onStepClick}
              onClick={() => onStepClick && isAccessible && onStepClick(s.step)}
              className={`flex flex-col items-center text-center p-2 rounded-xl transition-all min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                isCurrent
                  ? 'bg-amber-50/80 border-2 border-amber-500 shadow-sm'
                  : isCompleted
                  ? 'hover:bg-slate-50 cursor-pointer'
                  : 'opacity-60 cursor-not-allowed'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-sm sm:text-base mb-1.5 transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md ring-4 ring-amber-200'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isCompleted ? (
                  <span className="text-base sm:text-lg" aria-hidden="true">✓</span>
                ) : (
                  <span>{s.step}</span>
                )}
              </div>

              <div className="leading-tight">
                <p
                  className={`text-xs sm:text-sm font-bold truncate max-w-[90px] sm:max-w-none ${
                    isCurrent
                      ? 'text-amber-900'
                      : isCompleted
                      ? 'text-emerald-800'
                      : 'text-slate-600'
                  }`}
                >
                  {s.titleHi}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">
                  {s.titleEn}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
