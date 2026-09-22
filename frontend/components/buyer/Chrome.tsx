'use client';
import {FormEvent,useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {Compass,Heart,Home,Package,QrCode,Search,ShoppingBag,User} from 'lucide-react';
import {Logo} from '@/components/ui';
import {useMarket} from '@/lib/market';
const NAV=[['Home','/buyer'],['Shop','/buyer/shop'],['Crafts','/buyer/crafts'],['Artisans','/buyer/artisans'],['Stories','/buyer/stories'],['Orders','/buyer/orders']];
export function BuyerHeader(){
 const path=usePathname(),r=useRouter(),{cartCount,wish,bump,setDrawer}=useMarket();const [q,setQ]=useState('');
 const go=(e:FormEvent)=>{e.preventDefault();r.push('/buyer/shop'+(q.trim()?`?q=${encodeURIComponent(q.trim())}`:''))};
 const icon="relative grid h-10 w-10 place-items-center rounded-full hover:bg-sand";
 const on=(h:string)=>h==='/buyer'?path===h:path.startsWith(h);
 return <header className="sticky top-0 z-40 border-b border-sand bg-cream/95 backdrop-blur">
  <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-8">
   <Link href="/buyer" aria-label="Artifact home"><Logo size={36}/></Link>
   <nav className="ml-4 hidden gap-6 lg:flex">{NAV.map(([n,h])=><Link key={h} href={h} className={`text-sm font-semibold ${on(h)?'text-clay':'text-ink/80 hover:text-clay'}`}>{n}</Link>)}</nav>
   <form onSubmit={go} className="ml-auto hidden max-w-xs flex-1 items-center gap-2 rounded-full border border-sand bg-white px-4 md:flex"><Search size={16} className="text-ink/50"/>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search crafts, artisans…" className="h-10 w-full bg-transparent text-sm outline-none"/></form>
   <div className="ml-auto flex items-center gap-1 md:ml-0">
    <Link href="/buyer/shop" aria-label="Search" className={`${icon} md:hidden`}><Search size={20}/></Link>
    <Link href="/buyer/verify" aria-label="Verify a product" className={icon}><QrCode size={20}/></Link>
    <Link href="/buyer/wishlist" aria-label="Wishlist" className={`${icon} hidden md:grid`}><Heart size={20}/>{!!wish.length&&<i className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-clay px-1 text-[10px] font-bold not-italic text-white">{wish.length}</i>}</Link>
    <button aria-label="Cart" onClick={()=>setDrawer(true)} className={`${icon} hidden md:grid`}><ShoppingBag size={20}/>{cartCount>0&&<i key={bump} className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 animate-bump place-items-center rounded-full bg-clay px-1 text-[10px] font-bold not-italic text-white">{cartCount}</i>}</button>
    <Link href="/buyer/profile" aria-label="Profile" className={icon}><User size={20}/></Link>
   </div></div></header>;
}
export function BottomNav(){
 const path=usePathname(),{cartCount,bump}=useMarket();
 const items=[['Home','/buyer',Home],['Explore','/buyer/shop',Compass],['Wishlist','/buyer/wishlist',Heart],['Orders','/buyer/orders',Package],['Cart','/buyer/cart',ShoppingBag]] as const;
 return <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sand bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
  {items.map(([n,h,I])=>{const a=h==='/buyer'?path===h:path.startsWith(h);return <Link key={h} href={h} className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${a?'text-clay':'text-ink/60'}`}><I size={22}/>{n}
   {n==='Cart'&&cartCount>0&&<i key={bump} className="absolute right-[28%] top-1 grid h-4 min-w-4 animate-bump place-items-center rounded-full bg-clay px-1 text-[10px] font-bold not-italic text-white">{cartCount}</i>}</Link>})}</nav>;
}
export function Footer(){
 return <footer className="mt-20 hidden border-t border-sand bg-sand/50 md:block"><div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-8 text-sm text-ink/70">
  <p><b className="text-ink">Artifact</b> · Real Artisan → Real Craft → Verified Origin → Real Marketplace</p>
  <div className="flex gap-6"><Link href="/buyer/verify" className="hover:text-clay">Verify a product</Link><Link href="/onboarding" className="hover:text-clay">For artisans</Link></div></div></footer>;
}
