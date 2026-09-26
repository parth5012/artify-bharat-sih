import {readDb,writeDb} from './db';
import {audit} from './security';

// Atomic Inventory Lock (CONTEXT.md, #194): a unique 1-of-1 handcrafted piece
// sells on ONDC, so the piece must be marked sold_out exactly once and every
// OTHER channel must receive a delist intent — no second buyer can take it.
//
// The GeM/WhatsApp delist intents are deliberately STUB LOGS: they are audited
// (`ondc.delist_intent`) and nothing else happens — no outbound request, no
// channel credentials. That keeps the judge demo offline-capable (grill A3)
// and means a payment side effect can never open a network connection here.
const OTHER_CHANNELS=['GeM','WhatsApp'] as const;

export type InventoryLockResult={
 productId:string;
 /** True only for the call that actually performed the lock + delist. */
 locked:boolean;
 /** True when an earlier claim or the persisted marker already won. */
 alreadyLocked:boolean;
 /** `sold_out` matches the legacy backend vocabulary (export_service.py). */
 status:'sold_out'|'unknown_product';
 /** Channels this call emitted a delist intent for (empty on a no-op). */
 delistedFrom:string[];
 orderId?:string;
};

export type InventoryLockOptions={orderId?:string;origin?:string};

// Concurrency model (single Node process, whole-document JSON/JSONB store):
//
// 1. In-process claim: `claimed` is checked-and-set SYNCHRONOUSLY at function
//    entry, before any await — JS runs that section atomically, so of N
//    concurrent callers for the same product exactly one proceeds and the rest
//    return `alreadyLocked` immediately. This is the guard the concurrent
//    paid-webhook test proves.
// 2. Persisted marker: `ProductRecord.saleLockedAt` is written in the same
//    read-modify-write as the sold marking, so a process restart (empty claim
//    set) still yields exactly one delist — the restart test proves this.
// 3. A promise chain serializes store writes so two different products cannot
//    interleave whole-document read-modify-write cycles.
// A true cross-process guarantee would need a row lock inside one DB
// transaction (the legacy backend's `SELECT ... FOR UPDATE`); the frontend
// store exposes no transaction seam, so 1+2+3 cover the single-server
// deployment this app runs as.
const claimed=new Set<string>();
let chain:Promise<unknown>=Promise.resolve();

async function applyLock(productId:string,options:InventoryLockOptions,origin:string):Promise<InventoryLockResult>{
 const db=await readDb();
 const product=db.products.find(p=>p.id===productId);
 if(!product){
  // Never hold the claim on a product that does not exist — release it so a
  // later retry (e.g. an item registered concurrently) can still lock.
  claimed.delete(productId);
  return{productId,locked:false,alreadyLocked:false,status:'unknown_product',delistedFrom:[]};
 }
 if(product.saleLockedAt){
  return{productId,locked:false,alreadyLocked:true,status:'sold_out',delistedFrom:[],...(options.orderId?{orderId:options.orderId}:{})};
 }
 const now=Date.now();
 product.ownership='sold';
 product.soldAt=now;
 product.saleLockedAt=now;
 if(options.orderId)product.orderId=options.orderId;
 await writeDb(db);
 const orderId=options.orderId;
 for(const channel of OTHER_CHANNELS){
  await audit({action:'ondc.delist_intent',target:productId,detail:{channel,origin,reason:'sold_out',...(orderId?{orderId}:{})}});
 }
 await audit({action:'ondc.inventory_lock',target:productId,detail:{origin,channels:[...OTHER_CHANNELS],...(orderId?{orderId}:{})}});
 return{productId,locked:true,alreadyLocked:false,status:'sold_out',delistedFrom:[...OTHER_CHANNELS],...(orderId?{orderId}:{})};
}

/**
 * Locks a 1-of-1 product for sale (`lock_inventory_on_sale`, grill Q5 must-keep).
 *
 * Marks the product sold_out (ownership + soldAt + orderId + saleLockedAt)
 * exactly once, then emits delist intents for the other channels as audited
 * stub logs. Repeated or concurrent calls for the same product are no-ops that
 * report `alreadyLocked`.
 */
export function lock_inventory_on_sale(productId:string,options:InventoryLockOptions={}):Promise<InventoryLockResult>{
 const origin=options.origin??'ONDC';
 // Synchronous claim — no await above this line, ever: the check-and-set must
 // be atomic with respect to every other caller in this process.
 if(claimed.has(productId)){
  return Promise.resolve({productId,locked:false,alreadyLocked:true,status:'sold_out',delistedFrom:[],...(options.orderId?{orderId:options.orderId}:{})});
 }
 claimed.add(productId);
 const run=chain.then(()=>applyLock(productId,options,origin)).catch(error=>{
  // A failed store write must not strand the claim — release it so the sale
  // can be retried instead of silently skipping the delist forever.
  claimed.delete(productId);
  throw error;
 });
 chain=run.catch(()=>{});
 return run;
}
