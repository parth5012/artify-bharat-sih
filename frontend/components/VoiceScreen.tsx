'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,Edit3,Mic,MicOff,RotateCcw,Volume2,X} from 'lucide-react';
import {Btn,Screen,Thumb} from './ui';
import {useVoice} from './useVoice';
import {detectLanguage,Heard,listen,sleep,speak} from '@/lib/mock';
import {processVoiceAudio} from '@/lib/voice';
import {Lang} from '@/lib/store';
import {extractArtisanFromTranscript, extractProductFromTranscript} from '@/lib/nlp';
import type {VoiceResult} from '@/backend/bhashini';

export interface VoiceFieldItem {
  label: string;
  value: string;
  flag?: 'missing' | 'low_confidence' | 'verified';
}

export interface VoiceScreenResult {
  lang: Lang;
  blob: Blob | null;
  heard?: Heard | null;
  voiceResult?: VoiceResult | null;
  editedFields?: VoiceFieldItem[];
}

type Phase='idle'|'listening'|'processing'|'understanding'|'confirm'|'confirmed';
const LABELS=['Ready','Listening','Processing','Understanding','Confirmed'];
const IDX:Record<Phase,number>={idle:0,listening:1,processing:2,understanding:3,confirm:3,confirmed:4};

 export function VoiceScreen({kind,title,spoken,hints,thumbs,step,onBack,onResult}:{kind:'identity'|'product';title:string;spoken:string;hints:string[];thumbs?:string[];step:number;onBack?:()=>void;onResult:(r:VoiceScreenResult)=>void}){
  const v=useVoice();const blob=useRef<Blob|null>(null);const lastVoiceResult=useRef<VoiceResult|null>(null);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const [phase,setPhase]=useState<Phase>('idle'),[lang,setLang]=useState<Lang|null>(null),[heard,setHeard]=useState<Heard|null>(null),[shown,setShown]=useState(0);
  const [fieldItems, setFieldItems]=useState<VoiceFieldItem[]>([]);
  const [editingIdx, setEditingIdx]=useState<number|null>(null);
  const [showTextInput, setShowTextInput]=useState(false);
  const [customText, setCustomText]=useState('');

  useEffect(()=>{if(phase!=='idle')return;const t=setTimeout(()=>speak(spoken),500);return()=>{clearTimeout(t);window.speechSynthesis?.cancel()}},[spoken,phase]);

  const extractEntitiesForKind = (text: string, res: VoiceResult | null) => {
    const items: VoiceFieldItem[] = [];
    if (kind === 'identity') {
      const art = extractArtisanFromTranscript(text);
      items.push(
        { label: 'Name', value: art.name.value || '', flag: art.name.flag },
        { label: 'Artisan ID', value: art.artisanId.value || '', flag: art.artisanId.flag },
        { label: 'Phone', value: art.phone.value || '', flag: art.phone.flag },
        { label: 'Location', value: art.location.value || '', flag: art.location.flag },
        { label: 'Craft Category', value: art.craft.value || '', flag: art.craft.flag },
        { label: 'PIN', value: art.pin.value || '', flag: art.pin.flag }
      );
    } else {
      const prod = extractProductFromTranscript(text);
      items.push(
        { label: 'Product Name', value: prod.productName.value || '', flag: prod.productName.flag },
        { label: 'Materials', value: prod.materials.value?.join(', ') || '', flag: prod.materials.flag },
        { label: 'How it is made', value: prod.makingProcess.value || '', flag: prod.makingProcess.flag },
        { label: 'Used for', value: prod.usage.value || '', flag: prod.usage.flag },
        { label: 'Time required', value: prod.timeRequired.value || '', flag: prod.timeRequired.flag }
      );
    }
    return items;
  };

  const handleTestSample = async () => {
    setPhase('processing');
    const sampleText =
      kind === 'identity'
        ? 'My name is Ramesh Kumar. My artisan ID is ART-2041 and phone number is 9876543210. My PIN is 1234. I am from Bastar, Chhattisgarh practicing traditional handloom weaving.'
        : 'This is our handwoven Banarasi pure silk saree with authentic gold zari border. It took fifteen full days of handloom labor to craft this traditional piece. It is used for weddings and festive occasions.';

    try {
      const res = await processVoiceAudio('VGVzdEF1ZGlv', {
        language: 'hi',
        targetLanguage: 'en',
        kind,
        clientTranscript: sampleText,
      });
      lastVoiceResult.current = res;
      const items = extractEntitiesForKind(sampleText, res);
      setFieldItems(items);
      setHeard({
        transcript: sampleText,
        fields: items.map((it) => ({ label: it.label, value: it.value || 'Not detected' })),
      });
      setShown(0);
      setPhase('understanding');
    } catch (e: any) {
      console.error('Test sample error:', e);
    }
  };

  const handleCustomTextSubmit = async () => {
    if (!customText.trim()) return;
    const text = customText.trim();
    setShowTextInput(false);
    setPhase('processing');

    try {
      const res = await processVoiceAudio('VGVzdEF1ZGlv', {
        language: 'en',
        targetLanguage: 'en',
        kind,
        clientTranscript: text,
      });
      lastVoiceResult.current = res;
      const items = extractEntitiesForKind(text, res);
      setFieldItems(items);
      setHeard({
        transcript: text,
        fields: items.map((it) => ({ label: it.label, value: it.value || 'Not detected' })),
      });
      setShown(0);
      setPhase('understanding');
    } catch (e: any) {
      console.error('Custom text extraction error:', e);
    }
  };

  const finish=async()=>{
    const b=await v.stop();
    const liveText = v.liveTranscript?.current || '';
    blob.current=b;
    setPhase('processing');
    const l=await detectLanguage(b);
    setLang(l);

    let h: Heard | null = null;
    let items: VoiceFieldItem[] = [];

    try {
      console.log(`[VoiceScreen] Sending audio blob (${b?.size || 0} bytes) to /api/voice (kind=${kind}, liveText="${liveText.slice(0, 30)}")`);
      const res = await processVoiceAudio(b || 'VGVzdEF1ZGlv', {
        language: l?.code || 'hi',
        targetLanguage: 'en',
        kind,
        clientTranscript: liveText || undefined,
      });
      lastVoiceResult.current = res;
      if (res && (res.transcript || res.translation)) {
        const textToExtract = res.translation || res.transcript;
        items = extractEntitiesForKind(textToExtract, res);
        h = {
          transcript: res.transcript || res.translation,
          fields: items.map(it => ({ label: it.label, value: it.value || 'Not detected' })),
        };
      }
    } catch (err: any) {
      console.error('Bhashini live voice processing error:', err);
    }

    if (!h) {
      items = [
        { label: 'Microphone Status', value: v.micError || 'Audio capture returned 0 bytes', flag: 'low_confidence' },
        { label: 'Troubleshooting', value: 'Check microphone permissions or tap "Try sample speech" to test', flag: 'missing' },
      ];
      h = {
        transcript: 'No microphone audio was recorded. Please check browser permissions or use sample speech.',
        fields: items.map(it => ({ label: it.label, value: it.value })),
      };
    }

    setFieldItems(items);
    setHeard(h);
    setShown(0);
    setPhase('understanding');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhase('processing');
    blob.current = file;
    const l = await detectLanguage(file);
    setLang(l);
    try {
      console.log(`[VoiceScreen] Uploading audio file: ${file.name} (${file.size} bytes, ${file.type})`);
      const res = await processVoiceAudio(file, { language: l?.code || 'hi', targetLanguage: 'en', kind });
      lastVoiceResult.current = res;
      if (res && (res.transcript || res.translation)) {
        const textToExtract = res.translation || res.transcript;
        const items = extractEntitiesForKind(textToExtract, res);
        setFieldItems(items);
        setHeard({
          transcript: res.transcript || res.translation,
          fields: items.map(it => ({ label: it.label, value: it.value || 'Not detected' })),
        });
        setShown(0);
        setPhase('understanding');
        return;
      }
    } catch (err: any) {
      console.error('Bhashini live voice processing error:', err);
    }

    const fallbackItems: VoiceFieldItem[] = [
      { label: 'Error', value: lastVoiceResult.current?.error || 'Inference returned no text', flag: 'low_confidence' },
      { label: 'Action', value: 'Tap Retry to try another file', flag: 'missing' },
    ];
    setFieldItems(fallbackItems);
    setHeard({
      transcript: 'Could not transcribe uploaded audio file.',
      fields: fallbackItems.map(it => ({ label: it.label, value: it.value })),
    });
    setShown(0);
    setPhase('understanding');
  };

 const tap=async()=>{if(phase==='idle'){window.speechSynthesis?.cancel();setPhase('listening');await v.start()}else if(phase==='listening')finish()};
 useEffect(()=>{if(phase!=='listening')return;const t=setTimeout(finish,12000);return()=>clearTimeout(t)},[phase]); // eslint-disable-line
 useEffect(()=>{if(phase!=='understanding'||!heard)return;const last=shown>=heard.fields.length;const t=setTimeout(()=>last?setPhase('confirm'):setShown(shown+1),last?400:450);return()=>clearTimeout(t)},[phase,shown,heard]);
 function getFieldItemStyle(isEditing: boolean, isMissing: boolean): string {
   if (isEditing) return 'border-orange-500 bg-orange-50/30';
   if (isMissing) return 'border-amber-200 bg-amber-50/30 cursor-pointer hover:bg-amber-50/60';
   return 'border-stone-200 bg-white cursor-pointer hover:border-stone-300';
 }

 const confirm=async()=>{
   setPhase('confirmed');
   speak('बहुत बढ़िया!');
   await sleep(1300);
   const updatedHeard: Heard | null = heard
     ? {
         transcript: heard.transcript,
         fields: fieldItems.map(it => ({ label: it.label, value: it.value })),
       }
     : null;
   onResult({
     lang: lang!,
     blob: blob.current,
     heard: updatedHeard,
     voiceResult: lastVoiceResult.current,
     editedFields: fieldItems,
   });
 };
 const retry=()=>{setHeard(null);setFieldItems([]);setShown(0);setEditingIdx(null);setPhase('idle')};
 const on=phase==='listening',early=phase==='idle'||on||phase==='processing';

 return <Screen onBack={onBack} step={step}><div className="flex min-h-full flex-col items-center gap-4 text-center">
  <ol className="flex w-full justify-between text-[11px] font-semibold">{LABELS.map((l,i)=><li key={l} className={`flex flex-1 flex-col items-center gap-1 ${i<=IDX[phase]?'text-orange-700':'text-stone-400'}`}><span className={`h-2 w-2 rounded-full ${i<IDX[phase]?'bg-emerald-600':i===IDX[phase]?'animate-pulse bg-orange-600':'bg-stone-300'}`}/>{l}</li>)}</ol>
  <span className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-stone-700 shadow-sm">🎙 {lang?`${lang.native} · ${lang.name} detected`:'Speak in your own language'}</span>
  {!!thumbs?.length&&early&&<div className="flex gap-2 self-start">{thumbs.map((t,i)=><Thumb key={i} src={t}/>)}</div>}
  <h2 className="text-2xl font-bold">{phase==='confirm'?'Did I understand right?':title}</h2>
  {early&&<>
   <ul className="w-full space-y-1 rounded-2xl bg-white p-4 text-left text-base text-stone-700 shadow-sm">{hints.map(h=><li key={h}>• {h}</li>)}</ul>
   <button onClick={()=>speak(spoken)} className="flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 font-semibold text-orange-800"><Volume2 size={20}/> Listen again</button>

   {v.micError && (
     <div className="w-full rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 border border-red-200 text-left">
       ⚠️ {v.micError}
     </div>
   )}

   <button onClick={tap} aria-label="Microphone" disabled={phase==='processing'} className={`relative grid h-40 w-40 place-items-center rounded-full shadow-xl ${on?'bg-emerald-50':'bg-white'}`}>
    {on&&<span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/50"/>}
    {on?<Mic size={72} className="text-emerald-600"/>:<MicOff size={72} className="text-stone-700"/>}
   </button>
   <div className="flex h-14 items-center gap-[3px]">{v.levels.map((h,i)=><span key={i} className="w-1.5 rounded-full bg-stone-700/70 transition-all" style={{height:on?h:4}}/>)}</div>
    <p className="text-lg font-semibold">{phase==='idle'&&'Tap the mic and speak'}{on&&'Listening… tap again when done'}{phase==='processing'&&'Understanding your voice…'}</p>

    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={handleTestSample}
        className="rounded-full border border-orange-300 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-800 shadow-sm hover:bg-orange-100 transition-colors"
      >
        ⚡ Try sample speech
      </button>
      <button
        type="button"
        onClick={() => setShowTextInput(true)}
        className="rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 transition-colors"
      >
        ⌨️ Type speech text
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 transition-colors"
      >
        📁 Upload audio file
      </button>
    </div>

    {showTextInput && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl text-left">
          <h3 className="text-lg font-bold text-stone-900 mb-1">Enter Speech Text to Test</h3>
          <p className="text-xs text-stone-500 mb-3">
            {kind === 'identity'
              ? 'Type an artisan intro (e.g. name, phone, artisan ID, location, craft)'
              : 'Type a craft description (e.g. craft name, materials, technique, days, usage)'}
          </p>
          <textarea
            rows={4}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={
              kind === 'identity'
                ? 'My name is Ramesh Kumar. My artisan ID is ART-2041 and phone is 9876543210. I am from Bastar, Chhattisgarh practicing handloom weaving.'
                : 'This is our handwoven Banarasi pure silk saree with authentic gold zari border. It took 15 days using pit loom weaving for weddings.'
            }
            className="w-full rounded-xl border border-stone-300 p-3 text-sm outline-none focus:border-orange-500"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowTextInput(false)}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCustomTextSubmit}
              className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Extract & Confirm
            </button>
          </div>
        </div>
      </div>
    )}
   </>}
  {heard&&(phase==='understanding'||phase==='confirm')&&<div className="w-full space-y-3 text-left">
   <div className="rounded-2xl bg-orange-50/80 border border-orange-200 p-3">
     <div className="flex items-center justify-between mb-1">
       <span className="text-xs font-bold uppercase tracking-wider text-orange-800">
         {lastVoiceResult.current?.language ? `${lastVoiceResult.current.language.toUpperCase()} Voice Transcript` : 'Transcript'}
       </span>
       <button
         onClick={() => speak(heard.transcript, lang?.tts || 'hi-IN')}
         className="flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-900"
       >
         <Volume2 size={14}/> Listen
       </button>
     </div>
     <p className="italic text-stone-800 font-serif text-sm">“{heard.transcript}”</p>
     {lastVoiceResult.current?.translation && lastVoiceResult.current.translation !== heard.transcript && (
       <div className="mt-2 border-t border-orange-200/60 pt-2">
         <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">English Translation</span>
         <p className="text-xs text-stone-700">{lastVoiceResult.current.translation}</p>
       </div>
     )}
   </div>

   <div className="space-y-1">
     <div className="flex items-center justify-between px-1">
       <span className="text-xs font-bold text-stone-600 uppercase">Understood Details</span>
       <span className="text-[11px] text-stone-500">Tap any field to edit</span>
     </div>
     <ul className="space-y-2">
       {fieldItems.slice(0,shown).map((f, i) => {
         const isEditing = editingIdx === i;
         const isMissing = !f.value || f.value === 'Not detected';
         return (
           <li
             key={f.label}
             onClick={() => { if (phase === 'confirm' && !isEditing) setEditingIdx(i); }}
             className={`animate-fade-up rounded-xl border p-3 shadow-sm transition-all ${getFieldItemStyle(isEditing, isMissing)}`}
           >
             <div className="flex items-center justify-between mb-0.5">
               <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">{f.label}</p>
               {f.flag === 'verified' && (
                 <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                   ✓ Confirmed
                 </span>
               )}
               {f.flag === 'low_confidence' && (
                 <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                   ⚠️ Check
                 </span>
               )}
               {isMissing && (
                 <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                   Missing — tap to fill
                 </span>
               )}
             </div>

             {isEditing ? (
               <div className="flex gap-2 items-center mt-1">
                 <input
                   autoFocus
                   type="text"
                   defaultValue={isMissing ? '' : f.value}
                   onBlur={(e) => {
                     const updated = [...fieldItems];
                     const val = e.target.value.trim();
                     updated[i] = {
                       ...updated[i],
                       value: val || '',
                       flag: val ? 'verified' : 'missing',
                     };
                     setFieldItems(updated);
                     setEditingIdx(null);
                   }}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       (e.target as HTMLInputElement).blur();
                     }
                   }}
                   className="w-full rounded-lg border border-orange-400 bg-white p-2 text-base font-semibold outline-none"
                 />
                 <button
                   onClick={(e) => { e.stopPropagation(); setEditingIdx(null); }}
                   className="p-1 rounded-md bg-stone-200 text-stone-700 hover:bg-stone-300"
                 >
                   <Check size={18}/>
                 </button>
               </div>
             ) : (
               <div className="flex items-center justify-between">
                 <p className={`text-base font-bold ${isMissing ? 'text-stone-400 italic' : 'text-stone-900'}`}>
                   {f.value || 'Not detected'}
                 </p>
                 {phase === 'confirm' && (
                   <span className="text-stone-400 hover:text-stone-600">
                     <Edit3 size={15}/>
                   </span>
                 )}
               </div>
             )}
           </li>
         );
       })}
     </ul>
   </div>

   {phase==='understanding'&&<p className="text-center font-semibold text-orange-700 animate-pulse text-sm">Organizing your details…</p>}
   {phase==='confirm'&&<div className="flex gap-3 pt-3"><Btn aria-label="Correct" onClick={confirm}><Check size={28}/> Correct</Btn><Btn tone="red" aria-label="Try again" onClick={retry}><RotateCcw size={24}/> Speak again</Btn></div>}
  </div>}
  {phase==='confirmed'&&<div className="my-auto flex flex-col items-center gap-3"><span className="grid h-28 w-28 animate-pop place-items-center rounded-full bg-emerald-600 text-white"><Check size={64}/></span><p className="text-2xl font-bold">Got it!</p></div>}
 </div></Screen>;
}
