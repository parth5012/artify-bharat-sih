import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {currentUser,digest} from '@/backend/auth';
import {readDb,writeDb,ProductRecord} from '@/backend/db';
import {listProductOnOndc} from '@/backend/ondc';
import {asObject,jsonError} from '@/backend/http';

export const runtime='nodejs';

export async function GET(){const user=await currentUser();if(!user)return jsonError('Authentication required.',401);const db=await readDb();return NextResponse.json({products:db.products.filter(x=>x.artisanId===user.artisanId||x.artisanId===user.id)})}
export async function POST(request:Request){
 const user=await currentUser();if(!user)return jsonError('Authentication required.',401);
 const body=asObject(await request.json().catch(()=>null));const name=typeof body?.name==='string'?body.name.trim():'';const craft=typeof body?.craft==='string'?body.craft.trim():'';const description=typeof body?.description==='string'?body.description.trim():'';
 if(!name||!craft||!description)return jsonError('Name, craft, and description are required.');
 const price=typeof body?.price==='number'&&Number.isFinite(body.price)&&body.price>=0?body.price:0;const materials=Array.isArray(body?.materials)?body.materials.filter((x):x is string=>typeof x==='string'):[];const now=Date.now();
 const db=await readDb();const seed=JSON.stringify({artisan:user.id,name,craft,description,price,materials,now,nonce:randomBytes(8).toString('hex')});const parentHash=digest(seed);const serialNumber='1';const childHash=digest(`${parentHash}:${serialNumber}`);
 const product:ProductRecord={id:'prd_'+randomBytes(8).toString('hex'),parentHash,childHash,serialNumber,artisanId:user.artisanId??user.id,name,craft,price,description,materials,status:'published',createdAt:now};db.products.push(product);await writeDb(db);
 const ondc=await listProductOnOndc(product);return NextResponse.json({product,ondc},{status:201});
}