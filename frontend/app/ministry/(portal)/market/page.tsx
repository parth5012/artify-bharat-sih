'use client';
import {Card,Kpi,PageHead} from '@/components/ministry/ui';
import {C,MarketBars,Trend} from '@/components/ministry/Charts';
import {fmt,kpis,marketTrend,states,ONDC_LINKED_LABEL} from '@/lib/ministry/data';
import {Link2,ListChecks,ShoppingCart,IndianRupee} from 'lucide-react';
export default function Market(){
 const K=kpis(),data=marketTrend(),top=[...states].map(s=>({s,v:s.orders/s.registered})).sort((a,b)=>b.v-a.v).slice(0,8),low=[...states].filter(s=>s.registered>15000).map(s=>({s,v:s.orders/s.registered})).sort((a,b)=>a.v-b.v).slice(0,8);
 const List=(t:string,l:typeof top)=><Card title={t} sub="Orders per registered artisan (aggregate index)" demo><ul className="space-y-1.5">{l.map(({s,v})=><li key={s.id} className="flex items-center gap-2 text-sm"><span className="w-36 truncate">{s.name}</span><span className="h-2 flex-1 rounded bg-slate-100"><span className="block h-2 rounded bg-navy" style={{width:`${Math.min(100,v/1.2*100)}%`}}/></span><span className="w-12 text-right text-xs text-slate-500">{v.toFixed(2)}</span></li>)}</ul></Card>;
 return <div className="space-y-5"><PageHead title="Market Analytics" sub="Aggregated market participation. Individual financial information is never shown."/>
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Kpi label="Listings" value={fmt(K.listings)} icon={<ListChecks size={18}/>}/><Kpi label="Orders" value={fmt(K.orders)} icon={<ShoppingCart size={18}/>}/><Kpi label="Sales / activity" value={`₹${K.salesCr} Cr`} sub="Aggregated" icon={<IndianRupee size={18}/>}/><Kpi label={ONDC_LINKED_LABEL.value} value={fmt(K.ondc)} sub={ONDC_LINKED_LABEL.sub} icon={<Link2 size={18}/>}/></div>
  <div className="grid gap-4 xl:grid-cols-2"><Card title="Listings, orders & ONDC-linked products" demo><MarketBars data={data}/></Card><Card title="Orders trend" demo><Trend data={data} series={[{key:'orders',name:'Orders',color:C.saffron},{key:'ondc',name:'ONDC-linked products',color:C.teal}]}/></Card></div>
  <div className="grid gap-4 xl:grid-cols-2">{List('Highest market participation',top)}{List('High artisan base, lower market participation',low)}</div></div>;
}
