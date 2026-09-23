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

 const Field=(k:'name'|'artisanId'|'phone',label:string,type='text')=>{
   const isMissing = !f[k] || f[k].trim() === '';
   return (
     <label className="block">
       <div className="mb-1 flex items-center justify-between">
         <span className="text-base font-semibold text-stone-600">{label}</span>
         {isMissing ? (
           <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
             Missing — please enter
           </span>
         ) : (
           <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
             Extracted from voice
           </span>
         )}
       </div>
       <input
         type={type}
         value={f[k]}
         onChange={e=>setF({...f,[k]:e.target.value})}
         placeholder={`Enter ${label.toLowerCase()}`}
         className={`h-14 w-full rounded-xl border px-4 text-xl outline-none transition-colors ${
           isMissing ? 'border-amber-300 bg-amber-50/20 focus:border-amber-500' : 'border-stone-300 bg-white focus:border-stone-500'
         }`}
       />
     </label>
   );
 };

 return <Screen step={2} onBack={()=>r.push('/onboarding')}><div className="space-y-5">
  <div><h2 className="text-2xl font-bold">Profile Details</h2><p className="text-stone-600">Filled from your voice. Change only if something is wrong.</p></div>
  {Field('name','Name')}{Field('artisanId','Artisan Identity Card')}{Field('phone','Phone number','tel')}
    {error&&<p className="rounded-xl bg-red-50 p-3 font-semibold text-red-700">{error}</p>}
    <Btn onClick={async()=>{
      setError('');
      try{
        let res=await fetch('/api/artisans/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});
        if(res.status===401){
          res=await fetch('/api/artisans/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});
        }
        const data=await res.json();
        if(!res.ok)throw new Error(data.error);
        set({profile:f});
        setBusy(true);
      }catch(e){
        setError(e instanceof Error?e.message:'Unable to save profile');
      }
    }}>Submit <Check/></Btn>
 </div></Screen>;
}
