'use client';
import {ReactNode,ButtonHTMLAttributes} from 'react';
import {Lock,X} from 'lucide-react';
export const Demo=()=><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">Demo data</span>;
export function Card({title,sub,right,children,className='',demo,id}:{title?:string;sub?:string;right?:ReactNode;children:ReactNode;className?:string;demo?:boolean;id?:string}){
 return <section id={id} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 ${className}`}>
  {(title||right)&&<header className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h3 className="flex items-center gap-2 font-semibold text-navy">{title}{demo&&<Demo/>}</h3>{sub&&<p className="text-xs text-slate-500">{sub}</p>}</div>{right}</header>}{children}</section>;
}
export function PageHead({title,sub,right}:{title:string;sub?:string;right?:ReactNode}){
 return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold text-navy md:text-3xl">{title}</h1>{sub&&<p className="mt-1 max-w-3xl text-sm text-slate-600">{sub}</p>}</div>{right}</div>;
}
export function Kpi({label,value,sub,icon}:{label:string;value:string;sub?:string;icon:ReactNode}){
 return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-slate-500"><p className="text-xs font-semibold uppercase tracking-wide">{label}</p>{icon}</div><p className="mt-2 text-3xl font-bold text-navy">{value}</p>{sub&&<p className="mt-0.5 text-xs text-slate-500">{sub}</p>}</div>;
}
export function Select({label,value,onChange,options,disabled}:{label:string;value:string;onChange:(v:string)=>void;options:[string,string][];disabled?:boolean}){
 return <label className="block text-xs font-semibold text-slate-600">{label}<select disabled={disabled} value={value} onChange={e=>onChange(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-slate-800 disabled:bg-slate-100 disabled:text-slate-400">{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>;
}
const V={primary:'bg-navy text-white hover:bg-navy-700',ghost:'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',success:'bg-emerald-700 text-white hover:bg-emerald-800',danger:'bg-red-700 text-white hover:bg-red-800'};
export function Button({v='primary',className='',...p}:ButtonHTMLAttributes<HTMLButtonElement>&{v?:keyof typeof V}){
 return <button {...p} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${V[v]} ${className}`}/>;
}
const P={ok:'bg-emerald-100 text-emerald-800',warn:'bg-amber-100 text-amber-800',bad:'bg-red-100 text-red-800',info:'bg-sky-100 text-sky-800',mute:'bg-slate-100 text-slate-700'};
export const Pill=({tone='mute',children}:{tone?:keyof typeof P;children:ReactNode})=><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${P[tone]}`}>{children}</span>;
export const statusTone=(s:string):keyof typeof P=>/verified|approved|success|completed|applied|active/i.test(s)?'ok':/reject|flag|suspend|fail/i.test(s)?'bad':/pending|review/i.test(s)?'warn':'mute';
export function Modal({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:ReactNode}){
 if(!open)return null;
 return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 p-4" onClick={onClose}><div onClick={e=>e.stopPropagation()} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-navy">{title}</h2><button aria-label="Close" onClick={onClose}><X size={18}/></button></div>{children}</div></div>;
}
export const Locked=({text}:{text:string})=><div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600"><Lock size={16}/>{text}</div>;
export const Table=({head,children}:{head:string[];children:ReactNode})=><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">{head.map(h=><th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{children}</tbody></table></div>;
