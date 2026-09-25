'use client';
import { useState, useEffect, ReactNode } from 'react';
import { SplashScreen } from './SplashScreen';

interface AppInitializerProps {
  children: ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if splash was already shown in this session
    const splashShown = sessionStorage.getItem('artifact-splash-shown');
    
    if (splashShown === 'true') {
      setShowSplash(false);
      setIsReady(true);
    } else {
      // Mark splash as shown for this session
      sessionStorage.setItem('artifact-splash-shown', 'true');
      setIsReady(true);
    }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (!isReady) {
    return null; // Prevent flash of content
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <div style={{ opacity: showSplash ? 0 : 1, transition: 'opacity 400ms ease-out' }}>
        {children}
      </div>
    </>
  );
}
