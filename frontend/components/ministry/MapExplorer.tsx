'use client';
import {useMemo,useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {IndiaMap,Legend,scaleColor} from './IndiaMap';
import {Card,Pill} from './ui';
import {clusters as ALL,fmt,getDistricts,LAYERS,LayerId,states,stateById,Cluster,kpis} from '@/lib/ministry/data';
type Sel={state:string|null;district:string|null;cluster:string|null};
const M=({label,value}:{label:string;value:string})=><div className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-0.5 text-xl font-bold text-navy">{value}</p></div>;
export function MapExplorer({layers,initial='density',title='India Artisan Heatmap'}:{layers?:LayerId[];initial?:LayerId;title?:string}){
 const list=LAYERS.filter(l=>!layers||layers.includes(l.id));const [layer,setLayer]=useState<LayerId>(initial),[sel,setSel]=useState<Sel>({state:null,district:null,cluster:null});
 const L=LAYERS.find(l=>l.id===layer)!;const vals=states.map(L.get),min=Math.min(...vals),max=Math.max(...vals);
 const fills=useMemo(()=>Object.fromEntries(states.map(s=>[s.id,scaleColor(L.get(s),min,max)])),[L,min,max]);
 const showAll=layer==='clusters'||layer==='heritage';const cl=showAll?ALL:sel.state?ALL.filter(c=>c.stateId===sel.state):[];
 const S=sel.state?stateById(sel.state):null,D=S&&sel.district?getDistricts(S.id).find(d=>d.name===sel.district):null,C=sel.cluster?ALL.find(c=>c.id===sel.cluster)??null:null;
 const crumb=(t:string,to:Sel)=><button key={t} onClick={()=>setSel(to)} className="font-semibold text-navy hover:underline">{t}</button>;
 const top=[...states].sort((a,b)=>L.get(b)-L.get(a)).slice(0,6);const K=kpis();
 return <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
  <Card title={title} demo sub="Schematic map · click a state to drill down · demo data" right={sel.state&&<button onClick={()=>setSel({state:null,district:null,cluster:null})} className="text-xs font-semibold text-navy underline">Reset to India</button>}>
   <div className="mb-3 flex flex-wrap gap-1.5">{list.map(l=><button key={l.id} onClick={()=>setLayer(l.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${layer===l.id?'border-navy bg-navy text-white':'border-slate-300 bg-white text-slate-700 hover:border-navy'}`}>{l.label}</button>)}</div>
   <IndiaMap fills={fills} selected={sel.state} onSelect={id=>setSel({state:id,district:null,cluster:null})} tip={id=>{const s=stateById(id);return `${s.name} · ${L.label}: ${L.fmt(L.get(s))}`}} clusters={cl} activeCluster={sel.cluster} onCluster={c=>setSel({state:c.stateId,district:c.district,cluster:c.id})}/>
   <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><Legend min={min} max={max} fmt={L.fmt} label={L.label}/>{(showAll||sel.state)&&<span className="flex items-center gap-1 text-xs text-slate-600"><i className="h-3 w-3 rounded-full bg-saffron"/> Craft cluster</span>}</div>
   <p className="mt-1 text-[10px] text-slate-400">Schematic map, not an authoritative boundary. Base map: @svg-maps/india (CC BY 4.0). Values are demo data.</p></Card>
  <Card className="self-start" title={C?'Craft Cluster':D?'District Overview':S?'State Overview':'India Overview'} demo right={<Pill tone="info">Read-only</Pill>}>
   <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-slate-500">{crumb('India',{state:null,district:null,cluster:null})}{S&&<><ChevronRight size={12}/>{crumb(S.name,{state:S.id,district:null,cluster:null})}</>}{D&&<><ChevronRight size={12}/>{crumb(D.name,{state:S!.id,district:D.name,cluster:null})}</>}{C&&<><ChevronRight size={12}/><span className="font-semibold text-slate-700">{C.name}</span></>}</nav>
   {C?<ClusterDetail c={C}/>:D?<div className="space-y-4"><div className="grid grid-cols-2 gap-2"><M label="Registered artisans" value={fmt(D.registered)}/><M label="Verified" value={fmt(D.verified)}/><M label="Active" value={fmt(D.active)}/><M label="Products" value={fmt(D.products)}/><M label="Market activity (orders)" value={fmt(D.orders)}/><M label="Yojana coverage" value={D.coverage.toFixed(1)+'%'}/></div>
    <Clusters list={ALL.filter(c=>c.stateId===S!.id&&c.district===D.name)} onPick={c=>setSel({...sel,cluster:c.id})} empty="No mapped craft clusters in this district (demo data)."/></div>
   :S?<div className="space-y-4"><div className="grid grid-cols-2 gap-2"><M label="Registered artisans" value={fmt(S.registered)}/><M label="Verified" value={fmt(S.verified)}/><M label="Craft clusters" value={String(S.clusters)}/><M label="Products" value={fmt(S.products)}/><M label="Market activity (orders)" value={fmt(S.orders)}/><M label="Yojana beneficiaries" value={fmt(S.beneficiaries)}/></div>
    <div><p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Districts (drill down)</p><ul className="space-y-1">{getDistricts(S.id).map(d=>{const mx=getDistricts(S.id)[0].registered;return <li key={d.name}><button onClick={()=>setSel({...sel,district:d.name,cluster:null})} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"><span className="w-32 shrink-0 truncate">{d.name}</span><span className="h-2 flex-1 rounded bg-slate-100"><span className="block h-2 rounded bg-navy" style={{width:`${d.registered/mx*100}%`}}/></span><span className="w-14 text-right text-xs text-slate-500">{fmt(d.registered)}</span></button></li>})}</ul></div>
    <Clusters list={ALL.filter(c=>c.stateId===S.id)} onPick={c=>setSel({state:S.id,district:c.district,cluster:c.id})} empty="No mapped craft clusters in this state (demo data)."/></div>
   :<div className="space-y-4"><div className="grid grid-cols-2 gap-2"><M label="Registered artisans" value={fmt(K.artisans)}/><M label="Verified" value={fmt(K.verified)}/><M label="Products" value={fmt(K.products)}/><M label="Craft clusters" value={String(K.clusters)}/></div>
    <div><p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Top states · {L.label}</p><ul className="space-y-1">{top.map(s=><li key={s.id}><button onClick={()=>setSel({state:s.id,district:null,cluster:null})} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"><span className="w-32 shrink-0 truncate">{s.name}</span><span className="h-2 flex-1 rounded bg-slate-100"><span className="block h-2 rounded bg-navy" style={{width:`${L.get(s)/L.get(top[0])*100}%`}}/></span><span className="w-16 text-right text-xs text-slate-500">{L.fmt(L.get(s))}</span></button></li>)}</ul></div>
    <p className="text-xs text-slate-500">Select a state on the map to see its overview, districts and craft clusters.</p></div>}
  </Card></div>;
}
function Clusters({list,onPick,empty}:{list:Cluster[];onPick:(c:Cluster)=>void;empty:string}){
 return <div><p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Craft clusters</p>{list.length?<ul className="space-y-1">{list.map(c=><li key={c.id}><button onClick={()=>onPick(c)} className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:border-navy"><span><b>{c.name}</b><br/><span className="text-xs text-slate-500">{c.craft} · {c.district}</span></span><ChevronRight size={16} className="text-slate-400"/></button></li>)}</ul>:<p className="text-sm text-slate-500">{empty}</p>}</div>;
}
export function ClusterDetail({c}:{c:Cluster}){
 const rows:[string,string][]=[['Craft',c.craft],['Region',`${c.district}, ${stateById(c.stateId).name}`],['Artisan count',fmt(c.artisans)],['Product count',fmt(c.products)]];
 return <div className="space-y-3"><h4 className="text-lg font-bold text-navy">{c.name}</h4><dl className="divide-y divide-slate-100 text-sm">{rows.map(([k,v])=><div key={k} className="flex justify-between py-2"><dt className="text-slate-500">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
  <div className="flex justify-between py-2"><dt className="text-slate-500">Verification status</dt><dd><Pill tone={c.verifiedPct>=75?'ok':'warn'}>{c.status} · {c.verifiedPct}%</Pill></dd></div>
  <div className="flex justify-between py-2"><dt className="text-slate-500">Market activity</dt><dd><Pill tone={c.market==='High'?'ok':c.market==='Moderate'?'info':'warn'}>{c.market}</Pill></dd></div></dl><p className="text-[11px] text-slate-400">Illustrative cluster record · demo data</p></div>;
}
