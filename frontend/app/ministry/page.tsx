'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {CheckCircle2,Eye,EyeOff,Loader2,Lock,ShieldCheck,Timer} from 'lucide-react';
import {Logo} from '@/components/ui';
import {Button,Modal} from '@/components/ministry/ui';
import {authenticate,DEMO_IDS,DEMO_OTP,DEMO_PASSWORD,SESSION_MS,verifyMfa} from '@/lib/ministry/auth';
import {useMinistry} from '@/lib/ministry/context';
export default function MinistryLogin(){
 const r=useRouter();const {ready,session,signIn}=useMinistry();
 const [step,setStep]=useState<'creds'|'otp'|'done'>('creds'),[id,setId]=useState(''),[pw,setPw]=useState(''),[show,setShow]=useState(false),[otp,setOtp]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[notice,setNotice]=useState('');
 const [fails,setFails]=useState(0),[lock,setLock]=useState(0),[resend,setResend]=useState(30),[forgot,setForgot]=useState(false),[sent,setSent]=useState(false);const chal=useRef('');
 useEffect(()=>{if(ready&&session)r.replace('/ministry/dashboard')},[ready,session,r]);
 useEffect(()=>{try{if(sessionStorage.getItem('artifact-ministry-flash')==='expired')setNotice('Your session expired due to inactivity. Please sign in again.');sessionStorage.removeItem('artifact-ministry-flash')}catch{}},[]);
 useEffect(()=>{if(lock<=0)return;const t=setTimeout(()=>setLock(lock-1),1000);return()=>clearTimeout(t)},[lock]);
 useEffect(()=>{if(step!=='otp'||resend<=0)return;const t=setTimeout(()=>setResend(resend-1),1000);return()=>clearTimeout(t)},[step,resend]);
 const login=async()=>{setErr('');setBusy(true);const x=await authenticate(id,pw);setBusy(false);
  if(!x.ok){const n=fails+1;setFails(n);if(n>=3){setLock(30);setFails(0);setErr('Too many failed attempts. Sign-in is locked temporarily.')}else setErr(`${x.error} (${3-n} attempt${3-n===1?'':'s'} left)`);return}
  chal.current=x.challenge;setResend(30);setStep('otp')};
 const verify=async()=>{setErr('');setBusy(true);const x=await verifyMfa(chal.current,otp);setBusy(false);
  if(!x.ok){setErr(x.error);return}setStep('done');signIn(x.session);setTimeout(()=>r.push('/ministry/dashboard'),1400)};
 const input="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 outline-none focus:border-navy focus:ring-2 focus:ring-navy/15";
 return <div className="grid min-h-dvh bg-slate-50 lg:grid-cols-[1.05fr_1fr]">
  <aside className="hidden flex-col justify-between bg-navy p-12 text-white lg:flex"><div><p className="text-2xl font-bold tracking-wide">ARTIFACT</p><p className="text-white/70">Ministry Portal</p></div>
   <div className="space-y-6"><ShieldCheck size={56} className="text-white/90"/><h2 className="text-4xl font-bold leading-tight">Restricted government data.<br/>Authorized access only.</h2>
    <ul className="space-y-3 text-white/80"><li className="flex gap-2"><CheckCircle2 size={20}/> Role-based access with multi-factor verification</li><li className="flex gap-2"><CheckCircle2 size={20}/> Every administrative action is recorded in the audit log</li><li className="flex gap-2"><CheckCircle2 size={20}/> Sensitive fields are masked · sessions time out automatically</li></ul></div>
   <p className="text-xs text-white/50">Prototype environment · demo data only</p></aside>
  <main className="flex flex-col justify-center px-5 py-10 sm:px-12">
   <div className="mx-auto w-full max-w-md space-y-6">
    <div className="space-y-3"><Logo size={48}/><div><h1 className="text-3xl font-bold text-navy">Ministry Portal</h1><p className="flex items-center gap-1.5 text-sm font-semibold text-red-700"><Lock size={14}/> Authorized Access Only</p></div>
     <p className="text-sm text-slate-600">This area contains restricted government data. Activity is monitored and logged.</p></div>
    {notice&&<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
    {step==='creds'&&<form onSubmit={e=>{e.preventDefault();login()}} className="space-y-4">
     <label className="block text-sm font-semibold text-slate-700">Official ID / Username<input value={id} onChange={e=>setId(e.target.value)} autoComplete="username" className={`${input} mt-1 font-normal`}/></label>
     <label className="block text-sm font-semibold text-slate-700">Password<div className="relative mt-1"><input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} autoComplete="current-password" className={`${input} pr-12 font-normal`}/><button type="button" aria-label="Show password" onClick={()=>setShow(!show)} className="absolute right-3 top-3.5 text-slate-500">{show?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></label>
     {err&&<p role="alert" className="text-sm font-semibold text-red-700">{err}</p>}
     <Button type="submit" disabled={!id||!pw||busy||lock>0} className="h-12 w-full text-base">{busy?<Loader2 className="animate-spin" size={18}/>:<Lock size={16}/>}{lock>0?`Locked · try again in ${lock}s`:'Secure Login'}</Button>
     <div className="flex items-center justify-between text-sm"><button type="button" onClick={()=>{setForgot(true);setSent(false)}} className="font-semibold text-navy underline">Forgot Password?</button><Link href="/" className="text-slate-500">← Back</Link></div></form>}
    {step==='otp'&&<form onSubmit={e=>{e.preventDefault();verify()}} className="space-y-4"><div className="rounded-lg bg-navy-50 p-3 text-sm text-slate-700"><b>Two-step verification.</b> Enter the 6-digit code sent to your registered official mobile (demo).</div>
     <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoFocus placeholder="••••••" className={`${input} text-center text-2xl tracking-[0.6em]`}/>
     {err&&<p role="alert" className="text-sm font-semibold text-red-700">{err}</p>}
     <Button type="submit" disabled={otp.length<6||busy} className="h-12 w-full text-base">{busy&&<Loader2 className="animate-spin" size={18}/>}Verify & continue</Button>
     <div className="flex justify-between text-sm"><button type="button" disabled={resend>0} onClick={()=>setResend(30)} className="font-semibold text-navy disabled:text-slate-400">{resend>0?`Resend code in ${resend}s`:'Resend code'}</button><button type="button" onClick={()=>{setStep('creds');setOtp('');setErr('')}} className="text-slate-500">Use a different ID</button></div></form>}
    {step==='done'&&<div className="flex flex-col items-center gap-3 py-6 text-center"><CheckCircle2 size={64} className="animate-pop text-emerald-600"/><p className="text-xl font-bold text-navy">Authenticated</p><p className="text-sm text-slate-600">Establishing secure session…</p></div>}
    <div className="flex items-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500"><Timer size={14}/> Sessions expire after {SESSION_MS/60000} minutes of inactivity.</div>
    <details className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Prototype demo credentials</summary>
     <p className="mt-2">IDs: {DEMO_IDS.map(d=><button key={d} type="button" onClick={()=>{setId(d);setPw(DEMO_PASSWORD)}} className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-navy">{d}</button>)}</p><p className="mt-1">Password <code>{DEMO_PASSWORD}</code> · Code <code>{DEMO_OTP}</code>. Demo only — no real authentication.</p></details>
   </div></main>
  <Modal open={forgot} onClose={()=>setForgot(false)} title="Reset password">{sent?<p className="text-sm text-slate-700">If this ID exists, reset instructions have been sent to the registered official email. Contact your Ministry system administrator if you do not receive them.</p>
   :<form onSubmit={e=>{e.preventDefault();setSent(true)}} className="space-y-3"><p className="text-sm text-slate-600">Enter your official ID. Password resets are sent only to your registered government email.</p><input value={id} onChange={e=>setId(e.target.value)} placeholder="Official ID" className={input}/><Button type="submit" disabled={!id} className="w-full">Request reset (demo)</Button></form>}</Modal>
 </div>;
}
