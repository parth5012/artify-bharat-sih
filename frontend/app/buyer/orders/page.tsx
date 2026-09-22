'use client';
import Link from 'next/link';
import {Img} from '@/components/buyer/BuyerUI';
import {rupee,useMarket} from '@/lib/market';
export default function Orders(){
 const {orders,getProduct}=useMarket();
 return <div className="mx-auto max-w-3xl px-4 py-8 md:px-8"><h1 className="font-display text-4xl font-bold">Your orders</h1>
  {orders.length?<div className="mt-6 space-y-4">{orders.map(o=><Link key={o.id} href={`/buyer/orders/${o.id}`} className="block rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md">
   <div className="flex justify-between text-sm"><p className="font-bold">Order #{o.id}</p><p className="text-ink/60">{new Date(o.ts).toLocaleDateString('en-IN',{dateStyle:'medium'})}</p></div>
   <div className="mt-3 flex items-center gap-2">{o.lines.slice(0,4).map(l=><Img key={l.id} src={getProduct(l.id)?.images[0]} className="h-14 w-12 rounded-lg"/>)}<p className="ml-auto text-lg font-bold">{rupee(o.total)}</p></div>
   <p className="mt-2 text-sm font-semibold text-clay">Track order →</p></Link>)}</div>
  :<div className="py-24 text-center"><p className="text-lg text-ink/70">No orders yet.</p><Link href="/buyer/shop" className="mt-4 inline-block rounded-full bg-clay px-6 py-3 font-bold text-white">Explore handcrafts</Link></div>}</div>;
}
