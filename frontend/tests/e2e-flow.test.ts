import {createHmac} from 'node:crypto';
import {emptyDb,Database} from '../backend/db';

// End-to-end API chain: OTP login -> product registration -> ONDC checkout
// (server-side pricing) -> signed payment webhook. One shared in-memory store
// keeps every step consistent, like a real deployment would.

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
// Cookie store mock backed by the session token captured from the login response.
const sessionHolder:{token:string|null}={token:null};
jest.mock('next/headers',()=>({cookies:()=>({get:(name:string)=>name==='artifact_session'&&sessionHolder.token?{value:sessionHolder.token}:undefined})}));

function json(url:string,body:unknown,headers:Record<string,string>={}){
 return new Request(url,{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json',...headers}});
}
const sign=(body:string,secret:string)=>'sha256='+createHmac('sha256',secret).update(body).digest('hex');

beforeEach(()=>{storeHolder.store={...emptyDb};fetchMock.mockReset();sessionHolder.token=null});

describe('artisan-to-buyer e2e flow',()=>{
 it('walks login, product registration, checkout, and payment webhook',async()=>{
  // 1. OTP login
  const {POST:requestOtp}=await import('../app/api/auth/request-otp/route');
  const {POST:verifyOtp}=await import('../app/api/auth/verify-otp/route');
  const otpRes=await requestOtp(json('http://x/api/auth/request-otp',{phone:'9876500001'},{'x-forwarded-for':'10.1.1.1'}));
  const {devCode}=await otpRes.json();
  const loginRes=await verifyOtp(json('http://x/api/auth/verify-otp',{phone:'9876500001',code:devCode}));
  expect(loginRes.status).toBe(200);
  // Capture the session cookie exactly as a browser would.
  const setCookie=loginRes.headers.get('set-cookie')??'';
  sessionHolder.token=/artifact_session=([^;]+)/.exec(setCookie)?.[1]??null;
  expect(sessionHolder.token).toBeTruthy();

  // 2. Product registration (authenticated via the session created above)
  const {POST:registerProduct}=await import('../app/api/products/route');
  const productRes=await registerProduct(json('http://x/api/products',{name:'Dhokra Elephant',craft:'metal',description:'Lost-wax cast brass elephant',price:2499,materials:['Brass']}));
  expect(productRes.status).toBe(201);
  const {product}=await productRes.json();
  expect(product.parentHash).toHaveLength(64);
  expect(product.childHash).toHaveLength(64);

  // 3. Buyer checkout — a tampered cart price must be corrected server-side
  const {POST:checkout}=await import('../app/api/ondc/checkout/route');
  process.env.ONDC_CHECKOUT_URL='https://ondc.example/pay';
  const checkoutRes=await checkout(json('http://x/api/ondc/checkout',{
   items:[{id:product.id,qty:1,price:1}], // client tries price 1 instead of 2499
   buyer:{name:'Buyer',phone:'9876500002',line:'1 Main Rd',city:'Bastar',state:'CG',pin:'494001',language:'hi-IN'},
  },{'x-forwarded-for':'10.1.1.2'}));
  expect(checkoutRes.status).toBe(200);
  const {orderId,redirectUrl}=await checkoutRes.json();
  expect(redirectUrl).toContain('https://ondc.example/pay');
  const intent=storeHolder.store.ondcOrders.find(o=>o.id===orderId);
  expect(intent?.items[0].price).toBe(2499); // server-side price won

  // 4. Signed payment webhook -> confirmation call in the buyer language
  process.env.ONDC_WEBHOOK_SECRET='e2e-secret';
  process.env.CONFIRMATION_CALL_URL='https://calls.example/confirm';
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ok:true}),{status:200}));
  const {POST:webhook}=await import('../app/api/ondc/webhook/route');
  const raw=JSON.stringify({orderId,status:'paid'});
  const webhookRes=await webhook(new Request('http://x/api/ondc/webhook',{method:'POST',body:raw,headers:{'x-ondc-signature':sign(raw,'e2e-secret')}}));
  expect(webhookRes.status).toBe(200);
  const webhookData=await webhookRes.json();
  expect(webhookData.status).toBe('paid');
  expect(webhookData.settlement).toBe('ONDC-linked artisan account');
  expect(fetchMock).toHaveBeenCalledTimes(1); // regional confirmation call fired

  // 5. Replay protection: the same webhook is a no-op
  const replayRes=await webhook(new Request('http://x/api/ondc/webhook',{method:'POST',body:raw,headers:{'x-ondc-signature':sign(raw,'e2e-secret')}}));
  const replayData=await replayRes.json();
  expect(replayData.duplicate).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
 });
});
