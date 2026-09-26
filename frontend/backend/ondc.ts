import {randomBytes,randomUUID} from 'node:crypto';
import {OndcOrderIntent,readDb,writeDb} from './db';
import {audit} from './security';
import {mapProductToBecknCatalog,normalizeShortcode} from './beckn-mapper';
import type {BecknCatalog,BecknProductInput} from './beckn-mapper';

export async function createOndcIntent(input:Omit<OndcOrderIntent,'id'|'status'|'createdAt'|'updatedAt'>){
 const now=Date.now();const order:OndcOrderIntent={...input,id:'ondc_'+randomBytes(10).toString('hex'),status:'created',createdAt:now,updatedAt:now};const db=await readDb();db.ondcOrders.push(order);await writeDb(db);return order;
}
export async function getOndcIntent(id:string){const db=await readDb();return db.ondcOrders.find(x=>x.id===id)??null}

// Returns the order and its previous status so callers can implement
// idempotency (a webhook replaying the same status is a no-op).
export async function updateOndcIntent(id:string,status:'paid'|'failed'){
 const db=await readDb();const order=db.ondcOrders.find(x=>x.id===id);if(!order)return null;
 const previousStatus=order.status;
 order.status=status;order.updatedAt=Date.now();
 await writeDb(db);
 return{order,previousStatus};
}

// --- Wayfinder #193: local Beckn sandbox seller loop -------------------------
//
// Endpoints (verified against beckn/beckn-sandbox @644ccd16, the commit pinned
// in docker-compose.yml for the `beckn_sandbox` service, host port 3100):
//   POST /retail/1.1.0/search  -> synchronous canned on_search
//   (POST-only routes, keyed off `context.domain === 'retail:1.1.0'`).
// `ONDC_SELLER_LISTING_URL` (#191) is the seller publish endpoint the operator
// points at the local mock BPP; `ONDC_GATEWAY_URL` (#191, default
// http://localhost:3100 in frontend/.env.example) is the search/BG base.

const LOCAL_SANDBOX_BASE='http://localhost:3100';
const ONDC_DOMAIN='retail:1.1.0';
const SANDBOX_SEARCH_PATH='/retail/1.1.0/search';

export type SellerListingInput={
 id:string;name:string;craft:string;price:number;description:string;materials:string[];
 parentHash:string;childHash:string;
 /** BPP provider id — `ProductRecord.artisanId` in the real publish path. */
 artisanId?:string;
 /** Optional Digital Heritage Passport / artisan view (#192 BecknProductInput). */
 shortcode?:string;
 providerId?:string;
 giRegistration?:string;
 cluster?:string;
 wipImageUrls?:string[];
 studioImageUrls?:string[];
 artisanDisplayName?:string;
 artisanDistrict?:string;
 voiceStoryUrl?:string;
};

export type OndcListingResult={
 listed:boolean;
 attempts:number;
 /** Grill A1: sandbox unreachable/unconfigured -> mocked publish, demo never dies. */
 fallback?:boolean;
 reason?:string;
 /** Catalog id when the listing endpoint returns one (`catalog_id`/`catalogId`). */
 catalogId?:string;
};

export type OndcSearchIntent={
 /** Free-text query -> `message.intent.item.descriptor.name`. */
 query?:string;
 /** Category code -> `message.intent.category.descriptor.code`. */
 categoryCode?:string;
 /** Restrict the proof search to one provider id. */
 providerId?:string;
};

export type OndcPassportTags={
 shortcode:string;
 parentHash:string;
 childHash:string;
 giRegistration?:string;
 cluster?:string;
 wageFloorEnforced:boolean;
};

export type OndcSearchResult={
 found:boolean;
 /** `context.action` of the captured callback — `on_search` for a search round-trip. */
 action?:string;
 catalog?:BecknCatalog;
 passport?:OndcPassportTags;
 itemCount:number;
 reason?:string;
};

// ProductRecord (db.ts) carries no passport shortcode / GI / cluster, the media
// store keeps photos + voice as base64 data URLs (no fetchable URL), and the
// artisan row only carries name/place — so the Beckn view is assembled from
// what the repo really stores and every genuinely absent field stays unset.
// Nothing is derived or invented here (#193); callers that do hold a real value
// (shortcode, image URLs) pass it through.
function toBecknInput(product:SellerListingInput):BecknProductInput{
 return{
  id:product.id,
  providerId:product.providerId??product.artisanId??product.id,
  title:product.name,
  description:product.description,
  price:product.price,
  shortcode:product.shortcode??'',
  parentHash:product.parentHash,
  childHash:product.childHash,
  giRegistration:product.giRegistration,
  cluster:product.cluster,
  wipImageUrls:product.wipImageUrls,
  studioImageUrls:product.studioImageUrls,
  artisanDisplayName:product.artisanDisplayName??'',
  artisanDistrict:product.artisanDistrict??'',
  voiceStoryUrl:product.voiceStoryUrl,
 };
}

