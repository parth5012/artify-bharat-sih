'use client';
import {useRouter} from 'next/navigation';
import {Check,ChevronLeft,Minus,Plus} from 'lucide-react';
import {Btn,Screen,Thumb} from '@/components/ui';
import {categories,rupee} from '@/lib/market';
import {useStore} from '@/lib/store';
export default function Review(){
 const r=useRouter();const {s,set}=useStore();const p=s.product;
 if(!p)return <Screen step={5} onBack={()=>r.push('/describe')}><p className="mt-20 text-center text-lg">Nothing to show yet. Please speak about your craft first.</p></Screen>;
 const craft=categories.find(c=>c.slug===p.craft)?.name;
 const bump=(d:number)=>set({product:{...p,price:Math.max(100,p.price+d)}});
 const Row=(k:string,v:string)=><p><b>{k}:</b> {v}</p>;
 return <Screen step={5}><div className="space-y-4">
  <div className="overflow-hidden rounded-3xl bg-white shadow">
   {s.photos[0]&&<img src={s.photos[0].src} alt={p.localName} className="enhanced aspect-[4/3] w-full object-cover"/>}
   <div className="space-y-1 p-4"><p className="text-sm font-semibold uppercase tracking-wide text-orange-700">{craft}</p>
    <h2 className="font-display text-3xl font-extrabold">{p.localName}</h2><p className="text-stone-600">By {s.profile.name} · {s.profile.place}</p></div></div>
  <div className="flex gap-2 overflow-x-auto">{s.photos.map(x=><Thumb key={x.id} src={x.src}/>)}</div>
  <div className="space-y-2 rounded-2xl bg-white p-4 text-lg shadow-sm"><p>{p.description}</p><hr/>{Row('Made',p.howMade)}{Row('Used for',p.usedFor)}{Row('Time',p.time)}
   <div className="flex flex-wrap gap-2 pt-1">{p.materials.map(m=><span key={m} className="rounded-full bg-orange-100 px-3 py-1 text-base font-semibold text-orange-800">{m}</span>)}</div></div>
  <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-stone-500">Suggested price · based on materials & time</p>
   <div className="mt-2 flex items-center justify-between"><button aria-label="Less" onClick={()=>bump(-100)} className="grid h-14 w-14 place-items-center rounded-full bg-stone-100 active:scale-95"><Minus/></button>
    <p className="text-4xl font-extrabold">{rupee(p.price)}</p><button aria-label="More" onClick={()=>bump(100)} className="grid h-14 w-14 place-items-center rounded-full bg-stone-100 active:scale-95"><Plus/></button></div></div>
  <Btn onClick={()=>r.push('/record')}>Proceed <Check/></Btn>
  <button onClick={()=>r.push('/describe')} className="flex h-12 items-center gap-1 text-lg font-semibold text-stone-600"><ChevronLeft/> Back</button>
 </div></Screen>;
}
