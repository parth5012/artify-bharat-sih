'use client';
import {BadgeCheck,Boxes,IndianRupee,Users,Waypoints} from 'lucide-react';
import {Card,Kpi,PageHead} from '@/components/ministry/ui';
import {MapExplorer} from '@/components/ministry/MapExplorer';
import {C,CraftDonut,MarketBars,StateBars,Trend} from '@/components/ministry/Charts';
import {InsightCards} from '@/components/ministry/Insights';
import {fmt,kpis,marketTrend,onboardingTrend,productTrend} from '@/lib/ministry/data';
export default function Dashboard(){
 const K=kpis();
 return <div className="space-y-6">
  <PageHead title="Artifact — Ministry Command Center" sub="Monitor → Visualize → Analyze → Verify → Report. All figures on this prototype are demo data."/>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5"><Kpi label="Total Artisans" value={fmt(K.artisans)} sub="Registered · demo" icon={<Users size={18}/>}/><Kpi label="Verified Artisans" value={fmt(K.verified)} sub={`${(K.verified/K.artisans*100).toFixed(0)}% of registered`} icon={<BadgeCheck size={18}/>}/>
   <Kpi label="Products Registered" value={fmt(K.products)} sub="With origin records" icon={<Boxes size={18}/>}/><Kpi label="Market Activity" value={`${fmt(K.orders)} orders`} sub={`₹${K.salesCr} Cr aggregated activity`} icon={<IndianRupee size={18}/>}/><Kpi label="Active Craft Clusters" value={String(K.clusters)} sub="Across states / UTs" icon={<Waypoints size={18}/>}/></div>
  <MapExplorer/>
  <h2 className="pt-2 text-xl font-bold text-navy">Artisan analytics</h2>
  <div className="grid gap-4 xl:grid-cols-2"><Card title="Artisans by State" sub="Registered · Verified · Active" demo><StateBars/></Card>
   <Card title="Artisan Onboarding Trend" sub="Monthly, last 18 months" demo><Trend data={onboardingTrend()} series={[{key:'new',name:'New artisans',color:C.navy},{key:'verified',name:'Verified artisans',color:C.teal},{key:'active',name:'Active artisans',color:C.saffron}]}/></Card></div>
  <Card title="Craft Distribution" sub="Select a segment for detail" demo><CraftDonut/></Card>
  <h2 className="pt-2 text-xl font-bold text-navy">Product & market analytics</h2>
  <div className="grid gap-4 xl:grid-cols-2"><Card title="Product Registration Trend" sub="New registrations per month" demo><Trend data={productTrend()} series={[{key:'products',name:'Products registered',color:C.navy}]}/></Card>
   <Card title="Market Activity" sub="Aggregated · no individual financial data" demo><div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[['Listings',fmt(K.listings)],['Orders',fmt(K.orders)],['Sales / activity',`₹${K.salesCr} Cr`],['ONDC-linked',fmt(K.ondc)]].map(([a,b])=><div key={a} className="rounded-lg bg-slate-50 p-2.5"><p className="text-[11px] font-semibold uppercase text-slate-500">{a}</p><p className="text-lg font-bold text-navy">{b}</p></div>)}</div><MarketBars data={marketTrend()}/></Card></div>
  <InsightCards/>
 </div>;
}
