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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#E8E8E8] p-4">
      {/* Main Container with rounded border */}
      <div className="relative w-full max-w-md rounded-[40px] border-8 border-black bg-[#F5F5F5] p-6 shadow-2xl">
        {/* Main Title - Large and Centered */}
        <header className="mb-6 text-center">
          <h1 className="text-5xl font-extrabold uppercase tracking-wide text-[#3B2418]">
            ARTIFACT
          </h1>
        </header>

        {/* Cards Stack */}
        <div className="space-y-4">
          {/* Artisan Card */}
          <Link
            href="/onboarding"
            className="group relative block overflow-hidden rounded-3xl border-4 border-black shadow-lg transition-transform active:scale-[0.98]"
          >
            <div className="relative h-52">
              {/* Background Image - Centered and Cropped */}
              <img
                src="/src/artisan.jpg"
                alt="Artisan"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              
              {/* Content Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <h2 className="text-6xl font-extrabold text-white drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)]">
                  Artisan
                </h2>
              </div>
              
              {/* Hand Cursor Icon - Bottom Right */}
              <div className="absolute bottom-4 right-6">
                <div className="text-5xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">👆</div>
              </div>
            </div>
          </Link>

          {/* Buyer Card */}
          <Link
            href="/buyer"
            className="group relative block overflow-hidden rounded-3xl border-4 border-black bg-white shadow-lg transition-transform active:scale-[0.98]"
          >
            <div className="relative h-52 flex flex-col items-center justify-center">
              {/* Buyer Illustration - Centered and Zoomed */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <img
                  src="/src/buyer.jpg"
                  alt="Buyer"
                  className="h-40 w-40 object-contain mb-3"
                />
                <h2 className="text-4xl font-semibold text-stone-700">buyer</h2>
              </div>
            </div>
          </Link>

          {/* Authority Card */}
          <Link
            href="/ministry"
            className="group relative block overflow-hidden rounded-3xl border-4 border-black shadow-lg transition-transform active:scale-[0.98]"
          >
            <div className="relative h-52 bg-gradient-to-br from-[#F5E6D3] via-[#E8D7C3] to-[#D4C4B0]">
              {/* Ministry Image/Emblem - Larger and More Prominent */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/src/ministry.jpg"
                  alt="Authority"
                  className="h-44 w-44 object-contain opacity-95"
                />
              </div>
              
              {/* Text Overlay - Bottom - Smaller Text */}
              <div className="absolute inset-0 flex items-end justify-center pb-4">
                <div className="text-center">
                  <h2 className="text-4xl font-extrabold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
                    Authority
                  </h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                    Government of India
                  </p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
                    Ministry of Social Justice and Empowerment
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
