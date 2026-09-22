'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {VoiceScreen} from '@/components/VoiceScreen';
import {Processing} from '@/components/Processing';
import {transcribeIdentity} from '@/lib/mock';
import {useStore} from '@/lib/store';
export default function Onboarding(){
 const r=useRouter();const {set}=useStore();const [busy,setBusy]=useState(false);
 if(busy)return <Processing step={1} title="Setting up your profile" sub="Just a moment" steps={['Saving what you said','Preparing your profile']} onDone={()=>r.push('/profile')}/>;
 return <VoiceScreen kind="identity" step={1} title="Tell us about you" spoken="अपना कलाकार आईडी, नाम और फ़ोन नंबर बोलिए।" hints={['Your Artisan ID','Your name','Your phone number']} onBack={()=>r.push('/')}
  onResult={async({lang,blob})=>{const p=await transcribeIdentity(blob);const res=await fetch('/api/artisans/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});if(!res.ok)return;set({lang,profile:p});setBusy(true)}}/>;
}
