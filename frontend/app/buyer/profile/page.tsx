'use client';
import Link from 'next/link';
import {ChevronRight,Heart,Package,QrCode,Palette} from 'lucide-react';
import {useMarket} from '@/lib/market';
export default function Profile(){
 const {orders,wish}=useMarket();const name=orders[0]?.ship.name??'Guest Buyer';
 const rows=[[Package,'Orders',`${orders.length} placed`,'/buyer/orders'],[Heart,'Wishlist',`${wish.length} saved`,'/buyer/wishlist'],[QrCode,'Verify a product','Enter or scan a code','/buyer/verify'],[Palette,'I am an artisan','Open the artisan app','/onboarding']] as const;
 return <div className="mx-auto max-w-xl px-4 py-8"><div className="flex items-center gap-4"><span className="grid h-20 w-20 place-items-center rounded-full bg-clay font-display text-3xl font-bold text-white">{name[0]}</span><div><h1 className="font-display text-3xl font-bold">{name}</h1><p className="text-ink/60">Artifact buyer</p></div></div>
  <ul className="mt-8 divide-y divide-sand rounded-2xl bg-white shadow-sm">{rows.map(([I,t,d,h])=><li key={t}><Link href={h} className="flex items-center gap-4 p-4"><I className="text-clay"/><div className="flex-1"><p className="font-bold">{t}</p><p className="text-sm text-ink/60">{d}</p></div><ChevronRight className="text-ink/40"/></Link></li>)}</ul></div>;
}
