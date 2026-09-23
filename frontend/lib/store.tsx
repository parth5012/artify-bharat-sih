'use client';
import {createContext,useContext,useEffect,useState,ReactNode} from 'react';
export type Lang={code:string;name:string;native:string;tts:string};
export type Photo={id:string;src:string;rawSrc?:string;lat:number|null;lng:number|null;ts:number};
export type Profile={name:string;artisanId:string;phone:string;place?:string;craft?:string};
export type Product={localName:string;recognizedAs:string;description:string;howMade:string;usedFor:string;materials:string[];time:string;craft:string;price:number};
export type RecordIdentity={id:string;hash:string;parentHash:string;childHash:string;serialNumber:string;ts:number};
export type State={lang:Lang|null;profile:Profile;photos:Photo[];product:Product|null;record:RecordIdentity|null;productId:string|null};
const init:State={lang:null,profile:{name:'',artisanId:'',phone:''},photos:[],product:null,record:null,productId:null};
const Ctx=createContext<{s:State;set:(p:Partial<State>)=>void}>(null!);
const KEY='artifact-artisan-draft-v1';
export function StoreProvider({children}:{children:ReactNode}){
 const [s,setS]=useState(init),[hydrated,setHydrated]=useState(false);
 useEffect(()=>{try{const saved=localStorage.getItem(KEY);if(saved)setS({...init,...JSON.parse(saved)})}catch{}setHydrated(true)},[]);
 useEffect(()=>{if(!hydrated)return;try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}},[s,hydrated]);
 return <Ctx.Provider value={{s,set:p=>setS(o=>({...o,...p}))}}>{children}</Ctx.Provider>
}
export const useStore=()=>useContext(Ctx);
