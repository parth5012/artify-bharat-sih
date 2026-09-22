'use client';
// Shared marketplace data + state. Seed data stands in for a backend; artisan-published products merge into it.
import {createContext,useCallback,useContext,useEffect,useMemo,useState,ReactNode} from 'react';
export type Category={slug:string;name:string;about:string};
export type Artisan={id:string;name:string;craft:string;region:string;since:number;story:string;quote:string;phone?:string};
export type Craft={id:string;name:string;craft:string;price:number;artisanId:string;images:string[];wip:string[];short:string;description:string;madeHow:string;usedFor:string;materials:string[];time:string;hash:string;parentHash:string;childHash:string;serialNumber:string;added:number};
export type Ship={name:string;phone:string;line:string;city:string;state:string;pin:string};
export type Order={id:string;ts:number;lines:{id:string;qty:number;price:number}[];subtotal:number;shipping:number;total:number;ship:Ship;pay:'ondc'|'cod'};
export const rupee=(n:number)=>'₹'+n.toLocaleString('en-IN');
export const productImg=(id:string,i:number)=>`/products/${id}-${i}.jpg`;
export const wipImg=(id:string,i:number)=>`/products/${id}-wip-${i}.jpg`;
export const craftImg=(slug:string)=>`/crafts/${slug}.jpg`;
export const artisanImg=(id:string)=>`/artisans/${id}.jpg`;
export const categories:Category[]=[
 {slug:'handloom',name:'Handloom',about:'Handloom weaving turns yarn into cloth on a hand-operated loom. In ikat, the yarn is dyed before weaving, so the pattern appears as the cloth is made.'},
 {slug:'pottery',name:'Pottery',about:'From sun-baked terracotta to glazed blue pottery, each piece is shaped by hand or on the wheel, dried, and fired in kilns that have barely changed in centuries.'},
 {slug:'metal',name:'Metal Craft',about:'Dhokra uses lost-wax casting, one of the oldest metal techniques in the world. Every clay mould is broken to release the piece, so no two are identical.'},
 {slug:'wood',name:'Wood & Bamboo',about:'Local wood and bamboo are split, carved and woven by hand, keeping alive traditions of basketry, carving and joinery.'},
 {slug:'painting',name:'Painting',about:'Folk painting such as Madhubani tells stories of nature, festivals and belief, drawn with natural pigments and fine line work.'},
 {slug:'embroidery',name:'Embroidery',about:'Kantha embroidery turns layers of cloth into new textiles, joined with rows of small running stitches.'},
 {slug:'jewellery',name:'Jewellery',about:'Silver filigree jewellery is drawn from fine wire and shaped by hand, needing extraordinary patience and a steady eye.'},
 {slug:'decor',name:'Traditional Decor',about:'Handmade décor brings craft into the home — woven, painted or carved by hand from local materials.'},
];
export const artisans:Artisan[]=[
 {id:'ART-2041',name:'Ramesh Kumar',craft:'Dhokra metal casting',region:'Bastar, Chhattisgarh',since:1998,story:'Ramesh learned lost-wax casting from his father in a village near Bastar. He still shapes every wax model by hand and fires his moulds in a wood kiln behind his home.',quote:'Each piece is handcrafted using techniques passed through generations of my family.',phone:'98765 43210'},
 {id:'ART-1187',name:'Sunita Devi',craft:'Terracotta pottery',region:'Khurja, Uttar Pradesh',since:2004,story:'Sunita throws clay on her family’s wheel each morning. Her pots are sun-dried and fired the old way, and she teaches the village girls to do the same.',quote:'Clay remembers the hands that made it.'},
 {id:'ART-3310',name:'Bipul Das',craft:'Bamboo & cane weaving',region:'Guwahati, Assam',since:2001,story:'Bipul chooses each bamboo stalk himself. He splits it, smooths it and weaves it into baskets and hangings using patterns from his grandmother.',quote:'Bamboo bends but does not break — good lesson for a craftsman.'},
 {id:'ART-0925',name:'Kavita Jha',craft:'Madhubani painting',region:'Madhubani, Bihar',since:2008,story:'Kavita paints with bamboo pens and colours ground from flowers and leaves. Her fish, peacocks and trees of life follow the women’s tradition of her village.',quote:'Every line is a prayer, drawn slowly.'},
 {id:'ART-1542',name:'Rekha Mondal',craft:'Kantha embroidery',region:'Birbhum, West Bengal',since:2003,story:'Rekha leads a group of twelve women who stitch kantha together. One stole takes days of tiny running stitches.',quote:'Small stitches, done patiently, become a whole story.'},
 {id:'ART-2208',name:'Arjun Meena',craft:'Blue pottery',region:'Jaipur, Rajasthan',since:2010,story:'Arjun makes blue pottery from quartz and glass — no clay. Each vase is painted freehand with cobalt-blue florals and fired at low heat.',quote:'Blue is the colour of patience.'},
 {id:'ART-1673',name:'Lakshmi Reddy',craft:'Pochampally ikat',region:'Pochampally, Telangana',since:1995,story:'Lakshmi ties and dyes the yarn before it reaches the loom, so the pattern is woven in, not printed. Her family has woven ikat for four generations.',quote:'The design is in the thread before the cloth begins.'},
 {id:'ART-2890',name:'Salim Ansari',craft:'Silver filigree',region:'Cuttack, Odisha',since:2000,story:'Salim draws silver into hair-thin wire and shapes it into lace-like jewellery in the Cuttack tarakasi tradition.',quote:'Silver becomes lace when you are patient.'},
];
const mk=(id:string,name:string,craft:string,price:number,artisanId:string,n:number,w:number,short:string,description:string,madeHow:string,usedFor:string,materials:string[],time:string):Craft=>{const hash=hashOf(id+name);return{id,name,craft,price,artisanId,images:Array.from({length:n},(_,i)=>productImg(id,i+1)),wip:Array.from({length:w},(_,i)=>wipImg(id,i+1)),short,description,madeHow,usedFor,materials,time,hash,parentHash:hash,childHash:hash,serialNumber:'1',added:0}};
function hashOf(seed:string){let a=2166136261,o='';for(let i=0;o.length<64;i++){a^=seed.charCodeAt(i%seed.length)+i;a=Math.imul(a,16777619)>>>0;o+=a.toString(16).padStart(8,'0')}return o.slice(0,64)}
const seed:Craft[]=[
 mk('p1','Blue Pottery Vase','pottery',1450,'ART-2208',4,2,'Hand-painted glazed vase.','A hand-shaped blue pottery vase made from quartz, glass and gum instead of clay. Every floral motif is brushed freehand, so no two pieces are alike.','Moulded by hand, painted freehand, glazed and fired','Flowers & home décor',['Quartz powder','Glass','Multani mitti'],'5 days'),
 mk('p2','Terracotta Matka','pottery',650,'ART-1187',3,2,'Natural clay pot that keeps water cool.','Thrown on a potter’s wheel from local clay, sun-dried and fired in a traditional kiln. The porous clay cools water naturally.','Wheel-thrown, sun-dried, kiln-fired','Storing & cooling drinking water',['Local clay','River sand'],'3 days'),
 mk('p3','Bamboo Storage Basket','wood',890,'ART-3310',3,1,'Woven basket with a fitted lid.','Split and woven by hand from mature bamboo in a close-weave pattern. Light, strong and fully biodegradable.','Hand-split and hand-woven','Storage, laundry, gifting',['Bamboo','Cane strips'],'2 days'),
 mk('p4','Madhubani Painting','painting',2200,'ART-0925',5,3,'Folk art on handmade paper.','A Madhubani painting drawn with bamboo pens and natural pigments on handmade paper, with fish, peacocks and a tree of life in fine line work.','Hand-drawn and painted in layers','Wall art & gifting',['Handmade paper','Natural pigments'],'7 days'),
 mk('p5','Dhokra Lamp','metal',1800,'ART-2041',3,2,'Lost-wax cast brass lamp.','A tribal brass lamp cast by the lost-wax method. The clay mould is broken to release the piece, making each lamp one of a kind.','Lost-wax casting, hand-finished','Lighting & décor',['Brass','Beeswax','River clay'],'4 days'),
 mk('p6','Kantha Stitch Stole','embroidery',1250,'ART-1542',4,2,'Hand-stitched cotton stole.','Layers of soft cotton joined with fine running stitches into patterns of flowers and waves. Warm, light and gentle on the skin.','Hand-stitched, layer by layer','Wearing & gifting',['Cotton cloth','Cotton thread'],'8 days'),
 mk('p7','Pochampally Ikat Dupatta','handloom',1650,'ART-1673',3,2,'Handwoven ikat cotton dupatta.','Handwoven with yarn that is tied and dyed before weaving, giving the crisp geometric patterns of Pochampally ikat.','Tie-dyed yarn, handwoven on a pit loom','Wearing & gifting',['Cotton yarn','Natural dyes'],'6 days'),
 mk('p8','Silver Filigree Earrings','jewellery',2100,'ART-2890',3,1,'Lace-fine silver wirework.','Earrings shaped from hair-thin silver wire in the Cuttack filigree tradition, each curl placed by hand.','Wire drawn, twisted and shaped by hand','Wearing & gifting',['Sterling silver'],'4 days'),
 mk('p9','Cane Wall Hanging','decor',780,'ART-3310',2,1,'Woven cane wall décor.','A hand-woven cane wall hanging in a traditional Assamese pattern, light enough for any wall.','Hand-woven on a cane frame','Wall décor',['Cane','Bamboo ring'],'2 days'),
];
export const stages=['Order placed','Artisan is preparing','Packed with care','On the way','Delivered'];
export const totals=(sub:number)=>{const shipping=sub===0||sub>=1500?0:80;return{subtotal:sub,shipping,total:sub+shipping}};
type Draft={ship:Ship;pay:'ondc';language:string};
type Saved={cart:{id:string;qty:number}[];wish:string[];orders:Order[];published:Craft[];extra:Artisan[]};
type Ctx={ready:boolean;products:Craft[];artisans:Artisan[];cart:{id:string;qty:number}[];wish:string[];orders:Order[];cartCount:number;subtotal:number;bump:number;toast:string|null;drawer:boolean;draft:Draft|null;
 getProduct:(id:string)=>Craft|undefined;getArtisan:(id:string)=>Artisan|undefined;add:(id:string,q?:number)=>void;setQty:(id:string,q:number)=>void;remove:(id:string)=>void;toggleWish:(id:string)=>void;
 publish:(p:Craft,a?:Artisan)=>void;placeOrder:(d:Draft)=>Order;setDrawer:(b:boolean)=>void;setDraft:(d:Draft|null)=>void;notify:(m:string)=>void};
