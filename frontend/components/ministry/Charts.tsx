'use client';
import {useState} from 'react';
import {Bar,BarChart,CartesianGrid,Cell,Legend,Line,LineChart,Pie,PieChart,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {craftDistribution,fmt,states} from '@/lib/ministry/data';
export const C={navy:'#0B2A4A',blue:'#3B7DD8',teal:'#1B8A8F',saffron:'#E07B00',gray:'#94A3B8',green:'#2E7D32'};
const short=(n:number)=>n>=10000000?(n/10000000).toFixed(1)+'Cr':n>=100000?(n/100000).toFixed(1)+'L':n>=1000?(n/1000).toFixed(n>=10000?0:1)+'k':String(n);
const ax={fontSize:11,fill:'#64748B'};
export function StateBars(){
 const [top,setTop]=useState(12);const data=[...states].sort((a,b)=>b.registered-a.registered).slice(0,top).map(s=>({name:s.name,code:s.id.toUpperCase(),Registered:s.registered,Verified:s.verified,Active:s.active}));
 return <div><div className="mb-2 flex justify-end"><select aria-label="Number of states" value={top} onChange={e=>setTop(+e.target.value)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs">{[8,12,20,36].map(n=><option key={n} value={n}>Top {n}</option>)}</select></div>
  <ResponsiveContainer width="100%" height={300}><BarChart data={data} margin={{left:-10}}><CartesianGrid vertical={false} stroke="#E2E8F0"/><XAxis dataKey="code" tick={ax} interval={0}/><YAxis tick={ax} tickFormatter={short}/>
   <Tooltip labelFormatter={(_,p)=>p?.[0]?.payload?.name} formatter={(v:number)=>fmt(v)}/><Legend wrapperStyle={{fontSize:12}}/><Bar dataKey="Registered" fill={C.navy} radius={[3,3,0,0]}/><Bar dataKey="Verified" fill={C.teal} radius={[3,3,0,0]}/><Bar dataKey="Active" fill={C.saffron} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></div>;
}
export function Trend({data,series,height=280,refX,refLabel,yFmt=short}:{data:Record<string,number|string>[];series:{key:string;name:string;color:string}[];height?:number;refX?:string;refLabel?:string;yFmt?:(n:number)=>string}){
 return <ResponsiveContainer width="100%" height={height}><LineChart data={data} margin={{left:-10,right:8}}><CartesianGrid vertical={false} stroke="#E2E8F0"/><XAxis dataKey="m" tick={ax} interval={2}/><YAxis tick={ax} tickFormatter={yFmt}/>
  <Tooltip formatter={(v:number)=>fmt(v)}/>{series.length>1&&<Legend wrapperStyle={{fontSize:12}}/>}{refX&&<ReferenceLine x={refX} stroke={C.saffron} strokeDasharray="4 3" label={{value:refLabel,fill:C.saffron,fontSize:11,position:'insideTopLeft'}}/>}
  {series.map(s=><Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.2} dot={false}/>)}</LineChart></ResponsiveContainer>;
}
const PIE=[C.navy,C.blue,C.teal,C.saffron,'#7A5AA6',C.green,C.gray];
export function CraftDonut(){
 const d=craftDistribution(),[a,setA]=useState(0),tot=d.reduce((s,x)=>s+x.value,0);
 return <div className="grid items-center gap-2 sm:grid-cols-[1fr_1fr]"><div className="relative"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={d} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={2} onClick={(_,i)=>setA(i)}>{d.map((x,i)=><Cell key={x.name} fill={PIE[i]} opacity={a===i?1:.55} cursor="pointer"/>)}</Pie><Tooltip formatter={(v:number)=>fmt(v)}/></PieChart></ResponsiveContainer>
  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-xs text-slate-500">{d[a].name}</p><p className="text-xl font-bold text-navy">{(d[a].value/tot*100).toFixed(0)}%</p></div></div></div>
  <ul className="space-y-1">{d.map((x,i)=><li key={x.name}><button onClick={()=>setA(i)} className={`flex w-full items-center gap-2 rounded px-2 py-1 text-sm ${a===i?'bg-slate-100 font-semibold':''}`}><i className="h-3 w-3 rounded-sm" style={{background:PIE[i]}}/>{x.name}<span className="ml-auto text-xs text-slate-500">{fmt(x.value)}</span></button></li>)}</ul></div>;
}
export function MarketBars({data}:{data:{m:string;listings:number;orders:number;ondc:number}[]}){
 return <ResponsiveContainer width="100%" height={280}><BarChart data={data.slice(-9)} margin={{left:-10}}><CartesianGrid vertical={false} stroke="#E2E8F0"/><XAxis dataKey="m" tick={ax}/><YAxis tick={ax} tickFormatter={short}/><Tooltip formatter={(v:number)=>fmt(v)}/><Legend wrapperStyle={{fontSize:12}}/>
  <Bar dataKey="listings" name="Listings" fill={C.navy} radius={[3,3,0,0]}/><Bar dataKey="orders" name="Orders" fill={C.saffron} radius={[3,3,0,0]}/><Bar dataKey="ondc" name="ONDC-linked products" fill={C.teal} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer>;
}
export function BeforeAfter({before,after,unit}:{before:number;after:number;unit:string}){
 const d=[{n:'Before',v:before},{n:'After',v:after}];
 return <ResponsiveContainer width="100%" height={150}><BarChart data={d} margin={{left:-18,top:8}}><CartesianGrid vertical={false} stroke="#E2E8F0"/><XAxis dataKey="n" tick={ax}/><YAxis tick={ax} tickFormatter={short} domain={unit==='%'?[0,100]:[0,'auto']}/><Tooltip formatter={(v:number)=>`${fmt(v)} ${unit}`}/><Bar dataKey="v" radius={[4,4,0,0]}>{d.map((x,i)=><Cell key={x.n} fill={i?C.navy:C.gray}/>)}</Bar></BarChart></ResponsiveContainer>;
}
