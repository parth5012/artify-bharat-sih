'use client';
import {useEffect} from 'react';
import {initOfflineSync} from '@/lib/sync';

export default function SW() {
  useEffect(() => {
    // Replay queued offline work (product registrations) when connectivity returns
    const stop = initOfflineSync();
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.update();
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available, could show update prompt
                  console.log('🔄 New version available');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    }
    
    return stop;
  }, []);
  
  return null;
}
