'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Check,Mic,ShieldCheck,X} from 'lucide-react';
import {Btn,Screen,Thumb} from '@/components/ui';
import {CameraView,Shot} from '@/components/CameraView';
import {EnhanceView} from '@/components/EnhanceView';
import {useStore} from '@/lib/store';
export default function Capture(){
 const r=useRouter();const {s,set}=useStore();const [step,setStep]=useState<'camera'|'review'|'enhance'>('camera');const [shot,setShot]=useState<Shot|null>(null);
 const save=(enhancedSrc?:string)=>{if(shot)set({photos:[...s.photos,{id:Date.now().toString(36),...shot,src:enhancedSrc||shot.src,rawSrc:shot.src}]});setShot(null);setStep('camera')};
 if(step==='enhance'&&shot)return <Screen step={3} onBack={()=>setStep('review')}><EnhanceView src={shot.src} onAccept={save} onRetake={()=>{setShot(null);setStep('camera')}}/></Screen>;
 if(step==='review'&&shot)return <Screen step={3} onBack={()=>setStep('camera')}><div className="flex min-h-full flex-col gap-4">
  <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border-4 border-white shadow-lg"><img src={shot.src} alt="Captured craft" className="h-full w-full object-cover"/>
   <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/70 p-3 text-sm text-white"><p className="flex items-center gap-1 font-bold"><ShieldCheck size={16}/> Proof attached</p>
    <p>{shot.lat!=null?`📍 ${shot.lat.toFixed(4)}, ${shot.lng!.toFixed(4)}`:'📍 Location not available'} · {new Date(shot.ts).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</p></div></div>
  <p className="text-center text-xl font-semibold">Is this photo good?</p>
  <div className="flex gap-4"><Btn aria-label="Accept" onClick={()=>setStep('enhance')}><Check size={36}/> Yes</Btn><Btn tone="red" aria-label="Retake" onClick={()=>{setShot(null);setStep('camera')}}><X size={36}/> Retake</Btn></div>
 </div></Screen>;
 return <Screen step={3} onBack={()=>r.push('/home')}><div className="space-y-4">
  <CameraView onShot={x=>{setShot(x);setStep('review')}}/>
  {!!s.photos.length&&<><p className="text-center text-stone-600">Take another photo from another side, or continue.</p>
   <div className="flex gap-3 overflow-x-auto py-2">{s.photos.map(p=><Thumb key={p.id} src={p.src} onRemove={()=>set({photos:s.photos.filter(x=>x.id!==p.id)})}/>)}</div>
   <Btn onClick={()=>r.push('/describe')}><Mic/> Next: tell about your craft</Btn></>}
 </div></Screen>;
}
