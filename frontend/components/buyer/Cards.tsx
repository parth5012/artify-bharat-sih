'use client';
import Link from 'next/link';
import {Heart,ShoppingBag} from 'lucide-react';
import {Img,AuthBadge} from './BuyerUI';
import {Artisan,artisanImg,Category,craftImg,craftName,Craft,firstName,rupee,useMarket} from '@/lib/market';
export function ProductCard({p}:{p:Craft}){
 const {getArtisan,wish,toggleWish,add}=useMarket();const a=getArtisan(p.artisanId);const w=wish.includes(p.id);
 return <div className="group flex flex-col">
  <div className="relative">
   <Link href={`/buyer/product/${p.id}`} className="block aspect-[4/5] overflow-hidden rounded-2xl bg-sand shadow-sm"><Img src={p.images[0]} alt={p.name} className="h-full w-full transition duration-500 group-hover:scale-105"/></Link>
   <button aria-label={w?'Remove from wishlist':'Add to wishlist'} onClick={()=>toggleWish(p.id)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow transition active:scale-90"><Heart size={18} className={w?'fill-clay text-clay':'text-ink'}/></button>
  </div>
  <div className="mt-3 flex flex-1 flex-col gap-0.5">
   <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-clay">{craftName(p.craft)}</p>
   <Link href={`/buyer/product/${p.id}`} className="font-display text-lg font-bold leading-snug hover:text-clay">{p.name}</Link>
   {a&&<p className="text-sm text-ink/70">By {firstName(a.name)} • {a.region}</p>}
   <div className="mt-1 flex items-center justify-between"><span className="text-lg font-bold">{rupee(p.price)}</span><AuthBadge/></div>
  </div>
  <button onClick={()=>add(p.id)} className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full border border-clay text-sm font-semibold text-clay transition hover:bg-clay hover:text-white active:scale-95"><ShoppingBag size={16}/> Add to Cart</button>
 </div>;
}
export function ArtisanCard({a,large}:{a:Artisan;large?:boolean}){
 const {products}=useMarket();const n=products.filter(p=>p.artisanId===a.id).length;
 return <Link href={`/buyer/artisans/${a.id}`} className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md">
  <Img src={artisanImg(a.id)} alt={a.name} className={`w-full transition duration-500 group-hover:scale-105 ${large?'aspect-[4/3]':'aspect-square'}`}/>
  <div className="flex flex-1 flex-col gap-1 p-4">
   <h3 className="font-display text-xl font-bold">{a.name}</h3><p className="text-sm font-semibold text-clay">{a.craft}</p><p className="text-sm text-ink/70">{a.region}</p>
   <p className="mt-1 line-clamp-2 text-sm italic text-ink/80">“{a.quote}”</p>
   <div className="mt-2 flex items-center justify-between text-sm"><span className="text-ink/70">{n} {n===1?'product':'products'}</span><AuthBadge/></div>
   <span className="mt-1 text-sm font-bold text-clay">Meet the Maker →</span>
  </div></Link>;
}
export function CraftCard({c,tall}:{c:Category;tall?:boolean}){
 return <Link href={`/buyer/shop?craft=${c.slug}`} className={`group relative block shrink-0 overflow-hidden rounded-2xl ${tall?'aspect-[3/4]':'aspect-[3/4] w-40 md:w-auto'}`}>
  <Img src={craftImg(c.slug)} alt={c.name} className="h-full w-full transition duration-700 group-hover:scale-105"/>
  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"/>
  <span className="absolute bottom-3 left-3 right-3 font-display text-xl font-bold text-white">{c.name}</span></Link>;
}
