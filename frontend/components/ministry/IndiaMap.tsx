'use client';
import {useEffect,useRef,useState} from 'react';
import {Cluster,MAP} from '@/lib/ministry/data';
type Box={x:number;y:number;w:number;h:number};
const hex=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
export const scaleColor=(v:number,min:number,max:number,a='#E3ECF6',b='#0B2A4A')=>{const t=max>min?Math.pow((v-min)/(max-min),.65):0,A=hex(a),B=hex(b);return'#'+A.map((x,i)=>Math.round(x+(B[i]-x)*t).toString(16).padStart(2,'0')).join('')};
export function Legend({min,max,fmt,label}:{min:number;max:number;fmt:(n:number)=>string;label:string}){
 return <div className="flex items-center gap-2 text-xs text-slate-600"><span className="font-semibold">{label}</span><span>{fmt(min)}</span><span className="h-2.5 w-40 rounded" style={{background:'linear-gradient(90deg,#E3ECF6,#0B2A4A)'}}/><span>{fmt(max)}</span></div>;
}
export function IndiaMap({fills,selected,onSelect,tip,clusters=[],activeCluster,onCluster}:{fills:Record<string,string>;selected:string|null;onSelect:(id:string|null)=>void;tip:(id:string)=>string;clusters?:Cluster[];activeCluster?:string|null;onCluster?:(c:Cluster)=>void}){
 const refs=useRef<Record<string,SVGPathElement|null>>({}),wrap=useRef<HTMLDivElement>(null);const [boxes,setBoxes]=useState<Record<string,Box>>({}),[hov,setHov]=useState<{id:string;x:number;y:number}|null>(null);
 useEffect(()=>{const b:Record<string,Box>={};MAP.locations.forEach(l=>{const e=refs.current[l.id];if(e){const q=e.getBBox();b[l.id]={x:q.x,y:q.y,w:q.width,h:q.height}}});setBoxes(b)},[]);
 const [W,H]=MAP.viewBox.split(' ').slice(2).map(Number);let vb=[0,0,W,H];const sb=selected?boxes[selected]:null;
 if(sb){const p=Math.max(sb.w,sb.h)*.4,asp=W/H,cx=sb.x+sb.w/2,cy=sb.y+sb.h/2;let vw=Math.max(sb.w+2*p,95),vh=vw/asp;if(sb.h+2*p>vh){vh=sb.h+2*p;vw=vh*asp}vb=[cx-vw/2,cy-vh/2,vw,vh]}
 const k=vb[2]/W;
 const pos=(c:Cluster,i:number,n:number)=>{const b=boxes[c.stateId];if(!b)return null;const a=(i/Math.max(n,1))*Math.PI*2+.6,rr=n>1?Math.min(b.w,b.h)*.22:0;return{x:b.x+b.w/2+Math.cos(a)*rr,y:b.y+b.h/2+Math.sin(a)*rr}};
 const byState:Record<string,Cluster[]>={};clusters.forEach(c=>(byState[c.stateId]??=[]).push(c));
 return <div ref={wrap} className="relative">
  <svg viewBox={vb.join(' ')} className="mx-auto h-auto max-h-[620px] w-full" role="group" aria-label="Schematic map of India by state">
   {MAP.locations.map(l=><path key={l.id} ref={e=>{refs.current[l.id]=e}} d={l.path} fill={fills[l.id]} stroke="#fff" strokeWidth={.8*k} tabIndex={0} role="button" aria-label={l.name} opacity={selected&&selected!==l.id?.5:1}
    className="cursor-pointer outline-none transition-opacity hover:opacity-75 focus-visible:opacity-75" onClick={()=>onSelect(selected===l.id?null:l.id)} onKeyDown={e=>e.key==='Enter'&&onSelect(selected===l.id?null:l.id)}
    onPointerMove={e=>{const r=wrap.current!.getBoundingClientRect();setHov({id:l.id,x:e.clientX-r.left,y:e.clientY-r.top})}} onPointerLeave={()=>setHov(null)}/>)}
   {selected&&boxes[selected]&&<path d={MAP.locations.find(l=>l.id===selected)!.path} fill="none" stroke="#E07B00" strokeWidth={2.2*k} pointerEvents="none"/>}
   {Object.entries(byState).flatMap(([sid,cs])=>cs.map((c,i)=>{const p=pos(c,i,cs.length);if(!p)return null;const on=activeCluster===c.id;
    return <circle key={c.id} cx={p.x} cy={p.y} r={(on?8:5.5)*k} fill="#E07B00" stroke="#fff" strokeWidth={1.4*k} className="cursor-pointer" onClick={e=>{e.stopPropagation();onCluster?.(c)}}><title>{c.name}</title></circle>}))}
  </svg>
  {hov&&<div className="pointer-events-none absolute z-10 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow" style={{left:Math.min(hov.x+12,(wrap.current?.clientWidth??300)-160),top:hov.y+12}}>{tip(hov.id)}</div>}
 </div>;
}
