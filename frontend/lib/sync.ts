'use client';
// Offline sync + retry: queued product registrations and media (photos/voice)
// survive refreshes and replay automatically when connectivity returns. Each
// queued item carries a stable idempotency key so server replays never create
// duplicates. Items expose a status so UI can show pending/synced/failed.

const QUEUE_KEY='artifact-sync-queue-v2';

export type SyncStatus='pending'|'syncing'|'synced'|'failed';
export type QueuedItem={
 idempotencyKey:string;
 kind:'product'|'photo'|'voice';
 payload:Record<string,unknown>; // product fields, or {productId, dataUrl, kind, lat, lng, ts}
 status:SyncStatus;
 queuedAt:number;
 attempts:number;
 lastError?:string;
 syncedAt?:number;
};
export type QueuedProduct=QueuedItem; // back-compat alias

export function readQueue():QueuedItem[]{
 try{const raw=localStorage.getItem(QUEUE_KEY);return raw?JSON.parse(raw) as QueuedItem[]:[]}
 catch{return[]}
}
function writeQueue(queue:QueuedItem[]){try{localStorage.setItem(QUEUE_KEY,JSON.stringify(queue))}catch{}}

function upsert(item:QueuedItem){
 const queue=readQueue();
 if(!queue.some(x=>x.idempotencyKey===item.idempotencyKey))queue.push(item);
 writeQueue(queue);
}
export function removeFromQueue(idempotencyKey:string){writeQueue(readQueue().filter(x=>x.idempotencyKey!==idempotencyKey))}

export function enqueueProduct(item:{name:string;craft:string;description:string;price:number;materials:string[];queuedAtSeed:string}){
 // Key derives from content so the same product replay is always idempotent.
 const idempotencyKey='q_product_'+item.name.toLowerCase().replace(/\s+/g,'-')+'_'+item.queuedAtSeed;
 upsert({...item,kind:'product',payload:{...item},idempotencyKey,status:'pending',queuedAt:Date.now(),attempts:0});
}

// Media queue: photos and voice recordings are stored as compressed data URLs
// in localStorage. Large blobs may hit quota — enqueue() failures are surfaced.
export function enqueueMedia(item:{kind:'photo'|'voice';productId:string;dataUrl:string;lat?:number|null;lng?:number|null;ts?:number}){
 const idempotencyKey=`q_${item.kind}_${item.productId}_${item.ts??Date.now()}_${item.dataUrl.length}`;
 upsert({idempotencyKey,kind:item.kind,payload:{productId:item.productId,dataUrl:item.dataUrl,lat:item.lat??null,lng:item.lng??null,ts:item.ts??Date.now()},status:'pending',queuedAt:Date.now(),attempts:0});
}

async function syncOne(item:QueuedItem):Promise<{ok:boolean;replayed?:boolean;error?:string}>{
 const endpoint=item.kind==='product'?'/api/sync':'/api/media';
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item.kind==='product'?{...item.payload,idempotencyKey:item.idempotencyKey}:{...item.payload,idempotencyKey:item.idempotencyKey,kind:item.kind})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)return{ok:false,error:typeof data.error==='string'?data.error:`Sync failed with ${response.status}`};
  return{ok:true,replayed:!!data.replayed};
 }catch{return{ok:false,error:'offline'}}
}

export async function syncQueue():Promise<{synced:number;failed:number}>{
 let synced=0,failed=0;
 for(const item of readQueue()){
  // Mark in-flight so a UI can distinguish pending from syncing.
  const queue=readQueue();const live=queue.find(x=>x.idempotencyKey===item.idempotencyKey);
  if(live){live.status='syncing';writeQueue(queue)}
  const result=await syncOne(item);
  if(result.ok){removeFromQueue(item.idempotencyKey);synced+=1}
  else{
   failed+=1;
   const q=readQueue();const entry=q.find(x=>x.idempotencyKey===item.idempotencyKey);
   if(entry){entry.attempts+=1;entry.lastError=result.error;entry.status='failed';writeQueue(q)}
  }
 }
 return{synced,failed};
}

// Status snapshot for UI badges: pending + failed counts and the failed items.
export function syncStatus(){const q=readQueue();return{pending:q.filter(x=>x.status==='pending'||x.status==='syncing').length,failed:q.filter(x=>x.status==='failed').length,failedItems:q.filter(x=>x.status==='failed')}}

// Wire auto-sync: replays the queue when the browser regains connectivity.
export function initOfflineSync(){
 if(typeof window==='undefined')return()=>{};
 const handler=()=>{void syncQueue()};
 window.addEventListener('online',handler);
 return()=>window.removeEventListener('online',handler);
}
