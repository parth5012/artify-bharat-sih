import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {currentUser,digest} from '@/backend/auth';
import {readDb,writeDb,ProductRecord} from '@/backend/db';
import {listProductOnOndc} from '@/backend/ondc';
import {asObject,jsonError} from '@/backend/http';
import {rateLimit,clientIp,audit} from '@/backend/security';

export const runtime='nodejs';

export async function GET(){const user=await currentUser();if(!user)return jsonError('Authentication required.',401);const db=await readDb();return NextResponse.json({products:db.products.filter(x=>x.artisanId===user.artisanId||x.artisanId===user.id)})}
export async function POST(request:Request){
 const user=await currentUser();if(!user)return jsonError('Authentication required.',401);
 const ip=clientIp(request);
 if(!rateLimit(`products:${user.id}`,20,60*60*1000).ok)return jsonError('Too many products created. Try again later.',429);
 const body=asObject(await request.json().catch(()=>null));const name=typeof body?.name==='string'?body.name.trim():'';const craft=typeof body?.craft==='string'?body.craft.trim():'';const description=typeof body?.description==='string'?body.description.trim():'';
 if(name.length>200||description.length>5000)return jsonError('Product name or description is too long.');
 if(!name||!craft||!description)return jsonError('Name, craft, and description are required.');
 const price=typeof body?.price==='number'&&Number.isFinite(body.price)&&body.price>=0?body.price:0;const materials=Array.isArray(body?.materials)?body.materials.filter((x):x is string=>typeof x==='string'):[];const now=Date.now();
 const db=await readDb();
 // Serial numbers are unique per artisan: highest existing numeric serial + 1.
 const mine=db.products.filter(x=>x.artisanId===(user.artisanId??user.id));
 const serialNumber=String(mine.reduce((max,x)=>{const n=parseInt(x.serialNumber,10);return Number.isFinite(n)&&n>max?n:max},0)+1);
 const seed=JSON.stringify({artisan:user.id,name,craft,description,price,materials,now,nonce:randomBytes(8).toString('hex')});const parentHash=digest(seed);const childHash=digest(`${parentHash}:${serialNumber}`);
 const product:ProductRecord={id:'prd_'+randomBytes(8).toString('hex'),parentHash,childHash,serialNumber,artisanId:user.artisanId??user.id,name,craft,price,description,materials,status:'published',ownership:'artisan',createdAt:now};
 // Immutable identity rule: reject duplicate hashes and reused serial numbers.
 if(db.products.some(x=>x.parentHash===parentHash||x.childHash===childHash||(x.artisanId===product.artisanId&&x.serialNumber===serialNumber)))return jsonError('Product hash or serial number already exists.',409);
 db.products.push(product);await writeDb(db);
 await audit({action:'product.registered',actor:user.id,target:product.id,ip,detail:{parentHash:product.parentHash,childHash:product.childHash}});
 // Artisan view for the Beckn catalog (#193): ProductRecord has no display
 // name / district, but the owning user row (register route) carries both.
 const artisan=db.users.find(u=>u.id===product.artisanId||u.artisanId===product.artisanId);
 const ondc=await listProductOnOndc({...product,artisanDisplayName:artisan?.name??'',artisanDistrict:artisan?.place??''});
 await audit({action:'product.ondc_listing',actor:user.id,target:product.id,ip,detail:{...ondc}});
 return NextResponse.json({product,ondc},{status:201});
}