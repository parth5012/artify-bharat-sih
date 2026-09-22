'use client';
import {ShieldAlert} from 'lucide-react';
import {Card,Locked,PageHead,Pill,Table} from '@/components/ministry/ui';
import {PERM_LABEL,ROLE_LABEL,ROLE_PERMS} from '@/lib/ministry/auth';
import {seedUsers} from '@/lib/ministry/data';
import {useMinistry} from '@/lib/ministry/context';
export default function Access(){
 const {can}=useMinistry();
 if(!can('admin'))return <div className="space-y-5"><PageHead title="Access Control" sub="Manage authorized users, roles and access policies."/><Locked text="This section is available to the Ministry Administrator role only."/></div>;
 return <div className="space-y-5"><PageHead title="Access Control" sub="Manage authorized users, roles and access policies. Demo directory — no real accounts."/>
  <Card title="Roles & permissions" demo><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map(r=><div key={r} className="rounded-lg border border-slate-200 p-3"><p className="font-semibold text-navy">{ROLE_LABEL[r]}</p><ul className="mt-2 space-y-1 text-xs text-slate-600">{ROLE_PERMS[r].map(p=><li key={p}>• {PERM_LABEL[p]}</li>)}</ul></div>)}</div></Card>
  <Card title="Authorized users" sub="Directory — identifying details masked" demo><Table head={['User ID','Name','Official email','Role','Status','Last active']}>{seedUsers.map(u=><tr key={u[0]}><td className="px-3 py-2 font-mono text-xs">{u[0]}</td><td className="px-3 py-2">{u[1]}</td><td className="px-3 py-2 text-xs">{u[2]}</td><td className="px-3 py-2">{ROLE_LABEL[u[3] as keyof typeof ROLE_LABEL]}</td><td className="px-3 py-2"><Pill tone={u[4]==='Active'?'ok':'bad'}>{u[4]}</Pill></td><td className="px-3 py-2 text-xs">{u[5]}</td></tr>)}</Table></Card>
  <Card title="Policy note"><p className="flex items-start gap-2 text-sm text-slate-600"><ShieldAlert className="mt-0.5 shrink-0 text-slate-400" size={16}/>User and role management here is a prototype UI only. Real account provisioning should go through the Ministry's identity system, with these actions logged to the audit trail.</p></Card></div>;
}
