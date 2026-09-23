import {emptyDb,Database,ProductRecord} from '../backend/db';

// Coverage extension: everything the earlier suites did not touch — sync API
// happy path, checkout validation, privacy projections, confirmation-call
// retry, legacy webhook auth, session revocation, media limits, and the
// client-side queue helpers.

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

function json(url:string,body:unknown,headers:Record<string,string>={}){
 return new Request(url,{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json',...headers}});
}

let product:ProductRecord;
let phoneCounter=0;

beforeEach(async()=>{
 storeHolder.store={...emptyDb};fetchMock.mockReset();sessionHolder.token=null;
 phoneCounter+=1;const phone=`9876530${String(phoneCounter).padStart(3,'0')}`;
 const {POST:requestOtp}=await import('../app/api/auth/request-otp/route');
 const {POST:verifyOtp}=await import('../app/api/auth/verify-otp/route');
 const otpRes=await requestOtp(json('http://x/otp',{phone},{'x-forwarded-for':`10.7.7.${phoneCounter}`}));
 const {devCode}=await otpRes.json();
 const loginRes=await verifyOtp(json('http://x/otp',{phone,code:devCode}));
 sessionHolder.token=/artifact_session=([^;]+)/.exec(loginRes.headers.get('set-cookie')??'')?.[1]??null;
 const {POST:registerProduct}=await import('../app/api/products/route');
 const res=await registerProduct(json('http://x/products',{name:'Pashmina Shawl',craft:'handloom',description:'Handloom shawl',price:3200,materials:['Wool']}));
 expect(res.status).toBe(201);
 product=(await res.json()).product;
});

describe('sync API happy path',()=>{
 it('registers a queued product with the idempotency key and replays cleanly',async()=>{
  const {POST}=await import('../app/api/sync/route');
  const body={idempotencyKey:'off-1',name:'Terracotta Pot',craft:'pottery',description:'Clay pot',price:500,materials:['Clay']};
  const first=await POST(json('http://x/sync',body));
  expect(first.status).toBe(201);
  const firstData=await first.json();
  expect(firstData.replayed).toBe(false);
  expect(firstData.product.parentHash).toHaveLength(64);
  const replay=await POST(json('http://x/sync',body));
  expect(replay.status).toBe(200);
  expect((await replay.json()).replayed).toBe(true);
  expect(storeHolder.store.products.filter(p=>p.name==='Terracotta Pot')).toHaveLength(1);
 });
});

describe('checkout validation',()=>{
 it('rejects missing buyer details, invalid phone, qty bounds, and unknown products',async()=>{
  const {POST}=await import('../app/api/ondc/checkout/route');
  process.env.ONDC_CHECKOUT_URL='https://ondc.example/pay';
  const base={items:[{id:product.id,qty:1,price:3200}],buyer:{name:'B',phone:'9876511000',line:'l',city:'c',state:'s',pin:'494001',language:'hi-IN'}};
  expect((await POST(json('http://x/checkout',{...base,buyer:{...base.buyer,line:''}},{'x-forwarded-for':'10.7.8.1'}))).status).toBe(400);
  expect((await POST(json('http://x/checkout',{...base,buyer:{...base.buyer,phone:'123'}}))).status).toBe(400);
  expect((await POST(json('http://x/checkout',{...base,items:[{id:product.id,qty:99,price:3200}]}))).status).toBe(400);
  expect((await POST(json('http://x/checkout',{...base,items:[{id:'nope',qty:1,price:1}]}))).status).toBe(400);
  delete process.env.ONDC_CHECKOUT_URL;
 });
});

describe('privacy projections',()=>{
 it('verify API never exposes internal artisan id or buyer data',async()=>{
  const {GET}=await import('../app/api/products/verify/[hash]/route');
  const res=await GET(new Request('http://x/verify'),{params:{hash:product.childHash}});
  const data=await res.json();
  expect(data.verified).toBe(true);
  expect(data.product.artisanId).toBeUndefined();
  const raw=JSON.stringify(data);
  expect(raw).not.toContain(product.artisanId);
 });
 it('order history exposes products but no buyer phone or address',async()=>{
  process.env.ONDC_CHECKOUT_URL='https://ondc.example/pay';
  const {POST:checkout}=await import('../app/api/ondc/checkout/route');
  const checkoutRes=await checkout(json('http://x/checkout',{items:[{id:product.id,qty:1,price:3200}],buyer:{name:'Secret Buyer',phone:'9876599999',line:'42 Hidden Lane',city:'X',state:'Y',pin:'000001',language:'hi-IN'}}));
  const {orderId}=await checkoutRes.json();
  const {GET:history}=await import('../app/api/orders/[id]/route');
  const data=await (await history(new Request('http://x/order'),{params:{id:orderId}})).json();
  const raw=JSON.stringify(data);
  expect(raw).not.toContain('9876599999');
  expect(raw).not.toContain('42 Hidden Lane');
  expect(raw).not.toContain('Secret Buyer');
  delete process.env.ONDC_CHECKOUT_URL;
 });
});

describe('confirmation-call retry',()=>{
 beforeEach(()=>{process.env.CONFIRMATION_CALL_URL='https://calls.example/confirm'});
 afterEach(()=>{delete process.env.CONFIRMATION_CALL_URL});

 it('retries transient failures and succeeds on a later attempt',async()=>{
  fetchMock.mockRejectedValueOnce(new Error('network'))
   .mockResolvedValueOnce(new Response('{}',{status:503}))
   .mockResolvedValueOnce(new Response('{}',{status:200}));
  const {sendPaymentConfirmation}=await import('../backend/notifications');
  const result=await sendPaymentConfirmation({phone:'9',language:'hi-IN',orderId:'o',status:'paid'});
  expect(result.sent).toBe(true);
  expect(result.attempts).toBe(3);
 });
 it('fails fast on permanent 4xx rejection',async()=>{
  fetchMock.mockResolvedValueOnce(new Response('{}',{status:400}));
  const {sendPaymentConfirmation}=await import('../backend/notifications');
  const result=await sendPaymentConfirmation({phone:'9',language:'hi-IN',orderId:'o',status:'paid'});
  expect(result.sent).toBe(false);
  expect(result.attempts).toBe(1);
 });
});

describe('legacy webhook shared-secret auth',()=>{
 it('accepts the legacy header when no signature is present',async()=>{
  process.env.ONDC_WEBHOOK_SECRET='legacy-s3cret';
  const {POST:webhook}=await import('../app/api/ondc/webhook/route');
  const raw=JSON.stringify({orderId:'none',status:'paid'});
  const res=await webhook(new Request('http://x/webhook',{method:'POST',body:raw,headers:{'x-ondc-webhook-secret':'legacy-s3cret'}}));
  expect(res.status).toBe(404); // auth passed; order simply does not exist
  delete process.env.ONDC_WEBHOOK_SECRET;
 });
});

describe('session recovery',()=>{
 it('revokes every other session but keeps the current one',async()=>{
  const {revokeAllSessions}=await import('../backend/otp');
  const userId=storeHolder.store.users[0].id;
  storeHolder.store.sessions=[
   {tokenHash:'current',userId,expiresAt:Date.now()+60000},
   {tokenHash:'stolen',userId,expiresAt:Date.now()+60000},
   {tokenHash:'expired',userId,expiresAt:Date.now()-1000},
  ];
  const removed=await revokeAllSessions(userId,'current');
  expect(removed).toBe(2); // stolen + expired
  expect(storeHolder.store.sessions.map(s=>s.tokenHash)).toEqual(['current']);
 });
});

describe('media limits',()=>{
 it('rejects oversized payloads',async()=>{
  const {POST}=await import('../app/api/media/route');
  const big='data:image/jpeg;base64,'+'A'.repeat(11*1024*1024);
  const res=await POST(json('http://x/media',{idempotencyKey:'big1',productId:product.id,kind:'photo',dataUrl:big}));
  expect(res.status).toBe(400);
 });
});

describe('client offline queue',()=>{
 it('enqueues, reports status, syncs, and clears',async()=>{
  const store=new Map<string,string>();
  // Minimal localStorage stub for node.
  const ls={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v),removeItem:(k:string)=>store.delete(k)};
  Object.defineProperty(global,'localStorage',{value:ls,configurable:true});
  const queue=await import('../lib/sync');
  queue.enqueueProduct({name:'Offline Bell',craft:'metal',description:'d',price:100,materials:[],queuedAtSeed:'seed-1'});
  queue.enqueueMedia({kind:'voice',productId:'p1',dataUrl:'data:audio/webm;base64,AA',ts:123});
  let status=queue.syncStatus();
  expect(status.pending).toBe(2);
  expect(status.failed).toBe(0);
  // Happy-path sync: product goes to /api/sync, media to /api/media.
  fetchMock.mockImplementation(async(url:unknown,init?:RequestInit)=>{
   const body=JSON.parse(String(init?.body));
   if(String(url).endsWith('/api/sync'))return new Response(JSON.stringify({product:{id:'x'},replayed:false}),{status:201});
   return new Response(JSON.stringify({media:{id:'m'},replayed:false}),{status:201});
  });
  const result=await queue.syncQueue();
  expect(result.synced).toBe(2);
  expect(result.failed).toBe(0);
  expect(queue.readQueue()).toHaveLength(0);
  // Failure path: item stays queued with attempts + error.
  queue.enqueueProduct({name:'Offline Lamp',craft:'metal',description:'d',price:100,materials:[],queuedAtSeed:'seed-2'});
  fetchMock.mockResolvedValue(new Response(JSON.stringify({error:'boom'}),{status:500}));
  const failed=await queue.syncQueue();
  expect(failed.failed).toBe(1);
  status=queue.syncStatus();
  expect(status.failed).toBe(1);
  const item=queue.readQueue()[0];
  expect(item.attempts).toBe(1);
  expect(item.lastError).toBe('boom');
  expect(item.status).toBe('failed');
 });
});
