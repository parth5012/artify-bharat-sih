import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {revokeSession,SESSION_COOKIE} from '@/backend/auth';

export const runtime='nodejs';

export async function POST(){const token=cookies().get(SESSION_COOKIE)?.value;if(token)await revokeSession(token);const response=NextResponse.json({ok:true});response.cookies.set(SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return response}