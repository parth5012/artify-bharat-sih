'use client';
import {ArtisanCard} from '@/components/buyer/Cards';
import {useMarket} from '@/lib/market';
export default function Artisans(){
 const {artisans}=useMarket();
 return <div className="mx-auto max-w-7xl px-4 py-8 md:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">Discover artisans</p><h1 className="font-display text-4xl font-bold">The people behind the craft</h1>
  <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{artisans.map(a=><ArtisanCard key={a.id} a={a}/>)}</div></div>;
}
