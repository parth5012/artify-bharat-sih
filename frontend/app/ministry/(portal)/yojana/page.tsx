'use client';
import {useMemo,useState} from 'react';
import {AlertTriangle} from 'lucide-react';
import {Card,PageHead,Pill,Select} from '@/components/ministry/ui';
import {MapExplorer} from '@/components/ministry/MapExplorer';
import {BeforeAfter,C,Trend} from '@/components/ministry/Charts';
import {beforeAfter,coverageClass,districtNames,fmt,states,stateById,YFilter,YMETRICS,yojanaTrend,YOJANAS} from '@/lib/ministry/data';
export default function Yojana(){
 const [f,setF]=useState<YFilter>({yojana:YOJANAS[0].id,period:'12m',state:'all',district:'all',craft:'all'});
 const [metric,setMetric]=useState<typeof YMETRICS[number][0]>('beneficiaries');
 const districts=f.state==='all'?[]:districtNames(f.state);
 const rows=useMemo(()=>beforeAfter(f),[f]);const tr=useMemo(()=>yojanaTrend(f,metric),[f,metric]);
 const cc=coverageClass();const gaps=states.filter(s=>cc.of(s)==='hi-lo').sort((a,b)=>b.registered-a.registered);
 const set=(k:keyof YFilter,v:string)=>setF(x=>({...x,[k]:v,...(k==='state'?{district:'all'}:{})}));
 return <div className="space-y-5"><PageHead title="Yojana Impact & Policy Analytics" sub="How government schemes reach artisans, and what measurable changes are associated with them. Demo data — does not represent an actual scheme evaluation."/>
  <Card title="Filters"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
   <Select label="Select Yojana" value={f.yojana} onChange={v=>set('yojana',v)} options={YOJANAS.map(y=>[y.id,y.name])}/>
   <Select label="Select Period" value={f.period} onChange={v=>set('period',v)} options={[['6m','Last 6 months'],['12m','Last 12 months']]}/>
   <Select label="Select State" value={f.state} onChange={v=>set('state',v)} options={[['all','All states'],...states.map(s=>[s.id,s.name] as [string,string])]}/>
   <Select label="Select District" value={f.district} onChange={v=>set('district',v)} disabled={!districts.length} options={[['all','All districts'],...districts.map(d=>[d,d] as [string,string])]}/>
   <Select label="Select Craft" value={f.craft} onChange={v=>set('craft',v)} options={[['all','All crafts'],...['Handloom','Pottery','Metal Craft','Wood Craft','Painting','Embroidery','Other'].map(c=>[c,c] as [string,string])]}/></div></Card>
  <Card title="Before vs After / Observed Indicators" sub={`${YOJANAS.find(y=>y.id===f.yojana)?.name} · ${f.period==='12m'?'12-month':'6-month'} window · demo methodology: pre/post period comparison of aggregated indicators`} demo>
   <p className="mb-3 text-xs text-slate-500">This compares indicators before and after the selected period. It does not establish that the scheme caused the observed change.</p>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{rows.map(r=><div key={r.key} className="rounded-lg border border-slate-200 p-3"><p className="text-xs font-semibold text-slate-500">{r.label}</p><BeforeAfter before={r.before} after={r.after} unit={r.unit}/><p className={`text-center text-sm font-bold ${r.change>=0?'text-emerald-700':'text-red-700'}`}>{r.change>=0?'+':''}{r.change}{r.unit==='%'?' pts':'%'}</p></div>)}</div></Card>
  <Card title="Yojana Impact Over Time" sub="Selected indicator trend, last 18 months" demo right={<div className="w-48"><Select label="Metric" value={metric} onChange={v=>setMetric(v as typeof metric)} options={YMETRICS.map(([k,l])=>[k,l])}/></div>}>
   <Trend data={tr.data} series={[{key:'value',name:YMETRICS.find(m=>m[0]===metric)![1],color:C.navy}]} refX={tr.data[tr.start]?.m} refLabel="Scheme start"/></Card>
  <MapExplorer layers={['beneficiaries','coverage','density']} initial="coverage" title="Yojana Coverage — India Map"/>
  <Card title="Artisan Density × Yojana Coverage" sub="Comparing where artisans are concentrated against where scheme coverage is comparatively lower" demo>
   <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={18}/>
    <div><p className="font-semibold text-amber-900">Data Pattern Identified</p><p className="text-sm text-amber-900">“High artisan density with comparatively lower scheme coverage.”</p>
     <p className="mt-1 text-xs text-amber-800">This is a data pattern, not an automatic policy recommendation. The Ministry makes the policy decision.</p></div></div>
   <ul className="mt-3 grid gap-2 sm:grid-cols-2">{gaps.slice(0,8).map(s=><li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"><span>{s.name}</span><span className="flex items-center gap-2"><Pill tone="mute">{fmt(s.registered)} artisans</Pill><Pill tone="warn">{s.coverage.toFixed(1)}% coverage</Pill></span></li>)}</ul>
   <p className="mt-2 text-xs text-slate-500">Threshold: registered artisans ≥ median ({fmt(cc.md)}) and coverage below median ({cc.mc.toFixed(1)}%), demo data.</p></Card></div>;
}
