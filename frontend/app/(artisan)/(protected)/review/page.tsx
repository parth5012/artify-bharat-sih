'use client';
import {useMemo, useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Check,ChevronLeft,Loader2} from 'lucide-react';
import {Btn,Screen,Thumb} from '@/components/ui';
import {categories,rupee} from '@/lib/market';
import {useStore} from '@/lib/store';

export default function Review(){
 const r=useRouter();const {s,set}=useStore();const p=s.product;
 const [loading,setLoading]=useState(true);
 const [quote,setQuote]=useState<null | {
   estimated_cost:number;
   suggested_price_range:{minimum:number;recommended:number;maximum:number};
   market_reference:{average:number;low:number;high:number};
   material_cost:number;
   labour_cost:number;
   overhead_cost:number;
   sources?:Array<{name?:string;url?:string;date?:string}>;
  market_sources?:Array<{name?:string;url?:string;date?:string}>;
  estimated_material_cost:number;
  estimated_labour_cost:number;
  estimated_total_making_cost:number;
  similar_product_market_range:{low:number;high:number};
  recommended_price:number;
  product_understanding?:{category?:string;capacity?:string;use_case?:string;craftsmanship?:string};
 }>(null);
 const [error,setError]=useState('');
 
 const materialsPayload = useMemo(() => p?.materials.map((name:string) => ({ name, quantity: 1, unit: 'kg' })) || [], [p?.materials]);
 
 // Automatically fetch pricing when page loads
 useEffect(() => {
  if (!p) return;
  
  const getFairPrice = async () => {
   setLoading(true); 
   setError('');
   
   try {
    const res = await fetch('/api/pricing/calculate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       product_name: p.localName,
       description: `${p.description}. ${p.howMade}. ${p.usedFor}.`,
       materials: materialsPayload,
       making_days: Number.parseFloat(p.time.match(/(\d+(?:\.\d+)?)/)?.[1] || '1') || 1,
       location: s.profile.place || 'Haryana, India',
       image_data_url: s.photos[0]?.src || null,
       latitude: s.photos[0]?.lat ?? null,
       longitude: s.photos[0]?.lng ?? null,
       weight_kg: null,
     }),
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || data?.detail || 'Pricing unavailable');
    
    setQuote(data);
    if (data?.recommended_price) {
     set({product:{...p, price: Math.round(data.recommended_price)}});
    }
   } catch (err) {
    setError(err instanceof Error ? err.message : 'Unable to calculate fair price.');
   } finally {
    setLoading(false);
   }
  };
  
  getFairPrice();
 }, [p?.localName, materialsPayload.length]); // eslint-disable-line react-hooks/exhaustive-deps
 
 if(!p)return <Screen step={5} onBack={()=>r.push('/describe')}><p className="mt-20 text-center text-lg">Nothing to show yet. Please speak about your craft first.</p></Screen>;
 
 const craft=categories.find(c=>c.slug===p.craft)?.name;
 const Row=(k:string,v:string)=><p><b>{k}:</b> {v}</p>;
 
 return <Screen step={5}><div className="space-y-4">
  <div className="overflow-hidden rounded-3xl bg-white shadow">
   {s.photos[0]&&<img src={s.photos[0].src} alt={p.localName} className="enhanced aspect-[4/3] w-full object-cover"/>}
   <div className="space-y-1 p-4"><p className="text-sm font-semibold uppercase tracking-wide text-orange-700">{craft}</p>
    <h2 className="font-display text-3xl font-extrabold">{p.localName}</h2><p className="text-stone-600">By {s.profile.name} · {s.profile.place}</p></div></div>
  <div className="flex gap-2 overflow-x-auto">{s.photos.map(x=><Thumb key={x.id} src={x.src}/>)}</div>
  <div className="space-y-2 rounded-2xl bg-white p-4 text-lg shadow-sm"><p>{p.description}</p><hr/>{Row('Made',p.howMade)}{Row('Used for',p.usedFor)}{Row('Time',p.time)}
   <div className="flex flex-wrap gap-2 pt-1">{p.materials.map(m=><span key={m} className="rounded-full bg-orange-100 px-3 py-1 text-base font-semibold text-orange-800">{m}</span>)}</div></div>
  
  {/* Pricing Section */}
  <div className="space-y-3">
   {loading && (
    <div className="rounded-2xl bg-white p-6 shadow-sm flex flex-col items-center justify-center space-y-3">
     <Loader2 size={40} className="animate-spin text-orange-600" />
     <p className="text-sm font-semibold text-stone-600">Calculating fair price...</p>
    </div>
   )}
   
   {error && (
    <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 shadow-sm">
     <p className="text-sm font-semibold text-red-700">⚠️ {error}</p>
    </div>
   )}
   
   {quote && !loading && (
    <div className="space-y-3">
     {/* Suggested Range */}
     <div className="rounded-xl bg-stone-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">SUGGESTED RANGE</p>
      <p className="mt-1 text-2xl font-extrabold text-stone-900">{rupee(quote.suggested_price_range.minimum)} – {rupee(quote.suggested_price_range.maximum)}</p>
     </div>
     
     {/* Recommended Price */}
     <div className="rounded-xl bg-emerald-50 p-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">RECOMMENDED</p>
      <p className="mt-2 text-5xl font-extrabold text-emerald-900">{rupee(quote.recommended_price)}</p>
     </div>
     
     {/* Price Breakdown */}
     <div className="rounded-xl bg-orange-50 p-4">
      <p className="mb-3 text-sm font-bold text-orange-900">Why this price?</p>
      <ul className="space-y-1 text-sm text-stone-700">
       <li>Estimated material cost: {rupee(quote.estimated_material_cost)}</li>
       <li>Estimated labour/making cost: {rupee(quote.estimated_labour_cost)}</li>
       <li>Other costs: {rupee(quote.overhead_cost)}</li>
       <li>Similar product market range: {rupee(quote.similar_product_market_range.low)} – {rupee(quote.similar_product_market_range.high)}</li>
      </ul>
     </div>
    </div>
   )}
  </div>
  
  <Btn onClick={()=>r.push('/record')} disabled={loading}>
   {loading ? 'Please wait...' : 'Proceed'} <Check/>
  </Btn>
  <button onClick={()=>r.push('/describe')} className="flex h-12 items-center gap-1 text-lg font-semibold text-stone-600"><ChevronLeft/> Back</button>
 </div></Screen>;
}
