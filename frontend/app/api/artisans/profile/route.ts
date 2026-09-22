import {NextResponse} from 'next/server';
import {currentUser} from '@/backend/auth';
import {readDb,writeDb} from '@/backend/db';
import {asObject,jsonError} from '@/backend/http';

export const runtime='nodejs';

export async function GET(){const user=await currentUser();return user?NextResponse.json({user}):jsonError('Authentication required.',401)}
export async function PATCH(request:Request){
 const user=await currentUser();if(!user)return jsonError('Authentication required.',401);
 const body=asObject(await request.json().catch(()=>null));const db=await readDb();const saved=db.users.find(x=>x.id===user.id);if(!saved)return jsonError('Account not found.',404);
 for(const key of ['name','artisanId','place','craft'] as const)if(typeof body?.[key]==='string')saved[key]=body[key] as string;
 saved.updatedAt=Date.now();await writeDb(db);return NextResponse.json({user:saved});
}