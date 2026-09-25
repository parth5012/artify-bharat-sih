'use client';
import {useEffect, useState} from 'react';
import {Check, X, AlertCircle, Loader2} from 'lucide-react';

type VerificationStep = 'checking' | 'fetching' | 'matching' | 'verified' | 'failed' | 'mismatch';

interface ArtisanVerificationProps {
  artisanId: string;
  onComplete: (result: 'verified' | 'not-found' | 'mismatch', data?: any) => void;
  spokenDetails?: {
    name?: string;
    phone?: string;
    location?: string;
    craft?: string;
  };
}

export function ArtisanVerification({artisanId, onComplete, spokenDetails}: ArtisanVerificationProps) {
  const [step, setStep] = useState<VerificationStep>('checking');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let mounted = true;

    const verifyArtisan = async () => {
      try {
        // Step 1: Checking Artisan ID
        setStep('checking');
        setProgress(0);
        await new Promise(resolve => setTimeout(resolve, 600));
        if (!mounted) return;
        setProgress(33);

        // Step 2: Fetching registered details
        setStep('fetching');
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!mounted) return;
        setProgress(66);

        // Step 3: Call verification API
        const response = await fetch('/api/artisans/verify', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            artisanId,
            spokenDetails,
          }),
        });

        const data = await response.json();

        if (!mounted) return;

        if (!data.found) {
          // Artisan ID not found
          setStep('failed');
          setProgress(100);
          await new Promise(resolve => setTimeout(resolve, 800));
          if (mounted) onComplete('not-found');
          return;
        }

        // Step 4: Matching information
        setStep('matching');
        setProgress(90);
        await new Promise(resolve => setTimeout(resolve, 400));
        if (!mounted) return;

        // Check if details match
        if (data.matchStatus && !data.matchStatus.overallMatch) {
          setStep('mismatch');
          setProgress(100);
          await new Promise(resolve => setTimeout(resolve, 800));
          if (mounted) onComplete('mismatch', data);
          return;
        }

        // Success!
        setStep('verified');
        setProgress(100);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (mounted) onComplete('verified', data);
      } catch (error) {
        console.error('Verification error:', error);
        if (mounted) {
          setStep('failed');
          onComplete('not-found');
        }
      }
    };

    verifyArtisan();

    return () => {
      mounted = false;
    };
  }, [artisanId, onComplete, spokenDetails]);

  const getStepIcon = () => {
    if (step === 'verified') {
      return <Check size={48} className="text-emerald-600" />;
    }
    if (step === 'failed') {
      return <X size={48} className="text-red-600" />;
    }
    if (step === 'mismatch') {
      return <AlertCircle size={48} className="text-amber-600" />;
    }
    return <Loader2 size={48} className="animate-spin text-orange-600" />;
  };

  const getStepText = () => {
    switch (step) {
      case 'checking':
        return 'Checking Artisan ID...';
      case 'fetching':
        return 'Fetching registered details...';
      case 'matching':
        return 'Matching information...';
      case 'verified':
        return 'Artisan details verified';
      case 'failed':
        return 'Artisan ID not found';
      case 'mismatch':
        return 'Details don\'t match';
      default:
        return 'Verifying...';
    }
  };

  const getBackgroundColor = () => {
    if (step === 'verified') return 'bg-emerald-50';
    if (step === 'failed') return 'bg-red-50';
    if (step === 'mismatch') return 'bg-amber-50';
    return 'bg-[#FFF8EF]';
  };

  const getBorderColor = () => {
    if (step === 'verified') return 'border-emerald-200';
    if (step === 'failed') return 'border-red-200';
    if (step === 'mismatch') return 'border-amber-200';
    return 'border-[#E8D7C3]';
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-3xl border-2 ${getBorderColor()} ${getBackgroundColor()} p-8 shadow-2xl transition-all duration-500`}>
        <div className="text-center space-y-6">
          {/* Animated Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className={`grid h-32 w-32 place-items-center rounded-full ${
                step === 'verified' ? 'bg-emerald-100' :
                step === 'failed' ? 'bg-red-100' :
                step === 'mismatch' ? 'bg-amber-100' :
                'bg-white'
              } shadow-xl transition-all duration-500`}>
                {getStepIcon()}
              </div>
              {(step === 'checking' || step === 'fetching' || step === 'matching') && (
                <div className="absolute inset-0 animate-ping rounded-full bg-orange-300/30" />
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold text-[#3B2418] mb-2">
              {step === 'verified' ? '✓ Verified' :
               step === 'failed' ? '⚠ Not Found' :
               step === 'mismatch' ? '⚠ Mismatch' :
               '🔍 Verifying Artisan ID'}
            </h2>
            <p className="text-3xl font-extrabold text-orange-600 font-mono">
              {artisanId}
            </p>
          </div>

          {/* Progress Bar */}
          {(step === 'checking' || step === 'fetching' || step === 'matching') && (
            <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500 ease-out"
                style={{width: `${progress}%`}}
              />
            </div>
          )}

          {/* Status Text */}
          <p className="text-lg font-semibold text-stone-700">
            {getStepText()}
          </p>

          {/* Step Details */}
          {step === 'verified' && (
            <div className="rounded-xl bg-emerald-100 border border-emerald-300 p-4 text-left">
              <p className="text-sm font-semibold text-emerald-800">
                ✓ Your information matches our records.
              </p>
            </div>
          )}

          {step === 'failed' && (
            <div className="rounded-xl bg-red-100 border border-red-300 p-4 text-left">
              <p className="text-sm font-semibold text-red-800">
                We couldn't find <span className="font-mono">{artisanId}</span> in our records.
              </p>
            </div>
          )}

          {step === 'mismatch' && (
            <div className="rounded-xl bg-amber-100 border border-amber-300 p-4 text-left">
              <p className="text-sm font-semibold text-amber-800">
                Some details don't match our records. Please review and try again.
              </p>
            </div>
          )}

          {/* Loading animation text */}
          {(step === 'checking' || step === 'fetching' || step === 'matching') && (
            <div className="flex items-center justify-center gap-1 text-stone-500">
              <span className="text-sm">Please wait</span>
              <span className="animate-pulse">.</span>
              <span className="animate-pulse animation-delay-200">.</span>
              <span className="animate-pulse animation-delay-400">.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
