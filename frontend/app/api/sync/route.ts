import {NextResponse} from 'next/server';
import {currentUser} from '@/backend/auth';
import {readDb,writeDb,ProductRecord} from '@/backend/db';
import {digest} from '@/backend/auth';
import {asObject,jsonError} from '@/backend/http';
import {rateLimit,clientIp,audit} from '@/backend/security';

export const runtime='nodejs';

// Offline sync: the artisan client queues product registrations while offline
// and replays them here when connectivity returns. A client-generated
// idempotencyKey makes replays safe: the same key returns the original result
// instead of creating a duplicate product.

export async function POST(request:Request){
 const user=await currentUser();if(!user)return jsonError('Authentication required.',401);
 if(!rateLimit(`sync:${user.id}`,60,60*60*1000).ok)return jsonError('Too many sync requests. Try again later.',429);
 const body=asObject(await request.json().catch(()=>null));
 const idempotencyKey=typeof body?.idempotencyKey==='string'?body.idempotencyKey.trim():'';
 const name=typeof body?.name==='string'?body.name.trim():'';const craft=typeof body?.craft==='string'?body.craft.trim():'';const description=typeof body?.description==='string'?body.description.trim():'';
 if(!idempotencyKey)return jsonError('idempotencyKey is required.');
 if(!name||!craft||!description)return jsonError('Name, craft, and description are required.');
 const price=typeof body?.price==='number'&&Number.isFinite(body.price)&&body.price>=0?body.price:0;
 const materials=Array.isArray(body?.materials)?body.materials.filter((x):x is string=>typeof x==='string'):[];
 const db=await readDb();
 // Replay detection: idempotency keys are stored as hashed product ids.
 const replaySeed=`sync:${user.id}:${idempotencyKey}`;
 const existing=db.products.find(x=>x.id===digest(replaySeed));
 if(existing)return NextResponse.json({product:existing,replayed:true});
 const now=Date.now();
 // Serial numbers are unique per artisan: highest existing numeric serial + 1.
 const mine=db.products.filter(x=>x.artisanId===(user.artisanId??user.id));
 const serialNumber=String(mine.reduce((max,x)=>{const n=parseInt(x.serialNumber,10);return Number.isFinite(n)&&n>max?n:max},0)+1);
 const seed=JSON.stringify({artisan:user.id,name,craft,description,price,materials,now,nonce:idempotencyKey});
 const parentHash=digest(seed);const childHash=digest(`${parentHash}:${serialNumber}`);
 const product:ProductRecord={id:digest(replaySeed),parentHash,childHash,serialNumber,artisanId:user.artisanId??user.id,name,craft,price,description,materials,status:'published',ownership:'artisan',createdAt:now};
 if(db.products.some(x=>x.parentHash===parentHash||x.childHash===childHash||(x.artisanId===product.artisanId&&x.serialNumber===serialNumber)))return NextResponse.json({error:'Product hash or serial number already exists.',conflict:true},{status:409});
 db.products.push(product);await writeDb(db);
 await audit({action:'product.synced',actor:user.id,target:product.id,ip:clientIp(request),detail:{idempotency:true}});
 return NextResponse.json({product,replayed:false},{status:201});
}
