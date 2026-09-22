'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {QrCode} from 'lucide-react';
import {useMarket} from '@/lib/market';
export default function Verify(){
 const r=useRouter();const {products}=useMarket();const [code,setCode]=useState('');
 const go=()=>{const t=code.trim().split('/').pop()?.toLowerCase();if(t)r.push('/buyer/q/'+t)};
 return <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-5 px-4 py-10 text-center">
  <QrCode size={48} className="mx-auto text-clay"/><h1 className="font-display text-4xl font-bold">Verify a handcraft</h1><p className="text-ink/70">Enter the code that comes with the QR on your craft.</p>
  <input value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} placeholder="Enter hash code" autoCapitalize="off" autoCorrect="off" spellCheck={false} className="h-14 rounded-xl border-2 border-sand bg-white px-4 text-center outline-none focus:border-clay"/>
  <button onClick={go} disabled={!code.trim()} className="h-14 rounded-full bg-clay font-bold text-white transition active:scale-95 disabled:opacity-50">Proceed</button>
  <button onClick={()=>setCode(products[0]?.hash??'')} className="text-sm font-semibold text-clay underline">Use a sample code (demo)</button></div>;
}
