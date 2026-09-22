'use client';
import {useEffect,useState} from 'react';
import {Check,CheckCircle2,Loader2,X} from 'lucide-react';
import {Btn} from './ui';
const STEPS=['Cleaning distractions','Improving light','Framing for the marketplace'];
export function EnhanceView({src,onAccept,onRetake}:{src:string;onAccept:()=>void;onRetake:()=>void}){
 const [pos,setPos]=useState(0),[auto,setAuto]=useState(true);
 useEffect(()=>{if(!auto)return;const t=setInterval(()=>setPos(p=>p>=52?(setAuto(false),p):p+1.4),45);return()=>clearInterval(t)},[auto]);
 const done=!auto;
 return <div className="flex flex-col gap-4">
  <h2 className="text-center text-2xl font-bold">{done?'Ready for digital selling':'Preparing your product…'}</h2>
  <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border-4 border-white shadow-lg">
   <img src={src} alt="Before" className="absolute inset-0 h-full w-full object-cover"/>
   <img src={src} alt="After" className="enhanced absolute inset-0 h-full w-full object-cover" style={{clipPath:`inset(0 ${100-pos}% 0 0)`}}/>
   <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{left:`${pos}%`}}/>
   <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">After</span>
   <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">Before</span>
  </div>
  {done&&<input type="range" min={0} max={100} value={pos} onChange={e=>setPos(+e.target.value)} aria-label="Compare before and after" className="w-full accent-orange-600"/>}
  <ul className="space-y-2">{STEPS.map((s,k)=>{const ok=pos>=(k+1)*17;return <li key={s} className={`flex items-center gap-3 text-lg ${ok?'':'opacity-40'}`}>{ok?<CheckCircle2 className="text-emerald-600"/>:<Loader2 className="animate-spin text-orange-600"/>}{s}</li>})}</ul>
  <p className="text-center text-sm text-stone-500">Only light and framing improve. Your real craft is never changed.</p>
  {done&&<div className="flex gap-3"><Btn aria-label="Use this photo" onClick={onAccept}><Check size={32}/> Use</Btn><Btn tone="red" aria-label="Retake" onClick={onRetake}><X size={32}/> Retake</Btn></div>}
 </div>;
}