/**
 * Transport-boundary price unit conversion (runner decision on #193).
 *
 * #192 locks the mapper contract to integer paise (`item.price.value = "250000"`),
 * but the ONDC/Beckn `Price` shape (`DecimalValue`) and the pinned sandbox canned
 * on_search (beckn-sandbox `src/local-retail/retail-1.1.0/response/response.search.json`,
 * `"value": "1200.0"`) use a decimal MAJOR-unit (rupee) string. The unit therefore
 * flips here, at the wire, and never inside beckn-mapper.ts.
 */
export function paiseToWireRupees(paise:string):string{
 const rupees=Number(paise);
 if(!Number.isFinite(rupees))return paise;
 return (rupees/100).toFixed(2);
}

function toWireCatalog(catalog:BecknCatalog):BecknCatalog{
 return{
  ...catalog,
  providers:(catalog.providers??[]).map(provider=>({
   ...provider,
   items:(provider.items??[]).map(item=>({
    ...item,
    price:{...item.price,value:paiseToWireRupees(item.price.value)},
   })),
  })),
 };
}

// Sandbox responses vary (`{catalog_id}` from an ingest endpoint, the canned
// on_search pack from /retail/1.1.0/search, a bare ack). Only an explicit
// catalog id key is trusted — no guessing from unrelated ids.
async function readCatalogId(response:Response):Promise<string|undefined>{
 const data=await response.json().catch(()=>null) as Record<string,unknown>|null;
 if(!data||typeof data!=='object')return undefined;
 const pick=(source:Record<string,unknown>|undefined)=>{
  if(!source||typeof source!=='object')return undefined;
  for(const key of ['catalog_id','catalogId']){
   const value=source[key];
   if(typeof value==='string'&&value)return value;
  }
  return undefined;
 };
 return pick(data)??pick(data.message as Record<string,unknown>|undefined);
}

async function listingFallback(product:Pick<SellerListingInput,'id'>,attempts:number,reason:string){
 // Grill A1: an unreachable/unconfigured sandbox must never fail the publish
 // demo, so we fall back to the pre-#193 mocked intent path — auditable via
 // `ondc.listing_fallback` so operators can tell mock from real listing.
 await audit({action:'ondc.listing_fallback',target:product.id,detail:{attempts,reason}});
 return{listed:true,attempts,fallback:true,reason} as OndcListingResult;
}

export async function listProductOnOndc(product:SellerListingInput):Promise<OndcListingResult>{
 const endpoint=process.env.ONDC_SELLER_LISTING_URL;
 if(!endpoint)return listingFallback(product,0,'ONDC_SELLER_LISTING_URL is not configured');
  const headers:Record<string,string>={'Content-Type':'application/json'};
  if(process.env.ONDC_SELLER_TOKEN)headers.Authorization=`Bearer ${process.env.ONDC_SELLER_TOKEN}`;
 // Seller-side catalog push travels as an on_search message (BPP -> BAP);
 // the local mock BPP only routes on `context.domain` and answers 200 + canned
 // body, while a protocol-server BPP (#194+) gets the real catalog envelope.
 const body=JSON.stringify({
  context:{
   domain:ONDC_DOMAIN,
   action:'on_search',
   version:'1.1.0',
   transaction_id:randomUUID(),
   message_id:randomUUID(),
   timestamp:new Date().toISOString(),
   ttl:'PT10M',
  },
  message:{catalog:toWireCatalog(mapProductToBecknCatalog(toBecknInput(product)))},
 });
 // Retry with exponential backoff: listing must survive transient provider
 // failures; each retry is audited so operators can trace listing history.
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(endpoint,{method:'POST',headers,body});
   if(response.ok){
    const catalogId=await readCatalogId(response);
    return{listed:true,attempts:attempt,...(catalogId?{catalogId}:{})};
   }
   // 4xx (not 429) is a real rejection from a reachable server: no retry, no
   // fallback — the reason travels back to the caller for the audit trail.
   if(response.status<500&&response.status!==429)return{listed:false,attempts:attempt,reason:`ONDC listing rejected with ${response.status}`};
  }catch(error){
   // Network-layer failure (ECONNREFUSED / ENOTFOUND / timeout). Keep the
   // 3-attempt backoff; if the last attempt never reached the server, fall back.
   if(attempt===3){
    const reason=error instanceof Error?error.message:'network error';
    return listingFallback(product,attempt,`sandbox unreachable after 3 attempts: ${reason}`);
   }
  }
  if(attempt<3){
   await new Promise(r=>setTimeout(r,2**attempt*250));
   await audit({action:'ondc.listing_retry',target:product.id,detail:{attempt}});
  }
 }
 return{listed:false,attempts:3,reason:'ONDC listing failed after retries'};
}

