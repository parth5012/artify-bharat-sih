'use client';
import Link from 'next/link';
import {QrCode,ShieldCheck,Store,UserCheck} from 'lucide-react';
import {Img,Section} from '@/components/buyer/BuyerUI';
import {ArtisanCard,CraftCard,ProductCard} from '@/components/buyer/Cards';
import {categories,useMarket} from '@/lib/market';
export default function BuyerHome(){
 const {products,artisans}=useMarket();
 const trust=[[UserCheck,'Real artisans','Every maker is identified and verified'],[ShieldCheck,'Verified origin','Where and how it was made is recorded'],[Store,'Direct marketplace','Bought from the maker’s own listing']] as const;
 return <div className="space-y-14 pb-6 md:space-y-24">
  <section className="relative isolate overflow-hidden bg-ink">
   <Img src="/buyer/hero.jpg" className="absolute inset-0 -z-10 h-full w-full opacity-60"/><div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/30 to-transparent"/>
   <div className="mx-auto flex min-h-[62dvh] max-w-7xl flex-col justify-end px-4 pb-12 pt-24 md:min-h-[78dvh] md:justify-center md:px-8 md:pb-0">
    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#F3C99B]">Authentic Handmade Crafts • Real Artisans • Direct Marketplace</p>
    <h1 className="mt-4 max-w-2xl font-display text-5xl font-bold leading-[1.05] text-white md:text-7xl">Crafted by Hand.<br/>Carrying a Story.</h1>
    <p className="mt-5 max-w-lg text-lg text-white/85">Discover handmade crafts from real artisans across India — and meet the people behind every piece.</p>
    <div className="mt-8 flex flex-wrap gap-3"><Link href="/buyer/shop" className="rounded-full bg-clay px-7 py-3.5 font-bold text-white transition hover:bg-clay-dark active:scale-95">Explore Handcrafted Products</Link>
     <Link href="/buyer/artisans" className="rounded-full border border-white/70 px-7 py-3.5 font-bold text-white transition hover:bg-white/15 active:scale-95">Meet the Artisans</Link></div>
   </div></section>
  <div className="mx-auto -mt-6 grid max-w-7xl gap-3 px-4 md:-mt-20 md:grid-cols-3 md:px-8">{trust.map(([I,t,d])=><div key={t} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-md"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sand text-clay"><I/></span><div><p className="font-display text-lg font-bold">{t}</p><p className="text-sm text-ink/70">{d}</p></div></div>)}</div>
  <Section eyebrow="Shop by craft" title="Traditions, made new"><div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:px-0 lg:grid-cols-8">{categories.map(c=><CraftCard key={c.slug} c={c}/>)}</div></Section>
  <Section eyebrow="Featured handcrafts" title="Made this season" action={<Link href="/buyer/shop" className="text-sm font-bold text-clay">View all →</Link>}>
   <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">{products.slice(0,8).map(p=><ProductCard key={p.id} p={p}/>)}</div></Section>
  <Section eyebrow="The people behind the craft" title="Meet the makers" action={<Link href="/buyer/artisans" className="text-sm font-bold text-clay">All artisans →</Link>}>
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{artisans.slice(0,4).map(a=><ArtisanCard key={a.id} a={a}/>)}</div></Section>
  <section className="mx-auto w-full max-w-7xl px-4 md:px-8"><div className="flex flex-col items-start gap-5 rounded-3xl bg-clay p-8 text-white md:flex-row md:items-center md:justify-between md:p-12">
   <div><QrCode size={36}/><h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Scan the QR on any craft.<br/>See who made it.</h2><p className="mt-2 text-white/85">Every Artifact craft carries a code that shows its maker, origin and story.</p></div>
   <Link href="/buyer/verify" className="rounded-full bg-white px-7 py-3.5 font-bold text-clay transition active:scale-95">Verify a product</Link></div></section>
 </div>;
}
