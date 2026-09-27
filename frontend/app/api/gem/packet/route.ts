import {NextResponse} from 'next/server';
import {currentUser} from '@/backend/auth';
import {readDb} from '@/backend/db';
import {buildGemPacket} from '@/backend/gem';
import {asObject,jsonError} from '@/backend/http';
import {rateLimit,clientIp,audit} from '@/backend/security';

export const runtime='nodejs';

// Wayfinder #204 — GeM approval-ready packet route (grill G6 + G8). Guards
// mirror app/api/ondc/listing/route.ts line-for-line: 401 no session, rate
// limit, 400 missing productId, 404 unknown, 403 other artisan (dual
// `user.id || user.artisanId` ownership rule from #195). The response carries
// the packet {catalog, xml, csv, manifest} + the reserved-seam verdict
// (configured/unconfigured) — never GEM_SELLER_TOKEN or any raw env value.
export async function POST(request:Request){
 const user=await currentUser();if(!user)return jsonError('Authentication required.',401);
 const ip=clientIp(request);
 if(!rateLimit(`gem-packet:${user.id}`,10,60*60*1000).ok)return jsonError('Too many packet requests. Try again later.',429);
 const body=asObject(await request.json().catch(()=>null));
 const productId=typeof body?.productId==='string'?body.productId.trim():'';
 if(!productId)return jsonError('Product id is required.');
 // Optional Heritage Passport shortcode (the DB stores none); capped so a
 // caller cannot paste arbitrary payload into the packet.
 const shortcode=typeof body?.shortcode==='string'?body.shortcode.trim().slice(0,16):'';
 const db=await readDb();
 const product=db.products.find(x=>x.id===productId);
 if(!product)return jsonError('Product not found.',404);
 // Same ownership rule as GET /api/products: a row keeps whatever identifier it
 // was registered with (login id before the artisan set a shop-style artisanId),
 // so both must match or a legitimate packet request would 403.
 if(product.artisanId!==user.id&&product.artisanId!==user.artisanId)return jsonError('This product belongs to another artisan.',403);
 const artisan=db.users.find(u=>u.id===product.artisanId||u.artisanId===product.artisanId);
 const gem=buildGemPacket({product,artisan:artisan??null,...(shortcode?{shortcode}:{})});
 await audit({action:'product.gem_packet',actor:user.id,target:product.id,ip,detail:{configured:gem.env.configured,reason:gem.env.reason??null,shortcoded:Boolean(shortcode)}});
 return NextResponse.json({gem});
}
