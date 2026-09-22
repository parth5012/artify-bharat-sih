import {NextResponse} from 'next/server';
import {createOndcIntent} from '@/backend/ondc';
import {asObject,jsonError} from '@/backend/http';

export const runtime='nodejs';

export async function POST(request:Request){
 const body=asObject(await request.json().catch(()=>null));const buyer=asObject(body?.buyer);const rawItems=Array.isArray(body?.items)?body.items:[];
 if(!buyer||!rawItems.length)return jsonError('Buyer and cart details are required.');
 const required=['name','phone','line','city','state','pin'];if(required.some(k=>typeof buyer[k]!=='string'||!(buyer[k] as string).trim()))return jsonError('Complete delivery details are required.');
 const items=rawItems.filter((item):item is Record<string,unknown>=>!!item&&typeof item==='object').map(item=>({id:typeof item.id==='string'?item.id:'',qty:typeof item.qty==='number'?item.qty:0,price:typeof item.price==='number'?item.price:0}));
 if(items.some(x=>!x.id||x.qty<1||x.price<0))return jsonError('Cart contains an invalid item.');
 const order=await createOndcIntent({items,buyer:{name:buyer.name as string,phone:buyer.phone as string,line:buyer.line as string,city:buyer.city as string,state:buyer.state as string,pin:buyer.pin as string,language:typeof buyer.language==='string'?buyer.language:'hi-IN'}});
 const base=process.env.ONDC_CHECKOUT_URL;if(!base)return jsonError('ONDC checkout is not configured.',503);
 const redirect=new URL(base);redirect.searchParams.set('order_id',order.id);return NextResponse.json({orderId:order.id,redirectUrl:redirect.toString()});
}