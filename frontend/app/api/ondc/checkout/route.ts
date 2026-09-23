import {NextResponse} from 'next/server';
import {createOndcIntent} from '@/backend/ondc';
import {asObject,jsonError} from '@/backend/http';
import {rateLimit,clientIp,audit} from '@/backend/security';
import {readDb} from '@/backend/db';

export const runtime='nodejs';

export async function POST(request:Request){
 const ip=clientIp(request);
 if(!rateLimit(`checkout:${ip}`,10,15*60*1000).ok)return jsonError('Too many checkout attempts. Try again soon.',429);
 const body=asObject(await request.json().catch(()=>null));const buyer=asObject(body?.buyer);const rawItems=Array.isArray(body?.items)?body.items:[];
 if(!buyer||!rawItems.length)return jsonError('Buyer and cart details are required.');
 const required=['name','phone','line','city','state','pin'];if(required.some(k=>typeof buyer[k]!=='string'||!(buyer[k] as string).trim()))return jsonError('Complete delivery details are required.');
 const rawPhone=typeof buyer.phone==='string'?buyer.phone.replace(/\D/g,''):'';
 if(rawPhone.length<10||rawPhone.length>15)return jsonError('Enter a valid mobile number.');
 const items=rawItems.filter((item):item is Record<string,unknown>=>!!item&&typeof item==='object').map(item=>({id:typeof item.id==='string'?item.id:'',qty:typeof item.qty==='number'?item.qty:0,price:typeof item.price==='number'?item.price:0}));
 if(items.some(x=>!x.id||x.qty<1||x.qty>9||x.price<0))return jsonError('Cart contains an invalid item.');
 // Server-side price verification: the client price is never trusted. Every
 // line is resolved against the registered product database before the ONDC
 // intent is created, so tampered carts cannot change what ONDC settles.
 const db=await readDb();
 const verified:{id:string;qty:number;price:number}[]=[];
 for(const item of items){const product=db.products.find(p=>p.id===item.id||p.childHash===item.id);if(!product)return jsonError('Cart contains an unknown product.');verified.push({id:product.id,qty:item.qty,price:product.price})}
 const order=await createOndcIntent({items:verified,buyer:{name:buyer.name as string,phone:rawPhone,line:buyer.line as string,city:buyer.city as string,state:buyer.state as string,pin:buyer.pin as string,language:typeof buyer.language==='string'?buyer.language:'hi-IN'}});
 // Privacy: audit records the order and buyer language, never the address or phone.
 await audit({action:'ondc.checkout_intent',target:order.id,ip,detail:{items:order.items.length,language:order.buyer.language}});
 const base=process.env.ONDC_CHECKOUT_URL;if(!base)return jsonError('ONDC checkout is not configured.',503);
 const redirect=new URL(base);redirect.searchParams.set('order_id',order.id);return NextResponse.json({orderId:order.id,redirectUrl:redirect.toString()});
}