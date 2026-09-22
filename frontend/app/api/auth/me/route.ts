import {NextResponse} from 'next/server';
import {currentUser} from '@/backend/auth';

export const runtime='nodejs';

export async function GET(){const user=await currentUser();return user?NextResponse.json({user}):NextResponse.json({user:null},{status:401})}