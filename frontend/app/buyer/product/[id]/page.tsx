'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useParams,useRouter} from 'next/navigation';
import {Check,Heart} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {ProductGallery} from '@/components/buyer/ProductGallery';
import {ProductCard} from '@/components/buyer/Cards';
import {AuthBadge,Img,Section,Stepper} from '@/components/buyer/BuyerUI';
import {artisanImg,categories,craftName,firstName,qrUrl,rupee,useMarket} from '@/lib/market';
export default function ProductPage(){
 const {id}=useParams<{id:string}>();const r=useRouter();const M=useMarket();const p=M.getProduct(id);const a=p&&M.getArtisan(p.artisanId);
 const [qty,setQty]=useState(1),[copied,setCopied]=useState(false);
 if(!M.ready)return <div className="h-[70vh]"/>;
 if(!p||!a)return <p className="py-32 text-center">Product not found. <Link href="/buyer/shop" className="font-bold text-clay">Back to shop</Link></p>;
 const wished=M.wish.includes(p.id),more=M.products.filter(x=>x.artisanId===a.id&&x.id!==p.id),about=categories.find(c=>c.slug===p.craft)?.about;
 const buyNow=()=>{M.add(p.id,qty);r.push('/buyer/checkout')};
 const checks=['Verified Maker','Craft Origin Recorded','Authenticity Information Available'];
 const facts=[['Craft',craftName(p.craft)],['Region',a.region],['Material',p.materials.join(', ')],['Making time',p.time]];
 return <div className="pb-28 md:pb-6">
  <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
   <Link href="/buyer/shop" className="text-sm font-semibold text-clay">← Back to shop</Link>
   <div className="mt-4 grid gap-8 md:grid-cols-2 lg:gap-14">
    <ProductGallery images={p.images} alt={p.name}/>
    <div className="space-y-5 md:sticky md:top-24 md:self-start">
     <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">{craftName(p.craft)}</p>
     <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">{p.name}</h1>
     <p className="text-3xl font-bold">{rupee(p.price)}</p>
     <Link href={`/buyer/artisans/${a.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm transition hover:shadow-md">
      <Img src={artisanImg(a.id)} className="h-14 w-14 rounded-full"/><div className="flex-1"><p className="font-bold">By {a.name}</p><p className="text-sm text-ink/70">{a.craft} · {a.region}</p></div><span className="text-sm font-bold text-clay">Meet the Maker →</span></Link>
     <ul className="space-y-1">{checks.map(c=><li key={c} className="flex items-center gap-2 text-sm font-semibold text-moss"><Check size={16}/>{c}</li>)}</ul>
     <p className="text-lg leading-relaxed text-ink/85">{p.short} {p.description}</p>
     <div className="flex items-center gap-4"><span className="text-sm font-semibold">Quantity</span><Stepper q={qty} onChange={n=>setQty(Math.max(1,Math.min(9,n)))}/></div>
     <div className="hidden gap-3 md:flex">
      <button onClick={()=>M.add(p.id,qty)} className="h-14 flex-1 rounded-full border-2 border-clay font-bold text-clay transition hover:bg-clay hover:text-white active:scale-95">Add to Cart</button>
      <button onClick={buyNow} className="h-14 flex-1 rounded-full bg-clay font-bold text-white transition hover:bg-clay-dark active:scale-95">Buy Now</button>
      <button aria-label="Wishlist" onClick={()=>M.toggleWish(p.id)} className="grid h-14 w-14 place-items-center rounded-full border border-sand bg-white active:scale-90"><Heart className={wished?'fill-clay text-clay':''}/></button></div>
     <p className="text-sm text-ink/60">Free shipping above ₹1,500 · Direct from the maker</p>
    </div></div></div>
  <div className="mt-14 space-y-16 md:mt-20 md:space-y-24">
   <Section eyebrow={`Made by ${firstName(a.name)}`} title="The story behind it"><div className="grid gap-8 md:grid-cols-2">
    <blockquote className="font-display text-2xl italic leading-relaxed md:text-3xl">“{a.quote}”<footer className="mt-3 text-base not-italic text-ink/60">— {a.name}, {a.region}</footer></blockquote>
    <dl className="grid grid-cols-2 gap-4">{facts.map(([k,v])=><div key={k} className="rounded-2xl bg-white p-4 shadow-sm"><dt className="text-xs font-bold uppercase tracking-wide text-clay">{k}</dt><dd className="mt-1 font-semibold">{v}</dd></div>)}</dl></div></Section>
   <Section eyebrow="About the craft" title={craftName(p.craft)}><div className="grid gap-6 md:grid-cols-2"><p className="text-lg leading-relaxed">{about}</p>
    <div className="space-y-3 rounded-2xl bg-sand/60 p-5"><p><b>How it is made:</b> {p.madeHow}</p><p><b>Used for:</b> {p.usedFor}</p></div></div></Section>
   <Section eyebrow="Meet the artisan" title={a.name}><div className="grid overflow-hidden rounded-3xl bg-white shadow-sm md:grid-cols-[2fr_3fr]">
    <Img src={artisanImg(a.id)} alt={a.name} className="aspect-[4/3] w-full md:aspect-auto md:h-full"/>
    <div className="space-y-3 p-6 md:p-8"><p className="text-sm font-bold text-clay">{a.craft} · {a.region}</p><AuthBadge/><p className="text-lg leading-relaxed">{a.story}</p>
     <p className="text-sm text-ink/60">{M.products.filter(x=>x.artisanId===a.id).length} products · crafting since {a.since}</p><Link href={`/buyer/artisans/${a.id}`} className="inline-block font-bold text-clay">Meet the Maker →</Link></div></div></Section>
   {!!p.wip.length&&<Section eyebrow="Behind the making" title="From raw material to finished piece"><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{p.wip.map((w,i)=><Img key={i} src={w} alt="Work in progress" className="aspect-square rounded-2xl"/>)}</div></Section>}
   <Section eyebrow="Authenticity" title="You can verify what you are buying"><div className="grid items-center gap-8 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-[1fr_auto] md:p-8">
    <div className="space-y-4"><ul className="space-y-2 text-lg">{['Verified Artisan','Craft Origin Recorded','Product Registration Verified'].map(c=><li key={c} className="flex items-center gap-2 font-semibold text-moss"><Check size={20}/>{c}</li>)}</ul>
     <Link href={`/buyer/q/${p.hash}`} className="inline-block rounded-full bg-moss px-6 py-3 font-bold text-white transition active:scale-95">View Product Proof</Link></div>
    <div className="flex flex-col items-center gap-2"><QRCodeSVG value={qrUrl(p.hash)} size={140}/>
     <button onClick={()=>{navigator.clipboard?.writeText(p.hash);setCopied(true);setTimeout(()=>setCopied(false),1500)}} className="text-xs text-ink/50">{copied?'Copied ✓':`Code ${p.hash.slice(0,10)}… · copy`}</button></div></div></Section>
   {!!more.length&&<Section title={`More from ${firstName(a.name)}`}><div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">{more.slice(0,4).map(m=><ProductCard key={m.id} p={m}/>)}</div></Section>}
  </div>
  <div className="fixed inset-x-0 bottom-14 z-30 flex items-center gap-2 border-t border-sand bg-cream/95 p-3 backdrop-blur md:hidden">
   <div className="pl-1"><p className="text-xs text-ink/60">Total</p><p className="font-bold">{rupee(p.price*qty)}</p></div>
   <button onClick={()=>M.add(p.id,qty)} className="ml-auto h-12 rounded-full border-2 border-clay px-5 font-bold text-clay active:scale-95">Add to Cart</button>
   <button onClick={buyNow} className="h-12 rounded-full bg-clay px-5 font-bold text-white active:scale-95">Buy Now</button></div>
 </div>;
}
