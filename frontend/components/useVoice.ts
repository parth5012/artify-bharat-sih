'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
const N=28;
export function useVoice(){
 const [listening,setL]=useState(false);const [levels,setLv]=useState<number[]>(Array(N).fill(4));
 const rec=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]),raf=useRef(0),ctx=useRef<AudioContext|null>(null),stream=useRef<MediaStream|null>(null);
 const start=useCallback(async()=>{
  setL(true);let an:AnalyserNode|null=null;
  try{const s=await navigator.mediaDevices.getUserMedia({audio:true});stream.current=s;const r=new MediaRecorder(s);chunks.current=[];r.ondataavailable=e=>chunks.current.push(e.data);r.start();rec.current=r;
   const c=new AudioContext();ctx.current=c;an=c.createAnalyser();an.fftSize=64;c.createMediaStreamSource(s).connect(an)}catch{an=null} // mic denied → simulated waveform
  const buf=new Uint8Array(32);
  const tick=()=>{setLv(Array.from({length:N},(_,i)=>an?(an.getByteFrequencyData(buf),4+buf[i%32]/255*56):4+Math.random()*48));raf.current=requestAnimationFrame(tick)};tick();
 },[]);
 const stop=useCallback(()=>new Promise<Blob|null>(res=>{
  cancelAnimationFrame(raf.current);setL(false);setLv(Array(N).fill(4));const r=rec.current;
  const clean=()=>{stream.current?.getTracks().forEach(t=>t.stop());ctx.current?.close().catch(()=>{})};
  if(r&&r.state!=='inactive'){r.onstop=()=>{clean();res(new Blob(chunks.current,{type:r.mimeType}))};r.stop()}else{clean();res(null)}
 }),[]);
 useEffect(()=>()=>{cancelAnimationFrame(raf.current);stream.current?.getTracks().forEach(t=>t.stop())},[]);
 return{listening,levels,start,stop};
}
