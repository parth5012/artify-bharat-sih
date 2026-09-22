'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {CheckCircle2,Loader2,Circle} from 'lucide-react';
import {OndcLogo} from '@/components/buyer/BuyerUI';
import {useMarket} from '@/lib/market';
export default function Pay(){
 const r=useRouter();const M=useMarket();const {draft}=M;const [error,setError]=useState('');
 useEffect(()=>{
  if(!draft){r.replace('/buyer/checkout');return}
    (async()=>{const enriched=M.cart.map(item=>({id:item.id,qty:item.qty,price:M.getProduct(item.id)?.price??0}));try{const res=await fetch('/api/ondc/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:enriched,buyer:{...draft.ship,language:draft.language}})});const data=await res.json();if(!res.ok)throw new Error(data.error);window.location.assign(data.redirectUrl)}catch(e){setError(e instanceof Error?e.message:'Unable to connect to ONDC')}})();
 },[draft,r]);
 if(error)return <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center"><OndcLogo/><h1 className="font-display text-2xl font-bold">ONDC payment is unavailable</h1><p className="text-ink/70">{error}</p><button onClick={()=>r.push('/buyer/checkout')} className="rounded-full bg-clay px-6 py-3 font-bold text-white">Return to checkout</button></div>;
 return <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-6 px-4 text-center"><OndcLogo/><Loader2 size={42} className="animate-spin text-clay"/><p className="font-display text-2xl font-bold">Connecting you to ONDC…</p><p className="text-ink/70">Payment and artisan settlement are completed by the ONDC network.</p></div>;
}
