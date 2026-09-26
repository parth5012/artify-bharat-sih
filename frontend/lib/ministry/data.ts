// DEMO DATA ONLY — deterministic mock values, not real government statistics.
// Replace these functions with authorized dataset/API calls (e.g. GET /api/ministry/states) later.
import india from '@svg-maps/india';
export const MAP=india as unknown as {viewBox:string;locations:{id:string;name:string;path:string}[]};
function mulberry(a:number){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}
const rnd=(s:string)=>mulberry(hash(s));
const r1=(n:number)=>Math.round(n*10)/10;
export const fmt=(n:number)=>Math.round(n).toLocaleString('en-IN');
export type StateM={id:string;name:string;registered:number;verified:number;active:number;clusters:number;products:number;orders:number;sales:number;eligible:number;beneficiaries:number;coverage:number;participants:number};
export type DistM={name:string;registered:number;verified:number;active:number;products:number;orders:number;eligible:number;beneficiaries:number;coverage:number;participants:number};
const W:Record<string,number>={up:1,wb:.9,rj:.85,br:.72,tn:.78,gj:.72,or:.62,as:.58,mh:.62,ka:.56,ap:.5,tg:.5,ct:.4,mp:.5,kl:.36,jk:.36,jh:.3,hr:.28,pb:.26,ut:.2,hp:.2,dl:.22,mn:.18,tr:.14,ml:.1,nl:.14,ar:.1,mz:.08,sk:.05,ga:.06,py:.05,ch:.03,dn:.02,dd:.02,an:.03,ld:.02};
const COV:Record<string,number>={br:.27,as:.3,wb:.29,up:.34,or:.33,jh:.3,mp:.4,rj:.58,tn:.63,gj:.6,ka:.56,kl:.66,ap:.52,tg:.55,mh:.5,ct:.48};
const MK:Record<string,number>={br:.18,as:.25,or:.3,jh:.2,jk:.3,up:.38,wb:.32,mp:.35,ct:.3,mh:.45,rj:.62,gj:.68,tn:.7,ka:.66,kl:.6,tg:.55,ap:.5,dl:.7};
export const states:StateM[]=MAP.locations.map(l=>{
 const r=rnd('s'+l.id),w=W[l.id]??.1,mk=MK[l.id]??.45;
 const registered=Math.round(w*42000*(.92+r()*.16)),verified=Math.round(registered*(.55+r()*.25)),active=Math.round(registered*(.5+r()*.2));
 const products=Math.round(registered*(.5+mk*.9)),orders=Math.round(products*(.15+mk*.6)),eligible=Math.round(registered*1.4);
 const cov=Math.min(.9,(COV[l.id]??.45)*(.94+r()*.12)),beneficiaries=Math.round(eligible*cov);
 return{id:l.id,name:l.name,registered,verified,active,clusters:Math.max(1,Math.round(w*15)),products,orders,sales:r1(orders*.015),eligible,beneficiaries,coverage:r1(cov*100),participants:Math.round(beneficiaries*(.65+r()*.15))};
});
export const stateById=(id:string)=>states.find(s=>s.id===id)!;
const sum=(k:keyof StateM)=>states.reduce((a,s)=>a+(s[k] as number),0);
// #195 Ministry proof (context.md component 6, "MinistryProof — ONDC-linked
// KPIs"): ONDC-linked counts are a DOCUMENTED DEMO MULTIPLIER over the demo
// listings count. This module is the client-side demo path and cannot read the
// server-side ONDC-linked intents the sandbox loop writes (db.ondcOrders +
// `product.ondc_listing` audits), so real intent counts belong to an authorized
// aggregate endpoint (e.g. GET /api/ministry/ondc) later. Aggregated counts
// only — never per-order amounts, buyer names or phone numbers.
export const ONDC_LINKED_DEMO_MULTIPLIER=0.42;
/** Shared label so every ONDC-linked figure in the ministry view says Aggregated. */
export const ONDC_LINKED_LABEL={value:'ONDC-linked products',sub:'Aggregated · demo multiplier'};
export const ondcLinkedFromListings=(listings:number)=>Math.round(listings*ONDC_LINKED_DEMO_MULTIPLIER);
export const kpis=()=>{const listings=Math.round(sum('products')*.7);return{artisans:sum('registered'),verified:sum('verified'),products:sum('products'),orders:sum('orders'),salesCr:r1(sum('sales')/100),clusters:sum('clusters'),active:sum('active'),listings,ondc:ondcLinkedFromListings(listings)}};
const DIST:Record<string,string>={an:'South Andaman,North & Middle Andaman,Nicobar',ap:'Visakhapatnam,Krishna,Guntur,Chittoor,Kurnool',ar:'Papum Pare,Tawang,East Siang,Lower Subansiri',as:'Kamrup Metropolitan,Nalbari,Jorhat,Sivasagar,Barpeta',br:'Madhubani,Patna,Bhagalpur,Gaya,Darbhanga',ch:'Chandigarh',ct:'Bastar,Raipur,Raigarh,Surguja,Kondagaon',dn:'Dadra and Nagar Haveli',dd:'Daman,Diu',dl:'New Delhi,South Delhi,North Delhi',ga:'North Goa,South Goa',gj:'Kutch,Surendranagar,Patan,Ahmedabad,Jamnagar',hr:'Faridabad,Panipat,Sonipat,Karnal',hp:'Kullu,Kangra,Chamba,Mandi',jk:'Srinagar,Budgam,Anantnag,Jammu,Baramulla',jh:'Ranchi,Dumka,West Singhbhum,Hazaribagh',ka:'Bidar,Ramanagara,Mysuru,Belagavi,Dharwad',kl:'Alappuzha,Thrissur,Kannur,Thiruvananthapuram',ld:'Kavaratti,Agatti,Minicoy',mp:'Bhopal,Ashoknagar,Indore,Mandla,Gwalior',mh:'Kolhapur,Nagpur,Pune,Sindhudurg,Aurangabad',mn:'Imphal West,Imphal East,Thoubal,Bishnupur',ml:'East Khasi Hills,West Garo Hills,Ri-Bhoi',mz:'Aizawl,Champhai,Lunglei',nl:'Kohima,Dimapur,Mokokchung,Mon',or:'Puri,Cuttack,Bargarh,Mayurbhanj,Ganjam',py:'Puducherry,Karaikal',pb:'Amritsar,Ludhiana,Patiala,Jalandhar',rj:'Jaipur,Jodhpur,Udaipur,Barmer,Bikaner',sk:'Gangtok,Namchi',tn:'Kancheepuram,Thanjavur,Madurai,Salem,Kanniyakumari',tg:'Hyderabad,Nalgonda,Adilabad,Karimnagar,Warangal',tr:'West Tripura,Gomati,Unakoti',up:'Varanasi,Moradabad,Bulandshahr,Lucknow,Agra',ut:'Dehradun,Nainital,Almora,Haridwar',wb:'Birbhum,Nadia,Murshidabad,Bankura,Kolkata'};
export function getDistricts(sid:string):DistM[]{
 const s=stateById(sid),names=(DIST[sid]||'').split(','),r=rnd('d'+sid),ws=names.map(()=>.4+r()),t=ws.reduce((a,b)=>a+b,0);
 return names.map((name,i)=>{const f=ws[i]/t,cv=Math.max(5,Math.min(90,s.coverage*(.7+r()*.6)));
  return{name,registered:Math.round(s.registered*f),verified:Math.round(s.verified*f),active:Math.round(s.active*f),products:Math.round(s.products*f),orders:Math.round(s.orders*f),eligible:Math.round(s.eligible*f),beneficiaries:Math.round(s.eligible*f*cv/100),coverage:r1(cv),participants:Math.round(s.eligible*f*cv/100*.72)}}).sort((a,b)=>b.registered-a.registered);
}
export const districtNames=(sid:string)=>(DIST[sid]||'').split(',');
export const CRAFTS=['Handloom','Pottery','Metal Craft','Wood Craft','Painting','Embroidery','Other'];
const SHARE=[.31,.14,.11,.12,.09,.13,.10];
export const craftDistribution=()=>CRAFTS.map((name,i)=>({name,value:Math.round(sum('registered')*SHARE[i]),share:SHARE[i]}));
export type Cluster={id:string;name:string;craft:string;stateId:string;district:string;artisans:number;products:number;verifiedPct:number;market:'High'|'Moderate'|'Emerging';status:string};
const CL:[string,string,string,string][]=[['Bastar Dhokra','Metal Craft','ct','Bastar'],['Khurja Ceramics','Pottery','up','Bulandshahr'],['Jaipur Blue Pottery','Pottery','rj','Jaipur'],['Madhubani Painting','Painting','br','Madhubani'],['Pochampally Ikat','Handloom','tg','Nalgonda'],['Kutch Embroidery','Embroidery','gj','Kutch'],['Channapatna Toys','Wood Craft','ka','Ramanagara'],['Kanchipuram Silk','Handloom','tn','Kancheepuram'],['Banarasi Weaving','Handloom','up','Varanasi'],['Moradabad Brassware','Metal Craft','up','Moradabad'],['Bidriware','Metal Craft','ka','Bidar'],['Cuttack Filigree','Other','or','Cuttack'],['Pipili Appliqué','Embroidery','or','Puri'],['Kondapalli Toys','Wood Craft','ap','Krishna'],['Sanganer Block Print','Other','rj','Jaipur'],['Kantha Embroidery','Embroidery','wb','Birbhum'],['Sualkuchi Silk','Handloom','as','Kamrup Metropolitan'],['Kolhapuri Footwear','Other','mh','Kolhapur'],['Chanderi Weaving','Handloom','mp','Ashoknagar'],['Papier-Mâché','Painting','jk','Srinagar'],['Thanjavur Painting','Painting','tn','Thanjavur'],['Bankura Terracotta','Pottery','wb','Bankura'],['Kullu Shawl Weaving','Handloom','hp','Kullu'],['Assam Bamboo & Cane','Wood Craft','as','Jorhat']];
export const clusters:Cluster[]=CL.map(([name,craft,stateId,district],i)=>{const r=rnd('c'+i),v=Math.round(55+r()*30),mk=MK[stateId]??.45;
 return{id:'c'+i,name,craft,stateId,district,artisans:Math.round(1200+r()*7800),products:Math.round(900+r()*9000),verifiedPct:v,market:mk>.55?'High':mk>.35?'Moderate':'Emerging',status:v>=75?'Verified cluster':'Partially verified'}});
