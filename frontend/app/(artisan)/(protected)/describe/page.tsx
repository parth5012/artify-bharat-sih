'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {VoiceScreen} from '@/components/VoiceScreen';
import {Processing} from '@/components/Processing';
import {transcribeProduct} from '@/lib/mock';
import {useStore} from '@/lib/store';
export default function Describe(){
 const r=useRouter();const {s,set}=useStore();const [busy,setBusy]=useState(false);
 if(busy)return <Processing step={4} title="Preparing your product page" sub="Speak → understood → written" steps={['Writing your product story','Noting materials & time','Suggesting a fair price']} onDone={()=>r.push('/review')}/>;
  return <VoiceScreen kind="product" step={4} title="Tell us about your craft" spoken="अपने हस्तशिल्प का स्थानीय नाम बताइए। इसे कैसे बनाते हैं, किस काम आता है, कौन सा कच्चा माल लगता है, और कितना समय लगता है — दिन या घंटे।"
   hints={['Name of your craft','How you make it & what it is used for','Raw materials','Time to make (days or hours)','Anything else you want to say']}
   thumbs={s.photos.map(p=>p.src)} onBack={()=>r.push('/capture')}
   onResult={({blob,voiceResult})=>{
     transcribeProduct(blob).then(p=>{
       if (voiceResult && (voiceResult.transcript || voiceResult.translation)) {
         p.localName = voiceResult.transcript || p.localName;
         p.description = voiceResult.translation || p.description;
       }
       set({product:p});
     });
     setBusy(true);
   }}/>;
}
