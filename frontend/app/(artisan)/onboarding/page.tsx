'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {VoiceScreen} from '@/components/VoiceScreen';
import {Processing} from '@/components/Processing';
import {extractArtisanFromTranscript} from '@/lib/nlp';
import {useStore, Profile} from '@/lib/store';

export default function Onboarding(){
 const r=useRouter();const {set}=useStore();const [busy,setBusy]=useState(false);
 if(busy)return <Processing step={1} title="Setting up your profile" sub="Just a moment" steps={['Saving what you said','Preparing your profile']} onDone={()=>r.push('/profile')}/>;
 return <VoiceScreen kind="identity" step={1} title="Tell us about you" spoken="अपना कलाकार आईडी, नाम और फ़ोन नंबर बोलिए।" hints={['Your Artisan ID','Your name','Your phone number']} onBack={()=>r.push('/')}
  onResult={async({lang,blob,voiceResult,editedFields})=>{
    const transcriptText = voiceResult?.translation || voiceResult?.transcript || '';
    const extracted = extractArtisanFromTranscript(transcriptText);

    const getField = (label: string) => {
      const val = editedFields?.find(f => f.label === label)?.value;
      return val && val !== 'Not detected' ? val : undefined;
    };

    const nameVal = getField('Name');
    const idVal = getField('Artisan ID');
    const phoneVal = getField('Phone');
    const locVal = getField('Location');
    const craftVal = getField('Craft Category');

    const p: Profile = {
      name: nameVal || extracted.name.value || '',
      artisanId: idVal || extracted.artisanId.value || '',
      phone: phoneVal || extracted.phone.value || '',
      place: locVal || extracted.location.value || undefined,
      craft: craftVal || extracted.craft.value || undefined,
    };

    if (p.name && p.artisanId && p.phone.replace(/\D/g, '').length >= 10) {
      await fetch('/api/artisans/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(p),
      }).catch(() => null);
    }

    set({lang, profile: p});
    setBusy(true);
  }}/>;
}
