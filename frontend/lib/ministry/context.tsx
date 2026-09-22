'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState,ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {clearSession,loadSession,Perm,ROLE_PERMS,saveSession,Session,SESSION_MS} from './auth';
import {Audit,seedAudit,seedRecords,VRec} from './data';
export const fmtTs=(ts:number)=>new Date(ts).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'});
type Ctx={ready:boolean;session:Session|null;can:(p:Perm)=>boolean;secondsLeft:number;signIn:(s:Session)=>void;logout:(reason?:string)=>void;extend:()=>void;audit:Audit[];log:(action:string,record:string,status:string)=>void;
 records:VRec[];review:(id:string)=>void;decide:(id:string,d:'Approved'|'Rejected')=>void};
const C=createContext<Ctx>(null!);
export function MinistryProvider({children}:{children:ReactNode}){
 const r=useRouter();const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false),[left,setLeft]=useState(SESSION_MS/1000);
 const [audit,setAudit]=useState<Audit[]>(seedAudit),[records,setRecords]=useState<VRec[]>(seedRecords);const last=useRef(0);
 useEffect(()=>{setSession(loadSession());setReady(true)},[]);
 const logout=useCallback((reason?:string)=>{clearSession();setSession(null);try{reason&&sessionStorage.setItem('artifact-ministry-flash',reason)}catch{}r.replace('/ministry')},[r]);
 const bump=useCallback(()=>setSession(s=>{if(!s)return s;const n={...s,expires:Date.now()+SESSION_MS};saveSession(n);return n}),[]);
 useEffect(()=>{if(!session)return;const tick=()=>{const l=Math.round((session.expires-Date.now())/1000);setLeft(Math.max(0,l));if(l<=0)logout('expired')};tick();const t=setInterval(tick,1000);return()=>clearInterval(t)},[session,logout]);
 useEffect(()=>{if(!session)return;const on=()=>{const n=Date.now();if(n-last.current>5000&&session.expires-n>60000){last.current=n;bump()}};
  const ev=['pointerdown','keydown'] as const;ev.forEach(e=>window.addEventListener(e,on));return()=>ev.forEach(e=>window.removeEventListener(e,on))},[session,bump]);
 const label=session?`${session.name} (${session.role[0].toUpperCase()+session.role.slice(1)})`:'Unknown';
 const log=useCallback((action:string,record:string,status:string)=>setAudit(a=>[{ts:Date.now(),user:label,action,record,status},...a]),[label]);
 const review=(id:string)=>{setRecords(rs=>rs.map(x=>x.id===id&&x.status==='Pending'?{...x,status:'Under review'}:x));const x=records.find(y=>y.id===id);log(`Reviewed ${x?.type==='product'?'Product':'Artisan'}`,id,'In review')};
 const decide=(id:string,d:'Approved'|'Rejected')=>{const x=records.find(y=>y.id===id);setRecords(rs=>rs.map(y=>y.id===id?{...y,status:d,decidedBy:session?.name,decidedAt:fmtTs(Date.now()).split(',')[0]}:y));log(`${d==='Approved'?'Approved':'Rejected'} ${x?.type==='product'?'Product':'Artisan'}`,id,d)};
 return <C.Provider value={{ready,session,can:p=>!!session&&ROLE_PERMS[session.role].includes(p),secondsLeft:left,signIn:s=>{setSession(s);saveSession(s)},logout,extend:bump,audit,log,records,review,decide}}>{children}</C.Provider>;
}
export const useMinistry=()=>useContext(C);
