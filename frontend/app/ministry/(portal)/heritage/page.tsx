'use client';
import {useState} from 'react';
import {Card,PageHead,Pill,Select,Table} from '@/components/ministry/ui';
import {MapExplorer} from '@/components/ministry/MapExplorer';
import {clusters,CRAFTS,fmt,stateById} from '@/lib/ministry/data';
export default function Heritage(){
 const [craft,setCraft]=useState('all');const list=clusters.filter(c=>craft==='all'||c.craft===craft);
 return <div className="space-y-5"><PageHead title="Craft Heritage" sub="Traditional craft clusters connected with the economic ecosystem. Select a cluster marker on the map for details."/>
  <MapExplorer layers={['heritage','clusters','density','market']} initial="heritage" title="Traditional Craft Clusters"/>
  <Card title="Craft clusters" sub="Illustrative records" demo right={<div className="w-44"><Select label="Craft" value={craft} onChange={setCraft} options={[['all','All crafts'],...CRAFTS.map(c=>[c,c] as [string,string])]}/></div>}>
   <Table head={['Cluster','Craft','Region','Artisans','Products','Verification','Market activity']}>{list.map(c=><tr key={c.id}><td className="px-3 py-2 font-semibold">{c.name}</td><td className="px-3 py-2">{c.craft}</td><td className="px-3 py-2">{c.district}, {stateById(c.stateId).name}</td><td className="px-3 py-2">{fmt(c.artisans)}</td><td className="px-3 py-2">{fmt(c.products)}</td>
    <td className="px-3 py-2"><Pill tone={c.verifiedPct>=75?'ok':'warn'}>{c.status}</Pill></td><td className="px-3 py-2"><Pill tone={c.market==='High'?'ok':c.market==='Moderate'?'info':'warn'}>{c.market}</Pill></td></tr>)}</Table></Card></div>;
}
