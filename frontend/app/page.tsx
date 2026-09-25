'use client';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Landing() {
  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => console.log('SW registered:', registration))
        .catch((error) => console.log('SW registration failed:', error));
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#FFF8EF]">
      {/* Header */}
      <header className="px-4 py-6 text-center">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center">
          <img src="/logo.png" alt="Artify" className="h-full w-full object-contain" />
        </div>
        <h1 className="text-lg font-bold uppercase tracking-wide text-[#3B2418]">ARTIFACT</h1>
        <p className="mt-1 text-xs text-stone-600">
          Real Artisan → Real Craft → Verified Origin → Real Marketplace
        </p>
      </header>

      {/* Main Cards Container */}
      <div className="flex flex-1 flex-col gap-4 px-4 pb-8">
        {/* Artisan Card */}
        <Link
          href="/onboarding"
          className="group relative overflow-hidden rounded-3xl shadow-xl transition-transform active:scale-98 hover:shadow-2xl"
        >
          <div className="relative h-64">
            {/* Background Image */}
            <img
              src="/src/images/artisan-card-bg.jpg"
              alt="Artisan"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                // Fallback gradient if image not found
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.style.background = 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)';
                }
              }}
            />
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70" />
            
            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <h2 className="text-5xl font-extrabold text-white drop-shadow-lg">Artisan</h2>
              <p className="mt-3 text-lg font-semibold text-white/95 drop-shadow">
                Speak · Create · Verify · Sell
              </p>
            </div>
          </div>
        </Link>

        {/* Buyer Card */}
        <Link
          href="/buyer"
          className="group relative overflow-hidden rounded-3xl shadow-xl transition-transform active:scale-98 hover:shadow-2xl"
        >
          <div className="relative h-64">
            {/* Background Image */}
            <img
              src="/src/images/buyer-card-bg.jpg"
              alt="Buyer"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                // Fallback: Light background with illustration
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.style.background = 'linear-gradient(135deg, #E8D7C3 0%, #D4C4B0 100%)';
                }
              }}
            />
            {/* Lighter Overlay */}
            <div className="absolute inset-0 bg-white/30" />
            
            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <h2 className="text-5xl font-extrabold text-stone-900 drop-shadow-sm">buyer</h2>
              <p className="mt-3 text-lg font-semibold text-stone-800">
                Discover · Connect · Verify · Buy
              </p>
            </div>
          </div>
        </Link>

        {/* Authority Card */}
        <Link
          href="/ministry"
          className="group relative overflow-hidden rounded-3xl shadow-xl transition-transform active:scale-98 hover:shadow-2xl"
        >
          <div className="relative h-64">
            {/* Background Image - Government Emblem */}
            <img
              src="/src/images/authority-card-bg.jpg"
              alt="Authority"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                // Fallback: Dark blue/navy gradient
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.style.background = 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)';
                }
              }}
            />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/60 via-blue-900/70 to-blue-900/90" />
            
            {/* Government Emblem Icon */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              {/* Government of India Emblem SVG or Image */}
              <div className="mb-3 h-16 w-16 opacity-90">
                <img 
                  src="/src/images/govt-emblem.png" 
                  alt="Government of India"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    // Fallback: Show text icon
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <h2 className="text-4xl font-extrabold text-white drop-shadow-lg">Authority</h2>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-white/90 drop-shadow">
                Government of India
              </p>
              <p className="mt-1 text-xs text-white/75">Ministry of MSME</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white px-4 py-4 text-center">
        <p className="text-xs text-stone-500">
          🇮🇳 Ministry Portal — Authorized Access Only
        </p>
      </footer>
    </div>
  );
}