const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const months=Array.from({length:18},(_,i)=>{const d=new Date(2025,3+i,1);return MN[d.getMonth()]+' '+String(d.getFullYear()).slice(2)});
export const onboardingTrend=()=>months.map((m,i)=>{const r=rnd('o'+i),n=Math.round(2600+i*230+r()*500);return{m,new:n,verified:Math.round(n*(.52+i*.008)+r()*150),active:Math.round(n*(.42+i*.006)+r()*200)}});
export const productTrend=()=>months.map((m,i)=>({m,products:Math.round(4200+i*380+rnd('p'+i)()*900)}));
export const marketTrend=()=>months.map((m,i)=>{const r=rnd('m'+i),l=Math.round(3000+i*310+r()*600);return{m,listings:l,orders:Math.round(l*(.18+i*.006)),ondc:Math.round(l*(.3+i*.008))}});
export const YOJANAS=[{id:'y1',name:'Yojana A — Skill & Toolkit Support',start:6},{id:'y2',name:'Yojana B — Market Linkage Support',start:9},{id:'y3',name:'Yojana C — Credit Access Support',start:3}];
export type YFilter={yojana:string;period:'6m'|'12m';state:string;district:string;craft:string};
export const YMETRICS=[['beneficiaries','Beneficiaries'],['active','Active artisans'],['products','Products registered'],['market','Market participation'],['sales','Sales / activity']] as const;
function scope(f:YFilter){let k=1;const tot=sum('registered');if(f.state!=='all')k*=stateById(f.state).registered/tot;if(f.district!=='all')k*=.18;if(f.craft!=='all')k*=SHARE[CRAFTS.indexOf(f.craft)]??.1;return k}
export function beforeAfter(f:YFilter){
 const k=scope(f),r=rnd(JSON.stringify(f)),T=kpis(),big=f.period==='12m'?1.25:1;
 const base=[['participation','Artisan participation','artisans',T.artisans*.34],['products','Product creation','products',T.products*.11],['market','Market participation','artisans',T.active*.22],['sales','Sales / activity','₹ lakh',sum('sales')*.28],['retention','Artisan retention','%',72]] as const;
 return base.map(([key,label,unit,v])=>{const pct=unit==='%',before=pct?v-4+r()*6:v*k*(.9+r()*.2),g=pct?(2+r()*7)*big:(.04+r()*.24)*big,after=pct?Math.min(96,before+g):before*(1+g);
  return{key,label,unit,before:r1(before),after:r1(after),change:pct?r1(after-before):r1((after/before-1)*100)}});
}
export function yojanaTrend(f:YFilter,metric:string){
 const k=scope(f),r=rnd(JSON.stringify(f)+metric),T=kpis(),st=YOJANAS.find(y=>y.id===f.yojana)?.start??6;
 const bm:Record<string,number>={beneficiaries:T.artisans*.012,active:T.active*.04,products:T.products*.016,market:T.active*.02,sales:sum('sales')*.03},base=bm[metric]??100;
 return{start:st,data:months.map((m,i)=>{const growth=1+i*.012+(i>=st?(i-st)*.03:0);const v=metric==='beneficiaries'?(i<st?0:base*k*(i-st+1)*(.9+r()*.2)):base*k*growth*(.94+r()*.12);return{m,value:Math.round(v*10)/10}})};
}
export function coverageClass(){
 const med=(a:number[])=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];const md=med(states.map(s=>s.registered)),mc=med(states.map(s=>s.coverage));
 return{md,mc,of:(s:StateM)=>s.registered>=md?(s.coverage<mc?'hi-lo':'hi-hi'):(s.coverage<mc?'lo-lo':'lo-hi') as 'hi-lo'|'hi-hi'|'lo-lo'|'lo-hi'};
}
export function insights(){
 const c=coverageClass(),mkt=(s:StateM)=>s.orders/s.registered;const mm=[...states].map(mkt).sort((a,b)=>a-b)[Math.floor(states.length/2)];
 const gap=states.filter(s=>c.of(s).startsWith('hi')&&mkt(s)<mm).sort((a,b)=>b.registered-a.registered).slice(0,4).map(s=>s.name);
 const cv=states.map(s=>s.coverage),ot=onboardingTrend(),growth=CRAFTS.map((n,i)=>({n,g:8+((hash(n)%120)/10)}));const top=[...growth].sort((a,b)=>b.g-a.g)[0];
 return[{tag:'Geographic Pattern',text:'Several high-density artisan clusters show comparatively lower digital market activity.',detail:`Observed in: ${gap.join(', ')}.`,href:'/ministry/market'},
  {tag:'Scheme Coverage',text:'Scheme participation varies across districts.',detail:`State-level coverage ranges from ${Math.min(...cv).toFixed(1)}% to ${Math.max(...cv).toFixed(1)}% in demo data.`,href:'/ministry/yojana'},
  {tag:'Craft Activity',text:'Selected craft registrations increased during the selected period.',detail:`${top.n} registrations rose ${top.g.toFixed(1)}% over the last 6 months (demo).`,href:'/ministry/products'},
  {tag:'Onboarding',text:'Verified-artisan onboarding has grown month over month.',detail:`Latest month: ${fmt(ot[ot.length-1].verified)} verified vs ${fmt(ot[0].verified)} at the start of the window.`,href:'/ministry/artisans'}];
}
export type LayerId='density'|'verified'|'active'|'clusters'|'products'|'market'|'beneficiaries'|'coverage'|'heritage';
export const LAYERS:{id:LayerId;label:string;get:(s:StateM)=>number;fmt:(n:number)=>string}[]=[
 {id:'density',label:'Artisan Density',get:s=>s.registered,fmt},{id:'verified',label:'Verified Artisans',get:s=>s.verified,fmt},{id:'active',label:'Active Artisans',get:s=>s.active,fmt},
 {id:'clusters',label:'Craft Clusters',get:s=>s.clusters,fmt},{id:'products',label:'Product Registrations',get:s=>s.products,fmt},{id:'market',label:'Market Activity',get:s=>s.orders,fmt},
 {id:'beneficiaries',label:'Yojana Beneficiaries',get:s=>s.beneficiaries,fmt},{id:'coverage',label:'Yojana Coverage',get:s=>s.coverage,fmt:n=>n.toFixed(1)+'%'},{id:'heritage',label:'Craft Heritage',get:s=>s.clusters,fmt}];
