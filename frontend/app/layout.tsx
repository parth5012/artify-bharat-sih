import './globals.css';
import type {Metadata,Viewport} from 'next';
import {ReactNode} from 'react';
import {StoreProvider} from '@/lib/store';
import {MarketProvider} from '@/lib/market';
import SW from '@/components/SW';
import {LanguageSync} from '@/components/LanguageSync';
import {AppInitializer} from '@/components/AppInitializer';

export const metadata: Metadata = {
  title: 'Artify – Real Artisan. Real Craft.',
  description: 'Connect artisans with buyers. Verified origin, fair prices, authentic handcrafted products.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Artify',
    statusBarStyle: 'default'
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png'
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'application-name': 'Artify',
    'apple-mobile-web-app-title': 'Artify',
    'msapplication-TileColor': '#F97316',
    'msapplication-tap-highlight': 'no'
  }
};

export const viewport: Viewport = {
  themeColor: '#F97316',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  maximumScale: 5,
  userScalable: true
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="bg-cream text-ink">
        <StoreProvider>
          <LanguageSync />
          <MarketProvider>{children}</MarketProvider>
        </StoreProvider>
        <SW />
      </body>
    </html>
  );
}
