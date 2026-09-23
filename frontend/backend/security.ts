import {createHmac,timingSafeEqual} from 'node:crypto';
import {readDb,writeDb,AuditLog} from './db';

// Rate limiting: in-memory fixed-window limiter per key. For multi-instance
// production deployments swap the store for Redis; the interface stays the same.

type Bucket={count:number;resetAt:number};
const buckets=new Map<string,Bucket>();

export type RateLimitResult={ok:boolean;remaining:number;retryAfterSeconds:number};
export function rateLimit(key:string,limit:number,windowMs:number):RateLimitResult{
 const now=Date.now();
 let bucket=buckets.get(key);
 if(!bucket||bucket.resetAt<=now){bucket={count:0,resetAt:now+windowMs};buckets.set(key,bucket)}
 bucket.count+=1;
 if(bucket.count>limit)return{ok:false,remaining:0,retryAfterSeconds:Math.ceil((bucket.resetAt-now)/1000)};
 // Opportunistic cleanup so the map does not grow unbounded.
 if(buckets.size>5000)for(const [k,v] of buckets)if(v.resetAt<=now)buckets.delete(k);
 return{ok:true,remaining:limit-bucket.count,retryAfterSeconds:0};
}

export function clientIp(request:Request){
 const fwd=request.headers.get('x-forwarded-for');
 if(fwd)return fwd.split(',')[0].trim();
 return request.headers.get('x-real-ip')??'unknown';
}

// Audit logging: every mutation of interest lands in db.auditLogs. Sensitive
// fields are never logged; only identifiers and action names are recorded.

export type AuditEvent={action:string;actor?:string|null;target?:string|null;ip?:string|null;detail?:Record<string,unknown>};

export async function audit(event:AuditEvent){
 try{
  const db=await readDb();
  const entry:AuditLog={id:'aud_'+Math.random().toString(36).slice(2,12),ts:Date.now(),action:event.action,actor:event.actor??null,target:event.target??null,ip:event.ip??null,detail:event.detail??{}};
  await writeDb({...db,auditLogs:[entry,...db.auditLogs].slice(0,1000)});
 }catch{/* auditing must never break the request path */}
}

// Webhook signature verification: HMAC-SHA256 over the raw body against
// ONDC_WEBHOOK_SECRET. Compare using timingSafeEqual to avoid timing leaks.

export function verifyWebhookSignature(rawBody:string,signatureHeader:string|null):boolean{
 const secret=process.env.ONDC_WEBHOOK_SECRET;
 if(!secret||!signatureHeader)return false;
 const expected='sha256='+createHmac('sha256',secret).update(rawBody).digest('hex');
 const provided=signatureHeader.trim();
 const a=Buffer.from(expected);
 const b=Buffer.from(provided);
 if(a.length!==b.length)return false;
 return timingSafeEqual(a,b);
}
