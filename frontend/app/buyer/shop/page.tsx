'use client';
import {Suspense,useMemo} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {Search} from 'lucide-react';
import {ProductCard} from '@/components/buyer/Cards';
import {categories,craftName,useMarket} from '@/lib/market';
function Shop(){
 const sp=useSearchParams(),r=useRouter(),{products,getArtisan}=useMarket();
 const craft=sp.get('craft')||'all',q=sp.get('q')||'',sort=sp.get('sort')||'featured';
 const set=(k:string,v:string)=>{const n=new URLSearchParams(sp.toString());v&&v!=='all'&&v!=='featured'?n.set(k,v):n.delete(k);r.replace('/buyer/shop'+(n.toString()?'?'+n:''),{scroll:false})};
 const list=useMemo(()=>{
  const s=q.toLowerCase();let l=products.filter(p=>(craft==='all'||p.craft===craft)&&(!s||[p.name,craftName(p.craft),p.short,getArtisan(p.artisanId)?.name,getArtisan(p.artisanId)?.region].join(' ').toLowerCase().includes(s)));
  if(sort==='low')l=[...l].sort((a,b)=>a.price-b.price);if(sort==='high')l=[...l].sort((a,b)=>b.price-a.price);if(sort==='name')l=[...l].sort((a,b)=>a.name.localeCompare(b.name));return l;
 },[products,craft,q,sort,getArtisan]);
 const chip=(on:boolean)=>`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${on?'border-clay bg-clay text-white':'border-sand bg-white hover:border-clay'}`;
 return <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
  <h1 className="font-display text-4xl font-bold">Shop handcrafts</h1>
  <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
   <label className="flex flex-1 items-center gap-2 rounded-full border border-sand bg-white px-4"><Search size={18} className="text-ink/50"/><input value={q} onChange={e=>set('q',e.target.value)} placeholder="Search crafts, artisans, places…" className="h-12 w-full bg-transparent outline-none"/></label>
   <select value={sort} onChange={e=>set('sort',e.target.value)} aria-label="Sort" className="h-12 rounded-full border border-sand bg-white px-4 font-semibold"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Name A–Z</option></select></div>
  <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto"><button className={chip(craft==='all')} onClick={()=>set('craft','all')}>All</button>{categories.map(c=><button key={c.slug} className={chip(craft===c.slug)} onClick={()=>set('craft',c.slug)}>{c.name}</button>)}</div>
  <p className="mt-6 text-sm text-ink/60">{list.length} handcrafts</p>
  {list.length?<div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">{list.map(p=><ProductCard key={p.id} p={p}/>)}</div>
   :<p className="py-24 text-center text-ink/60">No crafts match. Try another search or craft.</p>}
 </div>;
}
export default function Page(){return <Suspense><Shop/></Suspense>}
