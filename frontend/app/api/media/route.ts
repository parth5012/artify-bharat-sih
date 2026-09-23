import {NextResponse} from 'next/server';
import {currentUser,digest} from '@/backend/auth';
import {readDb,writeDb} from '@/backend/db';
import {asObject,jsonError} from '@/backend/http';
import {rateLimit,clientIp,audit} from '@/backend/security';

export const runtime='nodejs';

// Media API for offline-queued uploads: photos and voice recordings arrive as
// base64 data URLs (compressed client-side before queuing). Uploads are
// idempotent by idempotencyKey — a replay returns the original record. The
// original is always preserved alongside any later AI Studio processing.

export async function POST(request:Request){
 const user=await currentUser();if(!user)return jsonError('Authentication required.',401);
 if(!rateLimit(`media:${user.id}`,120,60*60*1000).ok)return jsonError('Too many uploads. Try again later.',429);
 const body=asObject(await request.json().catch(()=>null));
 const kind=body?.kind==='voice'?'voice':'photo';
 const dataUrl=typeof body?.dataUrl==='string'?body.dataUrl:'';
 const productId=typeof body?.productId==='string'?body.productId.trim():'';
 const idempotencyKey=typeof body?.idempotencyKey==='string'?body.idempotencyKey.trim():'';
 if(!idempotencyKey)return jsonError('idempotencyKey is required.');
 if(!productId)return jsonError('productId is required.');
 if(!dataUrl.startsWith('data:image/')&&!dataUrl.startsWith('data:audio/'))return jsonError('Media must be an image or audio data URL.');
 // Cap stored size (10MB base64 ≈ 7.5MB binary) so the JSONB store stays healthy.
 if(dataUrl.length>10*1024*1024)return jsonError('Media is too large. Compress before upload.');
 const lat=typeof body?.lat==='number'?body.lat:null;const lng=typeof body?.lng==='number'?body.lng:null;
 const ts=typeof body?.ts==='number'?body.ts:Date.now();
 const db=await readDb();
 const mediaId=digest(`media:${user.id}:${idempotencyKey}`);
 const existing=db.media?.find(m=>m.id===mediaId);
 if(existing)return NextResponse.json({media:{id:existing.id,kind:existing.kind,productId:existing.productId},replayed:true});
 const record={id:mediaId,artisanId:user.artisanId??user.id,productId,kind:kind as 'photo'|'voice',dataUrl,lat,lng,ts,createdAt:Date.now()};
 await writeDb({...db,media:[...(db.media??[]),record]});
 await audit({action:'media.uploaded',actor:user.id,target:productId,ip:clientIp(request),detail:{mediaKind:kind,idempotent:true}});
 return NextResponse.json({media:{id:record.id,kind,productId},replayed:false},{status:201});
}
