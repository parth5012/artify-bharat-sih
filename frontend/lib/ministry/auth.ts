// Mock authentication service. Replace the bodies of authenticate/verifyMfa with real
// calls (e.g. government SSO / NIC OTP gateway) — the UI only depends on these signatures.
export type Role='viewer'|'analyst'|'officer'|'admin';
export type Perm='view'|'analyze'|'report'|'verify'|'audit'|'admin';
export type Session={userId:string;name:string;designation:string;role:Role;issued:number;expires:number};
export const SESSION_MS=10*60*1000; // idle timeout (demo)
export const ROLE_LABEL:Record<Role,string>={viewer:'Ministry Viewer',analyst:'Ministry Analyst',officer:'Ministry Officer',admin:'Ministry Administrator'};
export const ROLE_PERMS:Record<Role,Perm[]>={viewer:['view'],analyst:['view','analyze','report','audit'],officer:['view','verify','audit'],admin:['view','audit','admin']};
export const PERM_LABEL:Record<Perm,string>={view:'View dashboards & analytics',analyze:'Filter & analyze data',report:'Generate reports & exports',verify:'Review, approve or reject records',audit:'View audit logs',admin:'Manage users, roles & access policies'};
export const DEMO_PASSWORD='Artifact@2026',DEMO_OTP='246810';
const USERS:Record<string,{name:string;designation:string;role:Role}>={
 'viewer.demo':{name:'Demo Viewer',designation:'Section Officer (View)',role:'viewer'},
 'analyst.demo':{name:'Demo Analyst',designation:'Policy Analyst',role:'analyst'},
 'officer.demo':{name:'Demo Officer',designation:'Verification Officer',role:'officer'},
 'admin.demo':{name:'Demo Administrator',designation:'System Administrator',role:'admin'},
};
export const DEMO_IDS=Object.keys(USERS);
const challenges=new Map<string,string>();
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export async function authenticate(id:string,pw:string):Promise<{ok:true;challenge:string}|{ok:false;error:string}>{
 await wait(700);const u=id.trim().toLowerCase();
 if(!USERS[u]||pw!==DEMO_PASSWORD)return{ok:false,error:'Invalid official ID or password.'};
 const c=Math.random().toString(36).slice(2);challenges.set(c,u);return{ok:true,challenge:c};
}
export async function verifyMfa(challenge:string,code:string):Promise<{ok:true;session:Session}|{ok:false;error:string}>{
 await wait(600);const u=challenges.get(challenge);
 if(!u)return{ok:false,error:'Verification expired. Please sign in again.'};
 if(code!==DEMO_OTP)return{ok:false,error:'Incorrect verification code.'};
 challenges.delete(challenge);const now=Date.now();
 return{ok:true,session:{userId:u,...USERS[u],issued:now,expires:now+SESSION_MS}};
}
const KEY='artifact-ministry-session';
export const loadSession=():Session|null=>{try{const s=JSON.parse(sessionStorage.getItem(KEY)||'null');return s&&s.expires>Date.now()?s:null}catch{return null}};
export const saveSession=(s:Session)=>{try{sessionStorage.setItem(KEY,JSON.stringify(s))}catch{}};
export const clearSession=()=>{try{sessionStorage.removeItem(KEY)}catch{}};
