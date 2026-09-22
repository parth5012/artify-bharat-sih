import {NextResponse} from 'next/server';
import {translateWithBhashini} from '@/backend/bhashini';
import {asObject,jsonError} from '@/backend/http';

export const runtime='nodejs';

export async function POST(request:Request){
 const body=asObject(await request.json().catch(()=>null));const text=typeof body?.text==='string'?body.text.trim():'';const sourceLanguage=typeof body?.sourceLanguage==='string'?body.sourceLanguage.trim():'';const targetLanguage=typeof body?.targetLanguage==='string'?body.targetLanguage.trim():'';
 if(!text||!sourceLanguage||!targetLanguage)return jsonError('text, sourceLanguage, and targetLanguage are required.');
 if(text.length>5000)return jsonError('Text must be 5000 characters or less.');
 try{return NextResponse.json({translation:await translateWithBhashini(text,sourceLanguage,targetLanguage)})}catch(error){return jsonError(error instanceof Error?error.message:'Bhashini translation failed.',503)}
}