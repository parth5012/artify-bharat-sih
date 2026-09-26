import {NextResponse} from 'next/server';
import {currentUser} from '@/backend/auth';
import {readDb} from '@/backend/db';
import {listProductOnOndc} from '@/backend/ondc';
import {asObject,jsonError} from '@/backend/http';
import {rateLimit,clientIp,audit} from '@/backend/security';

export const runtime='nodejs';

// Wayfinder #195 — Try Again for a rejected ONDC listing. Re-runs the seller
// publish (#193 on_search push) for an ALREADY registered product instead of
// re-POSTing /api/products, which would register a second copy of the craft.
// All ONDC_* env reads stay server-side; the response only carries the
// auditable listing verdict ({listed, attempts, catalogId, fallback, reason}).
export async function POST(request:Request){
 const user=await currentUser();if(!user)return jsonError('Authentication required.',401);
 const ip=clientIp(request);
 if(!rateLimit(`ondc-listing:${user.id}`,10,60*60*1000).ok)return jsonError('Too many listing attempts. Try again later.',429);
 const body=asObject(await request.json().catch(()=>null));
 const productId=typeof body?.productId==='string'?body.productId.trim():'';
 if(!productId)return jsonError('Product id is required.');
 const db=await readDb();
 const product=db.products.find(x=>x.id===productId);
 if(!product)return jsonError('Product not found.',404);
 // Same ownership rule as GET /api/products: a row keeps whatever identifier it
 // was registered with (login id before the artisan set a shop-style artisanId),
 // so both must match or a legitimate Try Again would 403.
 if(product.artisanId!==user.id&&product.artisanId!==user.artisanId)return jsonError('This product belongs to another artisan.',403);
 const artisan=db.users.find(u=>u.id===product.artisanId||u.artisanId===product.artisanId);
 const ondc=await listProductOnOndc({...product,artisanDisplayName:artisan?.name??'',artisanDistrict:artisan?.place??''});
 await audit({action:'product.ondc_listing',actor:user.id,target:product.id,ip,detail:{...ondc,source:'relist'}});
 return NextResponse.json({ondc});
}
