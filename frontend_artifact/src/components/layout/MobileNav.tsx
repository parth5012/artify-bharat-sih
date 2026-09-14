import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, QrCode, Shield, Home } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-cream-50/95 backdrop-blur-md border-t border-terracotta-200 shadow-lg px-2 py-2">
      <div className="flex items-center justify-around">
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors ${
            isActive('/') && location.pathname === '/'
              ? 'text-terracotta-600 bg-terracotta-50'
              : 'text-charcoal-700 hover:text-terracotta-600'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>

        <Link
          to="/artisan"
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors ${
            isActive('/artisan')
              ? 'text-terracotta-600 bg-terracotta-50'
              : 'text-charcoal-700 hover:text-terracotta-600'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span>Artisan</span>
        </Link>

        <Link
          to="/buyer"
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors ${
            isActive('/buyer')
              ? 'text-terracotta-600 bg-terracotta-50'
              : 'text-charcoal-700 hover:text-terracotta-600'
          }`}
        >
          <QrCode className="w-5 h-5" />
          <span>Buyer</span>
        </Link>

        <Link
          to="/admin"
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors ${
            isActive('/admin')
              ? 'text-terracotta-600 bg-terracotta-50'
              : 'text-charcoal-700 hover:text-terracotta-600'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span>Admin</span>
        </Link>
      </div>
    </div>
  );
};
