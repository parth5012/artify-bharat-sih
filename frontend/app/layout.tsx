import './globals.css';
import type {Metadata,Viewport} from 'next';
import {ReactNode} from 'react';
import {StoreProvider} from '@/lib/store';
import {MarketProvider} from '@/lib/market';
import SW from '@/components/SW';
import {LanguageSync} from '@/components/LanguageSync';
export const metadata:Metadata={title:'Artifact – Real Artisan. Real Craft.',manifest:'/manifest.json',appleWebApp:{capable:true,title:'Artifact'}};
export const viewport:Viewport={themeColor:'#FBF7F0',width:'device-width',initialScale:1,viewportFit:'cover'};
export default function RootLayout({children}:{children:ReactNode}){
 return <html lang="en"><body className="bg-cream text-ink"><StoreProvider><LanguageSync/><MarketProvider>{children}</MarketProvider></StoreProvider><SW/></body></html>;
}
