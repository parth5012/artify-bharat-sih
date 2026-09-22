'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {CartLines,Summary} from '@/components/buyer/CartParts';
import {useMarket} from '@/lib/market';
export default function Cart(){
 const {cart}=useMarket();const r=useRouter();
 return <div className="mx-auto max-w-5xl px-4 py-8 md:px-8"><h1 className="font-display text-4xl font-bold">Your cart</h1>
  {cart.length?<div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]"><CartLines/><div className="lg:sticky lg:top-24 lg:self-start"><Summary cta="Proceed to Checkout" onCta={()=>r.push('/buyer/checkout')}/></div></div>
  :<div className="py-24 text-center"><p className="text-lg text-ink/70">Your cart is empty.</p><Link href="/buyer/shop" className="mt-4 inline-block rounded-full bg-clay px-6 py-3 font-bold text-white">Explore handcrafts</Link></div>}
 </div>;
}
