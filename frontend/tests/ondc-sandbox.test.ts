import {emptyDb,Database} from '../backend/db';
import {mapProductToBecknCatalog} from '../backend/beckn-mapper';

// Wayfinder #193 — ONDC sandbox seller loop, no-Docker edition (grill A3):
// every fetch is mocked, so CI never needs the beckn_sandbox sidecar. The live
// `docker compose up beckn_sandbox` boot stays manual-demo evidence.
//
// Shapes pinned here come from the pinned upstream mock BPP
// (beckn/beckn-sandbox @644ccd16, NestJS `LocalRetailController110`):
// - routes are POST-only and keyed off `context.domain`
//   (`retail:1.1.0`), so a bad/missing domain never reaches the canned pack;
// - `/retail/1.1.0/search` answers **synchronously** with the canned
//   `response.search.json`, whose `context.action` is `on_search` — that
//   synchronous body IS the on_search callback we capture;
// - canned `Price.value` is a decimal rupee string (`"1200.0"`), which is why
//   the paise->rupee flip happens at the transport boundary in ondc.ts.

const fetchMock=jest.fn();
const realFetch=global.fetch;
beforeAll(()=>{global.fetch=fetchMock as unknown as typeof fetch});
afterAll(()=>{global.fetch=realFetch});

const storeHolder:{store:Database}={store:null as unknown as Database};
jest.mock('../backend/db',()=>{
 const actual=jest.requireActual('../backend/db') as typeof import('../backend/db');
 return{
  ...actual,
  readDb:async()=>storeHolder.store,
  writeDb:async(next:Database)=>{storeHolder.store=next},
 };
});
const sessionHolder:{token:string|null}={token:null};
jest.mock('next/headers',()=>({cookies:()=>({get:(name:string)=>name==='artifact_session'&&sessionHolder.token?{value:sessionHolder.token}:undefined})}));

const SELLER_LISTING_URL='http://localhost:3100/retail/1.1.0/search';
const GATEWAY_BASE='http://localhost:3100';

type Tag={descriptor:{name:string;code?:string};value:string};
type TagGroup={descriptor:{name:string;code?:string};list:Tag[]};

function sellerProduct(){
 return{
  id:'prd_sandbox1',
  name:'Dhokra Elephant',
  craft:'metal',
  price:2500,
  description:'Lost-wax cast brass elephant',
  materials:['Brass'],
  parentHash:'a'.repeat(64),
  childHash:'b'.repeat(64),
  artisanId:'usr_artisan1',
  artisanDisplayName:'Ramesh Kumar',
  artisanDistrict:'Bastar, Chhattisgarh',
  shortcode:'a7x9b2',
 };
}

function jsonRequest(url:string,body:unknown){
 return new Request(url,{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}});
}

// Same product seen through the #192 BecknProductInput lens (mapper input).
function becknInput(){
 return{
  id:'prd_sandbox1',
  providerId:'usr_artisan1',
  title:'Dhokra Elephant',
  description:'Lost-wax cast brass elephant',
  price:2500,
  shortcode:'a7x9b2',
  parentHash:'a'.repeat(64),
  childHash:'b'.repeat(64),
  artisanDisplayName:'Ramesh Kumar',
  artisanDistrict:'Bastar, Chhattisgarh',
 };
}

async function login(phone:string,ip:string){
 const {POST:requestOtp}=await import('../app/api/auth/request-otp/route');
 const {POST:verifyOtp}=await import('../app/api/auth/verify-otp/route');
 const otpRes=await requestOtp(new Request('http://x/otp',{method:'POST',body:JSON.stringify({phone}),headers:{'Content-Type':'application/json','x-forwarded-for':ip}}));
 const {devCode}=await otpRes.json();
 const loginRes=await verifyOtp(new Request('http://x/otp',{method:'POST',body:JSON.stringify({phone,code:devCode}),headers:{'Content-Type':'application/json','x-forwarded-for':ip}}));
 sessionHolder.token=/artifact_session=([^;]+)/.exec(loginRes.headers.get('set-cookie')??'')?.[1]??null;
}

beforeEach(()=>{
 storeHolder.store={...emptyDb};
 fetchMock.mockReset();
 sessionHolder.token=null;
 delete process.env.ONDC_SELLER_LISTING_URL;
 delete process.env.ONDC_GATEWAY_URL;
});

