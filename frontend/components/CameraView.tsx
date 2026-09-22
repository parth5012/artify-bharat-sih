'use client';
import {useEffect,useRef,useState,ChangeEvent} from 'react';
import {Camera,Loader2,MapPin} from 'lucide-react';
import {getPosition} from '@/lib/mock';
export type Shot={src:string;lat:number|null;lng:number|null;ts:number};
export function CameraView({onShot}:{onShot:(s:Shot)=>void}){
 const vid=useRef<HTMLVideoElement>(null),file=useRef<HTMLInputElement>(null),pos=useRef<{lat:number;lng:number}|null>(null);
 const [ok,setOk]=useState(false),[busy,setBusy]=useState(false),[gps,setGps]=useState<'wait'|'ok'|'none'>('wait');
 useEffect(()=>{let st:MediaStream|null=null;
  navigator.mediaDevices?.getUserMedia({video:{facingMode:{ideal:'environment'}}}).then(s=>{st=s;if(vid.current){vid.current.srcObject=s;vid.current.play()}setOk(true)}).catch(()=>setOk(false));
  getPosition().then(p=>{pos.current=p;setGps(p?'ok':'none')});
  return()=>st?.getTracks().forEach(t=>t.stop())},[]);
 const finish=async(src:string)=>{setBusy(true);const p=pos.current??await getPosition();onShot({src,lat:p?.lat??null,lng:p?.lng??null,ts:Date.now()})};
 const snap=()=>{const v=vid.current!;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d')!.drawImage(v,0,0);finish(c.toDataURL('image/jpeg',.85))};
 const pick=(e:ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>finish(r.result as string);r.readAsDataURL(f)};
 const corner='absolute h-10 w-10 border-white';
 return <div className="space-y-3">
  <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-stone-900">
   <video ref={vid} playsInline muted className={ok?'h-full w-full object-cover':'hidden'}/>
   {!ok&&<button onClick={()=>file.current?.click()} className="grid h-full w-full place-items-center text-white/80"><Camera size={88}/></button>}
   <div className="pointer-events-none absolute inset-5"><i className={`${corner} left-0 top-0 rounded-tl-2xl border-l-4 border-t-4`}/><i className={`${corner} right-0 top-0 rounded-tr-2xl border-r-4 border-t-4`}/><i className={`${corner} bottom-0 left-0 rounded-bl-2xl border-b-4 border-l-4`}/><i className={`${corner} bottom-0 right-0 rounded-br-2xl border-b-4 border-r-4`}/></div>
   <span className={`absolute left-3 top-3 flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-white ${gps==='ok'?'bg-emerald-600':gps==='wait'?'bg-black/60':'bg-amber-600'}`}>{gps==='wait'?<Loader2 size={14} className="animate-spin"/>:<MapPin size={14}/>}{gps==='ok'?'Location ready':gps==='wait'?'Finding location…':'Location unavailable'}</span>
  </div>
  <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={pick}/>
  <p className="text-center text-lg font-semibold">Put your craft inside the frame</p>
  <p className="text-center text-sm text-stone-500">Your photo will carry proof of place and time.</p>
  <button onClick={ok?snap:()=>file.current?.click()} disabled={busy} aria-label="Take photo" className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-orange-600 bg-white shadow-lg active:scale-95 disabled:opacity-50"><Camera size={32}/></button>
 </div>;
}
