'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Summary} from '@/components/buyer/CartParts';
import {Img} from '@/components/buyer/BuyerUI';
import {rupee,Ship,useMarket} from '@/lib/market';
export default function Checkout(){
 const r=useRouter();const M=useMarket();
 const [ship,setShip]=useState<Ship>({name:'Aarav Sharma',phone:'9812345678',line:'12, Lotus Apartments, MI Road',city:'Jaipur',state:'Rajasthan',pin:'302001'});
 const [language,setLanguage]=useState('hi-IN');
 if(!M.cart.length)return <div className="py-32 text-center"><p className="text-lg">Your cart is empty.</p><Link href="/buyer/shop" className="mt-4 inline-block font-bold text-clay">Explore handcrafts →</Link></div>;
 const ok=Object.values(ship).every(v=>v.trim());
 const place=()=>{M.setDraft({ship,pay:'ondc',language});r.push('/buyer/checkout/pay')};
 const F=(k:keyof Ship,label:string,span='')=><label className={`block ${span}`}><span className="mb-1 block text-sm font-semibold text-ink/70">{label}</span><input value={ship[k]} onChange={e=>setShip({...ship,[k]:e.target.value})} className="h-12 w-full rounded-xl border border-sand bg-white px-4 outline-none focus:border-clay"/></label>;
 return <div className="mx-auto max-w-6xl px-4 py-8 md:px-8"><h1 className="font-display text-4xl font-bold">Checkout</h1>
  <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]"><div className="space-y-8">
   <section><h2 className="mb-3 font-display text-2xl font-bold">Shipping information</h2><div className="grid gap-3 sm:grid-cols-2">{F('name','Full name')}{F('phone','Phone')}{F('line','Address','sm:col-span-2')}{F('city','City')}{F('state','State')}{F('pin','PIN code')}</div></section>
    <section><h2 className="mb-3 font-display text-2xl font-bold">Payment and confirmation</h2><div className="rounded-2xl border-2 border-clay bg-white p-4"><b>Pay securely on ONDC</b><p className="mt-1 text-sm text-ink/70">You will leave Artifact and complete payment on the ONDC network. ONDC settles payment directly to the artisan’s linked account.</p></div><label className="mt-4 block"><span className="mb-1 block text-sm font-semibold text-ink/70">Confirmation call language</span><select value={language} onChange={e=>setLanguage(e.target.value)} className="h-12 w-full rounded-xl border border-sand bg-white px-4"><option value="hi-IN">Hindi</option><option value="bn-IN">Bengali</option><option value="ta-IN">Tamil</option><option value="te-IN">Telugu</option><option value="mr-IN">Marathi</option><option value="en-IN">English</option></select></label></section></div>
   <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start"><div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">{M.cart.map(l=>{const p=M.getProduct(l.id);return p&&<div key={l.id} className="flex items-center gap-3"><Img src={p.images[0]} className="h-14 w-12 rounded-lg"/><p className="flex-1 text-sm font-semibold">{p.name} × {l.qty}</p><p className="text-sm font-bold">{rupee(p.price*l.qty)}</p></div>})}</div>
    <Summary/><button onClick={place} disabled={!ok} className="h-14 w-full rounded-full bg-clay font-bold text-white transition hover:bg-clay-dark active:scale-95 disabled:opacity-50">Continue to ONDC</button></aside></div></div>;
}
