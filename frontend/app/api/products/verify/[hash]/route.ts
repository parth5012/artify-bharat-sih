import {createHash} from 'node:crypto';
import {NextResponse} from 'next/server';
import {readDb,writeDb,ProductRecord,AuditLog} from '@/backend/db';

export const runtime='nodejs';

// Privacy control: the public verification API exposes authenticity fields
// only. Artisan internal identifiers (user id) never leave the server.
function publicProduct(p:ProductRecord){
 return{id:p.id,name:p.name,craft:p.craft,description:p.description,materials:p.materials,price:p.price,parentHash:p.parentHash,childHash:p.childHash,serialNumber:p.serialNumber,status:p.status,createdAt:p.createdAt};
}
export async function GET(request:Request,{params}:{params:{hash:string}}){
 const value=params.hash.toLowerCase();const db=await readDb();const product=db.products.find(x=>x.parentHash===value||x.childHash===value);
 if(!product){
  const miss=await recordVerification(db,'verify.miss',value,null);
  return NextResponse.json({verified:false,...miss},{status:404});
 }
 const scanType=product.childHash===value&&product.parentHash!==value?'child':'parent';
 const receipt=await recordVerification(db,'verify.hit',value,product.id);
 return NextResponse.json({verified:true,scanType,product:publicProduct(product),ownership:scanType==='child'?product.ownership:undefined,...receipt});
}

// Tamper-evident verification log: each event chains to the previous entry's
// hash so any removal or reordering of verification history is detectable.
async function recordVerification(db:Awaited<ReturnType<typeof readDb>>,action:string,hash:string,productId:string|null){
 const previous=db.auditLogs[0];
 const previousHash=createHash('sha256').update(JSON.stringify(previous??{})).digest('hex');
 const entry:AuditLog={id:'aud_'+createHash('sha256').update(hash+Date.now()+Math.random()).digest('hex').slice(0,12),ts:Date.now(),action,target:productId,ip:null,detail:{hash,previousHash}};
 await writeDb({...db,auditLogs:[entry,...db.auditLogs].slice(0,1000)});
 return{receipt:{eventId:entry.id,previousHash,ts:entry.ts}};
}