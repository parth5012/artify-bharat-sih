'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Check} from 'lucide-react';
import {Btn,Screen} from '@/components/ui';
import {Processing} from '@/components/Processing';
import {useStore} from '@/lib/store';
export default function Profile(){
 const r=useRouter();const {s,set}=useStore();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [f,setF]=useState(s.profile);
 if(busy)return <Processing step={2} title="Creating your profile" steps={['Saving your details','Preparing your artisan card']} onDone={()=>r.push('/home')}/>;
 const Field=(k:'name'|'artisanId'|'phone',label:string,type='text')=><label className="block"><span className="mb-1 block text-base font-semibold text-stone-600">{label}</span>
  <input type={type} value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})} className="h-14 w-full rounded-xl border border-stone-300 bg-white px-4 text-xl"/></label>;
 return <Screen step={2} onBack={()=>r.push('/onboarding')}><div className="space-y-5">
  <div><h2 className="text-2xl font-bold">Profile Details</h2><p className="text-stone-600">Filled from your voice. Change only if something is wrong.</p></div>
  {Field('name','Name')}{Field('artisanId','Artisan Identity Card')}{Field('phone','Phone number','tel')}
    {error&&<p className="rounded-xl bg-red-50 p-3 font-semibold text-red-700">{error}</p>}
    <Btn onClick={async()=>{setError('');try{const res=await fetch('/api/artisans/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});const data=await res.json();if(!res.ok)throw new Error(data.error);set({profile:f});setBusy(true)}catch(e){setError(e instanceof Error?e.message:'Unable to save profile')}}}>Submit <Check/></Btn>
 </div></Screen>;
}
