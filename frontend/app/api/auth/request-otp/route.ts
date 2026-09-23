import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {readDb,writeDb} from '@/backend/db';
import {digest} from '@/backend/auth';
import {asObject,jsonError} from '@/backend/http';
import {rateLimit,clientIp,audit} from '@/backend/security';
import {sendOtp} from '@/backend/otp';

export const runtime='nodejs';

export async function POST(request:Request){
 const ip=clientIp(request);
 if(!rateLimit(`otp:${ip}`,5,15*60*1000).ok)return jsonError('Too many OTP requests. Try again later.',429);
 const body=asObject(await request.json().catch(()=>null));const raw=body?.phone;
 const phone=typeof raw==='string'?raw.replace(/\D/g,''):'';
 if(phone.length<10||phone.length>15)return jsonError('Enter a valid mobile number.');
 if(!rateLimit(`otp:phone:${phone}`,3,15*60*1000).ok)return jsonError('Too many OTP requests for this number. Try again later.',429);
 const db=await readDb();const now=Date.now();
 let user=db.users.find(x=>x.phone===phone);
 if(!user){user={id:'usr_'+randomBytes(8).toString('hex'),phone,createdAt:now,updatedAt:now};db.users.push(user)}
 const code=String(Math.floor(100000+Math.random()*900000));
 db.otpChallenges=db.otpChallenges.filter(x=>x.phone!==phone);db.otpChallenges.push({phone,codeHash:digest(code),expiresAt:now+5*60*1000,attempts:0});await writeDb(db);
 const delivery=await sendOtp(phone,code);
 await audit({action:'otp.request',actor:user.id,ip,detail:{delivered:delivery.sent,provider:delivery.provider}});
 const response:{ok:true;expiresIn:number;devCode?:string}={ok:true,expiresIn:300};
 if(process.env.NODE_ENV!=='production'&&delivery.provider==='none')response.devCode=code;
 return NextResponse.json(response);
}