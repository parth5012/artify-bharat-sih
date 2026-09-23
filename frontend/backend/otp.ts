import {readDb,writeDb} from './db';
import {audit} from './security';

// Production OTP delivery adapter. The code is generated server-side and only
// its hash is persisted; providers receive the plaintext code over TLS.

export type OtpDeliveryResult={sent:boolean;provider:string;reason?:string};

export async function sendOtp(phone:string,code:string):Promise<OtpDeliveryResult>{
 const endpoint=process.env.OTP_PROVIDER_URL;
 const token=process.env.OTP_PROVIDER_TOKEN;
 if(!endpoint)return{sent:false,provider:'none',reason:'OTP_PROVIDER_URL is not configured'};
 try{
  const response=await fetch(endpoint,{
   method:'POST',
   headers:{'Content-Type':'application/json','Authorization':`Bearer ${token??''}`},
   body:JSON.stringify({phone,code,template:process.env.OTP_PROVIDER_TEMPLATE??'artifact-login'}),
  });
  if(!response.ok){
   await audit({action:'otp.delivery_failed',target:phone,detail:{status:response.status}});
   return{sent:false,provider:'http',reason:`OTP provider responded ${response.status}`};
  }
  return{sent:true,provider:'http'};
 }catch(error){
  await audit({action:'otp.delivery_failed',target:phone,detail:{error:error instanceof Error?error.message:'unknown'}});
  return{sent:false,provider:'http',reason:error instanceof Error?error.message:'unknown'};
 }
}

// Session recovery: list active sessions for a user and revoke stale ones.
// Called by /api/auth/sessions so an artisan can see and end active sessions.

export async function listSessions(userId:string){
 const db=await readDb();
 return db.sessions.filter(s=>s.userId===userId&&s.expiresAt>Date.now()).map(s=>({tokenHash:s.tokenHash.slice(0,8)+'…',expiresAt:s.expiresAt}));
}

export async function revokeAllSessions(userId:string,exceptTokenHash?:string){
 const db=await readDb();
 const before=db.sessions.length;
 db.sessions=db.sessions.filter(s=>!(s.userId===userId&&s.tokenHash!==exceptTokenHash));
 await writeDb(db);
 await audit({action:'sessions.revoked_all',actor:userId,detail:{removed:before-db.sessions.length}});
 return before-db.sessions.length;
}
