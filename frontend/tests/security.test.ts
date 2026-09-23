import {createHmac} from 'node:crypto';
import {rateLimit,verifyWebhookSignature,audit} from '../backend/security';

describe('security helpers',()=>{
 describe('rateLimit',()=>{
  it('allows requests under the limit and blocks above it',()=>{
   const key='test:'+Math.random();
   for(let i=0;i<3;i++)expect(rateLimit(key,3,1000).ok).toBe(true);
   const blocked=rateLimit(key,3,1000);
   expect(blocked.ok).toBe(false);
   expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
  it('resets after the window',()=>{
   const key='test-window:'+Math.random();
   expect(rateLimit(key,1,10).ok).toBe(true);
   expect(rateLimit(key,1,10).ok).toBe(false);
   return new Promise(r=>setTimeout(r,20)).then(()=>{
    expect(rateLimit(key,1,10).ok).toBe(true);
   });
  });
 });

 describe('verifyWebhookSignature',()=>{
  const secret='whsec_test_123';
  beforeEach(()=>{process.env.ONDC_WEBHOOK_SECRET=secret});
  afterEach(()=>{delete process.env.ONDC_WEBHOOK_SECRET});

  it('accepts a valid HMAC signature',()=>{
   const body=JSON.stringify({orderId:'o1',status:'paid'});
   const sig='sha256='+createHmac('sha256',secret).update(body).digest('hex');
   expect(verifyWebhookSignature(body,sig)).toBe(true);
  });
  it('rejects a tampered body',()=>{
   const body=JSON.stringify({orderId:'o1',status:'paid'});
   const sig='sha256='+createHmac('sha256',secret).update(body).digest('hex');
   expect(verifyWebhookSignature(body+' ',sig)).toBe(false);
  });
  it('rejects a wrong signature and missing header',()=>{
   const body=JSON.stringify({orderId:'o1',status:'paid'});
   expect(verifyWebhookSignature(body,'sha256=deadbeef')).toBe(false);
   expect(verifyWebhookSignature(body,null)).toBe(false);
  });
  it('fails closed when no secret is configured',()=>{
   delete process.env.ONDC_WEBHOOK_SECRET;
   const body='{}';
   const sig='sha256='+createHmac('sha256','anything').update(body).digest('hex');
   expect(verifyWebhookSignature(body,sig)).toBe(false);
  });
 });

 describe('audit',()=>{
  it('writes an audit entry without throwing when db is a json file',async()=>{
   await expect(audit({action:'test.event',actor:'u1'})).resolves.toBeUndefined();
  });
 });
});
