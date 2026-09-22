'use client';
import Link from 'next/link';
import {Landmark,Palette,ShoppingBag} from 'lucide-react';
import {Logo} from '@/components/ui';
import {Img} from '@/components/buyer/BuyerUI';
export default function Landing(){
 const Panel=(href:string,img:string,icon:React.ReactNode,title:string,line:string)=><Link href={href} className="group relative flex min-h-[42dvh] flex-1 items-end overflow-hidden bg-ink p-8 md:min-h-0 md:p-14">
  <Img src={img} className="absolute inset-0 h-full w-full opacity-60 transition duration-700 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10"/>
  <div className="relative text-white">{icon}<h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">{title}</h2><p className="mt-2 text-lg tracking-wide text-white/85">{line}</p><span className="mt-5 inline-block rounded-full bg-white px-6 py-3 font-bold text-ink transition group-hover:bg-[#F3C99B]">Continue →</span></div></Link>;
 return <div className="flex min-h-dvh flex-col">
  <header className="flex flex-col items-center gap-1 bg-cream px-4 py-5 text-center"><Logo size={52}/><p className="text-sm tracking-wide text-ink/70">Real Artisan → Real Craft → Verified Origin → Real Marketplace</p></header>
  <div className="flex flex-1 flex-col md:flex-row">
   {Panel('/onboarding','/landing/artisan.jpg',<Palette size={40}/>,'I am an Artisan','Speak · Create · Verify · Sell')}
   {Panel('/buyer','/landing/buyer.jpg',<ShoppingBag size={40}/>,'I am a Buyer','Discover · Connect · Verify · Buy')}
  </div>
  <Link href="/ministry" className="flex items-center justify-center gap-2 bg-navy py-3 text-sm font-semibold text-white/90 hover:text-white"><Landmark size={16}/> Ministry Portal — Authorized Access Only</Link>
  </div>;
}
