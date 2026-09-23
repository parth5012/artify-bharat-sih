'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,Mic,MicOff,RotateCcw,Volume2,X} from 'lucide-react';
import {Btn,Screen,Thumb} from './ui';
import {useVoice} from './useVoice';
import {detectLanguage,Heard,listen,sleep,speak} from '@/lib/mock';
import {processVoiceAudio} from '@/lib/voice';
import {Lang} from '@/lib/store';
import type {VoiceResult} from '@/backend/bhashini';

export interface VoiceScreenResult {
  lang: Lang;
  blob: Blob | null;
  heard?: Heard | null;
  voiceResult?: VoiceResult | null;
}

type Phase='idle'|'listening'|'processing'|'understanding'|'confirm'|'confirmed';
const LABELS=['Ready','Listening','Processing','Understanding','Confirmed'];
const IDX:Record<Phase,number>={idle:0,listening:1,processing:2,understanding:3,confirm:3,confirmed:4};

export function VoiceScreen({kind,title,spoken,hints,thumbs,step,onBack,onResult}:{kind:'identity'|'product';title:string;spoken:string;hints:string[];thumbs?:string[];step:number;onBack?:()=>void;onResult:(r:VoiceScreenResult)=>void}){
 const v=useVoice();const blob=useRef<Blob|null>(null);const lastVoiceResult=useRef<VoiceResult|null>(null);
 const fileInputRef=useRef<HTMLInputElement>(null);
 const [phase,setPhase]=useState<Phase>('idle'),[lang,setLang]=useState<Lang|null>(null),[heard,setHeard]=useState<Heard|null>(null),[shown,setShown]=useState(0);
 useEffect(()=>{if(phase!=='idle')return;const t=setTimeout(()=>speak(spoken),500);return()=>{clearTimeout(t);window.speechSynthesis?.cancel()}},[spoken,phase]);
  const finish=async()=>{
    const b=await v.stop();
    blob.current=b;
    setPhase('processing');
    const l=await detectLanguage(b);
    setLang(l);

    let h: Heard | null = null;
    if (b && b.size > 0) {
      try {
        console.log(`[VoiceScreen] Sending audio blob (${b.size} bytes, ${b.type}) to /api/voice`);
        const res = await processVoiceAudio(b, { language: l?.code || 'hi', targetLanguage: 'en' });
        lastVoiceResult.current = res;
        if (res && (res.transcript || res.translation)) {
          h = {
            transcript: res.transcript || res.translation,
            fields: [
              { label: 'Transcript (' + (res.language || 'local').toUpperCase() + ')', value: res.transcript },
              { label: 'English Translation', value: res.translation },
              { label: 'Confidence Status', value: res.acceptedWithFlag ? (res.flag || 'Accepted (Flagged)') : 'High Confidence' }
            ]
          };
        }
      } catch (err: any) {
        console.error('Bhashini live voice processing error:', err);
      }
    }

    if (!h) {
      if (!b || b.size === 0) {
        h = {
          transcript: 'No microphone audio was recorded. Please check browser permissions and try again.',
          fields: [
            { label: 'Microphone Status', value: v.micError || 'Audio capture returned 0 bytes' },
            { label: 'Troubleshooting', value: 'Check microphone permissions or upload an audio file below' },
          ],
        };
      } else {
        h = {
          transcript: 'Audio was recorded (' + b.size + ' bytes), but no transcript was returned.',
          fields: [
            { label: 'Inference Status', value: lastVoiceResult.current?.error || 'Empty response from Bhashini' },
            { label: 'Action', value: 'Tap Retry to record again' },
          ],
        };
      }
    }

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
      const res = await processVoiceAudio(file, { language: l?.code || 'hi', targetLanguage: 'en' });
      lastVoiceResult.current = res;
      if (res && (res.transcript || res.translation)) {
        setHeard({
          transcript: res.transcript || res.translation,
          fields: [
            { label: 'Transcript (' + (res.language || 'local').toUpperCase() + ')', value: res.transcript },
            { label: 'English Translation', value: res.translation },
            { label: 'Confidence Status', value: res.acceptedWithFlag ? (res.flag || 'Accepted (Flagged)') : 'High Confidence' }
          ]
        });
        setShown(0);
        setPhase('understanding');
        return;
      }
    } catch (err: any) {
      console.error('Bhashini live voice processing error:', err);
    }

    setHeard({
      transcript: 'Could not transcribe uploaded audio file.',
      fields: [
        { label: 'Error', value: lastVoiceResult.current?.error || 'Inference returned no text' },
        { label: 'Action', value: 'Tap Retry to try another file' }
      ]
    });
    setShown(0);
    setPhase('understanding');
  };

 const tap=async()=>{if(phase==='idle'){window.speechSynthesis?.cancel();setPhase('listening');await v.start()}else if(phase==='listening')finish()};
 useEffect(()=>{if(phase!=='listening')return;const t=setTimeout(finish,12000);return()=>clearTimeout(t)},[phase]); // eslint-disable-line
 useEffect(()=>{if(phase!=='understanding'||!heard)return;const last=shown>=heard.fields.length;const t=setTimeout(()=>last?setPhase('confirm'):setShown(shown+1),last?400:450);return()=>clearTimeout(t)},[phase,shown,heard]);
 const confirm=async()=>{setPhase('confirmed');speak('बहुत बढ़िया!');await sleep(1300);onResult({lang:lang!,blob:blob.current,heard,voiceResult:lastVoiceResult.current})};
 const retry=()=>{setHeard(null);setShown(0);setPhase('idle')};
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

    <div className="mt-2 flex flex-col items-center gap-1">
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
        className="text-xs text-stone-500 underline hover:text-stone-800"
      >
        📁 Or upload an audio recording (.wav, .mp3, .m4a)
      </button>
    </div>
   </>}
  {heard&&(phase==='understanding'||phase==='confirm')&&<div className="w-full space-y-3 text-left">
   <p className="rounded-2xl bg-orange-50 p-3 italic text-stone-700">{heard.transcript}</p>
   <ul className="space-y-2">{heard.fields.slice(0,shown).map(f=><li key={f.label} className="animate-fade-up rounded-xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{f.label}</p><p className="text-lg font-bold">{f.value}</p></li>)}</ul>
   {phase==='understanding'&&<p className="text-center font-semibold text-orange-700">Writing it down for you…</p>}
   {phase==='confirm'&&<div className="flex gap-3 pt-2"><Btn aria-label="Correct" onClick={confirm}><Check size={32}/> Correct</Btn><Btn tone="red" aria-label="Try again" onClick={retry}><X size={32}/> Retry</Btn></div>}
   {phase==='confirm'&&<button onClick={retry} className="mx-auto flex items-center gap-1 text-stone-500"><RotateCcw size={16}/> Speak again</button>}</div>}
  {phase==='confirmed'&&<div className="my-auto flex flex-col items-center gap-3"><span className="grid h-28 w-28 animate-pop place-items-center rounded-full bg-emerald-600 text-white"><Check size={64}/></span><p className="text-2xl font-bold">Got it!</p></div>}
 </div></Screen>;
}
