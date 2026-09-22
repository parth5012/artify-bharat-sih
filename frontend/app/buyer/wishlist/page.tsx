'use client';
import Link from 'next/link';
import {ProductCard} from '@/components/buyer/Cards';
import {useMarket} from '@/lib/market';
export default function Wishlist(){
 const {products,wish}=useMarket();const l=products.filter(p=>wish.includes(p.id));
 return <div className="mx-auto max-w-7xl px-4 py-8 md:px-8"><h1 className="font-display text-4xl font-bold">Wishlist</h1>
  {l.length?<div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">{l.map(p=><ProductCard key={p.id} p={p}/>)}</div>
  :<div className="py-24 text-center"><p className="text-lg text-ink/70">Tap the heart on a craft to save it here.</p><Link href="/buyer/shop" className="mt-4 inline-block rounded-full bg-clay px-6 py-3 font-bold text-white">Explore handcrafts</Link></div>}</div>;
}
