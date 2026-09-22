'use client';
import {useState} from 'react';
import {Img,Viewer} from './BuyerUI';
export function ProductGallery({images,alt}:{images:string[];alt:string}){
 const [i,setI]=useState(0),[open,setOpen]=useState(false);
 return <div className="space-y-3">
  <button onClick={()=>setOpen(true)} aria-label="Open image viewer" className="block aspect-square w-full overflow-hidden rounded-3xl bg-sand shadow-md md:aspect-[4/5]"><Img src={images[i]} alt={alt} className="h-full w-full"/></button>
  {images.length>1&&<div className="no-scrollbar flex gap-3 overflow-x-auto">{images.map((s,k)=><button key={k} onClick={()=>setI(k)} aria-label={`Image ${k+1}`} className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${k===i?'border-clay':'border-transparent'}`}><Img src={s} className="h-full w-full"/></button>)}</div>}
  {open&&<Viewer srcs={images} index={i} onClose={()=>setOpen(false)} onIndex={setI}/>}
 </div>;
}
