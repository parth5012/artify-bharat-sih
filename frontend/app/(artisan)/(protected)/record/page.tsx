'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {PublishingFlow, MarketplaceSuccess} from '@/components/PublishingFlow';
import {Screen} from '@/components/ui';
import {createRecord,shrink} from '@/lib/mock';
import {enqueueProduct} from '@/lib/sync';
import {useMarket} from '@/lib/market';
import {useStore} from '@/lib/store';
import {generateProductHash} from '@/lib/hash';

export default function Record(){
 const r=useRouter();
 const {s,set}=useStore();
 const {publish}=useMarket();
 const [publishingComplete, setPublishingComplete] = useState(false);
 const [productHash, setProductHash] = useState('');
 const [error,setError]=useState('');
 
 useEffect(()=>{
   createRecord(s.photos,s.product).then(x=>set({record:x}))
 },[]); // eslint-disable-line
 
 useEffect(()=>{ 
   // Publish to the buyer marketplace and generate hash
   const rec=s.record,p=s.product;
   if(!rec||!p||s.productId==='u-'+rec.id)return;
   
   (async()=>{
     try{
       const api=await fetch('/api/products',{
         method:'POST',
         headers:{'Content-Type':'application/json'},
         body:JSON.stringify({
           name:p.localName,
           craft:p.craft,
           price:p.price,
           description:p.description,
           materials:p.materials
         })
       });
       const data=await api.json();
       if(!api.ok)throw new Error(data.error);
       
       const remote=data.product;
       const imgs=await Promise.all(s.photos.map(x=>shrink(x.src)));
       const id='u-'+rec.id;
       
       // Generate product hash
       const hash = await generateProductHash({
         productId: id,
         artisanId: s.profile.artisanId || 'UNKNOWN',
         productName: p.localName,
         timestamp: Date.now()
       });
       setProductHash(hash);
       
       publish(
         {
           id,
           name:p.localName,
           craft:p.craft,
           price:p.price,
           artisanId:s.profile.artisanId,
           images:imgs,
           wip:[],
           short:p.recognizedAs+'.',
           description:p.description,
           madeHow:p.howMade,
           usedFor:p.usedFor,
           materials:p.materials,
           time:p.time,
           hash:remote.childHash,
           parentHash:remote.parentHash,
           childHash:remote.childHash,
           serialNumber:remote.serialNumber,
           added:Date.now()
         },
         {
           id:s.profile.artisanId,
           name:s.profile.name,
           craft:p.recognizedAs,
           region:s.profile.place??'India',
           since:new Date().getFullYear(),
           story:'New on Artifact.',
           quote:'Made by hand, with care.'
         }
       );
       
       set({
         productId:id,
         record:{
           ...rec,
           hash:remote.parentHash,
           parentHash:remote.parentHash,
           childHash:remote.childHash,
           serialNumber:remote.serialNumber
         }
       });
     }catch(e){
       // Offline handling: queue for retry
       if(p&&rec){
         enqueueProduct({
           name:p.localName,
           craft:p.craft,
           description:p.description,
           price:p.price,
           materials:p.materials,
           queuedAtSeed:rec.id
         });
       }
       setError(e instanceof Error?e.message:'Unable to register product');
     }
   })();
 },[s.record]); // eslint-disable-line

 // Show error state
 if(error){
   return (
     <Screen step={6}>
       <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
         <div className="w-full space-y-4">
           <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-red-100 text-red-600">
             <span className="text-4xl">⚠️</span>
           </div>
           <h2 className="text-2xl font-bold text-[#3B2418]">Could not publish product</h2>
           <p className="text-stone-600">{error}</p>
           <button
             onClick={()=>{setError('');set({productId:null})}}
             className="rounded-full bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-700 active:scale-95 transition-transform"
           >
             Try again
           </button>
         </div>
       </div>
     </Screen>
   );
 }

 // Show publishing animation
 if(!publishingComplete || !s.record || !s.productId || !productHash){
   return (
     <Screen step={6}>
       <PublishingFlow
         onComplete={() => setPublishingComplete(true)}
         onError={(err) => setError(err)}
       />
     </Screen>
   );
 }

 // Show success with marketplace cards and QR
 const productId = s.productId || `ART-P-${s.record.serialNumber}`;
 
 return (
   <Screen step={6}>
     <MarketplaceSuccess
       productId={productId}
       productName={s.product?.localName || 'Your Product'}
       productHash={productHash}
       onViewProducts={() => r.push('/home')}
       onViewMarketplace={() => r.push('/buyer/product/'+s.productId)}
       ondcUrl="https://ondc.org/"
       gemUrl={`https://gem.gov.in/product/${productId}`}
     />
   </Screen>
 );
}
