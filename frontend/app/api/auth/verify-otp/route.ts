import {NextResponse} from 'next/server';
import {asObject,jsonError} from '@/backend/http';
import {createSession,isValidCode,SESSION_COOKIE} from '@/backend/auth';
import {readDb,writeDb} from '@/backend/db';
import {rateLimit,clientIp,audit} from '@/backend/security';

export const runtime='nodejs';

export async function POST(request:Request){
 const ip=clientIp(request);
 if(!rateLimit(`otpv:${ip}`,10,15*60*1000).ok)return jsonError('Too many attempts. Try again later.',429);
 const body=asObject(await request.json().catch(()=>null));const phone=typeof body?.phone==='string'?body.phone.replace(/\D/g,''):'';const code=typeof body?.code==='string'?body.code.trim():'';
 const db=await readDb();const challenge=db.otpChallenges.find(x=>x.phone===phone);
 if(!challenge||!isValidCode(challenge,code)){if(challenge){challenge.attempts+=1;await writeDb(db)}await audit({action:'otp.verify_failed',ip,target:phone});return jsonError('The OTP is invalid or expired.',401)}
 const user=db.users.find(x=>x.phone===phone);if(!user)return jsonError('Account not found.',404);
 db.otpChallenges=db.otpChallenges.filter(x=>x.phone!==phone);await writeDb(db);
 const token=await createSession(user.id);await audit({action:'otp.verify_success',actor:user.id,ip});const response=NextResponse.json({user});
 response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*24*60*60});
 return response;
}