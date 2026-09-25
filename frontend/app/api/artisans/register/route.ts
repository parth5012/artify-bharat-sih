import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {createSession,SESSION_COOKIE} from '@/backend/auth';
import {readDb,writeDb} from '@/backend/db';
import {asObject,jsonError} from '@/backend/http';
import {rateLimit,clientIp,audit} from '@/backend/security';

export const runtime='nodejs';

export async function POST(request:Request){
 if(!rateLimit(`register:${clientIp(request)}`,10,60*60*1000).ok)return jsonError('Too many registration attempts. Try again later.',429);
 const body=asObject(await request.json().catch(()=>null));const phone=typeof body?.phone==='string'?body.phone.replace(/\D/g,''):'';const name=typeof body?.name==='string'?body.name.trim():'';const artisanId=typeof body?.artisanId==='string'?body.artisanId.trim():'';
 if(phone.length<10||!name||!artisanId)return jsonError('Name, phone number, and Artisan ID are required.');
 
 const db=await readDb();const now=Date.now();let user=db.users.find(x=>x.phone===phone);
 
 // Check if phone number already exists with a PIN (registered user)
 if(user&&user.pinHash){
  await audit({action:'artisan.registration_blocked',target:phone,ip:clientIp(request),detail:{reason:'phone_already_registered'}});
  return NextResponse.json({
   error:'phone_exists',
   message:'This phone number is already registered.',
   action:'login'
  },{status:409});
 }
 
 if(user){user.name=name;user.artisanId=artisanId;user.place=typeof body?.place==='string'?body.place.trim():user.place;user.craft=typeof body?.craft==='string'?body.craft.trim():user.craft;user.updatedAt=now}else{user={id:'usr_'+randomBytes(8).toString('hex'),phone,name,artisanId,place:typeof body?.place==='string'?body.place.trim():undefined,craft:typeof body?.craft==='string'?body.craft.trim():undefined,createdAt:now,updatedAt:now};db.users.push(user)}
 await writeDb(db);const token=await createSession(user.id);await audit({action:'artisan.registered',actor:user.id,ip:clientIp(request)});const response=NextResponse.json({user});response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*24*60*60});return response;
}