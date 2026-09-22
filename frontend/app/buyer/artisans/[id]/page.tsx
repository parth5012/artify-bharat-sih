'use client';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {AuthBadge,Img,Section} from '@/components/buyer/BuyerUI';
import {ProductCard} from '@/components/buyer/Cards';
import {artisanImg,firstName,useMarket} from '@/lib/market';
export default function ArtisanPage(){
 const {id}=useParams<{id:string}>();const {ready,getArtisan,products}=useMarket();const a=getArtisan(id);
 if(!ready)return <div className="h-[60vh]"/>;
 if(!a)return <p className="py-32 text-center">Artisan not found. <Link href="/buyer/artisans" className="font-bold text-clay">See all artisans</Link></p>;
 const mine=products.filter(p=>p.artisanId===a.id);
 return <div className="space-y-12 pb-6">
  <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-2 md:items-center md:gap-14 md:px-8">
   <Img src={artisanImg(a.id)} alt={a.name} className="aspect-[4/3] w-full rounded-3xl shadow-md"/>
   <div className="space-y-4"><Link href="/buyer/artisans" className="text-sm font-semibold text-clay">← All artisans</Link>
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">{a.craft}</p><h1 className="font-display text-4xl font-bold md:text-6xl">{a.name}</h1>
    <p className="text-lg text-ink/70">{a.region}</p><AuthBadge/>
    <p className="text-lg leading-relaxed">{a.story}</p>
    <blockquote className="border-l-4 border-clay pl-4 font-display text-xl italic">“{a.quote}”</blockquote>
    <div className="flex gap-8 pt-2"><div><p className="text-2xl font-bold">{mine.length}</p><p className="text-sm text-ink/60">Products</p></div><div><p className="text-2xl font-bold">{a.since}</p><p className="text-sm text-ink/60">Crafting since</p></div></div></div></div>
  <Section title={`Crafted by ${firstName(a.name)}`}><div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">{mine.map(p=><ProductCard key={p.id} p={p}/>)}</div></Section>
 </div>;
}
