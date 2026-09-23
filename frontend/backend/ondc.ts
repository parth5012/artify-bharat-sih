import {randomBytes} from 'node:crypto';
import {OndcOrderIntent,readDb,writeDb} from './db';
import {audit} from './security';

export async function createOndcIntent(input:Omit<OndcOrderIntent,'id'|'status'|'createdAt'|'updatedAt'>){
 const now=Date.now();const order:OndcOrderIntent={...input,id:'ondc_'+randomBytes(10).toString('hex'),status:'created',createdAt:now,updatedAt:now};const db=await readDb();db.ondcOrders.push(order);await writeDb(db);return order;
}
export async function getOndcIntent(id:string){const db=await readDb();return db.ondcOrders.find(x=>x.id===id)??null}

// Returns the order and its previous status so callers can implement
// idempotency (a webhook replaying the same status is a no-op).
export async function updateOndcIntent(id:string,status:'paid'|'failed'){
 const db=await readDb();const order=db.ondcOrders.find(x=>x.id===id);if(!order)return null;
 const previousStatus=order.status;
 order.status=status;order.updatedAt=Date.now();
 await writeDb(db);
 return{order,previousStatus};
}
export async function listProductOnOndc(product:{id:string;name:string;craft:string;price:number;description:string;materials:string[];parentHash:string;childHash:string}){
 const endpoint=process.env.ONDC_SELLER_LISTING_URL;if(!endpoint)return{listed:false,reason:'ONDC_SELLER_LISTING_URL is not configured'};
 const headers={'Content-Type':'application/json','Authorization':`Bearer ${process.env.ONDC_SELLER_TOKEN??''}`};
 // Retry with exponential backoff: listing must survive transient provider
 // failures; each retry is audited so operators can trace listing history.
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(product)});
   if(response.ok)return{listed:true,attempts:attempt};
   if(response.status<500&&response.status!==429)return{listed:false,attempts:attempt,reason:`ONDC listing rejected with ${response.status}`};
  }catch(error){
   if(attempt===3)return{listed:false,attempts:attempt,reason:error instanceof Error?error.message:'network error'};
  }
  await new Promise(r=>setTimeout(r,2**attempt*250));
  await audit({action:'ondc.listing_retry',target:product.id,detail:{attempt}});
 }
 return{listed:false,attempts:3,reason:'ONDC listing failed after retries'};
}