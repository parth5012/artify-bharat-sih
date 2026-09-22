'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Trash2,X} from 'lucide-react';
import {Img,Stepper} from './BuyerUI';
import {rupee,totals,useMarket} from '@/lib/market';
export function CartLines({onNav}:{onNav?:()=>void}){
 const {cart,getProduct,getArtisan,setQty,remove}=useMarket();
 return <ul className="divide-y divide-sand">{cart.map(l=>{const p=getProduct(l.id);if(!p)return null;const a=getArtisan(p.artisanId);
  return <li key={l.id} className="flex gap-3 py-4">
   <Link onClick={onNav} href={`/buyer/product/${p.id}`}><Img src={p.images[0]} alt={p.name} className="h-24 w-20 rounded-xl"/></Link>
   <div className="flex flex-1 flex-col"><Link onClick={onNav} href={`/buyer/product/${p.id}`} className="font-display font-bold leading-tight">{p.name}</Link>
    <p className="text-sm text-ink/70">{a?.name}</p><p className="mt-1 font-bold">{rupee(p.price)}</p>
    <div className="mt-auto flex items-center justify-between"><Stepper size="sm" q={l.qty} onChange={n=>setQty(l.id,n)}/><button aria-label="Remove" onClick={()=>remove(l.id)} className="text-ink/50 hover:text-clay"><Trash2 size={18}/></button></div></div>
  </li>})}</ul>;
}
export function Summary({cta,onCta}:{cta?:string;onCta?:()=>void}){
 const {subtotal}=useMarket();const t=totals(subtotal);
 return <div className="space-y-2 rounded-2xl bg-white p-5 shadow-sm"><h3 className="font-display text-xl font-bold">Order summary</h3>
  <p className="flex justify-between"><span>Subtotal</span><span>{rupee(t.subtotal)}</span></p>
  <p className="flex justify-between"><span>Shipping</span><span>{t.shipping?rupee(t.shipping):'Free'}</span></p>
  {t.shipping>0&&<p className="text-xs text-ink/60">Free shipping on orders above ₹1,500</p>}
  <p className="flex justify-between border-t border-sand pt-2 text-lg font-bold"><span>Total</span><span>{rupee(t.total)}</span></p>
  {cta&&<button onClick={onCta} disabled={!t.subtotal} className="mt-2 h-12 w-full rounded-full bg-clay font-bold text-white transition hover:bg-clay-dark active:scale-95 disabled:opacity-50">{cta}</button>}</div>;
}
export function CartDrawer(){
 const {drawer,setDrawer,cartCount,cart}=useMarket();const r=useRouter();
 if(!drawer)return null;
 return <div className="fixed inset-0 z-[60]" onClick={()=>setDrawer(false)}><div className="absolute inset-0 bg-black/40"/>
  <aside onClick={e=>e.stopPropagation()} className="absolute right-0 top-0 flex h-full w-full max-w-md animate-slide-in flex-col bg-cream shadow-2xl">
   <div className="flex items-center justify-between border-b border-sand p-4"><h2 className="font-display text-2xl font-bold">Your cart ({cartCount})</h2><button aria-label="Close" onClick={()=>setDrawer(false)}><X/></button></div>
   <div className="flex-1 overflow-y-auto px-4">{cart.length?<CartLines onNav={()=>setDrawer(false)}/>:<p className="mt-20 text-center text-ink/70">Your cart is empty.</p>}</div>
   {!!cart.length&&<div className="space-y-3 border-t border-sand p-4"><Summary cta="Checkout" onCta={()=>{setDrawer(false);r.push('/buyer/checkout')}}/>
    <Link href="/buyer/cart" onClick={()=>setDrawer(false)} className="block text-center text-sm font-semibold text-clay underline">View full cart</Link></div>}
  </aside></div>;
}
export function Toast(){
 const {toast,setDrawer}=useMarket();if(!toast)return null;
 return <div className="fixed inset-x-0 bottom-24 z-[65] flex justify-center px-4 md:bottom-8"><div className="flex animate-fade-up items-center gap-4 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-xl">{toast}
  {toast==='Added to cart'&&<button onClick={()=>setDrawer(true)} className="text-[#F3C99B] underline">View cart</button>}</div></div>;
}
