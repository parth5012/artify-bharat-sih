import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, QrCode, Shield, Home, LogIn, LogOut, UserPlus } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(window.localStorage.getItem('artify-auth-token')));

  useEffect(() => {
    const syncAuthState = () => setIsAuthenticated(Boolean(window.localStorage.getItem('artify-auth-token')));
    window.addEventListener('artify-auth-change', syncAuthState);
    return () => window.removeEventListener('artify-auth-change', syncAuthState);
  }, []);

  const handleLogout = () => {
    window.localStorage.removeItem('artify-auth-token');
    window.dispatchEvent(new Event('artify-auth-change'));
    navigate('/');
  };

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

        {isAuthenticated ? (
          <button type="button" onClick={handleLogout} className="flex flex-col items-center gap-1 rounded-xl p-2 text-xs font-semibold text-charcoal-700">
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        ) : (
          <Link
            to={location.pathname === '/' ? '#artisan-login' : '/artisan?signup=1'}
            className="flex flex-col items-center gap-1 rounded-xl p-2 text-xs font-semibold text-charcoal-700"
          >
            {location.pathname === '/' ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            <span>{location.pathname === '/' ? 'Login' : 'Sign up'}</span>
          </Link>
        )}
      </div>
    </div>
  );
};
