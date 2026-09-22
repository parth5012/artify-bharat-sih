'use client';
import {Card,PageHead,Pill,statusTone,Table} from '@/components/ministry/ui';
import {C,CraftDonut,StateBars,Trend} from '@/components/ministry/Charts';
import {onboardingTrend} from '@/lib/ministry/data';
import {useMinistry} from '@/lib/ministry/context';
export default function Artisans(){
 const {records}=useMinistry();const rows=records.filter(r=>r.type==='artisan');
 return <div className="space-y-5"><PageHead title="Artisans" sub="Registration, verification and activity of artisans. Personal details are masked for all roles in this prototype."/>
  <div className="grid gap-4 xl:grid-cols-2"><Card title="Artisans by State" demo><StateBars/></Card><Card title="Artisan Onboarding Trend" demo><Trend data={onboardingTrend()} series={[{key:'new',name:'New artisans',color:C.navy},{key:'verified',name:'Verified artisans',color:C.teal},{key:'active',name:'Active artisans',color:C.saffron}]}/></Card></div>
  <Card title="Craft Distribution" demo><CraftDonut/></Card>
  <Card title="Artisan records (masked)" sub="Read-only · sensitive fields masked" demo><Table head={['Artisan ID','Name','State','Craft','Submitted','Status']}>{rows.map(r=><tr key={r.id}><td className="px-3 py-2 font-mono text-xs">{r.id}</td><td className="px-3 py-2">{r.label}</td><td className="px-3 py-2">{r.state}</td><td className="px-3 py-2">{r.craft}</td><td className="px-3 py-2">{r.submitted}</td><td className="px-3 py-2"><Pill tone={statusTone(r.status)}>{r.status}</Pill></td></tr>)}</Table></Card></div>;
}
