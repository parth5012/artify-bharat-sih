// Mock services — replace with real Bhashini / vision / backend calls later.
import {Lang,Photo,Product} from './store';
export const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export type Heard={transcript:string;fields:{label:string;value:string}[]};
const ID={name:'Ramesh Kumar',artisanId:'ART-2041',phone:'9876543210',place:'Bastar, Chhattisgarh',craft:'metal'};
const PR:Product={localName:'Dhokra Elephant',recognizedAs:'Dhokra brass figurine',description:'Hand-cast brass elephant made by the ancient lost-wax method. A wax model is coated in clay, melted out and filled with molten brass — so every piece is one of a kind.',howMade:'Lost-wax casting, hand-finished',usedFor:'Home décor & gifting',materials:['Brass','Beeswax','River clay'],time:'5 days',craft:'metal',price:2499};
export async function detectLanguage(_a:Blob|null):Promise<Lang>{await sleep(1200);return{code:'hi',name:'Hindi',native:'हिन्दी',tts:'hi-IN'}}
export async function listen(kind:'identity'|'product',_a:Blob|null):Promise<Heard>{
 await sleep(900);
 return kind==='identity'?{transcript:'“मेरा नाम रमेश कुमार है, मेरा आर्टिज़न आईडी ART-2041 है, फ़ोन 98765 43210।”',fields:[{label:'Name',value:ID.name},{label:'Artisan ID',value:ID.artisanId},{label:'Phone',value:ID.phone}]}
 :{transcript:'“यह ढोकरा का हाथी है। मोम और मिट्टी से साँचा बनाकर पीतल डालते हैं। सजावट के काम आता है। पाँच दिन लगते हैं।”',fields:[{label:'Product',value:PR.localName},{label:'How it is made',value:PR.howMade},{label:'Used for',value:PR.usedFor},{label:'Materials',value:PR.materials.join(', ')},{label:'Time to make',value:PR.time}]};
}
export async function transcribeIdentity(_a:Blob|null){await sleep(300);return ID}
export async function transcribeProduct(_a:Blob|null):Promise<Product>{await sleep(300);return PR}
export async function enhancePhoto(src:string){await sleep(300);return src} // TODO: real background removal + lighting API
export async function shrink(src:string,max=720):Promise<string>{
 return new Promise(res=>{const i=new Image();i.onload=()=>{const k=Math.min(1,max/Math.max(i.width,i.height));const c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d')!.drawImage(i,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.8))};i.onerror=()=>res(src);i.src=src});
}
async function digest(value:string){
 try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}
 catch{return Array.from({length:64},()=>Math.floor(Math.random()*16).toString(16)).join('')}
}
export async function createRecord(photos:Photo[],p:Product|null){
 const data=JSON.stringify({photos:photos.map(x=>({lat:x.lat,lng:x.lng,ts:x.ts,len:x.src.length})),p,t:Date.now()});
 const parentHash=await digest(data);const serialNumber='1';const childHash=await digest(`${parentHash}:${serialNumber}`);
 return{id:'REC-'+parentHash.slice(0,8).toUpperCase(),hash:parentHash,parentHash,childHash,serialNumber,ts:Date.now()};
}
export function getPosition():Promise<{lat:number;lng:number}|null>{
 return new Promise(res=>{if(!navigator.geolocation)return res(null);const t=setTimeout(()=>res(null),6000);
 navigator.geolocation.getCurrentPosition(p=>{clearTimeout(t);res({lat:p.coords.latitude,lng:p.coords.longitude})},()=>{clearTimeout(t);res(null)},{enableHighAccuracy:true,timeout:6000})});
}
export function speak(t:string,lang='hi-IN'){if(typeof window==='undefined'||!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang=lang;u.rate=0.9;window.speechSynthesis.speak(u)}
