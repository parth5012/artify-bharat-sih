import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {readDb,writeDb,User} from './db';

export const SESSION_COOKIE='artifact_session';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const equal=(left:string,right:string)=>{const a=Buffer.from(left);const b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b)};

export async function currentUser():Promise<User|null>{
 const token=cookies().get(SESSION_COOKIE)?.value;if(!token)return null;
 const db=await readDb();const session=db.sessions.find(x=>x.tokenHash===hash(token)&&x.expiresAt>Date.now());
 return session?db.users.find(x=>x.id===session.userId)??null:null;
}

// Middleware helper: validates a session token from a request cookie. Middleware
// runs on the Edge runtime, so it cannot use next/headers cookies() — it takes
// the token directly and consults the same server-side session store.
export async function verifySessionCookie(token:string|undefined):Promise<boolean>{
 if(!token)return false;
 const db=await readDb();
 return db.sessions.some(x=>x.tokenHash===hash(token)&&x.expiresAt>Date.now());
}
export async function createSession(userId:string){
 const token=randomBytes(32).toString('hex');const db=await readDb();
 db.sessions=db.sessions.filter(x=>x.expiresAt>Date.now());db.sessions.push({tokenHash:hash(token),userId,expiresAt:Date.now()+30*24*60*60*1000});await writeDb(db);return token;
}
export async function revokeSession(token:string){const db=await readDb();db.sessions=db.sessions.filter(x=>x.tokenHash!==hash(token));await writeDb(db)}
export function isValidCode(challenge:{codeHash:string;expiresAt:number;attempts:number},code:string){return challenge.expiresAt>Date.now()&&challenge.attempts<5&&equal(challenge.codeHash,hash(code))}
export const digest=hash;