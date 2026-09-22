import {NextResponse} from 'next/server';
export const jsonError=(message:string,status=400)=>NextResponse.json({error:message},{status});
export const asObject=(value:unknown):Record<string,unknown>|null=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;