describe('sandbox seller publish (#193)',()=>{
 it('POSTs the mapped on_search envelope to the local BPP on the first attempt',async()=>{
  process.env.ONDC_SELLER_LISTING_URL=SELLER_LISTING_URL;
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({catalog_id:'cat_sandbox_1'}),{status:200}));
  const {listProductOnOndc}=await import('../backend/ondc');
  const result=await listProductOnOndc(sellerProduct());

  expect(result).toMatchObject({listed:true,attempts:1,catalogId:'cat_sandbox_1'});
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url,init]=fetchMock.mock.calls[0] as [string|URL|Request,{body:string}];
  expect(String(url)).toBe(SELLER_LISTING_URL);

  const body=JSON.parse(init.body) as {
   context:{domain:string;action:string;version:string};
   message:{catalog:ReturnType<typeof mapProductToBecknCatalog>};
  };
  // Beckn envelope the mock BPP routes on (`context.domain`) — see header note.
  expect(body.context).toMatchObject({domain:'retail:1.1.0',action:'on_search',version:'1.1.0'});

  const item=body.message.catalog.providers[0].items[0];
  // Transport-boundary price conversion: mapper keeps paise, wire sends rupees.
  expect(item.price).toEqual({currency:'INR',value:'2500.00'});
  const passport=(item.tags as TagGroup[]).find(
   t=>t.descriptor.code==='DIGITAL_HERITAGE_PASSPORT'||t.descriptor.name==='Digital Heritage Passport'
  );
  expect(passport).toBeDefined();
  const tagValue=(code:string)=>passport?.list.find(t=>t.descriptor.code===code||t.descriptor.name===code)?.value;
  expect(tagValue('PARENT_HASH')).toBe('a'.repeat(64));
  expect(tagValue('CHILD_HASH')).toBe('b'.repeat(64));
  expect(tagValue('SHORTCODE')).toBe('A7X-9B2');
  expect(tagValue('WAGE_FLOOR_ENFORCED')).toBe('true');
  expect(body.message.catalog.providers[0].id).toBe('usr_artisan1');
  expect(body.message.catalog.providers[0].descriptor).toMatchObject({name:'Ramesh Kumar',short_desc:'Bastar, Chhattisgarh'});
 });

 it('keeps the paise mapper contract and converts only at the wire',()=>{
  const {paiseToWireRupees}=require('../backend/ondc') as typeof import('../backend/ondc');
  expect(paiseToWireRupees('250000')).toBe('2500.00');
  expect(paiseToWireRupees('1200')).toBe('12.00');
  expect(paiseToWireRupees('0')).toBe('0.00');
  // beckn-mapper.ts (#192) must stay integer paise — the unit flips only above.
  const catalog=mapProductToBecknCatalog(becknInput());
  expect(catalog.providers[0].items[0].price).toEqual({currency:'INR',value:'250000'});
 });

 it('retries a transient 500 and succeeds with an ondc.listing_retry audit',async()=>{
  process.env.ONDC_SELLER_LISTING_URL=SELLER_LISTING_URL;
  fetchMock.mockResolvedValueOnce(new Response('{}',{status:500}))
   .mockResolvedValueOnce(new Response(JSON.stringify({catalog_id:'cat_sandbox_2'}),{status:200}));
  const {listProductOnOndc}=await import('../backend/ondc');
  const result=await listProductOnOndc(sellerProduct());

  expect(result.listed).toBe(true);
  expect(result.attempts).toBe(2);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const retries=storeHolder.store.auditLogs.filter(x=>x.action==='ondc.listing_retry');
  expect(retries.map(r=>r.detail?.attempt)).toEqual([1]);
 });

 it('does not retry a 4xx rejection and captures the reason',async()=>{
  process.env.ONDC_SELLER_LISTING_URL=SELLER_LISTING_URL;
  fetchMock.mockResolvedValueOnce(new Response('{}',{status:422}));
  const {listProductOnOndc}=await import('../backend/ondc');
  const result=await listProductOnOndc(sellerProduct());

  expect(result.listed).toBe(false);
  expect(result.attempts).toBe(1);
  expect(result.reason).toContain('422');
  expect(result.fallback).toBeUndefined();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const actions=storeHolder.store.auditLogs.map(x=>x.action);
  expect(actions).not.toContain('ondc.listing_retry');
  expect(actions).not.toContain('ondc.listing_fallback');
 });
});

describe('A1 demo-never-dies fallback (#193 amendment)',()=>{
 it('falls back to the mocked publish when the listing endpoint is unset',async()=>{
  const {listProductOnOndc}=await import('../backend/ondc');
  const result=await listProductOnOndc(sellerProduct());

  expect(result).toMatchObject({listed:true,fallback:true,attempts:0});
  expect(result.reason).toContain('ONDC_SELLER_LISTING_URL');
  expect(fetchMock).not.toHaveBeenCalled();
  const fallback=storeHolder.store.auditLogs.filter(x=>x.action==='ondc.listing_fallback');
  expect(fallback).toHaveLength(1);
  expect(fallback[0].target).toBe('prd_sandbox1');
 });

 it('falls back after the 3-attempt backoff when the sandbox is unreachable',async()=>{
  process.env.ONDC_SELLER_LISTING_URL=SELLER_LISTING_URL;
  fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3100'));
  const {listProductOnOndc}=await import('../backend/ondc');
  const result=await listProductOnOndc(sellerProduct());

  expect(result).toMatchObject({listed:true,fallback:true,attempts:3});
  expect(result.reason).toContain('ECONNREFUSED');
  expect(fetchMock).toHaveBeenCalledTimes(3);
  // Retry audit survives the fallback (existing contract kept intact) …
  expect(storeHolder.store.auditLogs.filter(x=>x.action==='ondc.listing_retry')).toHaveLength(2);
  const fallback=storeHolder.store.auditLogs.filter(x=>x.action==='ondc.listing_fallback');
  expect(fallback).toHaveLength(1);
  expect(fallback[0].detail).toMatchObject({attempts:3});
 });
});

