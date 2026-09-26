import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {emptyDb,Database,ProductRecord} from '../backend/db';

// Wayfinder #194 — Beckn order callbacks (select/init/confirm) + webhook
// idempotency + Atomic Inventory Lock, no-Docker edition (grill A3): every
// fetch is mocked, so CI never needs the beckn_sandbox sidecar and the webhook
// + lock logic is identical for sandbox vs fallback intents.
//
// Status vocabulary (pre-existing, NOT extended): OndcOrderIntent.status stays
// `created | paid | failed`. The Beckn callback stage is recorded separately in
// `intent.callback`, so select/init are staged callbacks that leave the intent
// in `created`, confirm (or the legacy `paid`) settles it `paid`, and `failed`
// marks failure.

const fetchMock=jest.fn();
const realFetch=global.fetch;
beforeAll(()=>{global.fetch=fetchMock as unknown as typeof fetch});
afterAll(()=>{global.fetch=realFetch});

// Sync mock factory wrapping a mutable in-memory store (same pattern as
// ondc.test.ts / lifecycle.test.ts so audits land in storeHolder.store).
// Reads return a STRUCTURED CLONE, not the live reference: real storage
// (file/JSONB) hands every readDb() a fresh document, so any code that mutates
// an object from an earlier read and then writeDb()s a later snapshot is a
// detached write. The clone keeps that class of bug visible in CI.
const storeHolder:{store:Database}={store:null as unknown as Database};
jest.mock('../backend/db',()=>{
  const actual=jest.requireActual('../backend/db') as typeof import('../backend/db');
  return{
    ...actual,
    readDb:async()=>structuredClone(storeHolder.store),
    writeDb:async(next:Database)=>{storeHolder.store=next},
  };
});

const SECRET='s3cret';
const sign=(body:string,secret:string)=>'sha256='+createHmac('sha256',secret).update(body).digest('hex');

// Local shapes: the test compiles against the CURRENT tree so the red run
// fails on assertions, not on missing-module type errors.
type LockResult={productId:string;locked:boolean;alreadyLocked:boolean;status:'sold_out'|'unknown_product';delistedFrom:string[];orderId?:string};
type LockOptions={orderId?:string;origin?:string};
type InventoryModule={lock_inventory_on_sale:(productId:string,options?:LockOptions)=>Promise<LockResult>};
function inventory():InventoryModule{return require('../backend/inventory') as InventoryModule}

// Additive fields are read through narrow casts so this file compiles before
// db.ts gains them (red) and after (green).
const callbackOf=(intent:unknown)=>(intent as {callback?:string}).callback;
const saleLockedAtOf=(product:unknown)=>(product as {saleLockedAt?:number}).saleLockedAt;

function makeProduct(id:string):ProductRecord{
  return{id,parentHash:'a'.repeat(64),childHash:'b'.repeat(64),serialNumber:'1',artisanId:'usr_artisan1',name:'Dhokra Elephant',craft:'metal',price:2500,description:'Lost-wax cast brass elephant',materials:['Brass'],status:'published',ownership:'artisan',createdAt:Date.now()};
}

function seed(productId:string,orderId:string){
  storeHolder.store={
    ...emptyDb,
    products:[makeProduct(productId)],
    ondcOrders:[{id:orderId,items:[{id:productId,qty:1,price:2500}],buyer:{name:'B',phone:'9876543210',line:'1 Main Rd',city:'Bastar',state:'CG',pin:'494001',language:'hi-IN'},status:'created',createdAt:Date.now(),updatedAt:Date.now()}],
  };
}

async function postCallback(body:unknown,headers:Record<string,string>={}){
  const raw=JSON.stringify(body);
  process.env.ONDC_WEBHOOK_SECRET=SECRET;
  const {POST}=await import('../app/api/ondc/webhook/route');
  return POST(new Request('http://x/api/ondc/webhook',{method:'POST',body:raw,headers:{'x-ondc-signature':sign(raw,SECRET),...headers}}));
}

