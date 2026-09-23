import {emptyDb,Database} from '../backend/db';

// Integration tests for the artisan auth flow and protected routes.

const storeHolder:{store:Database}={store:null as unknown as Database};
jest.mock('../backend/db',()=>{
 const actual=jest.requireActual('../backend/db') as typeof import('../backend/db');
 return{
  ...actual,
  readDb:async()=>storeHolder.store,
  writeDb:async(next:Database)=>{storeHolder.store=next},
 };
});

function post(url:string,body:unknown,headers:Record<string,string>={}){
 return new Request(url,{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json',...headers}});
}

// Routes call next/headers cookies(); outside a real request scope Next throws.
// Anonymous requests see an empty cookie store.
jest.mock('next/headers',()=>({cookies:()=>({get:()=>undefined})}));

let ipCounter=0;
function postAsNewIp(url:string,body:unknown){
 ipCounter+=1;
 return post(url,body,{'x-forwarded-for':`10.0.0.${ipCounter}`});
}

beforeEach(()=>{storeHolder.store={...emptyDb}});

describe('auth flow',()=>{
 it('request-otp is rate limited per IP after 5 requests',async()=>{
  const {POST}=await import('../app/api/auth/request-otp/route');
  // Same IP every time, distinct phones so only the per-IP limit can trip.
  const sameIp={'x-forwarded-for':'10.9.9.9'};
  for(let i=0;i<5;i++){
   const res=await POST(post('http://localhost/api/auth/request-otp',{phone:`98765432${10+i}`},sameIp));
   expect(res.status).toBe(200);
  }
  const blocked=await POST(post('http://localhost/api/auth/request-otp',{phone:'9876543220'},sameIp));
  expect(blocked.status).toBe(429);
 });

 it('request-otp is rate limited per phone after 3 requests',async()=>{
  const {POST}=await import('../app/api/auth/request-otp/route');
  for(let i=0;i<3;i++){
   const res=await POST(postAsNewIp('http://localhost/api/auth/request-otp',{phone:'9876543299'}));
   expect(res.status).toBe(200);
  }
  const blocked=await POST(postAsNewIp('http://localhost/api/auth/request-otp',{phone:'9876543299'}));
  expect(blocked.status).toBe(429);
 });

 it('verify-otp rejects an invalid code and never creates a session',async()=>{
  const {POST:requestOtp}=await import('../app/api/auth/request-otp/route');
  const {POST:verifyOtp}=await import('../app/api/auth/verify-otp/route');
  await requestOtp(post('http://localhost/api/auth/request-otp',{phone:'9876543210'}));
  const res=await verifyOtp(post('http://localhost/api/auth/verify-otp',{phone:'9876543210',code:'000000'}));
  expect(res.status).toBe(401);
  expect(storeHolder.store.sessions).toHaveLength(0);
 });

 it('profile PATCH requires authentication',async()=>{
  const {PATCH}=await import('../app/api/artisans/profile/route');
  const res=await PATCH(new Request('http://localhost/api/artisans/profile',{method:'PATCH',body:JSON.stringify({name:'X'})}));
  expect(res.status).toBe(401);
 });

 it('products POST requires authentication',async()=>{
  const {POST}=await import('../app/api/products/route');
  const res=await POST(post('http://localhost/api/products',{name:'X',craft:'c',description:'d'}));
  expect(res.status).toBe(401);
 });

 it('full OTP login works with the dev code and creates a session',async()=>{
  const {POST:requestOtp}=await import('../app/api/auth/request-otp/route');
  const {POST:verifyOtp}=await import('../app/api/auth/verify-otp/route');
  const reqRes=await requestOtp(postAsNewIp('http://localhost/api/auth/request-otp',{phone:'9876543211'}));
  const reqData=await reqRes.json();
  expect(reqData.devCode).toBeDefined();
  const res=await verifyOtp(post('http://localhost/api/auth/verify-otp',{phone:'9876543211',code:reqData.devCode}));
  expect(res.status).toBe(200);
  expect(storeHolder.store.sessions).toHaveLength(1);
  const data=await res.json();
  expect(data.user.phone).toBe('9876543211');
 });

 it('session recovery route lists sessions only for the authenticated user',async()=>{
  const {GET}=await import('../app/api/auth/sessions/route');
  const unauth=await GET();
  expect(unauth.status).toBe(401);
 });
});
