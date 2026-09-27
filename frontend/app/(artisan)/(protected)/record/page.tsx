'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {PublishingFlow,MarketplaceSuccess} from '@/components/PublishingFlow';
import {Screen} from '@/components/ui';
import {createRecord,shrink} from '@/lib/mock';
import {enqueueProduct,takeQueuedProduct} from '@/lib/sync';
import {useMarket} from '@/lib/market';
import {useStore} from '@/lib/store';
import {generateProductHash} from '@/lib/hash';
import {initialPublishState,listingSource,OndcListingStatus,PublishState} from '@/lib/publishing';

// Wayfinder #195 — Step 6 runs one real publish pipeline and reports it to the
// checklist (no simulated delays):
//   record -> photos + passport hash -> POST /api/products (server pushes the
//   Beckn on_search catalog, answers {product, ondc}) -> durable local publish.
// A rejected listing (`ondc.listed === false`) stops here: the checklist shows
// the failure and Try Again calls POST /api/ondc/listing, which re-publishes the
// ALREADY registered product instead of creating a second one.

type PublishPayload={
 remote:{parentHash:string;childHash:string;serialNumber:string};
 imgs:string[];
 id:string;
};

export default function Record(){
 const r=useRouter();
 const {s,set}=useStore();
 const {publish}=useMarket();
 const [publishingComplete,setPublishingComplete]=useState(false);
 const [productHash,setProductHash]=useState('');
 const [status,setStatus]=useState<PublishState>(initialPublishState);
 const [attempt,setAttempt]=useState(0);
 // Server product id + tail payload: a Try Again resumes the listing instead of
 // re-POSTing /api/products (which would register the craft twice).
 const serverProductId=useRef<string|null>(null);
 const pending=useRef<PublishPayload|null>(null);
 const running=useRef(false);
 const relisting=useRef(false);
 const packetting=useRef(false);

 useEffect(()=>{
   createRecord(s.photos,s.product)
     .then(x=>{set({record:x});setStatus(prev=>({...prev,registered:true}))})
     .catch(e=>setStatus(prev=>({...prev,error:e instanceof Error?e.message:'Failed to create record'})));
 },[]); // eslint-disable-line

 const finishPublish=()=>{
  const rec=s.record,p=s.product,pl=pending.current;
  if(!rec||!p||!pl)return;
  publish(
   {
    id:pl.id,
    name:p.localName,
    craft:p.craft,
    price:p.price,
    artisanId:s.profile.artisanId,
    images:pl.imgs,
    wip:[],
    short:p.recognizedAs+'.',
    description:p.description,
    madeHow:p.howMade,
    usedFor:p.usedFor,
    materials:p.materials,
    time:p.time,
    hash:pl.remote.childHash,
    parentHash:pl.remote.parentHash,
    childHash:pl.remote.childHash,
    serialNumber:pl.remote.serialNumber,
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
   productId:pl.id,
   record:{
    ...rec,
    hash:pl.remote.parentHash,
    parentHash:pl.remote.parentHash,
    childHash:pl.remote.childHash,
    serialNumber:pl.remote.serialNumber
   }
  });
  setStatus(prev=>({...prev,available:true}));
 };

 // GeM packet (#204/#205): generate the manual-upload packet (XML + CSV +
 // 5-stage manifest) for the ALREADY registered product. A failure parks the
 // checklist on the GeM Try Again panel — it never re-registers the product
 // and never claims a GeM listing (grill G5).
 const requestPacket=async(productId:string):Promise<boolean>=>{
  if(packetting.current)return false;
  packetting.current=true;
  // NOTE: no retryingPacket here — that flag means "GeM Try Again in flight"
  // and is set only by retryPacket; the first request is the normal flow.
  try{
   const res=await fetch('/api/gem/packet',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({productId})
   });
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(typeof data.error==='string'?data.error:'Unable to generate the GeM packet');
   const gem=data.gem as {xml?:string;csv?:string;manifest?:unknown}|undefined;
   if(!gem?.xml||!gem?.csv||!gem.manifest)throw new Error('The GeM packet response was incomplete. Try again.');
   setStatus(prev=>({...prev,packet:{status:'ready'},retryingPacket:false}));
   return true;
  }catch(e){
   const reason=e instanceof Error?e.message:'Unable to generate the GeM packet';
   setStatus(prev=>({...prev,packet:{status:'failed',reason},retryingPacket:false}));
   return false;
  }finally{
   packetting.current=false;
  }
 };

 // Try Again on a failed packet: re-run POST /api/gem/packet only (#205).
 const retryPacket=async()=>{
  const productId=serverProductId.current;
  if(!productId||packetting.current)return;
  setStatus(prev=>({...prev,retryingPacket:true,error:null}));
  const ready=await requestPacket(productId);
  if(ready)finishPublish();
 };

 // Download the packet files for manual upload to the gem.gov.in dashboard.
 const downloadGemPacket=async()=>{
  // One packet request at a time: the route allows 10/hour per user.
  if(packetting.current)throw new Error('A GeM packet request is already running. Try again in a moment.');
  const productId=serverProductId.current;
  if(!productId)throw new Error('No server product id for this craft yet.');
  const res=await fetch('/api/gem/packet',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({productId})
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(typeof data.error==='string'?data.error:'Unable to build the GeM packet');
  const gem=data.gem as {xml?:string;csv?:string;manifest?:unknown}|undefined;
  if(!gem?.xml||!gem?.csv||!gem.manifest)throw new Error('The GeM packet response was incomplete. Try again.');
  // Local copies: TS property narrowing does not survive the setTimeout closure below.
  const {xml,csv,manifest}=gem;
  const save=(name:string,text:string,type:string)=>{
   const url=URL.createObjectURL(new Blob([text],{type}));
   const a=document.createElement('a');
   a.href=url;a.download=name;
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  save(`gem-catalog-${productId}.xml`,xml,'application/xml');
  // Stagger (#205 + OCR medium): never two saves in the same tick — mobile
  // browsers drop the later file. XML at 0ms, CSV at 350ms, manifest at 700ms.
  setTimeout(()=>{
   save(`gem-catalog-${productId}.csv`,csv,'text/csv');
  },350);
  setTimeout(()=>{
   save(`gem-manifest-${productId}.json`,JSON.stringify(manifest,null,2),'application/json');
  },700);
 };

 // Try Again on a rejected listing (#195): re-run the seller publish for the
 // product that already exists server-side.
 const retryListing=async()=>{
  const productId=serverProductId.current;
  if(!productId||relisting.current)return;
  relisting.current=true;
  setStatus(prev=>({...prev,retrying:true,error:null}));
  try{
   const res=await fetch('/api/ondc/listing',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({productId})
   });
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(typeof data.error==='string'?data.error:'Unable to retry the ONDC listing');
   const listing=(data.ondc??{listed:false,attempts:0,reason:'Listing retry returned no result'}) as OndcListingStatus;
   setStatus(prev=>({...prev,listing,retrying:false}));
   if(listing.listed&&await requestPacket(productId))finishPublish();
   }catch(e){
    // A failed Try Again stays INSIDE the checklist (#195: failure state with
    // Try Again). status.error owns the full-screen registration failure and
    // must not unmount the flow the user is retrying from.
    const reason=e instanceof Error?e.message:'Unable to retry the ONDC listing';
    setStatus(prev=>({...prev,retrying:false,listing:{listed:false,attempts:prev.listing?.attempts??0,reason}}));
   }finally{
   relisting.current=false;
  }
 };

  useEffect(()=>{
   const rec=s.record,p=s.product;
   if(!rec||!p)return;
   if(s.productId==='u-'+rec.id){
     // Published in an EARLIER session (store rehydrated from localStorage) —
     // this session has no live listing status, so nothing would ever complete
     // the checklist. Land on the success card instead of spinning forever.
     // A publish that just finished in this session DOES have `status.listing`,
     // so it keeps playing the checklist and its completion confirmation.
     if(!status.listing){
       setProductHash(prev=>prev||rec.childHash||rec.hash||'');
       setPublishingComplete(true);
     }
     return;
   }
   // A publish attempt is already running (also absorbs React StrictMode's
   // double effect, which previously double-registered the product).
   if(running.current)return;
   // The product exists server-side: resume at the listing, never re-register.
   if(serverProductId.current){void retryListing();return;}
   running.current=true;
   (async()=>{
     try{
       setStatus(prev=>({...prev,error:null}));
       const imgs=await Promise.all(s.photos.map(x=>shrink(x.src)));
       const hash=await generateProductHash({
         productId:'u-'+rec.id,
         artisanId:s.profile.artisanId||'UNKNOWN',
         productName:p.localName,
         timestamp:Date.now()
       });
       setProductHash(prev=>prev||hash);
       setStatus(prev=>({...prev,photos:true}));
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
       // This manual publish supersedes the offline queue entry for the record,
       // so the connectivity-replay cannot register a second copy (#195).
       takeQueuedProduct(rec.id);
       const listing=(data.ondc??{listed:true,attempts:0}) as OndcListingStatus;
       serverProductId.current=data.product.id;
       pending.current={remote:data.product,imgs,id:'u-'+rec.id};
       setStatus(prev=>({...prev,listing}));
       if(!listing.listed)return; // failure panel + Try Again takes over
       // GeM packet is a REAL step (#205): the packet must exist before the
       // checklist may complete; a failure lands on the packet Try Again panel.
       if(await requestPacket(data.product.id))finishPublish();
     }catch(e){
       // Offline handling: queue for retry when the connection returns (kept).
       // Only while the server has NOT taken the product — once it has, a
       // Try Again resumes the listing instead (#195), and a queued copy would
       // register the craft twice on the connectivity replay.
       if(p&&rec&&!serverProductId.current){
         enqueueProduct({
           name:p.localName,
           craft:p.craft,
           description:p.description,
           price:p.price,
           materials:p.materials,
           queuedAtSeed:rec.id
         });
       }
       setStatus(prev=>({...prev,error:e instanceof Error?e.message:'Unable to register product'}));
     }finally{
       running.current=false;
     }
   })();
 },[s.record,attempt]); // eslint-disable-line

 // Hard failure (network / rejected POST) — the offline queue entry above is
 // already written; Try Again re-runs the pipeline.
 if(status.error){
   return (
     <Screen step={6}>
       <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
         <div className="w-full space-y-4">
           <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-red-100 text-red-600">
             <span className="text-4xl">⚠️</span>
           </div>
           <h2 className="text-2xl font-bold text-[#3B2418]">Could not publish product</h2>
           <p className="text-stone-600">{status.error}</p>
           <button
             onClick={()=>{setStatus(prev=>({...prev,error:null}));setAttempt(n=>n+1)}}
             className="rounded-full bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-700 active:scale-95 transition-transform"
           >
             Try again
           </button>
         </div>
       </div>
     </Screen>
   );
 }

 // Live publishing checklist (real status, source badge, listing Try Again)
 if(!publishingComplete || !s.record || !s.productId || !productHash){
   return (
     <Screen step={6}>
       <PublishingFlow
         status={status}
         onComplete={() => setPublishingComplete(true)}
         onRetryListing={retryListing}
         onRetryPacket={retryPacket}
       />
     </Screen>
   );
 }

 // Show success with marketplace cards and QR
 const productId = s.productId || `ART-P-${s.record.serialNumber}`;
 const ondcProof=status.listing?.listed
   ?{source:listingSource(status.listing)??'live-sandbox',catalogId:status.listing.catalogId}
   :null;

 return (
   <Screen step={6}>
     <MarketplaceSuccess
       productId={productId}
       productName={s.product?.localName || 'Your Product'}
       productHash={productHash}
       onViewProducts={() => {set({photos:[],product:null,record:null,productId:null,catalogProductId:null});r.push('/home')}}
       onViewMarketplace={() => r.push('/buyer/product/'+s.productId)}
       ondcUrl="https://ondc.org/"
       gemReady={status.packet?.status==='ready'}
       onDownloadGemPacket={downloadGemPacket}
       ondc={ondcProof}
     />
   </Screen>
 );
}