const audits=(action:string)=>storeHolder.store.auditLogs.filter(entry=>entry.action===action);
const intent=()=>storeHolder.store.ondcOrders[0];
const product=()=>storeHolder.store.products[0];

beforeEach(()=>{
  storeHolder.store={...emptyDb};
  fetchMock.mockReset();
  // Default: a confirmation endpoint that answers 200 (so sendPaymentConfirmation
  // makes exactly one attempt). Tests asserting "no call" still see 0 calls.
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ok:true}),{status:200}));
  process.env.ONDC_WEBHOOK_SECRET=SECRET;
  // The confirmation endpoint is always configured so a wrongly-fired call
  // (e.g. on a staged select/init callback) shows up as a failed assertion.
  process.env.CONFIRMATION_CALL_URL='https://calls.example/confirm';
});
afterEach(()=>{
  delete process.env.ONDC_WEBHOOK_SECRET;
  delete process.env.CONFIRMATION_CALL_URL;
});

describe('Beckn order callbacks select/init/confirm (#194)',()=>{
  it('walks select -> init -> confirm: staged callbacks stay created, confirm settles paid',async()=>{
    seed('prd_cb_walk','ondc_cb_walk');

    const selectRes=await postCallback({orderId:'ondc_cb_walk',status:'select'});
    expect(selectRes.status).toBe(200);
    expect((await selectRes.json()).callback).toBe('select');
    expect(intent().status).toBe('created');
    expect(callbackOf(intent())).toBe('select');

    const initRes=await postCallback({orderId:'ondc_cb_walk',status:'init'});
    expect(initRes.status).toBe(200);
    expect((await initRes.json()).callback).toBe('init');
    expect(intent().status).toBe('created');
    expect(callbackOf(intent())).toBe('init');

    const confirmRes=await postCallback({orderId:'ondc_cb_walk',status:'confirm'});
    expect(confirmRes.status).toBe(200);
    const confirmData=await confirmRes.json();
    expect(confirmData.status).toBe('paid');
    expect(confirmData.callback).toBe('confirm');
    expect(confirmData.confirmationLanguage).toBe('hi-IN');
    expect(confirmData.settlement).toBe('ONDC-linked artisan account');
    expect(intent().status).toBe('paid');

    // Payment side effects fire only on the payment outcome, never on the
    // staged select/init callbacks.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('calls.example');

    // One ondc.payment_webhook audit per non-duplicate callback (newest-first
    // audit order), carrying the buyer confirmation language + the ONDC-owned
    // settlement note.
    const webhookAudits=audits('ondc.payment_webhook');
    expect(webhookAudits.map(entry=>entry.detail?.callback).reverse()).toEqual(['select','init','confirm']);
    const confirmAudit=webhookAudits.find(entry=>entry.detail?.callback==='confirm');
    expect(confirmAudit?.detail).toMatchObject({
      status:'paid',
      previousStatus:'created',
      confirmationLanguage:'hi-IN',
      settlement:'ONDC-linked artisan account',
    });

    // Atomic Inventory Lock ran exactly once on confirm (1-of-1 delist).
    expect(product().ownership).toBe('sold');
    expect(product().orderId).toBe('ondc_cb_walk');
    expect(saleLockedAtOf(product())).toBeGreaterThan(0);
    expect(intent().childUnitsSold).toBe(true);
    expect(audits('ondc.inventory_lock')).toHaveLength(1);
    // Newest-first audit order — assert the channel set, not the sequence.
    expect(audits('ondc.delist_intent').map(entry=>entry.detail?.channel).sort()).toEqual(['GeM','WhatsApp']);
    // Delist intents are stub logs: no network traffic beyond the one call.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the legacy paid status working (backwards compatibility)',async()=>{
    seed('prd_cb_legacy','ondc_cb_legacy');
    const res=await postCallback({orderId:'ondc_cb_legacy',status:'paid'});
    expect(res.status).toBe(200);
    const data=await res.json();
    expect(data.status).toBe('paid');
    expect(data.duplicate).toBeUndefined();
    expect(intent().status).toBe('paid');
    expect(callbackOf(intent())).toBe('paid');
    expect(audits('ondc.inventory_lock')).toHaveLength(1);
    expect(audits('ondc.delist_intent')).toHaveLength(2);
  });

  it('rejects an unknown status value with 400 and no state change',async()=>{
    seed('prd_cb_badstatus','ondc_cb_badstatus');
    const res=await postCallback({orderId:'ondc_cb_badstatus',status:'shipped'});
    expect(res.status).toBe(400);
    expect(intent().status).toBe('created');
    expect(audits('ondc.payment_webhook')).toHaveLength(0);
    expect(audits('ondc.inventory_lock')).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('webhook replay + failed idempotency (#194)',()=>{
  it('replaying the same callback is a no-op: no re-lock, no re-audit, no re-confirm',async()=>{
    seed('prd_rep_1','ondc_rep_1');
    const first=await postCallback({orderId:'ondc_rep_1',status:'confirm'});
    expect(first.status).toBe(200);
    expect((await first.json()).duplicate).toBeUndefined();

    const webhookAudits=audits('ondc.payment_webhook').length;
    const locks=audits('ondc.inventory_lock').length;
    const delists=audits('ondc.delist_intent').length;
    const soldAt=product().soldAt;

    const second=await postCallback({orderId:'ondc_rep_1',status:'confirm'});
    expect(second.status).toBe(200);
    const replay=await second.json();
    expect(replay.duplicate).toBe(true);
    expect(replay.status).toBe('paid');
    expect(audits('ondc.payment_webhook')).toHaveLength(webhookAudits);
    expect(audits('ondc.inventory_lock')).toHaveLength(locks);
    expect(audits('ondc.delist_intent')).toHaveLength(delists);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(product().soldAt).toBe(soldAt);

    // The legacy `paid` status replay stays a no-op too (previousStatus check).
    const third=await postCallback({orderId:'ondc_rep_1',status:'paid'});
    expect((await third.json()).duplicate).toBe(true);
    expect(audits('ondc.inventory_lock')).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('repeated failed webhooks keep the intent failed with no lock',async()=>{
    seed('prd_fail_1','ondc_fail_1');
    const first=await postCallback({orderId:'ondc_fail_1',status:'failed'});
    expect(first.status).toBe(200);
    expect((await first.json()).status).toBe('failed');
    expect(intent().status).toBe('failed');
    expect(callbackOf(intent())).toBe('failed');

    const confirmationCalls=fetchMock.mock.calls.length;
    const webhookAudits=audits('ondc.payment_webhook').length;

    const second=await postCallback({orderId:'ondc_fail_1',status:'failed'});
    expect((await second.json()).duplicate).toBe(true);
    expect(intent().status).toBe('failed');
    expect(audits('ondc.payment_webhook')).toHaveLength(webhookAudits);
    expect(fetchMock.mock.calls.length).toBe(confirmationCalls);
    expect(audits('ondc.inventory_lock')).toHaveLength(0);
    expect(product().ownership).toBe('artisan');
    expect(saleLockedAtOf(product())).toBeUndefined();
  });

  it('a late failed callback cannot regress a settled paid order',async()=>{
    seed('prd_paid_then_fail','ondc_paid_then_fail');
    const confirm=await postCallback({orderId:'ondc_paid_then_fail',status:'confirm'});
    expect((await confirm.json()).status).toBe('paid');
    expect(intent().status).toBe('paid');

    const locks=audits('ondc.inventory_lock').length;
    const webhookAudits=audits('ondc.payment_webhook').length;
    const confirmCalls=fetchMock.mock.calls.length;

    const late=await postCallback({orderId:'ondc_paid_then_fail',status:'failed'});
    expect(late.status).toBe(200);
    expect((await late.json()).duplicate).toBe(true);
    // The settled order stays paid: no status flip, no failure confirmation to
    // the buyer, no extra webhook audit, and the 1-of-1 lock is untouched.
    expect(intent().status).toBe('paid');
    expect(callbackOf(intent())).toBe('confirm');
    expect(audits('ondc.payment_webhook')).toHaveLength(webhookAudits);
    expect(audits('ondc.inventory_lock')).toHaveLength(locks);
    expect(fetchMock.mock.calls.length).toBe(confirmCalls);
    expect(product().ownership).toBe('sold');
  });

  it('staged select/init callbacks arriving after settlement are no-ops',async()=>{
    seed('prd_paid_then_select','ondc_paid_then_select');
    const confirm=await postCallback({orderId:'ondc_paid_then_select',status:'confirm'});
    expect((await confirm.json()).status).toBe('paid');

    const webhookAudits=audits('ondc.payment_webhook').length;
    const confirmCalls=fetchMock.mock.calls.length;

    const late=await postCallback({orderId:'ondc_paid_then_select',status:'select'});
    expect(late.status).toBe(200);
    expect((await late.json()).duplicate).toBe(true);
    expect(intent().status).toBe('paid');
    expect(callbackOf(intent())).toBe('confirm');
    expect(audits('ondc.payment_webhook')).toHaveLength(webhookAudits);
    expect(fetchMock.mock.calls.length).toBe(confirmCalls);
  });
});

describe('webhook authentication (#194)',()=>{
  it('rejects a bad signature with 401 and no state change',async()=>{
    seed('prd_auth_bad','ondc_auth_bad');
    const raw=JSON.stringify({orderId:'ondc_auth_bad',status:'confirm'});
    process.env.ONDC_WEBHOOK_SECRET=SECRET;
    const {POST}=await import('../app/api/ondc/webhook/route');
    const res=await POST(new Request('http://x/api/ondc/webhook',{method:'POST',body:raw,headers:{'x-ondc-signature':'sha256=bad'}}));
    expect(res.status).toBe(401);
    expect(intent().status).toBe('created');
    expect(callbackOf(intent())).toBeUndefined();
    expect(storeHolder.store.auditLogs).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a missing signature with 401',async()=>{
    seed('prd_auth_none','ondc_auth_none');
    const raw=JSON.stringify({orderId:'ondc_auth_none',status:'confirm'});
    process.env.ONDC_WEBHOOK_SECRET=SECRET;
    const {POST}=await import('../app/api/ondc/webhook/route');
    const res=await POST(new Request('http://x/api/ondc/webhook',{method:'POST',body:raw}));
    expect(res.status).toBe(401);
    expect(intent().status).toBe('created');
    expect(storeHolder.store.auditLogs).toHaveLength(0);
  });

  it('returns 400 (not 500) for an authenticated but unparseable body',async()=>{
    seed('prd_auth_badjson','ondc_auth_badjson');
    const raw='{not json';
    process.env.ONDC_WEBHOOK_SECRET=SECRET;
    const {POST}=await import('../app/api/ondc/webhook/route');
    const res=await POST(new Request('http://x/api/ondc/webhook',{method:'POST',body:raw,headers:{'x-ondc-signature':sign(raw,SECRET)}}));
    expect(res.status).toBe(400);
    expect(intent().status).toBe('created');
    expect(storeHolder.store.auditLogs).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Atomic Inventory Lock (#194)',()=>{
  it('locks exactly once for concurrent paid callbacks and the second is a no-op',async()=>{
    seed('prd_conc_1','ondc_conc_1');
    const responses=await Promise.all([
      postCallback({orderId:'ondc_conc_1',status:'paid'}),
      postCallback({orderId:'ondc_conc_1',status:'paid'}),
    ]);
    for(const res of responses)expect(res.status).toBe(200);
    const bodies=await Promise.all(responses.map(res=>res.json()));
    const duplicates=bodies.filter(body=>body.duplicate===true);
    const applied=bodies.filter(body=>body.duplicate!==true&&body.status==='paid');
    expect(duplicates).toHaveLength(1);
    expect(applied).toHaveLength(1);

    // Exactly one effective delist: one inventory lock + the GeM/WhatsApp
    // stub intents it emits, no matter how many paid callbacks raced.
    expect(audits('ondc.inventory_lock')).toHaveLength(1);
    expect(audits('ondc.delist_intent')).toHaveLength(2);
    expect(product().ownership).toBe('sold');
    expect(saleLockedAtOf(product())).toBeGreaterThan(0);
    expect(intent().status).toBe('paid');
    expect(intent().childUnitsSold).toBe(true);
  });

  it('lock_inventory_on_sale marks sold_out and stubs the GeM/WhatsApp delist with no network',async()=>{
    seed('prd_lock_unit','ondc_lock_unit');
    const {lock_inventory_on_sale}=inventory();

    const [first,second]=await Promise.all([
      lock_inventory_on_sale('prd_lock_unit',{orderId:'ondc_lock_unit',origin:'ONDC'}),
      lock_inventory_on_sale('prd_lock_unit',{orderId:'ondc_lock_unit',origin:'ONDC'}),
    ]);
    expect(first.locked).toBe(true);
    expect(first.status).toBe('sold_out');
    expect(first.delistedFrom).toEqual(['GeM','WhatsApp']);
    expect(second.locked).toBe(false);
    expect(second.alreadyLocked).toBe(true);

    expect(product().ownership).toBe('sold');
    expect(product().orderId).toBe('ondc_lock_unit');
    expect(saleLockedAtOf(product())).toBeGreaterThan(0);
    expect(audits('ondc.delist_intent').map(entry=>entry.detail?.channel).sort()).toEqual(['GeM','WhatsApp']);
    expect(audits('ondc.inventory_lock')).toHaveLength(1);
    // Stub log only: the delist emits audits, never an outbound request.
    expect(fetchMock).not.toHaveBeenCalled();

    const third=await lock_inventory_on_sale('prd_lock_unit');
    expect(third.alreadyLocked).toBe(true);
    expect(audits('ondc.delist_intent')).toHaveLength(2);
    expect(audits('ondc.inventory_lock')).toHaveLength(1);
  });

  it('reports an unknown product without locking or delisting',async()=>{
    seed('prd_lock_missing','ondc_lock_missing');
    const {lock_inventory_on_sale}=inventory();
    const result=await lock_inventory_on_sale('prd_does_not_exist');
    expect(result.locked).toBe(false);
    expect(result.status).toBe('unknown_product');
    expect(audits('ondc.inventory_lock')).toHaveLength(0);
    expect(audits('ondc.delist_intent')).toHaveLength(0);
  });

  it('keeps the delist single across a restart (persisted saleLockedAt guard)',async()=>{
    seed('prd_lock_restart','ondc_lock_restart');
    const {lock_inventory_on_sale}=inventory();
    const first=await lock_inventory_on_sale('prd_lock_restart',{orderId:'ondc_lock_restart'});
    expect(first.locked).toBe(true);

    // Simulated process restart: the in-memory claim set is gone but the
    // persisted marker on the product still blocks a second delist.
    jest.resetModules();
    const restarted=inventory();
    const second=await restarted.lock_inventory_on_sale('prd_lock_restart',{orderId:'ondc_lock_restart'});
    expect(second.locked).toBe(false);
    expect(second.alreadyLocked).toBe(true);
    expect(audits('ondc.delist_intent')).toHaveLength(2);
    expect(audits('ondc.inventory_lock')).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('the delist helper makes no network calls and reads no ONDC_* secrets',()=>{
    const source=readFileSync(path.join(__dirname,'..','backend','inventory.ts'),'utf8');
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toContain('ONDC_');
  });
});
