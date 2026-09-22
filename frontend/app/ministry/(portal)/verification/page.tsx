'use client';
import {useMemo,useState} from 'react';
import {Card,Kpi,Locked,PageHead,Pill,Select,statusTone,Table} from '@/components/ministry/ui';
import {useMinistry} from '@/lib/ministry/context';
import {ShieldAlert,ShieldCheck,History,Clock} from 'lucide-react';
export default function Verification(){
 const {records,review,decide,can,audit}=useMinistry();
 const [tab,setTab]=useState<'artisan'|'product'|'flagged'|'history'>('artisan');const [type,setType]=useState('all');
 const list=useMemo(()=>records.filter(r=>tab==='flagged'?r.status==='Flagged':tab==='history'?(r.status==='Approved'||r.status==='Rejected'):r.type===tab&&r.status!=='Flagged'&&r.status!=='Approved'&&r.status!=='Rejected'),[records,tab]);
 const counts={pending:records.filter(r=>r.status==='Pending').length,review:records.filter(r=>r.status==='Under review').length,flagged:records.filter(r=>r.status==='Flagged').length,history:records.filter(r=>r.status==='Approved'||r.status==='Rejected').length};
 const canDecide=can('verify');
 return <div className="space-y-5"><PageHead title="Verification" sub="Review submitted artisan and product records. Approvals and rejections are recorded in the audit log."/>
  {!canDecide&&<Locked text="Your role can view verification records but cannot approve or reject. Approve/Reject requires the Ministry Officer role."/>}
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Kpi label="Pending" value={String(counts.pending)} icon={<Clock size={18}/>}/><Kpi label="Under review" value={String(counts.review)} icon={<History size={18}/>}/><Kpi label="Flagged" value={String(counts.flagged)} icon={<ShieldAlert size={18}/>}/><Kpi label="Decided" value={String(counts.history)} icon={<ShieldCheck size={18}/>}/></div>
  <Card><div className="mb-3 flex flex-wrap gap-1.5">{(['artisan','product','flagged','history'] as const).map(t=><button key={t} onClick={()=>setTab(t)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${tab===t?'border-navy bg-navy text-white':'border-slate-300 bg-white text-slate-700'}`}>{t==='artisan'?'Pending artisans':t==='product'?'Pending products':t}</button>)}</div>
   <Table head={['ID','Record','State','Craft',tab==='flagged'?'Flag reason':'Submitted','Status','Evidence','Action']}>{list.map(r=><tr key={r.id}>
    <td className="px-3 py-2 font-mono text-xs">{r.id}</td><td className="px-3 py-2">{r.label}</td><td className="px-3 py-2">{r.state}</td><td className="px-3 py-2">{r.craft}</td>
    <td className="px-3 py-2 text-xs">{tab==='flagged'?r.flag:r.submitted}</td><td className="px-3 py-2"><Pill tone={statusTone(r.status)}>{r.status}</Pill>{r.decidedBy&&<p className="mt-0.5 text-[10px] text-slate-400">{r.decidedBy} · {r.decidedAt}</p>}</td>
    <td className="px-3 py-2 text-xs text-slate-500">{r.evidence.slice(0,2).join('; ')}…</td>
    <td className="px-3 py-2"><div className="flex gap-1.5">{r.status==='Pending'&&<button onClick={()=>review(r.id)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">Review</button>}
     {canDecide&&(r.status==='Under review'||r.status==='Flagged')&&<><button onClick={()=>decide(r.id,'Approved')} className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white">Approve</button><button onClick={()=>decide(r.id,'Rejected')} className="rounded bg-red-700 px-2 py-1 text-xs font-semibold text-white">Reject</button></>}</div></td></tr>)}</Table>
   {!list.length&&<p className="py-8 text-center text-sm text-slate-500">No records in this view.</p>}</Card>
  <Card title="Recent verification activity" sub="From the audit log" demo><Table head={['Officer','Action','Record','When','Status']}>{audit.slice(0,6).map((a,i)=><tr key={i}><td className="px-3 py-2">{a.user}</td><td className="px-3 py-2">{a.action}</td><td className="px-3 py-2 font-mono text-xs">{a.record}</td><td className="px-3 py-2 text-xs">{new Date(a.ts).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</td><td className="px-3 py-2"><Pill tone={statusTone(a.status)}>{a.status}</Pill></td></tr>)}</Table></Card></div>;
}
