'use client';

import React from 'react';
import Link from 'next/link';
import { ArtisanListingSuite } from '../components/ArtisanListingSuite';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FDFBF7]">
      {/* Top MoSJE Banner & Navigation */}
      <header className="bg-gradient-to-r from-amber-700 via-orange-700 to-amber-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-extrabold text-lg sm:text-xl tracking-wide">
                  Artify Bharat
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 tracking-wider uppercase">
                  MoSJE SIH PS 26090
                </span>
              </div>
              <p className="text-xs text-amber-200">
                Digital Business Manager & Gatekeeper for Rural Artisans & Weavers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/onboarding"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white text-amber-900 hover:bg-amber-50 font-extrabold text-sm shadow-sm transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <span>✨</span>
              <span>नया पंजीकरण (Start Onboarding)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner for Onboarding */}
      <div className="bg-gradient-to-b from-amber-100/60 to-transparent border-b border-amber-200/50 py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-amber-300/60 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center text-xl shadow-inner">
              👵
            </span>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                प्रथम बार आएं हैं? 3-चरणीय वॉइस और सरकारी सत्यापन ऑनबोर्डिंग
              </h2>
              <p className="text-xs text-slate-600">
                Pehchan ID / e-Shram सत्यापन, अपनी क्षेत्रीय बोली में दादी का मार्गदर्शन और 0% कमीशन संरक्षण।
              </p>
            </div>
          </div>

          <Link
            href="/onboarding"
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <span>ऑनबोर्डिंग शुरू करें</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Main Artisan Listing Suite */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <ArtisanListingSuite />
      </div>
    </main>
  );
}
