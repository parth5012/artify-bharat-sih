'use client';
import {useState} from 'react';
import {Download,FileText,Loader2,Table as TableIcon} from 'lucide-react';
import {Button,Card,Locked,PageHead,Select} from '@/components/ministry/ui';
import {useMinistry} from '@/lib/ministry/context';
import {CRAFTS,fmt,kpis,states,YOJANAS} from '@/lib/ministry/data';
type F={state:string;district:string;craft:string;yojana:string;from:string;to:string};
export default function Reports(){
 const {can,log}=useMinistry();const [f,setF]=useState<F>({state:'all',district:'all',craft:'all',yojana:'all',from:'2025-04-01',to:'2026-09-21'});
 const [busy,setBusy]=useState<''|'gen'|'csv'|'pdf'>(''),[ready,setReady]=useState(false);
 const allowed=can('report');const K=kpis();
 const run=(kind:'gen'|'csv'|'pdf')=>{if(!allowed)return;setBusy(kind);setTimeout(()=>{setBusy('');if(kind==='gen')setReady(true);
  log(kind==='gen'?'Generated Report':kind==='csv'?'Exported CSV':'Exported PDF',`Report: ${f.state==='all'?'All States':states.find(s=>s.id===f.state)?.name} / ${f.craft==='all'?'All Crafts':f.craft}`,'Completed')},900+Math.random()*500)};
 const dl=(name:string,content:string,type:string)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)};
 const csv=()=>{run('csv');const rows=[['State','Registered','Verified','Products','Orders','Coverage%'],...states.filter(s=>f.state==='all'||s.id===f.state).map(s=>[s.name,s.registered,s.verified,s.products,s.orders,s.coverage])];dl('artifact-ministry-report-demo.csv',rows.map(r=>r.join(',')).join('\n'),'text/csv')};
 const pdf=()=>{run('pdf');window.print()};
 return <div className="space-y-5"><PageHead title="Reports & Export" sub="Generate summary reports from displayed demo data."/>
  {!allowed&&<Locked text="Your role can view reports but cannot generate or export them. This requires the Ministry Analyst role or above."/>}
  <Card title="Report filters"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
   <Select label="State" value={f.state} onChange={v=>setF({...f,state:v})} options={[['all','All states'],...states.map(s=>[s.id,s.name] as [string,string])]}/>
   <Select label="District" value={f.district} onChange={v=>setF({...f,district:v})} options={[['all','All districts']]}/>
   <Select label="Craft" value={f.craft} onChange={v=>setF({...f,craft:v})} options={[['all','All crafts'],...CRAFTS.map(c=>[c,c] as [string,string])]}/>
   <Select label="Yojana" value={f.yojana} onChange={v=>setF({...f,yojana:v})} options={[['all','All yojanas'],...YOJANAS.map(y=>[y.id,y.name] as [string,string])]}/>
   <label className="block text-xs font-semibold text-slate-600">From<input type="date" value={f.from} onChange={e=>setF({...f,from:e.target.value})} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm"/></label>
   <label className="block text-xs font-semibold text-slate-600">To<input type="date" value={f.to} onChange={e=>setF({...f,to:e.target.value})} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm"/></label></div>
   <div className="mt-4 flex flex-wrap gap-2"><Button disabled={!allowed||!!busy} onClick={()=>run('gen')}>{busy==='gen'?<Loader2 className="animate-spin" size={16}/>:<FileText size={16}/>}Generate Report</Button>
    <Button v="ghost" disabled={!allowed||!!busy} onClick={csv}>{busy==='csv'?<Loader2 className="animate-spin" size={16}/>:<TableIcon size={16}/>}Export CSV</Button>
    <Button v="ghost" disabled={!allowed||!!busy} onClick={pdf}>{busy==='pdf'?<Loader2 className="animate-spin" size={16}/>:<Download size={16}/>}Export PDF</Button></div></Card>
  {ready&&<Card id="report" title="Sample report" sub={`${f.state==='all'?'All States':states.find(s=>s.id===f.state)?.name} · ${f.craft==='all'?'All crafts':f.craft} · ${f.from} to ${f.to}`} demo>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Registered artisans',fmt(K.artisans)],['Verified artisans',fmt(K.verified)],['Products registered',fmt(K.products)],['Market activity (orders)',fmt(K.orders)]].map(([a,b])=><div key={a} className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase text-slate-500">{a}</p><p className="text-xl font-bold text-navy">{b}</p></div>)}</div>
   <p className="mt-3 text-xs text-slate-500">This is a sample prototype report generated from demo data for illustration only.</p></Card>}</div>;
}
