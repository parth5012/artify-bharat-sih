'use client';
import {ReactNode,useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {BadgeIndianRupee,FileText,KeyRound,Landmark,LayoutDashboard,Lock,LogOut,Menu,Package,ScrollText,ShieldCheck,Timer,TrendingUp,Users,X,CheckCircle2} from 'lucide-react';
import {Logo} from '@/components/ui';
import {ROLE_LABEL} from '@/lib/ministry/auth';
import {useMinistry} from '@/lib/ministry/context';
import {Button,Modal} from './ui';
const NAV=[['Dashboard','/ministry/dashboard',LayoutDashboard],['Artisans','/ministry/artisans',Users],['Products','/ministry/products',Package],['Market Analytics','/ministry/market',TrendingUp],['Yojana Impact','/ministry/yojana',BadgeIndianRupee],['Craft Heritage','/ministry/heritage',Landmark],['Verification','/ministry/verification',ShieldCheck],['Reports','/ministry/reports',FileText],['Audit Logs','/ministry/audit',ScrollText],['Access Control','/ministry/access',KeyRound]] as const;
export function Shell({children}:{children:ReactNode}){
 const {ready,session,can,secondsLeft,logout,extend}=useMinistry();const path=usePathname(),r=useRouter();const [open,setOpen]=useState(false);
 if(!ready||!session)return <div className="grid min-h-dvh place-items-center bg-slate-100 text-slate-500"><Lock className="animate-pulse"/></div>;
 const items=NAV.filter(([n])=>n==='Access Control'?can('admin'):n==='Audit Logs'?can('audit'):true);
 const mm=String(Math.floor(secondsLeft/60)).padStart(2,'0')+':'+String(secondsLeft%60).padStart(2,'0');
 const Nav=<nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">{items.map(([n,h,I])=>{const on=path.startsWith(h);return <Link key={h} href={h} onClick={()=>setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${on?'bg-white/15 text-white':'text-white/70 hover:bg-white/10 hover:text-white'}`}><I size={18}/>{n}</Link>})}</nav>;
 const Side=<div className="flex h-full flex-col bg-navy"><div className="border-b border-white/10 p-5"><p className="text-lg font-bold tracking-wide text-white">ARTIFACT</p><p className="text-xs text-white/60">Ministry Portal</p></div>{Nav}
  <div className="border-t border-white/10 p-4 text-xs text-white/70"><p className="flex items-center gap-1.5"><Lock size={12}/> Restricted Government Data</p><p className="mt-1">All actions are audited.</p></div></div>;
 return <div className="min-h-dvh bg-slate-100 text-slate-800">
  <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{Side}</aside>
  {open&&<div className="fixed inset-0 z-50 lg:hidden" onClick={()=>setOpen(false)}><div className="absolute inset-0 bg-black/40"/><div className="absolute inset-y-0 left-0 w-72" onClick={e=>e.stopPropagation()}>{Side}</div></div>}
  <div className="lg:pl-64">
   <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur md:px-6">
    <button aria-label="Menu" className="lg:hidden" onClick={()=>setOpen(true)}><Menu/></button>
    <div className="hidden sm:block"><Logo size={30}/></div>
    <div className="ml-auto flex flex-wrap items-center gap-2 text-xs font-semibold">
     <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800"><CheckCircle2 size={13}/> Authenticated</span>
     <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"><Lock size={13}/> Secure Session</span>
     <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${secondsLeft<=60?'bg-red-50 text-red-700':'bg-slate-100 text-slate-700'}`}><Timer size={13}/> {mm}</span>
     <span className="hidden text-right leading-tight md:block"><b className="block text-slate-800">{session.name}</b><span className="text-slate-500">{ROLE_LABEL[session.role]}</span></span>
     <button onClick={()=>logout()} aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-full border border-slate-300 hover:bg-slate-50"><LogOut size={16}/></button></div></header>
   <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900 md:px-6">Prototype · all figures are <b>clearly labelled demo data</b>, not official government statistics · Role: {ROLE_LABEL[session.role]} · Read-only analytics</div>
   <main className="mx-auto max-w-[1500px] p-4 md:p-6">{children}</main></div>
  <Modal open={secondsLeft>0&&secondsLeft<=60} onClose={extend} title="Session about to expire"><p className="text-sm text-slate-600">For security, your session ends after inactivity. It will close in <b>{secondsLeft}s</b>.</p><div className="mt-4 flex gap-2"><Button onClick={extend}>Stay signed in</Button><Button v="ghost" onClick={()=>logout()}>Sign out</Button></div></Modal>
 </div>;
}
