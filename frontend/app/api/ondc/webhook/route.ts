import {NextResponse} from 'next/server';
import {updateOndcIntent} from '@/backend/ondc';
import {sendPaymentConfirmation} from '@/backend/notifications';
import {asObject,jsonError} from '@/backend/http';
import {verifyWebhookSignature,audit} from '@/backend/security';
import {readDb,writeDb} from '@/backend/db';
import {timingSafeEqual} from 'node:crypto';

export const runtime='nodejs';

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
 const body=asObject(JSON.parse(raw) as unknown);const id=typeof body?.orderId==='string'?body.orderId:'';const status=body?.status==='paid'||body?.status==='failed'?body.status:null;if(!id||!status)return jsonError('orderId and status are required.');
 // Idempotency: a replayed webhook for an order already in this state must
 // not duplicate confirmation calls or audit entries.
 const result=await updateOndcIntent(id,status);if(!result)return jsonError('ONDC order not found.',404);
 const {order,previousStatus}=result;
 if(previousStatus===status){
  return NextResponse.json({ok:true,orderId:order.id,status:order.status,duplicate:true,settlement:'ONDC-linked artisan account'});
 }
 // Order lifecycle: on the first 'paid' webhook, mark the ordered child units
 // sold (ownership + soldAt + orderId) so inventory and buyer verification
 // reflect the sale. Idempotent via order.childUnitsSold.
 if(status==='paid'&&!order.childUnitsSold){
  const db=await readDb();
  for(const item of order.items){
   const product=db.products.find(p=>p.id===item.id||p.childHash===item.id);
   if(!product||product.ownership==='sold')continue;
   product.ownership='sold';product.soldAt=Date.now();product.orderId=order.id;
  }
  order.childUnitsSold=true;
  await writeDb(db);
 }
 const confirmation=await sendPaymentConfirmation({phone:order.buyer.phone,language:order.buyer.language,orderId:order.id,status});
 await audit({action:'ondc.payment_webhook',target:order.id,detail:{status,previousStatus,confirmationLanguage:order.buyer.language,settlement:'ONDC-linked artisan account'}});
 return NextResponse.json({ok:true,orderId:order.id,status:order.status,confirmationLanguage:order.buyer.language,confirmation,settlement:'ONDC-linked artisan account'});
}