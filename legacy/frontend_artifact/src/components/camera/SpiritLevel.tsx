import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Laptop } from 'lucide-react';

interface SpiritLevelProps {
  onLevelChange: (isValid: boolean, tiltAngle: number) => void;
  toleranceDegree?: number;
}

export const SpiritLevel: React.FC<SpiritLevelProps> = ({
  onLevelChange,
  toleranceDegree = 1.5,
}) => {
  const [gamma, setGamma] = useState<number>(0.3);
  const [beta, setBeta] = useState<number>(0.4);
  const [hasGyro, setHasGyro] = useState<boolean>(true);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const hasReceivedEventsRef = useRef<boolean>(false);

  useEffect(() => {
    // Default initial notification so button isn't blocked on desktop PC
    onLevelChange(true, 0.5);

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null && e.beta === null) {
        setHasGyro(false);
        setIsSimulated(true);
        onLevelChange(true, 0.5);
        return;
      }

      hasReceivedEventsRef.current = true;
      const g = Math.round(e.gamma || 0);
      const b = Math.round(e.beta || 0);
      setGamma(g);
      setBeta(b);

      const tilt = Math.sqrt(g * g + b * b);
      const isValid = tilt <= toleranceDegree;

      onLevelChange(isValid, tilt);
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    } else {
      setHasGyro(false);
      setIsSimulated(true);
      onLevelChange(true, 0.5);
    }

    // Fallback timer: if no orientation events fire in 600ms (e.g. desktop browser), set simulated mode
    const timer = setTimeout(() => {
      if (!hasReceivedEventsRef.current) {
        setHasGyro(false);
        setIsSimulated(true);
        onLevelChange(true, 0.5);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [toleranceDegree, onLevelChange]);

  const maxTilt = Math.sqrt(gamma * gamma + beta * beta);
  const isLevel = maxTilt <= toleranceDegree;

  const handleDesktopOverride = () => {
    setIsSimulated(true);
    setGamma(0.3);
    setBeta(0.4);
    onLevelChange(true, 0.5);
  };

  return (
    <div className="bg-charcoal-900/90 backdrop-blur-md border border-cream-200/20 text-white px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-3">
      <div className="relative w-10 h-10 rounded-full border-2 border-cream-200/40 flex items-center justify-center bg-black/40">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-[1px] bg-cream-200/30" />
          <div className="h-full w-[1px] bg-cream-200/30 absolute" />
        </div>

        <div
          className={`w-3.5 h-3.5 rounded-full transition-all duration-150 shadow-md ${
            isLevel ? 'bg-emerald-400 shadow-emerald-400/80 animate-pulse' : 'bg-amber-400'
          }`}
          style={{
            transform: `translate(${Math.min(Math.max(gamma, -12), 12)}px, ${Math.min(
              Math.max(beta, -12),
              12
            )}px)`,
          }}
        />
      </div>

      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          {isLevel ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Level Verified ({maxTilt.toFixed(1)}°)
            </span>
          ) : (
            <span className="text-amber-300 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Aligning ({maxTilt.toFixed(1)}°)
            </span>
          )}
        </div>
        <p className="text-[10px] text-cream-200 opacity-80">
          {isSimulated ? (
            <span className="flex items-center gap-1 text-heritage-gold font-medium">
              <Laptop className="w-3 h-3" />
              Desktop Mode (Tilt ≤ 1.5° Unlocked)
            </span>
          ) : isLevel ? (
            'Tilt ≤ 1.5° — Capture Unlocked'
          ) : (
            'Hold steady & balance device'
          )}
        </p>

        {!hasGyro && !isSimulated && (
          <button
            onClick={handleDesktopOverride}
            className="text-[10px] text-heritage-gold underline mt-0.5 hover:text-white"
          >
            Desktop Demo Override
          </button>
        )}
      </div>
    </div>
  );
};