// ---- verification & audit seeds
export type VRec={id:string;type:'artisan'|'product';label:string;state:string;craft:string;submitted:string;status:'Pending'|'Under review'|'Flagged'|'Approved'|'Rejected';flag?:string;decidedBy?:string;decidedAt?:string;evidence:string[]};
const ev=['Maker identity: matched (details masked)','Location proof: recorded','Photos: 3 attached','Origin record: created'];
export const seedRecords:VRec[]=[
 ...['R••••• K•••••|Bastar|Metal Craft|ct','S••••• D••••|Khurja|Pottery|up','B•••• D••|Guwahati|Wood Craft|as','K•••• J••|Madhubani|Painting|br','R••• M•••••|Birbhum|Embroidery|wb','A•••• M•••|Jaipur|Pottery|rj','L•••••• R••••|Pochampally|Handloom|tg','S•••• A••••|Cuttack|Other|or'].map((x,i)=>{const[l,,c,s]=x.split('|');return{id:`ART-••••-${1000+i*137}`,type:'artisan' as const,label:l,state:stateById(s).name,craft:c,submitted:`${12+i} Sep 2026`,status:(i===1?'Under review':'Pending') as VRec['status'],evidence:ev}}),
 ...[['Dhokra Elephant','Metal Craft','ct'],['Blue Pottery Vase','Pottery','rj'],['Kantha Stitch Stole','Embroidery','wb'],['Madhubani Painting','Painting','br'],['Bamboo Storage Basket','Wood Craft','as'],['Ikat Dupatta','Handloom','tg']].map(([l,c,s],i)=>({id:`PRD-${(0x8f3a+i*977).toString(16).toUpperCase()}`,type:'product' as const,label:l,state:stateById(s).name,craft:c,submitted:`${14+i} Sep 2026`,status:'Pending' as const,evidence:ev})),
 ...[['Location mismatch with registered district','ART-••••-2210','Punjab'],['Duplicate photo detected','PRD-A91C','Uttar Pradesh'],['Incomplete documentation','ART-••••-3345','Bihar'],['Unusual listing volume','ART-••••-1876','Gujarat']].map(([f,id,s],i)=>({id,type:(id.startsWith('ART')?'artisan':'product') as 'artisan'|'product',label:id.startsWith('ART')?'M••••• S•••':'Handloom Set',state:s,craft:['Handloom','Pottery','Painting','Embroidery'][i],submitted:`${5+i} Sep 2026`,status:'Flagged' as const,flag:f,evidence:ev})),
 ...[['Approved','Officer A'],['Approved','Officer B'],['Rejected','Officer A'],['Approved','Officer C'],['Approved','Officer B']].map(([st,by],i)=>({id:`ART-••••-${4100+i*61}`,type:'artisan' as const,label:'V•••• K••••',state:['Odisha','Kerala','Bihar','Tamil Nadu','Assam'][i],craft:CRAFTS[i],submitted:`${1+i} Sep 2026`,status:st as 'Approved'|'Rejected',decidedBy:by,decidedAt:`${6+i} Sep 2026`,evidence:ev})),
];
export type Audit={ts:number;user:string;action:string;record:string;status:string};
const T0=Date.UTC(2026,8,21,4,0);
export const seedAudit:Audit[]=[['Officer A (Officer)','Reviewed Artisan','ART-••••-4100','Verified'],['Officer B (Officer)','Approved Product','PRD-8F3A','Approved'],['Analyst 2 (Analyst)','Generated Report','Report: Bihar / Handloom','Completed'],['Officer A (Officer)','Rejected Artisan','ART-••••-4161','Rejected'],['Admin (Administrator)','Updated Role','User U-0142','Applied'],['Analyst 1 (Analyst)','Exported CSV','Report: All States','Completed'],['Officer C (Officer)','Flagged Record','PRD-A91C','Flagged'],['Viewer 3 (Viewer)','Signed in (MFA)','Session S-88121','Success'],['Officer B (Officer)','Reviewed Artisan','ART-••••-4122','Verified'],['Admin (Administrator)','Suspended User','User U-0097','Applied']].map(([user,action,record,status],i)=>({ts:T0-i*47*60000,user,action,record,status}));
export const seedUsers=[['U-0101','A••••• K••••••','a.k••@gov.in','officer','Active','21 Sep 2026'],['U-0107','P•••• S••••','p.s••@gov.in','analyst','Active','21 Sep 2026'],['U-0118','R•••• M••••','r.m••@gov.in','viewer','Active','20 Sep 2026'],['U-0126','N••••• V••','n.v••@gov.in','officer','Active','19 Sep 2026'],['U-0142','S••••• T••••','s.t••@gov.in','analyst','Suspended','02 Sep 2026']] as const;
