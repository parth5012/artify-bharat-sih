import {NextResponse} from 'next/server';
import {currentUser} from '@/backend/auth';
import {readDb,writeDb} from '@/backend/db';
import {digest} from '@/backend/auth';
import {asObject,jsonError} from '@/backend/http';
import {rateLimit,clientIp,audit} from '@/backend/security';

export const runtime='nodejs';

export async function POST(request:Request){
 const user=await currentUser();if(!user)return jsonError('Authentication required.',401);
 if(!rateLimit(`set-pin:${user.id}`,5,60*60*1000).ok)return jsonError('Too many PIN setup attempts. Try again later.',429);
 
 const body=asObject(await request.json().catch(()=>null));
 const pin=typeof body?.pin==='string'?body.pin.trim():'';
 
 // Validate 4-digit PIN
 if(!/^\d{4}$/.test(pin))return jsonError('PIN must be exactly 4 digits.',400);
 
 const db=await readDb();
 const saved=db.users.find(x=>x.id===user.id);
 if(!saved)return jsonError('Account not found.',404);
 
 // Hash and store the PIN
 saved.pinHash=digest(pin);
 saved.updatedAt=Date.now();
 await writeDb(db);
 
 await audit({action:'pin.set',actor:user.id,ip:clientIp(request)});
 return NextResponse.json({ok:true,message:'PIN set successfully.'});
}
