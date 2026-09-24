'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {VoiceScreen} from '@/components/VoiceScreen';
import {Processing} from '@/components/Processing';
import {Btn,Screen} from '@/components/ui';
import {extractProductFromTranscript} from '@/lib/nlp';
import {useStore, Product} from '@/lib/store';
import {createProductDraft, saveProductCatalog} from '@/lib/catalogApi';

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

function parseEstimatedDays(timeStr: string | null): number {
  if (!timeStr) return 1;
  const match = timeStr.match(/(\d+(?:\.\d+)?)/);
  return match ? Math.max(1, parseFloat(match[1])) : 1;
}

export default function Describe(){
 const r=useRouter();const {s,set}=useStore();const [busy,setBusy]=useState(false);
 const [serverError,setServerError]=useState('');
 const [pendingProduct,setPendingProduct]=useState<Product|null>(null);
 if(busy)return <Processing step={4} title="Preparing your product page" sub="Speak → understood → written" steps={['Writing your product story','Noting materials & time','Suggesting a fair price']} onDone={()=>r.push('/review')}/>;
 if(serverError&&pendingProduct)return <Screen step={4}><div className="flex min-h-full flex-col items-center justify-center gap-4 text-center">
   <h2 className="text-2xl font-bold">Could not save product on server</h2>
   <p className="text-stone-600">{serverError}</p>
   <p className="text-sm text-stone-500">Your draft is saved on this device.</p>
   <Btn onClick={()=>{setServerError('');void saveToServer(pendingProduct)}}>Try again</Btn>
   <Btn tone="light" onClick={()=>{setServerError('');setPendingProduct(null);r.push('/review')}}>Continue without server save</Btn>
 </div></Screen>;

 async function saveToServer(p:Product):Promise<void>{
   set({product:p});
   setPendingProduct(p);
   setServerError('');
   try{
     const token=globalThis.localStorage?.getItem('artify-auth-token');
     if(!token)throw new Error('Sign in from the profile page to save on the server.');
      const existing=s.catalogProductId;
      let productId=existing;
      if(!productId){
        const draft=await createProductDraft({title:p.localName,craft_category:p.craft});
        productId=draft.product_id;
        // Persist the draft id immediately so a retry PATCHes this row
        // instead of creating an orphaned duplicate draft.
        set({catalogProductId:productId});
      }
      await saveProductCatalog(productId,{
        title:p.localName,
        description:p.description,
        craft_category:p.craft,
        material:p.materials.join(', '),
        estimated_days:parseEstimatedDays(p.time),
        seo_tags:[],
      });
      setPendingProduct(null);
     setBusy(true);
   }catch(e){
     setServerError(e instanceof Error?e.message:'Unable to save product on server');
   }
 }
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

     // Draft-first local save, then best-effort backend persist.
     void saveToServer(p);
   }}/>;
}
