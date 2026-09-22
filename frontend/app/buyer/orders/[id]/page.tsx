'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {Check,PartyPopper} from 'lucide-react';
import {Img} from '@/components/buyer/BuyerUI';
import {rupee,stages,useMarket} from '@/lib/market';
export default function OrderPage(){
 const {id}=useParams<{id:string}>();const {ready,orders,getProduct,getArtisan}=useMarket();const o=orders.find(x=>x.id===id);
 const [now,setNow]=useState(0),[placed,setPlaced]=useState(false);
 useEffect(()=>{setNow(Date.now());setPlaced(new URLSearchParams(location.search).get('placed')==='1');const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
 if(!ready)return <div className="h-[60vh]"/>;
 if(!o)return <p className="py-32 text-center">Order not found. <Link href="/buyer/orders" className="font-bold text-clay">Your orders</Link></p>;
 const stage=Math.min(stages.length-1,Math.max(0,Math.floor((now-o.ts)/12000)));const eta=new Date(o.ts+5*864e5).toLocaleDateString('en-IN',{dateStyle:'long'});
 const makers=Array.from(new Set(o.lines.map(l=>getArtisan(getProduct(l.id)?.artisanId??'')?.name).filter(Boolean)));
 return <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-8">
  {placed&&<div className="animate-fade-up rounded-3xl bg-moss p-6 text-white"><PartyPopper size={32}/><h1 className="mt-2 font-display text-3xl font-bold">Order confirmed</h1><p className="mt-1 text-white/90">Thank you! {makers.join(' & ')||'Your artisan'} will start preparing your craft with care.</p></div>}
  <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-sm text-ink/60">Order</p><h2 className="font-display text-2xl font-bold">#{o.id}</h2></div><p className="text-sm text-ink/70">Estimated delivery: <b>{eta}</b></p></div>
  <section className="rounded-2xl bg-white p-5 shadow-sm"><h3 className="mb-4 font-display text-xl font-bold">Order tracking</h3>
   <ol className="space-y-4">{stages.map((s,k)=><li key={s} className="flex items-center gap-3"><span className={`grid h-8 w-8 place-items-center rounded-full ${k<=stage?'bg-moss text-white':'bg-sand text-ink/40'} ${k===stage&&k<stages.length-1?'animate-pulse':''}`}>{k<=stage?<Check size={16}/>:k+1}</span><span className={k<=stage?'font-semibold':'text-ink/50'}>{s}</span></li>)}</ol></section>
  <section className="rounded-2xl bg-white p-5 shadow-sm"><h3 className="mb-3 font-display text-xl font-bold">Items</h3><ul className="space-y-3">{o.lines.map(l=>{const p=getProduct(l.id);return <li key={l.id} className="flex items-center gap-3"><Img src={p?.images[0]} className="h-16 w-14 rounded-lg"/><div className="flex-1"><p className="font-bold">{p?.name}</p><p className="text-sm text-ink/60">Qty {l.qty} · by {getArtisan(p?.artisanId??'')?.name}</p></div><p className="font-bold">{rupee(l.price*l.qty)}</p></li>})}</ul>
   <div className="mt-4 space-y-1 border-t border-sand pt-3 text-sm"><p className="flex justify-between"><span>Subtotal</span>{rupee(o.subtotal)}</p><p className="flex justify-between"><span>Shipping</span>{o.shipping?rupee(o.shipping):'Free'}</p><p className="flex justify-between text-lg font-bold"><span>Total</span>{rupee(o.total)}</p></div></section>
  <section className="rounded-2xl bg-white p-5 text-sm shadow-sm"><h3 className="mb-2 font-display text-xl font-bold">Shipping to</h3><p>{o.ship.name} · {o.ship.phone}</p><p>{o.ship.line}, {o.ship.city}, {o.ship.state} {o.ship.pin}</p><p className="mt-2 text-ink/60">Payment: {o.pay==='ondc'?'Paid via ONDC (demo)':'Cash on delivery'}</p></section>
 </div>;
}
