'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {LogOut,Plus,User} from 'lucide-react';
import {Img} from '@/components/buyer/BuyerUI';
import {Screen} from '@/components/ui';
import {useStore} from '@/lib/store';
import {useMarket} from '@/lib/market';
export default function Home(){
 const r=useRouter();const {s,set}=useStore();const {products}=useMarket();const p=s.profile;
 useEffect(()=>{
  fetch('/api/auth/me').then(async x=>{
   if(!x.ok){r.replace('/login');return}
   const data=await x.json();
   if(data.user){
    set({profile:{
     name:data.user.name||'',
     artisanId:data.user.artisanId||'',
     phone:data.user.phone||'',
     place:data.user.place,
     craft:data.user.craft
    }});
   }
  }).catch(()=>r.replace('/login'))
 },[r,set]);
 const logout=async()=>{await fetch('/api/auth/logout',{method:'POST'});set({lang:null,profile:{name:'',artisanId:'',phone:''},photos:[],product:null,record:null,productId:null});r.replace('/login')};
 const mine=products.filter(x=>x.id.startsWith('u-')&&x.artisanId===p.artisanId);
 return <Screen><div className="flex min-h-full flex-col items-center gap-5">
  <div className="grid h-24 w-24 place-items-center rounded-full border-2 border-stone-400 bg-white"><User size={56}/></div>
    <div className="w-full space-y-1 rounded-2xl bg-white p-5 text-lg shadow-sm">
     <div className="flex items-start justify-between gap-3"><p className="text-2xl font-bold">{p.name||'—'}</p><button onClick={logout} aria-label="Log out" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-700"><LogOut size={18}/></button></div>
     <p className="text-stone-600">{p.place}</p><p><b>Artisan Identity Card:</b> {p.artisanId||'—'}</p><p><b>Phone:</b> {p.phone||'—'}</p></div>
  <hr className="w-full border-t-4 border-stone-800"/>
  <p className="self-start text-xl font-bold">ADD Product</p>
  <button onClick={()=>r.push('/capture')} aria-label="Add product" className="grid h-32 w-32 place-items-center rounded-full bg-orange-600 text-white shadow-xl active:scale-95"><Plus size={72}/></button>
  {!!mine.length&&<div className="w-full space-y-2"><p className="font-bold">Your products</p>
   <div className="flex gap-3 overflow-x-auto">{mine.map(m=><button key={m.id} onClick={()=>r.push('/buyer/product/'+m.id)} className="w-24 shrink-0 text-left"><Img src={m.images[0]} className="enhanced h-24 w-24 rounded-xl"/><p className="mt-1 line-clamp-1 text-sm font-semibold">{m.name}</p></button>)}</div></div>}
  <button onClick={()=>r.push('/buyer')} className="mt-auto pt-2 font-semibold text-orange-800 underline">See the marketplace →</button>
 </div></Screen>;
}