describe('BAP search -> on_search round-trip (#193)',()=>{
 function onSearchEnvelope(){
  // Same synchronous body shape the mock BPP returns from
  // retail-1.1.0/response/response.search.json, carrying the catalog a BPP
  // would answer with for our product (passport tags included).
  const catalog=mapProductToBecknCatalog(becknInput());
  return{context:{domain:'retail:1.1.0',action:'on_search',version:'1.1.0',message_id:'msg_1',transaction_id:'txn_1'},message:{catalog}};
 }

 it('POSTs a Beckn /search intent to the gateway and surfaces passport tags + shortcode',async()=>{
  process.env.ONDC_GATEWAY_URL=GATEWAY_BASE;
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(onSearchEnvelope()),{status:200}));
  const {searchCatalogOnSandbox}=await import('../backend/ondc');
  const result=await searchCatalogOnSandbox({query:'Dhokra Elephant'});

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url,init]=fetchMock.mock.calls[0] as [string|URL|Request,{body:string}];
  expect(String(url)).toBe(`${GATEWAY_BASE}/retail/1.1.0/search`);
  const request=JSON.parse(init.body) as {context:{domain:string;action:string};message:{intent:{item:{descriptor:{name:string}}}}};
  expect(request.context.domain).toBe('retail:1.1.0');
  expect(request.context.action).toBe('search');
  expect(request.message.intent.item.descriptor.name).toBe('Dhokra Elephant');

  expect(result.found).toBe(true);
  expect(result.action).toBe('on_search');
  expect(result.itemCount).toBe(1);
  expect(result.passport).toMatchObject({
   shortcode:'A7X-9B2',
   parentHash:'a'.repeat(64),
   childHash:'b'.repeat(64),
   wageFloorEnforced:true,
  });
 });

 it('reports an unreachable gateway instead of throwing',async()=>{
  process.env.ONDC_GATEWAY_URL=GATEWAY_BASE;
  fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3100'));
  const {searchCatalogOnSandbox}=await import('../backend/ondc');
  const result=await searchCatalogOnSandbox({query:'Dhokra Elephant'});
  expect(result.found).toBe(false);
  expect(result.itemCount).toBe(0);
  expect(result.reason).toContain('ECONNREFUSED');
 });

 it('reports a rejected search without inventing a catalog',async()=>{
  process.env.ONDC_GATEWAY_URL=GATEWAY_BASE;
  fetchMock.mockResolvedValueOnce(new Response('{}',{status:503}));
  const {searchCatalogOnSandbox}=await import('../backend/ondc');
  const result=await searchCatalogOnSandbox({query:'x'});
  expect(result.found).toBe(false);
  expect(result.reason).toContain('503');
 });
});

describe('products route publish passthrough (#193 deliverable 2)',()=>{
 it('returns {listed, attempts, catalogId} in the 201 body and audits product.ondc_listing',async()=>{
  process.env.ONDC_SELLER_LISTING_URL=SELLER_LISTING_URL;
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({catalog_id:'cat_route_1'}),{status:200}));
  let phoneCounter=0;phoneCounter+=1;
  const phone=`9876599${String(phoneCounter).padStart(3,'0')}`;
  await login(phone,`10.9.9.${phoneCounter}`);
  expect(sessionHolder.token).toBeTruthy();

  const {POST}=await import('../app/api/products/route');
  const res=await POST(jsonRequest('http://x/api/products',{name:'Dhokra Elephant',craft:'metal',description:'Lost-wax cast brass elephant',price:2499,materials:['Brass']}));
  expect(res.status).toBe(201);
  const data=await res.json();
  expect(data.ondc).toMatchObject({listed:true,attempts:1,catalogId:'cat_route_1'});

  const listed=storeHolder.store.auditLogs.find(x=>x.action==='product.ondc_listing');
  expect(listed).toBeDefined();
  expect(listed?.target).toBe(data.product.id);
  expect(listed?.detail).toMatchObject({listed:true,attempts:1,catalogId:'cat_route_1'});

  // Provider id is the real repo source (ProductRecord.artisanId), not invented.
  const body=JSON.parse((fetchMock.mock.calls[0] as [unknown,{body:string}])[1].body) as {
   message:{catalog:{providers:{id:string}[]}};
  };
  expect(body.message.catalog.providers[0].id).toBe(data.product.artisanId);
 });
});
