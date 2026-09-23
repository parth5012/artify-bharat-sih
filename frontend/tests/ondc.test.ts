import {createHmac} from 'node:crypto';
import {emptyDb,Database} from '../backend/db';

// Integration tests for the ONDC flow: checkout intent, signed webhook with
// idempotency, seller listing retry, and the confirmation-call contract.

const fetchMock=jest.fn();
const realFetch=global.fetch;
beforeAll(()=>{global.fetch=fetchMock as unknown as typeof fetch});
afterAll(()=>{global.fetch=realFetch});

// Sync mock factory wrapping a mutable in-memory store.
const storeHolder:{store:Database}={store:null as unknown as Database};
jest.mock('../backend/db',()=>{
 const actual=jest.requireActual('../backend/db') as typeof import('../backend/db');
 return{
  ...actual,
  readDb:async()=>storeHolder.store,
  writeDb:async(next:Database)=>{storeHolder.store=next},
 };
});

function sign(body:string,secret:string){return 'sha256='+createHmac('sha256',secret).update(body).digest('hex')}

function makeOrder(){
 return{...emptyDb,ondcOrders:[{id:'ondc_test1',items:[{id:'p1',qty:1,price:100}],buyer:{name:'B',phone:'9876543210',line:'l',city:'c',state:'s',pin:'1',language:'hi-IN'},status:'created' as const,createdAt:Date.now(),updatedAt:Date.now()}]};
}

async function postWebhook(body:unknown,secret:string){
 const raw=JSON.stringify(body);
 process.env.ONDC_WEBHOOK_SECRET=secret;
 const {POST}=await import('../app/api/ondc/webhook/route');
 const request=new Request('http://localhost/api/ondc/webhook',{method:'POST',body:raw,headers:{'x-ondc-signature':sign(raw,secret)}});
 return POST(request);
}

async function callWebhook(body:unknown,secret:string){
 storeHolder.store=makeOrder();
 return postWebhook(body,secret);
}

beforeEach(()=>{storeHolder.store={...emptyDb};fetchMock.mockReset()});

describe('ONDC webhook',()=>{
 beforeEach(()=>{process.env.CONFIRMATION_CALL_URL='https://calls.example/confirm'});
 afterEach(()=>{delete process.env.CONFIRMATION_CALL_URL});

 it('marks an order paid and confirms in the buyer language',async()=>{
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ok:true}),{status:200}));
  const response=await callWebhook({orderId:'ondc_test1',status:'paid'},'s3cret');
  expect(response.status).toBe(200);
  const data=await response.json();
  expect(data.duplicate).toBeUndefined();
  expect(data.status).toBe('paid');
  expect(data.confirmationLanguage).toBe('hi-IN');
  expect(data.settlement).toBe('ONDC-linked artisan account');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toContain('calls.example');
 });

 it('is idempotent: a replayed webhook does not call the provider twice',async()=>{
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ok:true}),{status:200}));
  storeHolder.store=makeOrder();
  await postWebhook({orderId:'ondc_test1',status:'paid'},'s3cret');
  const firstCalls=fetchMock.mock.calls.length;
  const second=await postWebhook({orderId:'ondc_test1',status:'paid'},'s3cret');
  const data=await second.json();
  expect(data.duplicate).toBe(true);
  expect(fetchMock.mock.calls.length).toBe(firstCalls);
 });

 it('rejects an invalid signature',async()=>{
  const raw=JSON.stringify({orderId:'ondc_test1',status:'paid'});
  process.env.ONDC_WEBHOOK_SECRET='s3cret';
  const {POST}=await import('../app/api/ondc/webhook/route');
  const request=new Request('http://localhost/api/ondc/webhook',{method:'POST',body:raw,headers:{'x-ondc-signature':'sha256=bad'}});
  const response=await POST(request);
  expect(response.status).toBe(401);
 });
});

describe('ONDC seller listing retry',()=>{
 it('retries on 5xx and succeeds',async()=>{
  process.env.ONDC_SELLER_LISTING_URL='https://ondc.example/list';
  process.env.ONDC_WEBHOOK_SECRET='s3cret';
  fetchMock.mockRejectedValueOnce(new Error('network'))
   .mockResolvedValueOnce(new Response('{}',{status:500}))
   .mockResolvedValueOnce(new Response('{}',{status:200}));
  const {listProductOnOndc}=await import('../backend/ondc');
  const result=await listProductOnOndc({id:'p1',name:'n',craft:'c',price:1,description:'d',materials:[],parentHash:'ph',childHash:'ch'});
  expect(result.listed).toBe(true);
  expect(result.attempts).toBe(3);
  delete process.env.ONDC_SELLER_LISTING_URL;
 });

 it('does not retry a 4xx rejection',async()=>{
  process.env.ONDC_SELLER_LISTING_URL='https://ondc.example/list';
  process.env.ONDC_WEBHOOK_SECRET='s3cret';
  fetchMock.mockResolvedValueOnce(new Response('{}',{status:422}));
  const {listProductOnOndc}=await import('../backend/ondc');
  const result=await listProductOnOndc({id:'p1',name:'n',craft:'c',price:1,description:'d',materials:[],parentHash:'ph',childHash:'ch'});
  expect(result.listed).toBe(false);
  expect(result.attempts).toBe(1);
  delete process.env.ONDC_SELLER_LISTING_URL;
 });
});
