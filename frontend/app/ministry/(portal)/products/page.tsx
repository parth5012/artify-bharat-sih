'use client';
import {Card,PageHead,Pill,statusTone,Table} from '@/components/ministry/ui';
import {C,CraftDonut,Trend} from '@/components/ministry/Charts';
import {productTrend} from '@/lib/ministry/data';
import {useMinistry} from '@/lib/ministry/context';
export default function Products(){
 const {records}=useMinistry();const rows=records.filter(r=>r.type==='product');
 return <div className="space-y-5"><PageHead title="Products" sub="Products registered with a recorded maker, place and origin."/>
  <div className="grid gap-4 xl:grid-cols-2"><Card title="Product Registration Trend" demo><Trend data={productTrend()} series={[{key:'products',name:'Products registered',color:C.navy}]}/></Card><Card title="Registrations by craft" demo><CraftDonut/></Card></div>
  <Card title="Product registrations awaiting verification" sub="Read-only view" demo><Table head={['Product ID','Product','State','Craft','Submitted','Status']}>{rows.map(r=><tr key={r.id}><td className="px-3 py-2 font-mono text-xs">{r.id}</td><td className="px-3 py-2">{r.label}</td><td className="px-3 py-2">{r.state}</td><td className="px-3 py-2">{r.craft}</td><td className="px-3 py-2">{r.submitted}</td><td className="px-3 py-2"><Pill tone={statusTone(r.status)}>{r.status}</Pill></td></tr>)}</Table></Card></div>;
}
