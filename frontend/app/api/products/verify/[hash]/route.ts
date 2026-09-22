import {NextResponse} from 'next/server';
import {readDb} from '@/backend/db';

export const runtime='nodejs';

export async function GET(_request:Request,{params}:{params:{hash:string}}){
 const value=params.hash.toLowerCase();const db=await readDb();const product=db.products.find(x=>x.parentHash===value||x.childHash===value);
 if(!product)return NextResponse.json({verified:false},{status:404});
 return NextResponse.json({verified:true,scanType:product.childHash===value&&product.parentHash!==value?'child':'parent',product});
}