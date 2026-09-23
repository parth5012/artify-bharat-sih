import {NextResponse} from 'next/server';
import {currentUser,SESSION_COOKIE} from '@/backend/auth';
import {cookies} from 'next/headers';
import {listSessions,revokeAllSessions} from '@/backend/otp';
import {jsonError} from '@/backend/http';

export const runtime='nodejs';

export async function GET(){
 const user=await currentUser();
 if(!user)return jsonError('Authentication required.',401);
 return NextResponse.json({sessions:await listSessions(user.id)});
}

export async function DELETE(){
 const user=await currentUser();
 if(!user)return jsonError('Authentication required.',401);
 const token=cookies().get(SESSION_COOKIE)?.value;
 const {createHash}=await import('node:crypto');
 const keep=token?createHash('sha256').update(token).digest('hex'):undefined;
 const removed=await revokeAllSessions(user.id,keep);
 return NextResponse.json({ok:true,removed});
}
