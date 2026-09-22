'use client';
import Link from 'next/link';
import {Lightbulb} from 'lucide-react';
import {Card} from './ui';
import {insights} from '@/lib/ministry/data';
export function InsightCards(){
 return <div><div className="mb-3 flex items-center gap-2"><Lightbulb className="text-saffron"/><h2 className="text-xl font-bold text-navy">Data Insights</h2></div>
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{insights().map(i=><Card key={i.tag} className="flex flex-col"><p className="text-xs font-bold uppercase tracking-wide text-saffron">{i.tag}</p><p className="mt-1 font-semibold text-slate-800">“{i.text}”</p><p className="mt-1 text-sm text-slate-600">{i.detail}</p>
   <Link href={i.href} className="mt-auto pt-3 text-sm font-bold text-navy hover:underline">Investigate →</Link></Card>)}</div>
  <p className="mt-2 text-xs text-slate-500">Observations are generated from displayed demo data. They describe patterns, not causes, and are not policy recommendations.</p></div>;
}
