'use client';
import {useState} from 'react';
import {Card,PageHead,Pill,statusTone,Table} from '@/components/ministry/ui';
import {useMinistry} from '@/lib/ministry/context';
export default function AuditPage(){
 const {audit}=useMinistry();const [q,setQ]=useState('');
 const list=audit.filter(a=>!q||[a.user,a.action,a.record,a.status].join(' ').toLowerCase().includes(q.toLowerCase()));
 return <div className="space-y-5"><PageHead title="Audit Logs" sub="Every administrative action taken in this portal is recorded here, including reviews, approvals, rejections, exports and role changes."/>
  <Card title="Filter" right={<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search user, action, record…" className="h-9 w-64 rounded-lg border border-slate-300 px-3 text-sm"/>}>
   <Table head={['User / Role','Action','Record','Timestamp','Status']}>{list.map((a,i)=><tr key={i}><td className="px-3 py-2">{a.user}</td><td className="px-3 py-2">{a.action}</td><td className="px-3 py-2 font-mono text-xs">{a.record}</td><td className="px-3 py-2 text-xs">{new Date(a.ts).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})}</td><td className="px-3 py-2"><Pill tone={statusTone(a.status)}>{a.status}</Pill></td></tr>)}</Table>
   {!list.length&&<p className="py-8 text-center text-sm text-slate-500">No matching entries.</p>}</Card></div>;
}
