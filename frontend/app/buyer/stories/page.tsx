'use client';
import Link from 'next/link';
import {Img} from '@/components/buyer/BuyerUI';
import {artisanImg,firstName,useMarket} from '@/lib/market';
export default function Stories(){
 const {artisans}=useMarket();
 return <div className="mx-auto max-w-7xl px-4 py-8 md:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">Craft stories</p><h1 className="font-display text-4xl font-bold">Stories from the workshop</h1>
  <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{artisans.map(a=><Link key={a.id} href={`/buyer/artisans/${a.id}`} className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md">
   <Img src={artisanImg(a.id)} alt={a.name} className="aspect-[16/10] w-full transition duration-500 group-hover:scale-105"/>
   <div className="space-y-2 p-5"><p className="text-xs font-bold uppercase tracking-[0.15em] text-clay">{a.craft}</p><h2 className="font-display text-xl font-bold leading-snug">“{a.quote}”</h2>
    <p className="line-clamp-3 text-sm text-ink/75">{a.story}</p><span className="text-sm font-bold text-clay">Read {firstName(a.name)}’s story →</span></div></Link>)}</div></div>;
}
