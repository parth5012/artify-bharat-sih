'use client';
import Link from 'next/link';
import {Img} from '@/components/buyer/BuyerUI';
import {categories,craftImg,useMarket} from '@/lib/market';
export default function Crafts(){
 const {products}=useMarket();
 return <div className="mx-auto max-w-7xl px-4 py-8 md:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">Craft traditions</p><h1 className="font-display text-4xl font-bold">Crafts of India</h1>
  <div className="mt-8 grid gap-6 md:grid-cols-2">{categories.map(c=><Link key={c.slug} href={`/buyer/shop?craft=${c.slug}`} className="group flex overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md">
   <Img src={craftImg(c.slug)} alt={c.name} className="w-2/5 shrink-0 transition duration-500 group-hover:scale-105"/>
   <div className="flex flex-col gap-2 p-5"><h2 className="font-display text-2xl font-bold">{c.name}</h2><p className="text-sm text-ink/75">{c.about}</p>
    <span className="mt-auto text-sm font-bold text-clay">{products.filter(p=>p.craft===c.slug).length} handcrafts →</span></div></Link>)}</div></div>;
}