// Passport tag group written by #192 (`DIGITAL_HERITAGE_PASSPORT`). Both the
// mapper (name + code) and the sandbox canned packs (name only) are accepted.
const PASSPORT_GROUP_CODE='DIGITAL_HERITAGE_PASSPORT';
const PASSPORT_GROUP_NAME='Digital Heritage Passport';

function countItems(catalog:BecknCatalog):number{
 return (catalog.providers??[]).reduce((total,provider)=>total+(provider.items??[]).length,0);
}

function extractPassport(catalog:BecknCatalog):OndcPassportTags|undefined{
 for(const provider of catalog.providers??[]){
  for(const item of provider.items??[]){
    const tags=Array.isArray(item.tags)?item.tags:[];
    const group=tags.find(t=>t.descriptor?.code===PASSPORT_GROUP_CODE||t.descriptor?.name===PASSPORT_GROUP_NAME);
   if(!group)continue;
   const byKey=new Map<string,string>();
   for(const entry of group.list??[]){
    if(entry.descriptor?.name)byKey.set(entry.descriptor.name,entry.value);
    if(entry.descriptor?.code)byKey.set(entry.descriptor.code,entry.value);
   }
   const pick=(...keys:string[])=>{
    for(const key of keys){const value=byKey.get(key);if(value!==undefined)return value}
    return undefined;
   };
   const giRegistration=pick('GI','GI_REGISTRATION');
   const cluster=pick('cluster','CLUSTER');
   return{
    shortcode:normalizeShortcode(pick('shortcode','SHORTCODE')??''),
    parentHash:pick('parentHash','PARENT_HASH')??'',
    childHash:pick('childHash','CHILD_HASH')??'',
    wageFloorEnforced:(pick('wage_floor_enforced','WAGE_FLOOR_ENFORCED')??'').toLowerCase()==='true',
    ...(giRegistration?{giRegistration}:{}),
    ...(cluster?{cluster}:{}),
   };
  }
 }
 return undefined;
}

/**
 * BAP-side search proof (#193): POST a Beckn `/search` intent to the local
 * gateway/mock BPP and capture the `on_search` callback.
 *
 * The pinned mock BPP answers `/retail/1.1.0/search` synchronously with the
 * canned pack (`context.action === 'on_search'`, `message.catalog`) — no
 * separate callback URL is configured locally (upstream only forwards webhooks
 * when a BPP client URL is set, see docs/deployment-guide.md 4.2) — so whatever
 * the POST returns IS the on_search callback. Passport tags + shortcode are
 * surfaced in `passport` for callers and tests.
 *
 * All env reads stay server-side (`frontend/backend/**`); no client env access.
 */
export async function searchCatalogOnSandbox(intent:OndcSearchIntent={}):Promise<OndcSearchResult>{
 const base=(process.env.ONDC_GATEWAY_URL||LOCAL_SANDBOX_BASE).replace(/\/+$/,'');
 const url=`${base}${SANDBOX_SEARCH_PATH}`;
 const messageIntent:Record<string,unknown>={};
 if(intent.query)messageIntent.item={descriptor:{name:intent.query}};
 if(intent.categoryCode)messageIntent.category={descriptor:{code:intent.categoryCode}};
 if(intent.providerId)messageIntent.provider={id:intent.providerId};
 const request={
  context:{
   domain:ONDC_DOMAIN,
   action:'search',
   version:'1.1.0',
   transaction_id:randomUUID(),
   message_id:randomUUID(),
   timestamp:new Date().toISOString(),
   ttl:'PT30S',
  },
  message:{intent:messageIntent},
 };
 try{
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});
  if(!response.ok)return{found:false,itemCount:0,reason:`sandbox search rejected with ${response.status}`};
  const data=await response.json().catch(()=>null) as {context?:{action?:string};message?:{catalog?:BecknCatalog};providers?:BecknCatalog['providers']}|null;
  const action=typeof data?.context?.action==='string'?data.context.action:undefined;
  const catalog:BecknCatalog|null=data?.message?.catalog??(Array.isArray(data?.providers)?data as unknown as BecknCatalog:null);
  if(!catalog)return{found:false,itemCount:0,...(action?{action}:{}),reason:'sandbox response carried no on_search catalog'};
  const passport=extractPassport(catalog);
  return{found:true,itemCount:countItems(catalog),catalog,...(action?{action}:{}),...(passport?{passport}:{})};
 }catch(error){
  return{found:false,itemCount:0,reason:error instanceof Error?error.message:'network error'};
 }
}
