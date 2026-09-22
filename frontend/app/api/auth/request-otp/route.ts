import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {readDb,writeDb} from '@/backend/db';
import {digest} from '@/backend/auth';
import {asObject,jsonError} from '@/backend/http';

export const runtime='nodejs';

export async function POST(request:Request){
 const body=asObject(await request.json().catch(()=>null));const raw=body?.phone;
 const phone=typeof raw==='string'?raw.replace(/\D/g,''):'';
 if(phone.length<10||phone.length>15)return jsonError('Enter a valid mobile number.');
 const db=await readDb();const now=Date.now();
 let user=db.users.find(x=>x.phone===phone);
 if(!user){user={id:'usr_'+randomBytes(8).toString('hex'),phone,createdAt:now,updatedAt:now};db.users.push(user)}
 const code=String(Math.floor(100000+Math.random()*900000));
 db.otpChallenges=db.otpChallenges.filter(x=>x.phone!==phone);db.otpChallenges.push({phone,codeHash:digest(code),expiresAt:now+5*60*1000,attempts:0});await writeDb(db);
 const response:{ok:true;expiresIn:number;devCode?:string}={ok:true,expiresIn:300};
 if(process.env.NODE_ENV!=='production')response.devCode=code;
 return NextResponse.json(response);
}