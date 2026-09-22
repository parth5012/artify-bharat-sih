'use client';
import {useEffect,useRef,useState} from 'react';
import {CheckCircle2,Circle,Loader2} from 'lucide-react';
import {Screen} from './ui';
export function Processing({title,sub,steps,onDone,ms=1000,step}:{title:string;sub?:string;steps:string[];onDone:()=>void;ms?:number;step?:number}){
 const [i,setI]=useState(0);const done=useRef(onDone);done.current=onDone;
 useEffect(()=>{const t=setTimeout(()=>i<steps.length?setI(i+1):done.current(),i<steps.length?ms:500);return()=>clearTimeout(t)},[i,steps.length,ms]);
 return <Screen step={step}><div className="flex min-h-full flex-col items-center justify-center gap-6 text-center">
  <div className="relative h-28 w-28"><div className="absolute inset-0 animate-spin rounded-full border-8 border-stone-200 border-t-orange-600"/><div className="absolute inset-5 animate-pulse rounded-full bg-orange-100"/></div>
  <div><h2 className="text-2xl font-bold">{title}</h2>{sub&&<p className="mt-1 text-stone-600">{sub}</p>}</div>
  <ul className="w-full space-y-3 text-left">{steps.map((s,k)=><li key={s} className={`flex items-center gap-3 rounded-xl bg-white p-3 text-lg shadow-sm transition-opacity ${k>i?'opacity-30':''}`}>
   {k<i?<CheckCircle2 className="text-emerald-600"/>:k===i?<Loader2 className="animate-spin text-orange-600"/>:<Circle className="text-stone-400"/>}{s}</li>)}</ul>
 </div></Screen>;
}
