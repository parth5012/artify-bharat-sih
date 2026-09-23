import {emptyDb,Database} from '../backend/db';

// Integration tests for the offline sync API (idempotent product replay).

const storeHolder:{store:Database}={store:null as unknown as Database};
jest.mock('../backend/db',()=>{
 const actual=jest.requireActual('../backend/db') as typeof import('../backend/db');
 return{
  ...actual,
  readDb:async()=>storeHolder.store,
  writeDb:async(next:Database)=>{storeHolder.store=next},
 };
});
jest.mock('next/headers',()=>({cookies:()=>({get:()=>undefined})}));

function post(body:unknown){
 return new Request('http://localhost/api/sync',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}});
}

beforeEach(()=>{storeHolder.store={...emptyDb}});

describe('offline sync API',()=>{
 it('requires authentication',async()=>{
  const {POST}=await import('../app/api/sync/route');
  const res=await POST(post({idempotencyKey:'k1',name:'n',craft:'c',description:'d'}));
  expect(res.status).toBe(401);
 });

 it('rejects unauthenticated requests before validation (no data leak)',async()=>{
  const {POST}=await import('../app/api/sync/route');
  // Missing idempotency key AND no session: auth must win with 401.
  const res=await POST(post({name:'n',craft:'c',description:'d'}));
  expect(res.status).toBe(401);
 });
});
