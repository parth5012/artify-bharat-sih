import {emptyDb,Database} from '../backend/db';

// Wayfinder #195 — Try Again for a rejected listing. The Step 6 checklist must
// be able to re-attempt the sandbox publish WITHOUT re-POSTing /api/products
// (that would register a second copy of the same craft). No-Docker (grill A3):
// every fetch is mocked, no live beckn_sandbox sidecar in CI.

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

function jsonRequest(url:string,body:unknown){
 return new Request(url,{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}});
}

async function login(phone:string,ip:string){
 const {POST:requestOtp}=await import('../app/api/auth/request-otp/route');
 const {POST:verifyOtp}=await import('../app/api/auth/verify-otp/route');
 const otpRes=await requestOtp(new Request('http://x/otp',{method:'POST',body:JSON.stringify({phone}),headers:{'Content-Type':'application/json','x-forwarded-for':ip}}));
 const {devCode}=await otpRes.json();
 const loginRes=await verifyOtp(new Request('http://x/otp',{method:'POST',body:JSON.stringify({phone,code:devCode}),headers:{'Content-Type':'application/json','x-forwarded-for':ip}}));
 sessionHolder.token=/artifact_session=([^;]+)/.exec(loginRes.headers.get('set-cookie')??'')?.[1]??null;
}

// Registers through the real products route (listing env unset -> A1 fallback,
// so no fetch happens here), then clears the fetch mock for the retry assertions.
async function registerProduct(phone:string,ip:string){
 await login(phone,ip);
 const {POST:create}=await import('../app/api/products/route');
 const res=await create(jsonRequest('http://x/api/products',{name:'Dhokra Elephant',craft:'metal',description:'Lost-wax cast brass elephant',price:2499,materials:['Brass']}));
 expect(res.status).toBe(201);
 const data=await res.json();
 fetchMock.mockReset();
 return data.product as {id:string;artisanId:string};
}

beforeEach(()=>{
 storeHolder.store={...emptyDb};
 fetchMock.mockReset();
 sessionHolder.token=null;
 delete process.env.ONDC_SELLER_LISTING_URL;
 delete process.env.ONDC_GATEWAY_URL;
});

describe('ONDC listing retry route — Try Again (#195)',()=>{
 it('requires an authenticated artisan',async()=>{
  const {POST}=await import('../app/api/ondc/listing/route');
  const res=await POST(jsonRequest('http://x/api/ondc/listing',{productId:'prd_x'}));
  expect(res.status).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
 });

 it('rejects a missing productId before touching the store',async()=>{
  await login('9876599201','10.9.9.21');
  expect(sessionHolder.token).toBeTruthy();
  const {POST}=await import('../app/api/ondc/listing/route');
  const res=await POST(jsonRequest('http://x/api/ondc/listing',{}));
  expect(res.status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
 });

 it('404s an unknown product',async()=>{
  await login('9876599202','10.9.9.22');
  const {POST}=await import('../app/api/ondc/listing/route');
  const res=await POST(jsonRequest('http://x/api/ondc/listing',{productId:'prd_does_not_exist'}));
  expect(res.status).toBe(404);
  expect(fetchMock).not.toHaveBeenCalled();
 });

 it('re-publishes the artisan\'s own product and audits product.ondc_listing',async()=>{
  const product=await registerProduct('9876599203','10.9.9.23');
  process.env.ONDC_SELLER_LISTING_URL=SELLER_LISTING_URL;
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({catalog_id:'cat_retry_1'}),{status:200}));

  const {POST:relist}=await import('../app/api/ondc/listing/route');
  const res=await relist(jsonRequest('http://x/api/ondc/listing',{productId:product.id}));
  expect(res.status).toBe(200);
  const data=await res.json();
  expect(data.ondc).toMatchObject({listed:true,attempts:1,catalogId:'cat_retry_1'});

  const [url]=fetchMock.mock.calls[0] as [string];
  expect(String(url)).toBe(SELLER_LISTING_URL);

  const audits=storeHolder.store.auditLogs.filter(x=>x.action==='product.ondc_listing'&&x.target===product.id);
  expect(audits).toHaveLength(2); // register + retry — auditLogs is newest-first
  expect(audits[0].detail).toMatchObject({listed:true,attempts:1,catalogId:'cat_retry_1',source:'relist'});
  expect(audits[1].detail).toMatchObject({listed:true});      // #193 register passthrough (A1 fallback)
 });

 it('refuses to re-publish a product owned by another artisan',async()=>{
  await login('9876599204','10.9.9.24');
  storeHolder.store.products.push({id:'prd_other',parentHash:'a'.repeat(64),childHash:'b'.repeat(64),serialNumber:'1',artisanId:'usr_someone_else',name:'Other craft',craft:'metal',price:1,description:'d',materials:[],status:'published',ownership:'artisan',createdAt:Date.now()});
  process.env.ONDC_SELLER_LISTING_URL=SELLER_LISTING_URL;
  const {POST}=await import('../app/api/ondc/listing/route');
  const res=await POST(jsonRequest('http://x/api/ondc/listing',{productId:'prd_other'}));
  expect(res.status).toBe(403);
  expect(fetchMock).not.toHaveBeenCalled();
 });

 it('re-publishes a legacy product stored under the login id after the artisan gained an artisanId',async()=>{
  // The register route writes `user.artisanId ?? user.id`, and GET /api/products
  // accepts BOTH identifiers. A profile edit that adds an artisanId later must
  // not 403 the artisan's own Try Again (#195 review should-fix).
  await login('9876599206','10.9.9.26');
  const user=storeHolder.store.users.find(u=>u.phone==='9876599206');
  expect(user?.id).toBeTruthy();
  storeHolder.store.products.push({id:'prd_legacy',parentHash:'c'.repeat(64),childHash:'d'.repeat(64),serialNumber:'9',artisanId:user!.id,name:'Legacy craft',craft:'metal',price:10,description:'d',materials:[],status:'published',ownership:'artisan',createdAt:Date.now()});
  user!.artisanId='ART-2041';
  process.env.ONDC_SELLER_LISTING_URL=SELLER_LISTING_URL;
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({catalog_id:'cat_legacy_1'}),{status:200}));

  const {POST:relist}=await import('../app/api/ondc/listing/route');
  const res=await relist(jsonRequest('http://x/api/ondc/listing',{productId:'prd_legacy'}));
  expect(res.status).toBe(200);
  expect((await res.json()).ondc).toMatchObject({listed:true,attempts:1,catalogId:'cat_legacy_1'});
 });

 it('surfaces a sandbox 4xx rejection as listed:false with the reason',async()=>{
  const product=await registerProduct('9876599205','10.9.9.25');
  process.env.ONDC_SELLER_LISTING_URL=SELLER_LISTING_URL;
  fetchMock.mockResolvedValueOnce(new Response('{}',{status:422}));

  const {POST:relist}=await import('../app/api/ondc/listing/route');
  const res=await relist(jsonRequest('http://x/api/ondc/listing',{productId:product.id}));
  expect(res.status).toBe(200);
  const data=await res.json();
  expect(data.ondc).toMatchObject({listed:false,attempts:1});
  expect(data.ondc.reason).toContain('422');
  expect(fetchMock).toHaveBeenCalledTimes(1);
 });
});
