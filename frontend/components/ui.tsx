'use client';
import {ArrowLeft,X} from 'lucide-react';
import {useState,ReactNode,ButtonHTMLAttributes} from 'react';
export const STEPS=['Speak','Profile','Photo','Describe','Check','Ready'];
export function Logo({size=44}:{size?:number}){
 const [bad,setBad]=useState(false);
 return bad?<span className="text-sm font-extrabold tracking-wide text-stone-800">ARTIFACT</span>
 :<img src="/logo.png" alt="Artifact" style={{height:size}} className="w-auto" onError={()=>setBad(true)}/>;
}
export function Screen({children,onBack,step}:{children:ReactNode;onBack?:()=>void;step?:number}){
 return <div className="flex min-h-0 flex-1 flex-col">
  <header className="flex items-center justify-between px-4 pb-2 pt-4">
   <div className="flex-1">{onBack&&<button onClick={onBack} aria-label="Back" className="grid h-12 w-12 place-items-center rounded-full bg-white shadow active:scale-95"><ArrowLeft/></button>}</div>
   <div className="flex-1"/>
  </header>
  {step&&<div className="px-5 pb-2"><div className="flex gap-1">{STEPS.map((_,i)=><span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i<step?'bg-orange-600':'bg-stone-200'}`}/>)}</div>
   <p className="mt-1 text-xs font-semibold text-stone-500">Step {step} of {STEPS.length} · {STEPS[step-1]}</p></div>}
  <main className="flex min-h-0 flex-1 animate-fade-up flex-col overflow-y-auto px-5 pb-6">{children}</main>
 </div>;
}
const tones={green:'bg-emerald-600 text-white',red:'bg-red-600 text-white',light:'bg-white text-stone-800 border border-stone-300'};
export function Btn({tone='green',className='',...p}:ButtonHTMLAttributes<HTMLButtonElement>&{tone?:keyof typeof tones}){
 return <button {...p} className={`flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-xl font-bold shadow transition active:scale-95 disabled:opacity-50 ${tones[tone]} ${className}`}/>;
}
export function Thumb({src,onRemove}:{src:string;onRemove?:()=>void}){
 return <div className="relative h-20 w-20 shrink-0">
  <img src={src} alt="Craft" className="enhanced h-full w-full rounded-xl border object-cover"/>
  {onRemove&&<button onClick={onRemove} aria-label="Remove" className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white shadow"><X size={16}/></button>}
 </div>;
}
