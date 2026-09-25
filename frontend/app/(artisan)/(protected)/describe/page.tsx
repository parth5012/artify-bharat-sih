'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {VoiceScreen} from '@/components/VoiceScreen';
import {Processing} from '@/components/Processing';
import {extractProductFromTranscript} from '@/lib/nlp';
import {useStore, Product} from '@/lib/store';

function determineCraftSlug(category: string | null): string {
  if (!category) return 'handloom';
  const c = category.toLowerCase();
  if (c.includes('metal') || c.includes('brass') || c.includes('dhokra')) return 'metal';
  if (c.includes('paint') || c.includes('madhubani') || c.includes('warli')) return 'painting';
  if (c.includes('pottery') || c.includes('terracotta') || c.includes('clay')) return 'pottery';
  if (c.includes('wood')) return 'wood';
  return 'handloom';
}

function calculateEstimatedPrice(timeStr: string | null, materials: string[] | null): number {
  let days = 1;
  if (timeStr) {
    const match = timeStr.match(/(\d+(?:\.\d+)?)/);
    if (match) days = Math.max(1, parseFloat(match[1]));
  }
  // Baseline: Daily fair wage benchmark ~Rs. 450-800 + materials
  const matCost = (materials?.length || 1) * 350;
  const laborCost = days * 550;
  return Math.round((laborCost + matCost) / 100) * 100;
}

export default function Describe(){
 const r=useRouter();const {s,set}=useStore();const [busy,setBusy]=useState(false);
 if(busy)return <Processing step={4} title="Preparing your product page" sub="Speak → understood → written" steps={['Writing your product story','Noting materials & time','Suggesting a fair price']} onDone={()=>r.push('/review')}/>;
  return <VoiceScreen kind="product" step={4} title="Tell us about your craft" spoken="अपने हस्तशिल्प का स्थानीय नाम बताइए। इसे कैसे बनाते हैं, किस काम आता है, कौन सा कच्चा माल लगता है, और कितना समय लगता है — दिन या घंटे।"
   hints={['Name of your craft','How you make it & what it is used for','Raw materials','Time to make (days or hours)','Anything else you want to say']}
   thumbs={s.photos.map(p=>p.src)} onBack={()=>r.push('/capture')}
   onResult={({blob,voiceResult,editedFields})=>{
     const transcriptText = voiceResult?.translation || voiceResult?.transcript || '';
     const extracted = extractProductFromTranscript(transcriptText);

     const getField = (label: string) => {
       const val = editedFields?.find(f => f.label === label)?.value;
       return val && val !== 'Not detected' ? val : undefined;
     };

     const prodName = getField('Product Name');
     const matsStr = getField('Materials');
     const howMade = getField('How it is made');
     const usedFor = getField('Used for');
     const timeReq = getField('Time required');

     const materials = matsStr
       ? matsStr.split(',').map(m => m.trim()).filter(Boolean)
       : (extracted.materials.value || []);

     const timeVal = timeReq || (extracted.timeRequired.value || '1 day');

     const p: Product = {
       localName: prodName || (extracted.productName.value || voiceResult?.transcript || 'Handcrafted Heritage Item'),
       recognizedAs: extracted.craftCategory.value || 'Artisan Handcraft',
       description: (extracted.description.value && extracted.description.value.length > 10) 
         ? extracted.description.value 
         : (voiceResult?.translation || voiceResult?.transcript || 'Handcrafted traditional artisan product.'),
       howMade: howMade || (extracted.makingProcess.value || 'Traditional handcrafted method'),
       usedFor: usedFor || (extracted.usage.value || 'Traditional décor & gifting'),
       materials,
       time: timeVal,
       craft: determineCraftSlug(extracted.craftCategory.value),
       price: calculateEstimatedPrice(timeVal, materials),
     };

     set({product: p});
     setBusy(true);
   }}/>;
}
