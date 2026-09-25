import {NextResponse} from 'next/server';
import {createHash,timingSafeEqual} from 'node:crypto';
import {createSession,SESSION_COOKIE,digest} from '@/backend/auth';
import {readDb} from '@/backend/db';
import {asObject,jsonError} from '@/backend/http';
import {rateLimit,clientIp,audit} from '@/backend/security';

export const runtime='nodejs';

const equal=(left:string,right:string)=>{const a=Buffer.from(left);const b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b)};

export async function POST(request:Request){
 const ip=clientIp(request);
 if(!rateLimit(`login:${ip}`,10,15*60*1000).ok)return jsonError('Too many login attempts. Try again later.',429);
 
 const body=asObject(await request.json().catch(()=>null));
 const phone=typeof body?.phone==='string'?body.phone.replace(/\D/g,''):'';
 const pin=typeof body?.pin==='string'?body.pin.trim():'';
 
 if(phone.length<10)return jsonError('Enter a valid phone number.',400);
 if(!/^\d{4}$/.test(pin))return jsonError('PIN must be 4 digits.',400);
 
 if(!rateLimit(`login:phone:${phone}`,5,15*60*1000).ok)return jsonError('Too many login attempts for this number. Try again later.',429);
 
 const db=await readDb();
 const user=db.users.find(x=>x.phone===phone);
 
 if(!user||!user.pinHash){
   await audit({action:'login.failed',ip,target:phone,detail:{reason:'user_not_found_or_no_pin'}});
   return jsonError('Invalid phone number or PIN.',401);
 }
 
 const pinHash=digest(pin);
 if(!equal(user.pinHash,pinHash)){
   await audit({action:'login.failed',actor:user.id,ip,detail:{reason:'invalid_pin'}});
   return jsonError('Invalid phone number or PIN.',401);
 }
 
 const token=await createSession(user.id);
 await audit({action:'login.success',actor:user.id,ip});
 
 const response=NextResponse.json({user,message:'Login successful.'});
 response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*24*60*60});
 return response;
}
