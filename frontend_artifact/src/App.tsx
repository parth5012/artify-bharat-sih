import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';
import { LandingPage } from './pages/LandingPage';
import { ArtisanPortalPage } from './pages/ArtisanPortalPage';
import { BuyerPortalPage } from './pages/BuyerPortalPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import type { ArtisanRole, Language } from './types';

export function App() {
  const [currentRole, setCurrentRole] = useState<ArtisanRole>('solo');
  const [language, setLanguage] = useState<Language>('en');
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration error:', err);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-cream-100 text-charcoal-800 pb-20 lg:pb-8">
        <Navbar
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          isOffline={isOffline}
          language={language}
          onLanguageChange={setLanguage}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            
            <Route
              path="/artisan/*"
              element={
                <ArtisanPortalPage
                  currentRole={currentRole}
                  onRoleChange={setCurrentRole}
                />
              }
            />

            <Route path="/buyer" element={<BuyerPortalPage />} />
            <Route path="/buyer/verify" element={<BuyerPortalPage />} />
            <Route path="/buyer/passport/:code" element={<BuyerPortalPage />} />

            <Route path="/admin/*" element={<AdminDashboardPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <MobileNav />
      </div>
    </Router>
  );
}

export default App;