const C=createContext<Ctx>(null!);
const KEY='artifact-market-v1';
export function MarketProvider({children}:{children:ReactNode}){
 const [d,setD]=useState<Saved>({cart:[],wish:[],orders:[],published:[],extra:[]});const [ready,setReady]=useState(false);
 const [bump,setBump]=useState(0),[toast,setToast]=useState<string|null>(null),[drawer,setDrawer]=useState(false),[draft,setDraft]=useState<Draft|null>(null);
 useEffect(()=>{try{const r=localStorage.getItem(KEY);if(r)setD(JSON.parse(r))}catch{}setReady(true)},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem(KEY,JSON.stringify(d))}catch{}},[d,ready]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),2600);return()=>clearTimeout(t)},[toast]);
 const products=useMemo(()=>[...d.published,...seed],[d.published]);
 const all=useMemo(()=>[...artisans,...d.extra.filter(e=>!artisans.some(a=>a.id===e.id))],[d.extra]);
 const getProduct=useCallback((id:string)=>products.find(p=>p.id===id),[products]);
 const getArtisan=useCallback((id:string)=>all.find(a=>a.id===id),[all]);
 const notify=useCallback((m:string)=>setToast(m),[]);
 const add=useCallback((id:string,q=1)=>{setD(o=>({...o,cart:o.cart.some(l=>l.id===id)?o.cart.map(l=>l.id===id?{...l,qty:Math.min(9,l.qty+q)}:l):[...o.cart,{id,qty:q}]}));setBump(b=>b+1);setToast('Added to cart')},[]);
 const setQty=useCallback((id:string,q:number)=>setD(o=>({...o,cart:q<1?o.cart.filter(l=>l.id!==id):o.cart.map(l=>l.id===id?{...l,qty:Math.min(9,q)}:l)})),[]);
 const remove=useCallback((id:string)=>setD(o=>({...o,cart:o.cart.filter(l=>l.id!==id)})),[]);
 const toggleWish=useCallback((id:string)=>setD(o=>({...o,wish:o.wish.includes(id)?o.wish.filter(w=>w!==id):[...o.wish,id]})),[]);
 const publish=useCallback((p:Craft,a?:Artisan)=>setD(o=>({...o,published:[p,...o.published.filter(x=>x.id!==p.id)],extra:a?[a,...o.extra.filter(x=>x.id!==a.id)]:o.extra})),[]);
 const subtotal=d.cart.reduce((s,l)=>s+l.qty*(products.find(p=>p.id===l.id)?.price??0),0);
 const placeOrder=useCallback((dr:Draft)=>{
  const lines=d.cart.map(l=>({...l,price:products.find(p=>p.id===l.id)?.price??0}));const t=totals(lines.reduce((s,l)=>s+l.qty*l.price,0));
  const o:Order={id:'AF'+Date.now().toString().slice(-8),ts:Date.now(),lines,...t,ship:dr.ship,pay:dr.pay};
  setD(x=>({...x,orders:[o,...x.orders],cart:[]}));setDraft(null);return o;
 },[d.cart,products]);
 return <C.Provider value={{ready,products,artisans:all,cart:d.cart,wish:d.wish,orders:d.orders,cartCount:d.cart.reduce((s,l)=>s+l.qty,0),subtotal,bump,toast,drawer,draft,getProduct,getArtisan,add,setQty,remove,toggleWish,publish,placeOrder,setDrawer,setDraft,notify}}>{children}</C.Provider>;
}
export const useMarket=()=>useContext(C);
export const qrUrl=(hash:string)=>(typeof window!=='undefined'?window.location.origin:'https://artifact.example')+'/buyer/q/'+hash;
export const craftName=(slug:string)=>categories.find(c=>c.slug===slug)?.name??'Handcraft';
export const firstName=(n:string)=>n.split(' ')[0];
