import {createHmac} from 'node:crypto';
import {emptyDb,Database,ProductRecord} from '../backend/db';

// Tests for the new lifecycle rules: duplicate identity rejection, sold-unit
// marking on payment, media idempotency, and tamper-evident verify receipts.

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
const sign=(body:string,secret:string)=>'sha256='+createHmac('sha256',secret).update(body).digest('hex');

let product:ProductRecord;
let phoneCounter=0;

beforeEach(async()=>{
 storeHolder.store={...emptyDb};fetchMock.mockReset();sessionHolder.token=null;
 // Fresh phone per test: the OTP per-phone rate limiter persists for the
 // whole file run, so reusing one number would trip 429 after 3 tests.
 phoneCounter+=1;const phone=`9876520${String(phoneCounter).padStart(3,'0')}`;
 const {POST:requestOtp}=await import('../app/api/auth/request-otp/route');
 const {POST:verifyOtp}=await import('../app/api/auth/verify-otp/route');
 const otpRes=await requestOtp(json('http://x/otp',{phone},{'x-forwarded-for':`10.5.6.${phoneCounter}`}));
 const {devCode}=await otpRes.json();
 const loginRes=await verifyOtp(json('http://x/otp',{phone,code:devCode}));
 sessionHolder.token=/artifact_session=([^;]+)/.exec(loginRes.headers.get('set-cookie')??'')?.[1]??null;
 const {POST:registerProduct}=await import('../app/api/products/route');
 const res=await registerProduct(json('http://x/products',{name:'Bell Metal Lamp',craft:'metal',description:'Hand cast lamp',price:1200,materials:['Brass']}));
 expect(res.status).toBe(201);
 product=(await res.json()).product;
});

describe('product identity rules',()=>{
 it('assigns unique per-artisan serial numbers across multiple products',async()=>{
  const {POST}=await import('../app/api/products/route');
  // Regression: serials used to be fixed at '1', which collided and made a
  // second product impossible for the same artisan.
  const res=await POST(json('http://x/products',{name:'Another Lamp',craft:'metal',description:'Second item',price:900,materials:['Brass']}));
  expect(res.status).toBe(201);
  const second=(await res.json()).product;
  expect(second.serialNumber).toBe('2');
  expect(second.parentHash).not.toBe(product.parentHash);
  expect(second.childHash).not.toBe(product.childHash);
 });
 it('keeps parent/child identity intact per product',async()=>{
  // childHash derives from the parent hash and the child serial number.
  expect(product.childHash).toMatch(/^[0-9a-f]{64}$/);
  expect(product.childHash).not.toBe(product.parentHash);
 });
});

describe('order lifecycle',()=>{
 it('marks the child unit sold on the first paid webhook and not again on replay',async()=>{
  process.env.ONDC_CHECKOUT_URL='https://ondc.example/pay';
  process.env.ONDC_WEBHOOK_SECRET='s3cret';
  process.env.CONFIRMATION_CALL_URL='https://calls.example/confirm';
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ok:true}),{status:200}));
  const {POST:checkout}=await import('../app/api/ondc/checkout/route');
  const checkoutRes=await checkout(json('http://x/checkout',{items:[{id:product.id,qty:1,price:1200}],buyer:{name:'B',phone:'9876511002',line:'l',city:'c',state:'s',pin:'494001',language:'hi-IN'}},{'x-forwarded-for':'10.5.5.3'}));
  expect(checkoutRes.status).toBe(200);
  const {orderId}=await checkoutRes.json();
  const {POST:webhook}=await import('../app/api/ondc/webhook/route');
  const raw=JSON.stringify({orderId,status:'paid'});
  await webhook(new Request('http://x/webhook',{method:'POST',body:raw,headers:{'x-ondc-signature':sign(raw,'s3cret')}}));
  let sold=storeHolder.store.products.find(p=>p.id===product.id);
  expect(sold?.ownership).toBe('sold');
  expect(sold?.orderId).toBe(orderId);
  // Replay must not change anything further (idempotent lifecycle).
  await webhook(new Request('http://x/webhook',{method:'POST',body:raw,headers:{'x-ondc-signature':sign(raw,'s3cret')}}));
  sold=storeHolder.store.products.find(p=>p.id===product.id);
  expect(sold?.ownership).toBe('sold');
  // Order history exposes sold status but no buyer PII.
  const {GET:orderHistory}=await import('../app/api/orders/[id]/route');
  const history=await orderHistory(new Request('http://x/order'),{params:{id:orderId}});
  const data=await history.json();
  expect(data.lines[0].product.ownership).toBe('sold');
  expect(JSON.stringify(data)).not.toContain('9876511002');
  delete process.env.ONDC_CHECKOUT_URL;delete process.env.ONDC_WEBHOOK_SECRET;delete process.env.CONFIRMATION_CALL_URL;
 });
});

describe('media upload',()=>{
 it('is idempotent per idempotencyKey',async()=>{
  const {POST}=await import('../app/api/media/route');
  const body={idempotencyKey:'m1',productId:product.id,kind:'photo',dataUrl:'data:image/jpeg;base64,AAAA'};
  const first=await POST(json('http://x/media',body));
  expect(first.status).toBe(201);
  const replay=await POST(json('http://x/media',body));
  expect(replay.status).toBe(200);
  const data=await replay.json();
  expect(data.replayed).toBe(true);
  expect(storeHolder.store.media).toHaveLength(1);
 });
 it('rejects non-media payloads',async()=>{
  const {POST}=await import('../app/api/media/route');
  const res=await POST(json('http://x/media',{idempotencyKey:'m2',productId:product.id,kind:'photo',dataUrl:'data:text/html;base64,AAAA'}));
  expect(res.status).toBe(400);
 });
});

describe('tamper-evident verification',()=>{
 it('returns a chained receipt and logs misses',async()=>{
  const {GET}=await import('../app/api/products/verify/[hash]/route');
  const hit=await GET(new Request('http://x/verify'),{params:{hash:product.parentHash}});
  const hitData=await hit.json();
  expect(hitData.verified).toBe(true);
  expect(hitData.receipt.previousHash).toHaveLength(64);
  const miss=await GET(new Request('http://x/verify'),{params:{hash:'f'.repeat(64)}});
  expect(miss.status).toBe(404);
  const actions=storeHolder.store.auditLogs.map(a=>a.action);
  expect(actions).toContain('verify.miss');
 });
});
