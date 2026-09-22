import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {createSession,SESSION_COOKIE} from '@/backend/auth';
import {readDb,writeDb} from '@/backend/db';
import {asObject,jsonError} from '@/backend/http';

export const runtime='nodejs';

export async function POST(request:Request){
 const body=asObject(await request.json().catch(()=>null));const phone=typeof body?.phone==='string'?body.phone.replace(/\D/g,''):'';const name=typeof body?.name==='string'?body.name.trim():'';const artisanId=typeof body?.artisanId==='string'?body.artisanId.trim():'';
 if(phone.length<10||!name||!artisanId)return jsonError('Name, phone number, and Artisan ID are required.');
 const db=await readDb();const now=Date.now();let user=db.users.find(x=>x.phone===phone);
 if(user){user.name=name;user.artisanId=artisanId;user.place=typeof body?.place==='string'?body.place.trim():user.place;user.craft=typeof body?.craft==='string'?body.craft.trim():user.craft;user.updatedAt=now}else{user={id:'usr_'+randomBytes(8).toString('hex'),phone,name,artisanId,place:typeof body?.place==='string'?body.place.trim():undefined,craft:typeof body?.craft==='string'?body.craft.trim():undefined,createdAt:now,updatedAt:now};db.users.push(user)}
 await writeDb(db);const token=await createSession(user.id);const response=NextResponse.json({user});response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*24*60*60});return response;
}