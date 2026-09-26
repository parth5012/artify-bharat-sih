import {NextResponse} from 'next/server';
import {updateOndcIntent,ONDC_CALLBACKS} from '@/backend/ondc';
import type {OndcCallbackStatus} from '@/backend/ondc';
import {sendPaymentConfirmation} from '@/backend/notifications';
import {asObject,jsonError} from '@/backend/http';
import {verifyWebhookSignature,audit} from '@/backend/security';
import {readDb,writeDb} from '@/backend/db';
import {lock_inventory_on_sale} from '@/backend/inventory';
import {timingSafeEqual} from 'node:crypto';

export const runtime='nodejs';

// Settlement stays ONDC-owned end to end (TEAM_TASKS Yash): the artisan payout
// rides the ONDC-linked account, ArtifyBharat never touches the money. The note
// is a fixed, non-sensitive string — payment credentials are never accepted,
// processed, or logged here.
const SETTLEMENT_NOTE='ONDC-linked artisan account';

function legacySecretValid(header:string|null){
 const secret=process.env.ONDC_WEBHOOK_SECRET;if(!secret||!header)return false;
 const a=Buffer.from(secret),b=Buffer.from(header.trim());return a.length===b.length&&timingSafeEqual(a,b);
}

export async function POST(request:Request){
 const raw=await request.text();
 // Prefer HMAC-SHA256 signature over the raw body; accept the legacy shared
 // secret header for providers that do not sign. Both run server-side only.
 const signed=verifyWebhookSignature(raw,request.headers.get('x-ondc-signature'));
 const legacy=legacySecretValid(request.headers.get('x-ondc-webhook-secret'));
 if(!signed&&!legacy)return jsonError('Invalid webhook credentials.',401);
  let parsed:unknown;
  try{parsed=JSON.parse(raw)}catch{return jsonError('Invalid JSON body.',400)}
  const body=asObject(parsed);const id=typeof body?.orderId==='string'?body.orderId:'';
 // Beckn order callbacks (#194): select/init/confirm plus the legacy
 // paid/failed payment statuses — anything else is rejected before it can
 // touch the intent.
 const rawStatus=body?.status;
 const callback=(typeof rawStatus==='string'&&(ONDC_CALLBACKS as readonly string[]).includes(rawStatus))?rawStatus as OndcCallbackStatus:null;
 if(!id||!callback)return jsonError('orderId and status are required.');
 const result=await updateOndcIntent(id,callback);if(!result)return jsonError('ONDC order not found.',404);
 const {order,previousStatus,target,duplicate}=result;
 // Idempotency: a replayed webhook — same callback as the last one applied, or
 // a payment status the order already reached (previousStatus check) — must not
 // duplicate confirmation calls, the inventory lock, or audit entries.
 if(duplicate||previousStatus===callback){
  return NextResponse.json({ok:true,orderId:order.id,status:order.status,callback,duplicate:true,settlement:SETTLEMENT_NOTE});
 }
 const paid=target==='paid';const failed=target==='failed';
 // Atomic Inventory Lock (#194): claim the 1-of-1 unit and emit the GeM/
 // WhatsApp delist intents BEFORE the child-unit marking below, so the sale is
 // recorded exactly once even when two paid callbacks race.
 if(paid){
  const snapshot=await readDb();
  for(const item of order.items){
   const product=snapshot.products.find(p=>p.id===item.id||p.childHash===item.id);
   if(product)await lock_inventory_on_sale(product.id,{orderId:order.id,origin:'ONDC'});
  }
 }
  // Order lifecycle: on the first 'paid' webhook, record the child-unit handoff
  // on the intent itself. The Atomic Inventory Lock above already marked the
  // ordered products sold (same id/childHash lookup), so there is nothing left
  // to mutate on the products here. The flag MUST be written on the order inside
  // this snapshot: the `order` reference above came from an earlier readDb() and
  // is detached from storage — mutating it alone would silently lose the write.
  if(paid&&!order.childUnitsSold){
   const db=await readDb();
   const dbOrder=db.ondcOrders.find(o=>o.id===order.id);
   if(dbOrder){
    dbOrder.childUnitsSold=true;
    order.childUnitsSold=true;
    await writeDb(db);
   }
  }
 // Regional confirmation call fires only for payment outcomes — staged
 // select/init callbacks do not confirm a payment that has not happened.
 let confirmation:Awaited<ReturnType<typeof sendPaymentConfirmation>>|undefined;
 if(paid||failed){
  confirmation=await sendPaymentConfirmation({phone:order.buyer.phone,language:order.buyer.language,orderId:order.id,status:target});
 }
 // Audit every non-duplicate callback: which stage arrived, where the intent
 // was, the buyer confirmation language, and the ONDC-owned settlement note.
 // Detail carries ids/languages only — never address, phone, or credentials.
 await audit({action:'ondc.payment_webhook',target:order.id,detail:{callback,status:target,previousStatus,confirmationLanguage:order.buyer.language,settlement:SETTLEMENT_NOTE}});
 return NextResponse.json({ok:true,orderId:order.id,status:order.status,callback,confirmationLanguage:order.buyer.language,...(confirmation!==undefined?{confirmation}:{}),settlement:SETTLEMENT_NOTE});
}
