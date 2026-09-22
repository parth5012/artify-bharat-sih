'use client';
import {useEffect,useState,ReactNode} from 'react';
import {ChevronLeft,ChevronRight,ImageIcon,Minus,Plus,ShieldCheck} from 'lucide-react';
export function Img({src,alt='',className=''}:{src?:string;alt?:string;className?:string}){
 const [bad,setBad]=useState(false);
 return bad||!src?<div role="img" aria-label={alt} className={`grid place-items-center bg-gradient-to-br from-[#EBD9BD] to-[#D9B98D] text-[#8F3F1F]/60 ${className}`}><ImageIcon size={28}/></div>
 :<img src={src} alt={alt} loading="lazy" onError={()=>setBad(true)} className={`object-cover ${className}`}/>;
}
export function OndcLogo(){
 const [bad,setBad]=useState(false);
 return bad?<div className="text-center"><p className="text-5xl font-extrabold tracking-tight text-sky-600">ONDC</p><p className="text-xs text-stone-500">Open Network for Digital Commerce</p></div>
 :<img src="/buyer/ondc-logo.png" alt="ONDC" className="h-20 w-auto" onError={()=>setBad(true)}/>;
}
export function AuthBadge({label='Verified Artisan'}:{label?:string}){return <span className="inline-flex items-center gap-1 text-xs font-semibold text-moss"><ShieldCheck size={14}/>{label}</span>}
export function Stepper({q,onChange,size='md'}:{q:number;onChange:(n:number)=>void;size?:'sm'|'md'}){
 const b=`grid place-items-center rounded-full border border-sand bg-white transition active:scale-90 ${size==='sm'?'h-8 w-8':'h-10 w-10'}`;
 return <div className="inline-flex items-center gap-3"><button aria-label="Decrease" className={b} onClick={()=>onChange(q-1)}><Minus size={16}/></button><span className="w-5 text-center font-semibold">{q}</span><button aria-label="Increase" className={b} onClick={()=>onChange(q+1)}><Plus size={16}/></button></div>;
}
export function Section({title,eyebrow,action,children,className=''}:{title:string;eyebrow?:string;action?:ReactNode;children:ReactNode;className?:string}){
 return <section className={`mx-auto w-full max-w-7xl px-4 md:px-8 ${className}`}><div className="mb-5 flex items-end justify-between gap-4"><div>{eyebrow&&<p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">{eyebrow}</p>}<h2 className="font-display text-2xl font-bold md:text-4xl">{title}</h2></div>{action}</div>{children}</section>;
}
export function Viewer({srcs,index,onClose,onIndex}:{srcs:string[];index:number;onClose:()=>void;onIndex:(i:number)=>void}){
 const n=srcs.length,go=(d:number)=>onIndex((index+d+n)%n);
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='ArrowRight')go(1);if(e.key==='ArrowLeft')go(-1)};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)});
 const arrow="absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow";
 return <div onClick={onClose} className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 p-4">
  <div onClick={e=>e.stopPropagation()} className="w-full max-w-xl"><Img src={srcs[index]} className="aspect-square w-full rounded-2xl"/></div>
  <p className="mt-3 text-white">{index+1} / {n}</p>
  {n>1&&<><button aria-label="Previous" className={`${arrow} left-3`} onClick={e=>{e.stopPropagation();go(-1)}}><ChevronLeft/></button>
   <button aria-label="Next" className={`${arrow} right-3`} onClick={e=>{e.stopPropagation();go(1)}}><ChevronRight/></button></>}
 </div>;
}
