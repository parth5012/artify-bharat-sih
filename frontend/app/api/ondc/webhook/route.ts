import {NextResponse} from 'next/server';
import {updateOndcIntent} from '@/backend/ondc';
import {sendPaymentConfirmation} from '@/backend/notifications';
import {asObject,jsonError} from '@/backend/http';

export const runtime='nodejs';

export async function POST(request:Request){
 const secret=request.headers.get('x-ondc-webhook-secret');if(!process.env.ONDC_WEBHOOK_SECRET||secret!==process.env.ONDC_WEBHOOK_SECRET)return jsonError('Invalid webhook credentials.',401);
 const body=asObject(await request.json().catch(()=>null));const id=typeof body?.orderId==='string'?body.orderId:'';const status=body?.status==='paid'||body?.status==='failed'?body.status:null;if(!id||!status)return jsonError('orderId and status are required.');
 const order=await updateOndcIntent(id,status);if(!order)return jsonError('ONDC order not found.',404);
 const confirmation=await sendPaymentConfirmation({phone:order.buyer.phone,language:order.buyer.language,orderId:order.id,status});
 return NextResponse.json({ok:true,orderId:order.id,status:order.status,confirmationLanguage:order.buyer.language,confirmation,settlement:'ONDC-linked artisan account'});
}