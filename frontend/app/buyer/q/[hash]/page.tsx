'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useParams,useRouter} from 'next/navigation';
import {Check,CheckCircle2,Loader2,Phone,XCircle} from 'lucide-react';
import {AuthBadge,Img} from '@/components/buyer/BuyerUI';
import {artisanImg,craftName,firstName,rupee,useMarket} from '@/lib/market';
export default function QrLanding(){
 const {hash}=useParams<{hash:string}>();const r=useRouter();const M=useMarket();const [busy,setBusy]=useState(true);
 useEffect(()=>{const t=setTimeout(()=>setBusy(false),1600);return()=>clearTimeout(t)},[]);
 if(busy||!M.ready)return <div className="mx-auto flex min-h-[60dvh] max-w-sm flex-col items-center justify-center gap-4 text-center"><Loader2 size={48} className="animate-spin text-clay"/><p className="font-display text-2xl font-bold">Checking Artifact record…</p><p className="text-ink/60">Matching the code with the maker’s registration</p></div>;
 const scannedHash=hash.toLowerCase();
 const p=M.products.find(x=>x.hash===scannedHash||x.parentHash===scannedHash||x.childHash===scannedHash),a=p&&M.getArtisan(p.artisanId);
 const scanType=p&&(p.childHash===scannedHash&&p.parentHash!==scannedHash?'child':'parent');
 if(!p||!a)return <div className="mx-auto flex min-h-[60dvh] max-w-sm flex-col items-center justify-center gap-4 text-center"><XCircle size={110} className="animate-pop text-red-600"/><h1 className="font-display text-3xl font-bold">Product not verified</h1><p className="text-ink/70">This code does not match any craft registered on Artifact. Please check the code and try again.</p><Link href="/buyer/verify" className="rounded-full bg-clay px-6 py-3 font-bold text-white">Try again</Link></div>;
 return <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8">
  <div className="flex items-center gap-4 rounded-3xl bg-moss p-5 text-white"><CheckCircle2 size={56} className="shrink-0 animate-pop"/><div><h1 className="font-display text-3xl font-bold">{scanType==='child'?'Item verified':'Product verified'}</h1><p className="text-white/90">Made by {a.name} · Origin recorded on Artifact</p>{scanType==='child'&&<p className="mt-1 text-sm text-white/85">Item serial number: {p.serialNumber}</p>}</div></div>
  <div className="grid gap-8 md:grid-cols-2">
   <Img src={p.images[0]} alt={p.name} className="aspect-square w-full rounded-3xl shadow-md"/>
   <div className="space-y-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">{craftName(p.craft)}</p><h2 className="font-display text-4xl font-bold">{p.name}</h2><p className="text-3xl font-bold">{rupee(p.price)}</p>
    <p className="text-lg leading-relaxed">{p.description}</p><p className="text-sm text-ink/70"><b>Made:</b> {p.madeHow} · <b>Time:</b> {p.time}</p>
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"><Img src={artisanImg(a.id)} className="h-14 w-14 rounded-full"/><div className="flex-1"><p className="font-bold">{a.name}</p><p className="text-sm text-ink/70">{a.craft} · {a.region}</p><AuthBadge/></div></div>
    <ul className="space-y-1">{['Verified Artisan','Craft Origin Recorded','Product Registration Verified'].map(c=><li key={c} className="flex items-center gap-2 font-semibold text-moss"><Check size={18}/>{c}</li>)}</ul>
    <div className="flex flex-wrap gap-3 pt-2"><button onClick={()=>{M.add(p.id);r.push('/buyer/checkout')}} className="h-12 flex-1 rounded-full bg-clay px-6 font-bold text-white active:scale-95">Order now</button>
     {a.phone&&<a href={`tel:+91${a.phone.replace(/\D/g,'')}`} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-clay px-6 font-bold text-clay active:scale-95"><Phone size={18}/> Call {firstName(a.name)}</a>}</div>
    <Link href={`/buyer/product/${p.id}`} className="block text-sm font-bold text-clay underline">View full product page →</Link></div></div>
  {!!p.wip.length&&<div><h3 className="mb-3 font-display text-2xl font-bold">Behind the making</h3><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{p.wip.map((w,i)=><Img key={i} src={w} className="aspect-square rounded-2xl"/>)}</div></div>}
 </div>;
}
