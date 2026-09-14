import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, QrCode, Shield, Wifi, WifiOff, Award } from 'lucide-react';
import { RoleSwitcher } from '../artisan/RoleSwitcher';
import type { ArtisanRole } from '../../types';

interface NavbarProps {
  currentRole: ArtisanRole;
  onRoleChange: (role: ArtisanRole) => void;
  isOffline: boolean;
  language?: 'en' | 'hi';
  onLanguageChange?: (lang: 'en' | 'hi') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  isOffline,
  language = 'en',
  onLanguageChange,
}) => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-cream-100/90 backdrop-blur-md border-b border-terracotta-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-terracotta-500 flex items-center justify-center text-white shadow-md shadow-terracotta-500/20 group-hover:scale-105 transition-transform">
              <Award className="w-6 h-6 text-heritage-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-xl sm:text-2xl text-terracotta-600 tracking-tight">
                  ARTIFACT
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-terracotta-100 text-terracotta-800 rounded-full border border-terracotta-200">
                  SIH 26090
                </span>
              </div>
              <p className="text-[11px] text-charcoal-700 font-medium hidden sm:block">
                {language === 'hi'
                  ? 'डिजिटल हेरिटेज पासपोर्ट एवं उचित मजदूरी मंच'
                  : 'Digital Heritage Passport & Fair-Wage Rural Platform'}
              </p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 bg-cream-200/50 p-1.5 rounded-2xl border border-terracotta-200/40">
            <Link
              to="/artisan"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                isActive('/artisan')
                  ? 'bg-cream-50 text-terracotta-600 shadow-sm'
                  : 'text-charcoal-700 hover:text-terracotta-600 hover:bg-cream-50/50'
              }`}
            >
              <Camera className="w-4 h-4 text-terracotta-500" />
              <span>{language === 'hi' ? 'कारीगर पोर्टल' : 'Artisan Portal'}</span>
            </Link>

            <Link
              to="/buyer"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                isActive('/buyer')
                  ? 'bg-cream-50 text-terracotta-600 shadow-sm'
                  : 'text-charcoal-700 hover:text-terracotta-600 hover:bg-cream-50/50'
              }`}
            >
              <QrCode className="w-4 h-4 text-heritage-goldDark" />
              <span>{language === 'hi' ? 'क्रेता सत्यापन' : 'Buyer Passport Portal'}</span>
            </Link>

            <Link
              to="/admin"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                isActive('/admin')
                  ? 'bg-cream-50 text-terracotta-600 shadow-sm'
                  : 'text-charcoal-700 hover:text-terracotta-600 hover:bg-cream-50/50'
              }`}
            >
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>{language === 'hi' ? 'MoSJE एडमिन' : 'MoSJE Admin Dashboard'}</span>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {onLanguageChange && (
              <button
                onClick={() => onLanguageChange(language === 'en' ? 'hi' : 'en')}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-cream-200 hover:bg-cream-300 text-charcoal-800 border border-terracotta-200 shadow-xs flex items-center gap-1 transition-colors"
                title="Toggle Language / भाषा बदलें"
              >
                <span>{language === 'en' ? '🇮🇳 हिन्दी' : '🌐 English'}</span>
              </button>
            )}

            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                isOffline
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {isOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                  <span className="hidden sm:inline">Offline Draft Mode</span>
                  <span className="sm:hidden">Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Live PWA Sync</span>
                  <span className="sm:hidden">Live</span>
                </>
              )}
            </div>

            <div className="hidden sm:block">
              <RoleSwitcher currentRole={currentRole} onRoleChange={onRoleChange} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
