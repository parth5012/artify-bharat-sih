'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'shield' | 'wordmark' | 'tagline' | 'complete'>('shield');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      // Simple fade for accessibility
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 400);
      }, 1500);
      return () => clearTimeout(timer);
    }

    // Full animation sequence
    const timeline = [
      { delay: 0, action: () => setPhase('shield') },
      { delay: 800, action: () => setPhase('wordmark') },
      { delay: 1300, action: () => setPhase('tagline') },
      { delay: 1700, action: () => setPhase('complete') },
      { 
        delay: 2500, 
        action: () => {
          setIsVisible(false);
          setTimeout(onComplete, 400);
        } 
      },
    ];

    const timers = timeline.map(({ delay, action }) => 
      setTimeout(action, delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#000000]"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 400ms ease-out',
      }}
    >
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-600/5 blur-[120px]"
          style={{
            opacity: phase === 'shield' ? 0 : 0.3,
            transition: 'opacity 1200ms ease-out',
          }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-6 px-8">
        {/* Shield Logo */}
        <div 
          className="relative"
          style={{
            opacity: phase === 'shield' ? 1 : 1,
            transform: `scale(${phase === 'shield' ? 1 : 1}) translateY(0px)`,
            filter: phase === 'shield' ? 'blur(8px)' : 'blur(0px)',
            transition: 'all 800ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Metallic sweep effect */}
          <div 
            className="absolute inset-0 overflow-hidden rounded-full"
            style={{
              opacity: phase === 'shield' ? 0 : phase === 'wordmark' ? 0.6 : 0,
            }}
          >
            <div 
              className="absolute h-[200%] w-[200%] -left-full -top-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{
                animation: phase === 'wordmark' ? 'metallic-sweep 1s ease-out' : 'none',
                transform: 'rotate(25deg)',
              }}
            />
          </div>

          <Image
            src="/src/logo-artifact.png"
            alt="ARTIFACT"
            width={280}
            height={280}
            priority
            className="relative z-10"
            style={{
              filter: 'drop-shadow(0 0 40px rgba(249, 115, 22, 0.15))',
            }}
          />
        </div>

        {/* ARTIFACT Wordmark - Already part of the logo image, no separate text needed */}

        {/* Tagline */}
        <div
          style={{
            opacity: phase === 'tagline' || phase === 'complete' ? 1 : 0,
            transform: `translateY(${phase === 'tagline' || phase === 'complete' ? '0px' : '8px'})`,
            transition: 'all 400ms ease-out',
          }}
        >
          <p className="text-center text-sm font-semibold uppercase tracking-[0.3em] text-stone-400/90">
            Personalizing Technology
          </p>
        </div>
      </div>

      {/* CSS Keyframes */}
      <style jsx>{`
        @keyframes metallic-sweep {
          0% {
            transform: translateX(-100%) rotate(25deg);
          }
          100% {
            transform: translateX(200%) rotate(25deg);
          }
        }
      `}</style>
    </div>
  );
}
