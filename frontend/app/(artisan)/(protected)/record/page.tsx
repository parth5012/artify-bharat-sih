'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Check,ShieldCheck} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {Btn,Screen} from '@/components/ui';
import {Processing} from '@/components/Processing';
import {createRecord,shrink} from '@/lib/mock';
import {enqueueProduct} from '@/lib/sync';
import {qrUrl,useMarket} from '@/lib/market';
import {useStore} from '@/lib/store';
export default function Record(){
 const r=useRouter();const {s,set}=useStore();const {publish}=useMarket();const [ready,setReady]=useState(false),[full,setFull]=useState(false),[error,setError]=useState('');
 useEffect(()=>{createRecord(s.photos,s.product).then(x=>set({record:x}))},[]); // eslint-disable-line
 useEffect(()=>{ // publish to the buyer marketplace so both sides share one product
  const rec=s.record,p=s.product;if(!rec||!p||s.productId==='u-'+rec.id)return;
  (async()=>{try{const api=await fetch('/api/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:p.localName,craft:p.craft,price:p.price,description:p.description,materials:p.materials})});const data=await api.json();if(!api.ok)throw new Error(data.error);const remote=data.product;const imgs=await Promise.all(s.photos.map(x=>shrink(x.src)));const id='u-'+rec.id;
   publish({id,name:p.localName,craft:p.craft,price:p.price,artisanId:s.profile.artisanId,images:imgs,wip:[],short:p.recognizedAs+'.',description:p.description,madeHow:p.howMade,usedFor:p.usedFor,materials:p.materials,time:p.time,hash:remote.childHash,parentHash:remote.parentHash,childHash:remote.childHash,serialNumber:remote.serialNumber,added:Date.now()},
    // Privacy: the artisan's phone number is never published to the buyer marketplace.
    {id:s.profile.artisanId,name:s.profile.name,craft:p.recognizedAs,region:s.profile.place??'India',since:new Date().getFullYear(),story:'New on Artifact.',quote:'Made by hand, with care.'});
   set({productId:id,record:{...rec,hash:remote.parentHash,parentHash:remote.parentHash,childHash:remote.childHash,serialNumber:remote.serialNumber}})}catch(e){
   // Offline handling: queue the registration for retry when connectivity
   // returns. The client idempotency key keeps replays duplicate-free.
   if(p&&rec){enqueueProduct({name:p.localName,craft:p.craft,description:p.description,price:p.price,materials:p.materials,queuedAtSeed:rec.id})}
   setError(e instanceof Error?e.message:'Unable to register product')}})();
 },[s.record]); // eslint-disable-line
 if(error)return <Screen step={6}><div className="flex min-h-full flex-col items-center justify-center gap-4 text-center"><h2 className="text-2xl font-bold">Could not register product</h2><p className="text-stone-600">{error}</p><Btn onClick={()=>{setError('');set({productId:null})}}>Try again</Btn></div></Screen>;
 if(!ready||!s.record||!s.productId)return <Processing step={6} title="Registering your product" sub="Almost ready" steps={['Saving your photos & place','Recording who made it','Getting it ready for the market']} onDone={()=>setReady(true)}/>;
 const parentHash=s.record.parentHash,childHash=s.record.childHash;
 return <Screen step={6}><div className="flex min-h-full flex-col items-center gap-4 text-center">
  <span className="grid h-24 w-24 animate-pop place-items-center rounded-full bg-emerald-600 text-white"><Check size={56}/></span>
  <div><h2 className="text-3xl font-extrabold">Product ready!</h2><p className="mt-1 text-lg text-stone-700">Your product is now registered and ready for the market.</p></div>
  <div className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm">
   {s.photos[0]&&<img src={s.photos[0].src} alt="" className="enhanced h-16 w-16 rounded-xl object-cover"/>}
   <div><p className="font-bold">{s.product?.localName}</p><p className="flex items-center gap-1 text-sm font-semibold text-emerald-700"><ShieldCheck size={16}/> Verified maker · Origin recorded</p></div></div>
  <div className="grid w-full gap-3 sm:grid-cols-2">
   <div className="rounded-2xl bg-white p-3 shadow"><QRCodeSVG value={qrUrl(parentHash)} size={150}/><p className="mt-2 font-bold">Parent product QR</p><p className="text-xs text-stone-500">Identifies this product design</p></div>
   <div className="rounded-2xl bg-white p-3 shadow"><QRCodeSVG value={qrUrl(childHash)} size={150}/><p className="mt-2 font-bold">Item QR · #{s.record.serialNumber}</p><p className="text-xs text-stone-500">Identifies this physical item</p></div>
  </div>
  <button onClick={()=>setFull(!full)} className="break-all text-xs text-stone-500">{full?`Parent: ${parentHash} · Child: ${childHash}`:`Proof ID ${s.record.id} · tap for full codes`}</button>
  <Btn onClick={()=>r.push('/buyer/product/'+s.productId)}>See it in the marketplace</Btn>
  <Btn tone="light" onClick={()=>{set({photos:[],product:null,record:null,productId:null});r.push('/capture')}}>Add another product</Btn>
  <button onClick={()=>r.push('/home')} className="font-semibold text-stone-600 underline">Done</button>
 </div></Screen>;
}
