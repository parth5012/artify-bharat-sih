'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {LogOut,Plus,User,ChevronRight,Package} from 'lucide-react';
import {Img} from '@/components/buyer/BuyerUI';
import {Screen} from '@/components/ui';
import {useStore} from '@/lib/store';
import {useMarket} from '@/lib/market';
import {rupee} from '@/lib/market';

export default function Home(){
 const r=useRouter();const {s,set}=useStore();const {products}=useMarket();const p=s.profile;
 useEffect(()=>{
  fetch('/api/auth/me').then(async x=>{
   if(!x.ok){r.replace('/login');return}
   const data=await x.json();
   if(data.user){
    set({profile:{
     name:data.user.name||'',
     artisanId:data.user.artisanId||'',
     phone:data.user.phone||'',
     place:data.user.place,
     craft:data.user.craft
    }});
   }
  }).catch(()=>r.replace('/login'))
 },[r,set]);
 const logout=async()=>{await fetch('/api/auth/logout',{method:'POST'});try{globalThis.localStorage?.removeItem('artify-auth-token')}catch{};set({lang:null,profile:{name:'',artisanId:'',phone:''},photos:[],product:null,record:null,productId:null,catalogProductId:null});r.replace('/login')};
 const mine=products.filter(x=>x.id.startsWith('u-')&&x.artisanId===p.artisanId);
 
 return <Screen><div className="flex min-h-full flex-col items-center gap-5 pb-8">
  {/* Profile Section */}
  <div className="grid h-24 w-24 place-items-center rounded-full border-2 border-stone-400 bg-white"><User size={56}/></div>
  <div className="w-full space-y-1 rounded-2xl bg-white p-5 text-lg shadow-sm">
   <div className="flex items-start justify-between gap-3">
    <p className="text-2xl font-bold">{p.name||'—'}</p>
    <button onClick={logout} aria-label="Log out" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
     <LogOut size={18}/>
    </button>
   </div>
   <p className="text-stone-600">{p.place}</p>
   <p><b>Artisan Identity Card:</b> {p.artisanId||'—'}</p>
   <p><b>Phone:</b> {p.phone||'—'}</p>
  </div>

  {/* Divider */}
  <hr className="w-full border-t-4 border-stone-800"/>

  {/* Add Product Section */}
  <p className="self-start text-xl font-bold">ADD Product</p>
  <button 
   onClick={()=>r.push('/capture')} 
   aria-label="Add product" 
   className="grid h-32 w-32 place-items-center rounded-full bg-orange-600 text-white shadow-xl active:scale-95 transition-transform hover:bg-orange-700"
  >
   <Plus size={72}/>
  </button>

  {/* Your Products Section */}
  {mine.length > 0 && (
   <div className="w-full space-y-4">
    <div className="flex items-center justify-between">
     <p className="text-xl font-bold">Your products</p>
     <span className="text-sm font-semibold text-stone-600">{mine.length} {mine.length === 1 ? 'product' : 'products'}</span>
    </div>

    {/* Product Grid - Full Cards */}
    <div className="space-y-3">
     {mine.map(product => (
      <button
       key={product.id}
       onClick={()=>r.push('/buyer/product/'+product.id)}
       className="w-full rounded-2xl border-2 border-stone-200 bg-white p-4 shadow-sm hover:border-orange-300 hover:shadow-md transition-all active:scale-[0.98] text-left"
      >
       <div className="flex gap-4">
        {/* Product Image */}
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-stone-100">
         <Img 
          src={product.images[0]} 
          className="enhanced h-full w-full object-cover"
         />
        </div>

        {/* Product Details */}
        <div className="flex flex-1 flex-col justify-between">
         <div className="space-y-1">
          <h3 className="font-bold text-stone-900 line-clamp-2 text-base leading-snug">
           {product.name}
          </h3>
          <p className="text-xs text-stone-500 uppercase tracking-wide font-semibold">
           {product.craft}
          </p>
          {product.description && (
           <p className="text-sm text-stone-600 line-clamp-2 leading-snug">
            {product.description}
           </p>
          )}
         </div>
         
         <div className="flex items-center justify-between mt-2">
          <p className="text-lg font-extrabold text-orange-700">
           {rupee(product.price)}
          </p>
          <div className="flex items-center gap-1 text-orange-600">
           <span className="text-xs font-semibold">View</span>
           <ChevronRight size={16} />
          </div>
         </div>
        </div>
       </div>

       {/* Additional Info */}
       {product.materials && product.materials.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-stone-100 pt-3">
         {product.materials.slice(0, 3).map((material, idx) => (
          <span 
           key={idx}
           className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700"
          >
           {material}
          </span>
         ))}
         {product.materials.length > 3 && (
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500">
           +{product.materials.length - 3} more
          </span>
         )}
        </div>
       )}
      </button>
     ))}
    </div>
   </div>
  )}

  {/* Empty State */}
  {mine.length === 0 && (
   <div className="w-full rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
    <Package size={48} className="mx-auto mb-3 text-stone-400" />
    <p className="text-lg font-semibold text-stone-700 mb-1">No products yet</p>
    <p className="text-sm text-stone-500">Tap the + button above to add your first product</p>
   </div>
  )}

  {/* Marketplace Link */}
  <button 
   onClick={()=>r.push('/buyer')} 
   className="mt-4 w-full rounded-full border-2 border-orange-300 bg-orange-50 py-3 font-semibold text-orange-800 hover:bg-orange-100 transition-colors"
  >
   See the marketplace →
  </button>
 </div></Screen>;
}
